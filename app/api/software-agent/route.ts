import { createScenarioAdapter } from "../../../lib/experiment/runtime";
import type { InformationNode, InformationPacket, InformationStage } from "../../../lib/experiment/types";
import { SOFTWARE_PRODUCT_DEVELOPMENT_V1 } from "../../../scenarios/software-product-development-v1";
import { getCommonOpportunityScenario } from "../../../scenarios/common-opportunities-v4.2";
import { canonicalMaterialDelivery, MAX_CANONICAL_MATERIAL_CHARACTERS } from "../../../lib/experiment/agent-gateway";
import {
  PRODUCT_ACTION_TOOL, EVALUATION_TOOL, prepareSessionAction, productSessionSnapshot,
  readProductSession, getSessionEvaluationCapabilities, executeSessionEvaluationTool,
  readSessionEvaluationAlias,
} from "../../../lib/experiment/product-service";
import { withProductFacts } from "../../../scenarios/with-product-facts";
import type { ProductSessionSnapshot } from "../../../scenarios/with-product-facts";

function scenarioWithProductSnapshot(snapshot: ProductSessionSnapshot) {
  return withProductFacts(SOFTWARE_PRODUCT_DEVELOPMENT_V1, snapshot.publicFacts);
}

type ClientMessage = { role: "user" | "assistant"; content: string };
type SoftwareAgentBody = {
  scenarioId?: unknown;
  messages?: unknown;
  frontierStage?: unknown;
  contextNodeIds?: unknown;
  productSessionId?: unknown;
};

type AgentEnvironmentName =
  | "SOFTWARE_AGENT_API_KEY"
  | "SOFTWARE_AGENT_BASE_URL"
  | "SOFTWARE_AGENT_MODEL"
  | "DEEPSEEK_API_KEY"
  | "DEEPSEEK_BASE_URL"
  | "DEEPSEEK_MODEL";

const allowedBodyKeys = new Set(["scenarioId", "messages", "frontierStage", "contextNodeIds", "productSessionId"]);
const markerPattern = /\[\[([A-Z0-9:@._+-]+)\|([^\]\r\n]{1,160})\]\]/g;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const MAX_REQUEST_BYTES = 8_388_608;
const MAX_MESSAGES = 256;
const MAX_MESSAGE_CHARACTERS = 256_000;
const MAX_TRANSCRIPT_CHARACTERS = 1_000_000;
const MAX_RESPONSE_CHARACTERS = 32_000;

