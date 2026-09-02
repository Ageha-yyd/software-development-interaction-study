import { createScenarioAdapter } from "../../../lib/experiment/runtime";
import { SOFTWARE_PRODUCT_DEVELOPMENT_V1 } from "../../../scenarios/software-product-development-v1";

type ClientMessage = { role: "user" | "assistant"; content: string };
type SoftwareAgentBody = {
  scenarioId?: unknown;
  messages?: unknown;
  visibleOrdinal?: unknown;
  contextNodeIds?: unknown;
};

type AgentEnvironmentName =
  | "SOFTWARE_AGENT_API_KEY"
  | "SOFTWARE_AGENT_BASE_URL"
  | "SOFTWARE_AGENT_MODEL"
  | "DEEPSEEK_API_KEY"
  | "DEEPSEEK_BASE_URL"
  | "DEEPSEEK_MODEL";

const scenario = SOFTWARE_PRODUCT_DEVELOPMENT_V1;
const adapter = createScenarioAdapter(scenario);
const allowedBodyKeys = new Set(["scenarioId", "messages", "visibleOrdinal", "contextNodeIds"]);
const markerPattern = /\[\[([A-Z0-9:_-]+)\|([^\]\r\n]{1,160})\]\]/g;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;

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

function cleanMessages(value: unknown): ClientMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 16) return null;
  const cleaned: ClientMessage[] = [];
  let totalLength = 0;
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().replace(markerPattern, "$2");
    if (!text || text.length > 2_000) return null;
    totalLength += text.length;
    if (totalLength > 16_000) return null;
    cleaned.push({ role, content: text });
  }
  if (cleaned.at(-1)?.role !== "user") return null;
  return cleaned;
}

function cleanContextNodeIds(value: unknown, visibleNodeIds: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && visibleNodeIds.has(item))
    .filter((item, index, values) => values.indexOf(item) === index)
    .slice(0, 8);
}

function buildSystemPrompt(
  visibleOrdinal: number,
  contextNodeIds: readonly string[],
  likelyNodeIds: readonly string[],
): string {
  const nodes = adapter.visibleNodes(visibleOrdinal);
  return [
    "你是一个软件产品开发研究中的中立对话 Agent。使用自然、直接的中文与参与者讨论一个做到一半的个人阅读清单产品。",
    "你不知道参与者使用哪一种界面，也不得提及实验条件、对象模式、评分规则或内部实现。",
    "下面的信息包是唯一事实来源。不得补充真实用户研究、产品现状、指标、因果解释或候选改版结果；材料不能支持的判断要明确保留不确定性。",
    "你只负责解释、连接、澄清和帮助参与者表达下一步意图；不得推进阶段、替参与者提交、指定唯一正确方案或宣称候选已经通过。",
    "回答应像正常对话，不要复述字段名，不要写成信息卡清单，通常控制在 80–260 个汉字。",
    "只要使用某个信息节点的事实，就把该事实中的一个自然短语写成 [[节点ID|用户可读短语]]。不得在标记之外显示节点 ID，也不得创造信息包之外的 ID。",
    "标记只是渲染锚点，参与者最终只会看到竖线右侧的自然短语。",
    `当前可见序号：${visibleOrdinal}。`,
    `最近语义上下文：${contextNodeIds.length > 0 ? contextNodeIds.join(", ") : "无"}。`,
    `确定性检索建议关注：${likelyNodeIds.length > 0 ? likelyNodeIds.join(", ") : "未唯一定位"}。`,
    "当前可用信息包：",
    ...nodes.map((item) => [
      `[${item.nodeId}] ${item.title}`,
      item.body,
      `建议锚点短语：${item.chatAnchorText}`,
      `来源：${item.sourceLabel}`,
    ].join("\n")),
  ].join("\n\n");
}

function validateOutput(content: string, visibleNodeIds: ReadonlySet<string>) {
  const rawMarkers = [...content.matchAll(markerPattern)];
  let invalidMarkerCount = 0;
  const nodeIds: string[] = [];
  const message = content.replace(markerPattern, (_whole, nodeId: string, label: string) => {
    if (!visibleNodeIds.has(nodeId)) {
      invalidMarkerCount += 1;
      return label;
    }
    if (!nodeIds.includes(nodeId)) nodeIds.push(nodeId);
    return `[[${nodeId}|${label.trim()}]]`;
  }).trim();
  return { message, nodeIds, invalidMarkerCount, rawMarkerCount: rawMarkers.length };
}

async function payloadHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  const configuration = await agentConfiguration();
  return Response.json({
    configured: Boolean(configuration.apiKey),
    mode: configuration.apiKey ? "remote_chat_completion" : "deterministic_local_lookup",
    model: configuration.model,
    provider: configuration.provider,
  });
}

export async function POST(request: Request) {
  if (isRateLimited(request)) return Response.json({ error: "请求过于频繁，请稍后再试。" }, { status: 429 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_000) return Response.json({ error: "请求内容过长。" }, { status: 413 });

  const configuration = await agentConfiguration();
  if (!configuration.apiKey) return Response.json({ error: "软件 Agent 尚未配置服务端 API Key。" }, { status: 503 });
  try {
    const parsedBaseUrl = new URL(configuration.baseUrl);
    if (parsedBaseUrl.protocol !== "https:" && !(parsedBaseUrl.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname))) {
      return Response.json({ error: "软件 Agent 服务端配置无效。" }, { status: 500 });
    }
  } catch {
    return Response.json({ error: "软件 Agent 服务端配置无效。" }, { status: 500 });
  }

  let body: SoftwareAgentBody;
  try {
    body = await request.json() as SoftwareAgentBody;
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Object.keys(body).some((key) => !allowedBodyKeys.has(key))) {
    return Response.json({ error: "请求字段无效。" }, { status: 400 });
  }
  if (body.scenarioId !== scenario.scenarioId) return Response.json({ error: "场景不匹配。" }, { status: 400 });
  const messages = cleanMessages(body.messages);
  if (!messages) return Response.json({ error: "messages 必须包含 1–16 条有效消息，且最后一条必须来自用户。" }, { status: 400 });
  const visibleOrdinal = body.visibleOrdinal;
  if (visibleOrdinal !== scenario.baselineOrdinal && visibleOrdinal !== scenario.triggerOrdinal) {
    return Response.json({ error: "可见信息序号无效。" }, { status: 400 });
  }

  const visibleNodes = adapter.visibleNodes(visibleOrdinal);
  const visibleNodeIds = new Set(visibleNodes.map((item) => item.nodeId));
  const contextNodeIds = cleanContextNodeIds(body.contextNodeIds, visibleNodeIds);
  const query = messages.at(-1)?.content ?? "";
  const resolution = adapter.resolveQuery(query, visibleOrdinal, contextNodeIds);
  const evidenceEnvelope = {
    scenarioId: scenario.scenarioId,
    visibleOrdinal,
    nodes: visibleNodes.map(({ nodeId, title, body: nodeBody, sourceLabel }) => ({ nodeId, title, body: nodeBody, sourceLabel })),
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  const startedAt = Date.now();

  try {
    const upstream = await fetch(`${configuration.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.apiKey}` },
      body: JSON.stringify({
        model: configuration.model,
        messages: [
          { role: "system", content: buildSystemPrompt(visibleOrdinal, contextNodeIds, resolution.nodeIds) },
          ...messages,
        ],
        temperature: 0.2,
        stream: false,
      }),
      signal: controller.signal,
    });

    const requestId = upstream.headers.get("x-request-id") ?? crypto.randomUUID();
    if (!upstream.ok) {
      const retryable = upstream.status === 429 || upstream.status >= 500;
      return Response.json({ error: retryable ? "模型服务暂时繁忙，请稍后重试。" : "模型请求未完成。", requestId }, { status: retryable ? 503 : 502 });
    }
    const payload = await upstream.json() as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content || content.length > 4_000) return Response.json({ error: "模型没有返回可用内容。", requestId }, { status: 502 });
    const validated = validateOutput(content, visibleNodeIds);
    if (validated.invalidMarkerCount > 0 || (resolution.matched && validated.nodeIds.length === 0)) {
      return Response.json({ error: "模型输出未通过当前信息包校验。", requestId }, { status: 502 });
    }

    return Response.json({
      matched: resolution.matched || validated.nodeIds.length > 0,
      message: validated.message,
      nodeIds: validated.nodeIds,
      groundedNodeIds: resolution.nodeIds,
      mode: "remote_chat_completion",
      model: configuration.model,
      provider: configuration.provider,
      requestId,
      latencyMs: Date.now() - startedAt,
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      usage: payload.usage ?? null,
      invalidMarkerCount: validated.invalidMarkerCount,
      evidenceEnvelopeHash: await payloadHash(evidenceEnvelope),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({ error: timedOut ? "模型响应超时，请重试。" : "模型服务暂时不可用。" }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