async function runtimeBindings(): Promise<Record<string, unknown>> {
  try {
    const workersRuntime = await import("cloudflare:workers");
    return workersRuntime.env as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

function serverEnv(bindings: Record<string, unknown>, ...names: AgentEnvironmentName[]): string | undefined {
  for (const name of names) {
    const workerValue = bindings[name];
    if (typeof workerValue === "string" && workerValue.trim()) return workerValue.trim();
    const processValue = typeof process !== "undefined" ? process.env[name] : undefined;
    if (typeof processValue === "string" && processValue.trim()) return processValue.trim();
  }
  return undefined;
}

async function agentConfiguration() {
  const bindings = await runtimeBindings();
  const apiKey = serverEnv(bindings, "SOFTWARE_AGENT_API_KEY", "DEEPSEEK_API_KEY");
  const baseUrl = (serverEnv(bindings, "SOFTWARE_AGENT_BASE_URL", "DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = serverEnv(bindings, "SOFTWARE_AGENT_MODEL", "DEEPSEEK_MODEL") ?? "deepseek-v4-flash";
  let provider = "invalid";
  try {
    provider = new URL(baseUrl).host;
  } catch {
    // POST reports the invalid server configuration without exposing it.
  }
  return { apiKey, baseUrl, model, provider };
}

function requestKey(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function isRateLimited(request: Request): boolean {
  const now = Date.now();
  const key = requestKey(request);
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

type CleanMessagesResult = { messages: ClientMessage[]; participantRequest: string; error?: never; status?: never }
  | { messages?: never; error: string; status: 400 | 413 };

function cleanMessages(value: unknown): CleanMessagesResult {
  const invalid = { error: "messages 必须包含有效的用户或助手消息，且最后一条必须来自用户。", status: 400 as const };
  if (!Array.isArray(value) || value.length === 0) return invalid;
  if (value.length > MAX_MESSAGES) {
    return { error: `完整对话超过 ${MAX_MESSAGES} 条消息的服务上限。本次请求未发送，历史未被截断。`, status: 413 };
  }
  const cleaned: ClientMessage[] = [];
  let totalLength = 0;
  for (const item of value) {
    if (!item || typeof item !== "object") return invalid;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return invalid;
    const text = content.trim().replace(markerPattern, "$2");
    if (!text) return invalid;
    if (text.length > MAX_MESSAGE_CHARACTERS) {
      return { error: `单条消息超过 ${MAX_MESSAGE_CHARACTERS} 字符的服务上限。本次请求未发送，内容未被截断。`, status: 413 };
    }
    totalLength += text.length;
    if (totalLength > MAX_TRANSCRIPT_CHARACTERS) {
      return { error: `完整对话超过 ${MAX_TRANSCRIPT_CHARACTERS} 字符的服务上限。本次请求未发送，历史未被截断。`, status: 413 };
    }
    cleaned.push({ role, content: text });
  }
  if (cleaned.at(-1)?.role !== "user") return invalid;
  return { messages: cleaned, participantRequest: (value.at(-1) as ClientMessage).content };
}

function cleanNodeIds(value: unknown, eligibleNodeIds: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && eligibleNodeIds.has(item))
    .filter((item, index, values) => values.indexOf(item) === index);
}

type ProductAuthority = {
  sessionVersion: number;
  productStateVersion: number;
  currentRevisionId: string;
  candidateRevisionId: string | null;
  rollbackTargetRevisionId: string | null;
  receipts: Array<{ receiptId: string; revisionId: string; purpose: string; passed: boolean }>;
  evaluationCapabilities: unknown;
};

function buildSystemPrompt(packet: InformationPacket, productAuthority?: ProductAuthority): string {
  return [
    "你是一个软件产品开发研究中的中立对话 Agent。使用自然、直接的中文与参与者讨论一个做到一半的个人阅读清单产品。",
    "你不知道参与者使用哪一种界面，也不得提及实验条件、对象模式、评分规则或内部实现。",
    "下面的信息包和完整对话中已披露的同版本材料是场景事实来源。参与者的推测与要求不自动成为产品事实。不得补充真实用户研究、产品现状、指标、因果解释、未来证据或候选改版结果；材料不能支持的判断要明确保留不确定性。",
    "完整回答参与者实际提出的问题，允许一轮查询多个字段、比较多个案例、回顾历史，并在被请求时综合或建议。区分材料事实、推断与建议；不要代写参与者理由或主动选择下一条调查路线。",
    productAuthority
      ? "你可以解释、连接、澄清，并在参与者明确要求具体产品操作时调用 prepare_product_action，准备实际范围供其确认。工具只准备，不执行或采用；只有随后真实的参与者确认才能执行。不得替参与者确认、代写理由、推进研究阶段或宣称未执行的检查已通过。"
      : "你负责解释、连接、澄清和帮助参与者表达下一步意图；当前回答器不会实施改版，不得推进阶段、替参与者提交、扩张实施范围、指定唯一正确方案或宣称候选已经通过。",
    ...(productAuthority ? [
      "普通建议、讨论是否要做、假设、引述及否定要求继续普通 Chat，不是执行授权。不能因某个动作词出现就调用工具；必须依据本次完整请求判断。意图、范围、候选或回执不明确时先澄清，不选择最近的候选或相近功能。",
      "一次回复最多调用一个工具，不自动连锁。明确要求生成并检查同一个候选时，可在一个 prepare_product_action 中设置 verifyAfterProposal=true；不要强迫拆成多轮。即使检查通过也不得自动采用。工具返回后由系统交付真实结果，不需要你续写或美化。",
      "明确请求模拟评价材料时可调用 request_candidate_evaluation；它按确切版本、协议、窗口和请求范围发布或读取材料，不改产品，不等同于真实用户研究或六条数据内核检查。缺少必要参数时澄清，不猜未来窗口。全集按明确分页交付并提供完整下载，不把第一页称作全部。",
      `当前产品的最小权威元数据（不是检查或用户效果的替代证据）：${JSON.stringify(productAuthority)}。只有这里及已提供事实中的确切版本和回执可用于动作；历史通过回执不自动授权当前候选。`,
    ] : []),
    "回答长度随请求所需内容决定，不人为拆成多轮小问答，也不因固定字数省略比较项或证据限制。必要时可使用列表或对照表；不主动把可用节点、层级或操作列成任务菜单。",
    "只要使用某个信息节点的事实，就从该节点的“允许锚点短语”中逐字选择一个确实出现在回答里的短语，写成 [[节点ID|允许锚点短语]]。不要圈代词、整段结论或与对象不完全对应的概括。不得在标记之外显示节点 ID，也不得创造信息包之外的 ID。",
    "标记只是渲染锚点，参与者最终只会看到竖线右侧的自然短语。",
    `信息空间版本：${packet.frontier.informationSpaceVersion}。`,
    `当前共同时间阶段：${packet.frontier.stage}。`,
    `最近语义上下文：${packet.frontier.contextNodeIds.length > 0 ? packet.frontier.contextNodeIds.join(", ") : "无"}。`,
    `本次请求的材料 bundle：${packet.resolution.nodeIds.length > 0 ? packet.resolution.nodeIds.join(", ") : "未唯一定位；需要时自然澄清，不猜测未提供材料"}。这些节点进入信息包不表示它们已向参与者披露。`,
    "当前局部信息包：",
    ...packet.nodes.map((item) => [
      `[${item.nodeId}] ${item.title}`,
      item.body,
      `允许锚点短语：${item.groundingPhrases.join(" | ")}`,
      `来源：${item.sourceLabel}`,
      `坐标：${item.epistemicDepth} / ${item.kind} / ${item.temporalStage} / ${item.epistemicStatus}`,
      `可用语义操作：${item.availableOperations.join(", ")}`,
    ].join("\n")),
    "当前局部类型化关系：",
    ...(packet.relations.length > 0
      ? packet.relations.map((relation) => `${relation.sourceNodeId} --${relation.kind}--> ${relation.targetNodeId}`)
      : ["无"]),
  ].join("\n\n");
}

function normalizedAnchor(value: string): string {
  return value.toLocaleLowerCase("zh-CN").replace(/[\s，。！？、；：,.!?;:()（）【】+=@\u005b\u005d“”‘’'"·]/gu, "");
}

function validateOutput(content: string, allowedNodes: ReadonlyMap<string, InformationNode>) {
  const rawMarkers = [...content.matchAll(markerPattern)];
  let invalidMarkerCount = 0;
  let invalidAnchorCount = 0;
  const nodeIds: string[] = [];
  const message = content.replace(markerPattern, (_whole, nodeId: string, label: string) => {
    const item = allowedNodes.get(nodeId);
    if (item === undefined) {
      invalidMarkerCount += 1;
      return label;
    }
    const normalizedLabel = normalizedAnchor(label.trim());
    const allowed = item.groundingPhrases.some((phrase) => normalizedAnchor(phrase) === normalizedLabel);
    if (!allowed) {
      invalidAnchorCount += 1;
      return label;
    }
    if (!nodeIds.includes(nodeId)) nodeIds.push(nodeId);
    return `[[${nodeId}|${label.trim()}]]`;
  }).trim();
  return { message, nodeIds, invalidMarkerCount, invalidAnchorCount, rawMarkerCount: rawMarkers.length };
}

async function payloadHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function evaluationDelivery(evaluation: ReturnType<typeof executeSessionEvaluationTool>, stage: InformationStage) {
  const adapter = createScenarioAdapter(scenarioWithProductSnapshot(evaluation.snapshot));
  const nodes = evaluation.nodeIds.map((nodeId: string) => adapter.node(nodeId));
  const grounded = adapter.markGroundedPhrases(evaluation.message, evaluation.nodeIds);
  if (grounded.message.length > MAX_CANONICAL_MATERIAL_CHARACTERS) throw new Error("product_evaluation:page_delivery_limit_exceeded");
  return {
    nodes,
    payload: {
      matched: true, message: grounded.message, nodeIds: grounded.nodeIds, groundedNodeIds: grounded.nodeIds,
      requestedNodeIds: evaluation.nodeIds, frontierRef: adapter.frontier(stage).frontierRef,
      traversedRelationIds: [], packetNodeIds: evaluation.nodeIds, deliveryKind: "product_evaluation_material",
      productSnapshot: evaluation.snapshot,
      productEvaluation: { status: evaluation.status, publicationId: evaluation.publicationId,
        pagination: evaluation.pagination ?? null, downloadUrl: evaluation.downloadUrl ?? null },
      invalidMarkerCount: 0, invalidAnchorCount: 0, autoGroundedNodeIds: grounded.nodeIds,
    },
  };
}

export async function GET() {
  const configuration = await agentConfiguration();
  return Response.json({
    configured: Boolean(configuration.apiKey),
    mode: configuration.apiKey ? "remote_chat_completion" : "deterministic_local_lookup",
    model: configuration.model,
    provider: configuration.provider,
    transcriptLimits: {
      maxMessages: MAX_MESSAGES,
      maxMessageCharacters: MAX_MESSAGE_CHARACTERS,
      maxTranscriptCharacters: MAX_TRANSCRIPT_CHARACTERS,
      maxRequestBytes: MAX_REQUEST_BYTES,
      maxCanonicalMaterialCharacters: MAX_CANONICAL_MATERIAL_CHARACTERS,
    },
  });
}

export async function POST(request: Request) {
  if (isRateLimited(request)) return Response.json({ error: "请求过于频繁，请稍后再试。" }, { status: 429 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) return Response.json({ error: "请求超过 8 MiB 服务上限，完整历史未被截断。" }, { status: 413 });

  const configuration = await agentConfiguration();

  let body: SoftwareAgentBody;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return Response.json({ error: "请求超过 8 MiB 服务上限，完整历史未被截断。" }, { status: 413 });
    }
    body = JSON.parse(rawBody) as SoftwareAgentBody;
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Object.keys(body).some((key) => !allowedBodyKeys.has(key))) {
    return Response.json({ error: "请求字段无效。" }, { status: 400 });
  }
  let scenario = body.scenarioId === SOFTWARE_PRODUCT_DEVELOPMENT_V1.scenarioId
    ? SOFTWARE_PRODUCT_DEVELOPMENT_V1
    : typeof body.scenarioId === "string" ? getCommonOpportunityScenario(body.scenarioId) : undefined;
  if (!scenario) return Response.json({ error: "场景不匹配。" }, { status: 400 });
  const transcript = cleanMessages(body.messages);
  if (transcript.error !== undefined) return Response.json({ error: transcript.error }, { status: transcript.status });
  const messages = transcript.messages;
  const frontierStage = body.frontierStage;
  if (frontierStage !== "history" && frontierStage !== "e0") {
    return Response.json({ error: "信息 Frontier 阶段无效。" }, { status: 400 });
  }

  const stage = frontierStage satisfies InformationStage;
  let productSnapshot: ProductSessionSnapshot | undefined;
  let productAuthority: ProductAuthority | undefined;
  if (body.productSessionId !== undefined) {
    if (typeof body.productSessionId !== "string" || !body.productSessionId.trim()
      || scenario.scenarioId !== SOFTWARE_PRODUCT_DEVELOPMENT_V1.scenarioId || stage !== "e0") {
      return Response.json({ error: "产品会话仅可用于主场景开放阶段，且必须使用有效会话标识。" }, { status: 400 });
    }
    try {
      const state = readProductSession(body.productSessionId);
      productSnapshot = productSessionSnapshot(body.productSessionId);
      productAuthority = {
        sessionVersion: state.sessionVersion,
        productStateVersion: state.product.stateVersion,
        currentRevisionId: state.product.currentRevisionId,
        candidateRevisionId: state.product.candidate?.revisionId ?? null,
        rollbackTargetRevisionId: [...state.product.adoptionHistory].reverse()
          .find((entry) => entry.revisionId === state.product.currentRevisionId && !entry.rolledBack)?.before.revisionId ?? null,
        receipts: state.product.receipts.map((receipt: ProductAuthority["receipts"][number]) => ({
          receiptId: receipt.receiptId, revisionId: receipt.revisionId, purpose: receipt.purpose, passed: receipt.passed,
        })),
        evaluationCapabilities: getSessionEvaluationCapabilities(body.productSessionId),
      };
      scenario = scenarioWithProductSnapshot(productSnapshot);
    } catch {
      return Response.json({ error: "产品会话不可用或已过期，请恢复会话后重试。" }, { status: 409 });
    }
  }
  const adapter = createScenarioAdapter(scenario);
  const eligibleNodeIds = new Set(adapter.frontier(stage).eligibleNodeIds);
  const contextNodeIds = cleanNodeIds(body.contextNodeIds, eligibleNodeIds);
  const query = messages.at(-1)?.content ?? "";
  const packet = adapter.buildPacket(query, stage, contextNodeIds, contextNodeIds);
  const resolution = packet.resolution;
  const packetNodeMap = new Map(packet.nodes.map((item) => [item.nodeId, item]));
  const evidenceEnvelope = {
    scenarioId: scenario.scenarioId,
    informationSpaceVersion: scenario.informationSpaceVersion,
    stage,
    contextNodeIds,
    requestedNodeIds: resolution.nodeIds,
    nodes: packet.nodes.map(({
      nodeId,
      title,
      body: nodeBody,
      sourceLabel,
      epistemicDepth,
      kind,
      temporalStage,
      epistemicStatus,
      availableOperations,
    }) => ({
      nodeId,
      title,
      body: nodeBody,
      sourceLabel,
      epistemicDepth,
      kind,
      temporalStage,
      epistemicStatus,
      availableOperations,
    })),
    relations: packet.relations,
    ...(productAuthority ? { productAuthority } : {}),
  };
  const canonical = canonicalMaterialDelivery(packet, query);
  if (typeof body.productSessionId === "string") {
    try {
      // This is a strict, complete material-read alias, not an action-intent
      // classifier. It can only read packets already published in this session.
      const evaluation = readSessionEvaluationAlias(body.productSessionId, transcript.participantRequest);
      if (evaluation) {
        const startedAt = Date.now();
        const delivery = evaluationDelivery(evaluation, stage);
        const configuredAgentMode = configuration.apiKey ? "remote_chat_completion" : "deterministic_local_lookup";
        return Response.json({
          ...delivery.payload, mode: configuredAgentMode, configuredAgentMode,
          provider: "local-canonical-material", providerInvoked: false, requestId: crypto.randomUUID(),
          latencyMs: Date.now() - startedAt, finishReason: "canonical_complete", usage: null,
          evidenceEnvelopeHash: await payloadHash({ ...evidenceEnvelope, deliveryKind: "product_evaluation_material", deliveredNodes: delivery.nodes }),
        });
      }
    } catch (error) {
      const reason = error instanceof Error && error.message.startsWith("product_evaluation:") ? error.message : "product_evaluation:material_read_failed";
      return Response.json({ error: `评价材料尚未交付（${reason}）。请指定已发布窗口和读取范围。` }, { status: 409 });
    }
  }
  if (canonical) {
    const startedAt = Date.now();
    const grounded = adapter.markGroundedPhrases(canonical.message, canonical.nodeIds);
    if (grounded.message.length > MAX_CANONICAL_MATERIAL_CHARACTERS) {
      return Response.json({ error: `完整资料超过 ${MAX_CANONICAL_MATERIAL_CHARACTERS} 字符的单次交付上限，本次未交付，资料未被截断。请明确缩小资料范围。` }, { status: 413 });
    }
    const disclosed = new Set(grounded.nodeIds);
    const disclosedRelations = packet.relations.filter((relation) => disclosed.has(relation.sourceNodeId) && disclosed.has(relation.targetNodeId));
    const configuredAgentMode = configuration.apiKey ? "remote_chat_completion" : "deterministic_local_lookup";
    return Response.json({
      matched: true,
      message: grounded.message,
      nodeIds: grounded.nodeIds,
      requestedNodeIds: canonical.nodeIds,
      groundedNodeIds: grounded.nodeIds,
      frontierRef: packet.frontier.frontierRef,
      traversedRelationIds: disclosedRelations.map((relation) => relation.relationId),
      packetNodeIds: [...canonical.nodeIds],
      mode: configuredAgentMode,
      configuredAgentMode,
      deliveryKind: "canonical_material",
      provider: "local-canonical-material",
      providerInvoked: false,
      requestId: crypto.randomUUID(),
      latencyMs: Date.now() - startedAt,
      finishReason: "canonical_complete",
      usage: null,
      invalidMarkerCount: 0,
      invalidAnchorCount: 0,
      autoGroundedNodeIds: grounded.nodeIds,
      ...(productSnapshot ? { productSnapshot } : {}),
      evidenceEnvelopeHash: await payloadHash({
        ...evidenceEnvelope,
        deliveryKind: "canonical_material",
        nodes: evidenceEnvelope.nodes.filter((node) => canonical.nodeIds.includes(node.nodeId)),
        relations: disclosedRelations,
      }),
    });
  }
  // Model configuration is required only for generated conversation. Canonical
  // reads above have already passed scenario, stage, request and transcript
  // validation and never turn a provider failure into replacement output.
  if (!configuration.apiKey) return Response.json({ error: "软件 Agent 尚未配置服务端 API Key。" }, { status: 503 });
  try {
    const parsedBaseUrl = new URL(configuration.baseUrl);
    if (parsedBaseUrl.protocol !== "https:" && !(parsedBaseUrl.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname))) {
      return Response.json({ error: "软件 Agent 服务端配置无效。" }, { status: 500 });
    }
  } catch {
    return Response.json({ error: "软件 Agent 服务端配置无效。" }, { status: 500 });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  const startedAt = Date.now();
  const toolsEnabled = productAuthority !== undefined;
  const thinkingDisabled = toolsEnabled && new URL(configuration.baseUrl).hostname === "api.deepseek.com";
  const providerPolicy = {
    productToolsEnabled: toolsEnabled,
    maxToolCalls: toolsEnabled ? 1 : 0,
    thinkingMode: thinkingDisabled ? "disabled" : "provider_default",
    toolResultContinuation: false,
  };

  try {
    const upstream = await fetch(`${configuration.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.apiKey}` },
      body: JSON.stringify({
        model: configuration.model,
        messages: [
          { role: "system", content: buildSystemPrompt(packet, productAuthority) },
          ...messages,
        ],
        temperature: 0.2,
        stream: false,
        ...(toolsEnabled ? { tools: [PRODUCT_ACTION_TOOL, EVALUATION_TOOL], tool_choice: "auto" } : {}),
        ...(thinkingDisabled ? { thinking: { type: "disabled" } } : {}),
      }),
      signal: controller.signal,
    });

    const requestId = upstream.headers.get("x-request-id") ?? crypto.randomUUID();
    if (!upstream.ok) {
      const retryable = upstream.status === 429 || upstream.status >= 500;
      return Response.json({ error: retryable ? "模型服务暂时繁忙，请稍后重试。" : "模型请求未完成。", requestId, providerPolicy }, { status: retryable ? 503 : 502 });
    }
    const payload = await upstream.json() as {
      choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown; function_call?: unknown }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const choice = payload.choices?.[0];
    if (payload.choices?.[0]?.finish_reason === "length") {
      return Response.json({ error: "模型回答被服务长度限制截断，本次未记为完整回答。请重试。", requestId, providerPolicy }, { status: 502 });
    }
    const toolCalls = choice?.message?.tool_calls;
    if (choice?.message?.function_call !== undefined
      || (toolCalls != null && !Array.isArray(toolCalls))
      || (Array.isArray(toolCalls) && toolCalls.length > 1)
      || (choice?.finish_reason === "tool_calls" && (!Array.isArray(toolCalls) || toolCalls.length !== 1))) {
      return Response.json({ error: "模型工具调用协议无效；本次未执行工具。", requestId, providerPolicy }, { status: 502 });
    }
    if (Array.isArray(toolCalls) && toolCalls.length === 1) {
      const call = toolCalls[0];
      if (!productSnapshot || !productAuthority || typeof body.productSessionId !== "string"
        || !call || typeof call !== "object" || call.type !== "function"
        || typeof call.id !== "string" || !call.id
        || !call.function || typeof call.function !== "object"
        || ![PRODUCT_ACTION_TOOL.function.name, EVALUATION_TOOL.function.name].includes(call.function.name)
        || typeof call.function.arguments !== "string" || call.function.arguments.length > MAX_RESPONSE_CHARACTERS) {
        return Response.json({ error: "模型工具调用不在当前会话授权范围；本次未执行工具。", requestId, providerPolicy }, { status: 502 });
      }
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(call.function.arguments);
        if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("tool_arguments_invalid");
      } catch {
        return Response.json({ error: "模型工具参数不是有效的 JSON 对象；本次未执行工具。", requestId, providerPolicy }, { status: 502 });
      }
      const toolMetadata = {
        mode: "remote_chat_completion", configuredAgentMode: "remote_chat_completion",
        providerInvoked: true, providerPolicy, model: configuration.model, provider: configuration.provider,
        requestId, latencyMs: Date.now() - startedAt, finishReason: choice?.finish_reason ?? null,
        usage: payload.usage ?? null, toolCallId: call.id, toolName: call.function.name,
      };
      if (call.function.name === PRODUCT_ACTION_TOOL.function.name) {
        if (Object.keys(args).some((key) => key !== "operation") || !args.operation
          || typeof args.operation !== "object" || Array.isArray(args.operation)) {
          return Response.json({ error: "模型产品操作参数无效；本次未准备操作。", ...toolMetadata }, { status: 502 });
        }
        let outcome;
        try {
          outcome = prepareSessionAction(body.productSessionId, productAuthority.sessionVersion,
            transcript.participantRequest, args.operation as Record<string, unknown>);
        } catch {
          return Response.json({ error: "产品会话在请求期间已失效，本次未准备操作。", ...toolMetadata }, { status: 409 });
        }
        if (outcome.status === "rejected") {
          return Response.json({ error: `产品操作未准备成功（${outcome.code}）。请依据当前状态重新说明请求。`,
            productSnapshot: outcome.snapshot, ...toolMetadata }, { status: 409 });
        }
        const preparedProductAction = outcome.status === "prepared" ? outcome.preparedAction : null;
        const message = preparedProductAction
          ? `${preparedProductAction.review.summary}\n\n以上操作尚未执行。请核对范围，明确确认后才会执行。`
          : outcome.clarification ?? "需要进一步明确本次操作、目标版本及范围；目前未准备或执行操作。";
        const grounded = adapter.markGroundedPhrases(message, packet.nodes.map((node) => node.nodeId));
        return Response.json({
          matched: true, message: grounded.message, nodeIds: grounded.nodeIds, groundedNodeIds: grounded.nodeIds,
          requestedNodeIds: resolution.nodeIds, frontierRef: packet.frontier.frontierRef, traversedRelationIds: [],
          packetNodeIds: packet.nodes.map((node) => node.nodeId),
          deliveryKind: preparedProductAction ? "product_action_prepared" : "generated_response",
          preparedProductAction, productActionStatus: outcome.status, productSnapshot: outcome.snapshot,
          invalidMarkerCount: 0, invalidAnchorCount: 0, autoGroundedNodeIds: grounded.nodeIds,
          evidenceEnvelopeHash: await payloadHash({ ...evidenceEnvelope, tool: { name: call.function.name, args }, review: preparedProductAction?.review ?? null }),
          ...toolMetadata,
        });
      }
      try {
        const evaluation = executeSessionEvaluationTool(body.productSessionId, productAuthority.sessionVersion,
          transcript.participantRequest, args);
        const delivery = evaluationDelivery(evaluation, stage);
        return Response.json({
          ...delivery.payload,
          evidenceEnvelopeHash: await payloadHash({ ...evidenceEnvelope, tool: { name: call.function.name, args }, deliveredNodes: delivery.nodes }),
          ...toolMetadata,
        });
      } catch (error) {
        const reason = error instanceof Error && error.message.startsWith("product_evaluation:") ? error.message : "product_evaluation:request_unavailable";
        return Response.json({ error: `评价材料请求未完成（${reason}）。请明确版本、窗口和范围后重试。`, ...toolMetadata }, { status: 409 });
      }
    }
    const content = typeof choice?.message?.content === "string" ? choice.message.content.trim() : "";
    if (!content || content.length > MAX_RESPONSE_CHARACTERS) return Response.json({ error: "模型没有返回完整可用内容。", requestId, providerPolicy }, { status: 502 });
    const validated = validateOutput(content, packetNodeMap);
    const missingGroundedNodeIds = [...packetNodeMap.keys()].filter((nodeId) => !validated.nodeIds.includes(nodeId));
    const autoGrounded = adapter.markGroundedPhrases(validated.message, missingGroundedNodeIds);
    const renderedNodeIds = [...validated.nodeIds, ...autoGrounded.nodeIds]
      .filter((nodeId, index, values) => values.indexOf(nodeId) === index);
    const renderedMessage = autoGrounded.message;
    if (!renderedMessage) {
      return Response.json({ error: "模型输出未通过当前信息包校验。", requestId }, { status: 502 });
    }
    const disclosed = new Set(renderedNodeIds);
    const connected = new Set([...contextNodeIds, ...renderedNodeIds]);
    const disclosedRelationIds = packet.relations.filter((relation) => (
      (disclosed.has(relation.sourceNodeId) && connected.has(relation.targetNodeId))
      || (disclosed.has(relation.targetNodeId) && connected.has(relation.sourceNodeId))
    )).map((relation) => relation.relationId);

    return Response.json({
      matched: resolution.matched || renderedNodeIds.length > 0,
      message: renderedMessage,
      nodeIds: renderedNodeIds,
      requestedNodeIds: resolution.nodeIds,
      groundedNodeIds: renderedNodeIds,
      frontierRef: packet.frontier.frontierRef,
      traversedRelationIds: disclosedRelationIds,
      packetNodeIds: packet.nodes.map((item) => item.nodeId),
      mode: "remote_chat_completion",
      configuredAgentMode: "remote_chat_completion",
      deliveryKind: "generated_response",
      providerInvoked: true,
      model: configuration.model,
      provider: configuration.provider,
      requestId,
      latencyMs: Date.now() - startedAt,
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      usage: payload.usage ?? null,
      invalidMarkerCount: validated.invalidMarkerCount,
      invalidAnchorCount: validated.invalidAnchorCount,
      autoGroundedNodeIds: autoGrounded.nodeIds,
      evidenceEnvelopeHash: await payloadHash(evidenceEnvelope),
      ...(productSnapshot ? { productSnapshot } : {}),
      providerPolicy,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({ error: timedOut ? "模型响应超时，请重试。" : "模型服务暂时不可用。", providerPolicy }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
