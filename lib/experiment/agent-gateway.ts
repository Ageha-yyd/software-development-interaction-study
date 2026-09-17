import type { InformationPacket, InformationStage, QueryResolution } from "./types";
import type { ScenarioAdapter } from "./runtime";
import type { PreparedProductAction, ProductSessionSnapshot } from "../../scenarios/with-product-facts";

export type AgentMode = "deterministic_local_lookup" | "remote_chat_completion";
export type AgentDeliveryKind = "canonical_material" | "generated_response" | "deterministic_lookup" | "product_action_prepared" | "product_evaluation_material";
export interface AgentProviderPolicy {
  productToolsEnabled: boolean;
  maxToolCalls: number;
  thinkingMode: "disabled" | "provider_default";
  toolResultContinuation: false;
}
export interface ProductEvaluationDelivery {
  status: "published" | "read";
  publicationId: string;
  pagination: unknown;
  downloadUrl: string | null;
}
export const MAX_CANONICAL_MATERIAL_CHARACTERS = 256_000;

/** A material read is a normal transport operation, never a provider-error fallback. */
export function canonicalMaterialDelivery(packet: InformationPacket, query: string): {
  message: string;
  nodeIds: readonly string[];
} | null {
  if (packet.frontier.informationSpaceVersion !== "v4.2-e0" || packet.frontier.stage !== "e0"
    || !packet.resolution.matched || packet.resolution.nodeIds.length === 0) return null;
  const text = query.trim().toLocaleLowerCase("zh-CN");
  // Reading a quoted source and asking what it means are different requests.
  // Be conservative: any substantive synthesis clause keeps the whole turn on
  // the configured Agent, including "give me all records and then compare...".
  const intentText = text.replace(/(?:不要|不需要|无需|不用)(?:做)?(?:总结|概括|解释|分析|比较|对比|建议|推荐|改写)/gu, "");
  if (/分析|解释|建议|推荐|比较|对比|评价|判断|结论|意味着|说明了|为什么|如何|怎么|总结|概括|优先|应该|能否|是否|因果|支持什么|看法|区别|评估|修改|改版|实现|设计|推断|合并|compare|contrast|summari[sz]e|explain|recommend|analy[sz]e|evaluate|infer|should|why|how/iu.test(intentText)) return null;
  const explicitRead = /全部|所有|完整|原文|原始|逐条|逐项|全量|全文|不省略|一字不漏|verbatim|\b(?:all|full|raw|complete|unabridged)\b/iu.test(intentText);
  const bareRecordRead = /^(?:请)?(?:给我|查看|显示|读取|展示|打开|列出|返回|提供|看一下)?\s*(?:r0-refind-\d{3}|r0-orgreturn-\d{3}|r0-\d{3}|raw:[a-z0-9:@._+-]+|trace:[a-z0-9:@._+-]+|item:[a-z0-9:@._+-]+)\s*[。.!！]?$/iu.test(intentText);
  if (!explicitRead && !bareRecordRead) return null;
  const nodesById = new Map(packet.nodes.map((node) => [node.nodeId, node]));
  const requestedNodes = packet.resolution.nodeIds.map((nodeId) => nodesById.get(nodeId));
  if (requestedNodes.some((node) => !node || node.availableFromStage !== "e0"
    || node.temporalStage !== "e0_observation"
    || (!node.scopeTags.includes("ledger-derived") && !node.scopeTags.includes("canonical-material")))) return null;
  if (!bareRecordRead) {
    const normalize = (value: string) => value.toLocaleLowerCase("zh-CN").replace(/[\s，。！？、；：,.!?;:()（）【】+=@\u005b\u005d“”‘’'"·/\\-]/gu, "");
    let remainder = normalize(intentText);
    const aliases = requestedNodes.flatMap((node) => node
      ? [node.nodeId, node.title, node.sourceLabel, ...node.queryAliases] : [])
      .map(normalize).filter((alias) => alias.length > 1).sort((left, right) => right.length - left.length);
    for (const alias of aliases) remainder = remainder.split(alias).join("");
    // Only a bounded read instruction may remain after its actual references.
    // An unfamiliar additional question must go to the Agent even when no word
    // in the synthesis guard above happens to recognize its phrasing.
    remainder = remainder.replace(/一次性|一字不漏|不省略|我想|我需要|请将|请把|给我|看一下|看一看|查看|显示|读取|展示|打开|列出|返回|提供|直接|原始|原文|全文|全部|所有|完整|逐条|逐项|全量|以下|这些|资料|材料|记录|数据|来源|事件|条目|任务|案例|以及|还有|同时|分别|请|和|与|及|的|把|将|please|show|display|return|provide|give|read|me|all|full|raw|complete|unabridged|verbatim|records|record|materials|material|data|and|for|the/gu, "");
    if (remainder) return null;
  }
  // Bodies are already the shared projection. Do not send them to a model to
  // rewrite, shorten, or decide which rows should count as the complete result.
  return {
    message: requestedNodes.map((node) => node!.body).join("\n\n"),
    nodeIds: Object.freeze([...packet.resolution.nodeIds]),
  };
}

export interface AgentTranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRequest {
  scenarioId: string;
  query: string;
  frontierStage: InformationStage;
  contextNodeIds?: readonly string[];
  revealedNodeIds?: readonly string[];
  messages?: readonly AgentTranscriptMessage[];
  productSessionId?: string;
}

export interface AgentResponse extends QueryResolution {
  mode: AgentMode;
  deliveryKind?: AgentDeliveryKind;
  configuredAgentMode?: AgentMode;
  providerInvoked?: boolean;
  /** Authored evidence bundle requested by retrieval, not observed disclosure. */
  requestedNodeIds?: readonly string[];
  /** Nodes with valid anchors actually present in the returned message. */
  groundedNodeIds?: readonly string[];
  model?: string;
  provider?: string;
  requestId?: string;
  latencyMs?: number;
  usage?: unknown;
  evidenceEnvelopeHash?: string;
  packetNodeIds?: readonly string[];
  preparedProductAction?: PreparedProductAction;
  productSnapshot?: ProductSessionSnapshot;
  productEvaluation?: ProductEvaluationDelivery;
  providerPolicy?: AgentProviderPolicy;
}

export interface AgentGateway {
  respond(request: AgentRequest): Promise<AgentResponse>;
}

export function createDeterministicAgentGateway(adapter: ScenarioAdapter): AgentGateway {
  return Object.freeze({
    async respond(request: AgentRequest): Promise<AgentResponse> {
      if (request.scenarioId !== adapter.scenario.scenarioId) {
        throw new Error("agent_gateway_scenario_mismatch");
      }
      const packet = adapter.buildPacket(
        request.query,
        request.frontierStage,
        request.contextNodeIds,
        request.contextNodeIds,
      );
      const canonical = canonicalMaterialDelivery(packet, request.query);
      const grounded = adapter.markGroundedPhrases(canonical?.message ?? packet.resolution.message, canonical?.nodeIds ?? packet.resolution.nodeIds);
      if (canonical && grounded.message.length > MAX_CANONICAL_MATERIAL_CHARACTERS) {
        throw new Error(`完整资料超过 ${MAX_CANONICAL_MATERIAL_CHARACTERS} 字符的单次交付上限，本次未交付，资料未被截断。请明确缩小资料范围。`);
      }
      const disclosed = new Set(grounded.nodeIds);
      const connected = new Set([...packet.frontier.contextNodeIds, ...grounded.nodeIds]);
      // These are graph links between mentioned materials, not measured human
      // semantic transitions. Unmentioned requested evidence contributes none.
      const disclosedRelationIds = packet.relations.filter((relation) => (
        (disclosed.has(relation.sourceNodeId) && connected.has(relation.targetNodeId))
        || (disclosed.has(relation.targetNodeId) && connected.has(relation.sourceNodeId))
      )).map((relation) => relation.relationId);
      return Object.freeze({
        ...packet.resolution,
        message: grounded.message,
        nodeIds: grounded.nodeIds,
        requestedNodeIds: packet.resolution.nodeIds,
        groundedNodeIds: grounded.nodeIds,
        traversedRelationIds: disclosedRelationIds,
        packetNodeIds: packet.nodes.map((item) => item.nodeId),
        mode: "deterministic_local_lookup",
        configuredAgentMode: "deterministic_local_lookup",
        deliveryKind: canonical ? "canonical_material" : "deterministic_lookup",
        provider: canonical ? "local-canonical-material" : "local-deterministic-lookup",
        providerInvoked: false,
      });
    },
  });
}

export function stripAgentObjectMarkup(value: string): string {
  return value.replace(/\[\[([A-Z0-9:@._+-]+)\|([^\]\r\n]+)\]\]/g, "$2");
}

export function createRemoteAgentGateway(endpoint = "/api/software-agent"): AgentGateway {
  return Object.freeze({
    async respond(request: AgentRequest): Promise<AgentResponse> {
      const messages = request.messages?.length
        ? request.messages
        : [{ role: "user" as const, content: request.query }];
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: request.scenarioId,
          messages,
          frontierStage: request.frontierStage,
          contextNodeIds: request.contextNodeIds ?? [],
          ...(request.productSessionId !== undefined ? { productSessionId: request.productSessionId } : {}),
        }),
      });
      const payload = await response.json() as {
        error?: string;
        matched?: boolean;
        message?: string;
        nodeIds?: unknown;
        requestedNodeIds?: unknown;
        groundedNodeIds?: unknown;
        mode?: unknown;
        deliveryKind?: unknown;
        configuredAgentMode?: unknown;
        providerInvoked?: unknown;
        model?: string;
        provider?: string;
        requestId?: string;
        latencyMs?: number;
        usage?: unknown;
        evidenceEnvelopeHash?: string;
        frontierRef?: string;
        traversedRelationIds?: unknown;
        packetNodeIds?: unknown;
        preparedProductAction?: PreparedProductAction | null;
        productSnapshot?: ProductSessionSnapshot;
        productEvaluation?: ProductEvaluationDelivery;
        providerPolicy?: AgentProviderPolicy;
      };
      const canonicalResponse = payload.deliveryKind === "canonical_material";
      const preparedResponse = payload.deliveryKind === "product_action_prepared";
      const evaluationResponse = payload.deliveryKind === "product_evaluation_material";
      const localMaterialResponse = (canonicalResponse || evaluationResponse)
        && payload.provider === "local-canonical-material" && payload.providerInvoked === false;
      if (
        !response.ok
        || typeof payload.message !== "string"
        || (canonicalResponse && (payload.provider !== "local-canonical-material" || payload.providerInvoked !== false))
        || (payload.mode !== "remote_chat_completion" && !(
          localMaterialResponse
          && (payload.mode === "deterministic_local_lookup")
        ))
        || typeof payload.frontierRef !== "string"
        || ((preparedResponse || evaluationResponse) && ((!localMaterialResponse && (payload.mode !== "remote_chat_completion" || payload.providerInvoked !== true))
          || !payload.productSnapshot || typeof payload.productSnapshot.sessionId !== "string"
          || payload.productSnapshot.sessionId !== request.productSessionId || !Array.isArray(payload.productSnapshot.publicFacts)))
        || (preparedResponse && (!payload.preparedProductAction || typeof payload.preparedProductAction.preparedActionId !== "string"
          || typeof payload.preparedProductAction.review?.summary !== "string"
          || !payload.preparedProductAction.requiredConfirmation || typeof payload.preparedProductAction.requiredConfirmation !== "object"))
        || (preparedResponse && (payload.mode !== "remote_chat_completion" || payload.providerInvoked !== true))
        || (evaluationResponse && (!payload.productEvaluation || typeof payload.productEvaluation.publicationId !== "string"))
      ) {
        throw new Error(payload.error ?? `software_agent_request_failed:${response.status}`);
      }
      const nodeIds = Array.isArray(payload.nodeIds) ? payload.nodeIds.filter((item): item is string => typeof item === "string") : [];
      const groundedNodeIds = Array.isArray(payload.groundedNodeIds)
        ? payload.groundedNodeIds.filter((item): item is string => typeof item === "string")
        : [];
      const requestedNodeIds = Array.isArray(payload.requestedNodeIds)
        ? payload.requestedNodeIds.filter((item): item is string => typeof item === "string")
        : [];
      const traversedRelationIds = Array.isArray(payload.traversedRelationIds)
        ? payload.traversedRelationIds.filter((item): item is string => typeof item === "string")
        : [];
      const packetNodeIds = Array.isArray(payload.packetNodeIds)
        ? payload.packetNodeIds.filter((item): item is string => typeof item === "string")
        : [];
      return Object.freeze({
        matched: Boolean(payload.matched),
        message: payload.message,
        nodeIds: Object.freeze(nodeIds),
        groundedNodeIds: Object.freeze(groundedNodeIds),
        requestedNodeIds: Object.freeze(requestedNodeIds),
        mode: "remote_chat_completion" as const,
        configuredAgentMode: payload.configuredAgentMode === "deterministic_local_lookup"
          ? "deterministic_local_lookup" : "remote_chat_completion",
        deliveryKind: canonicalResponse ? "canonical_material" : preparedResponse ? "product_action_prepared" : evaluationResponse ? "product_evaluation_material" : "generated_response",
        providerInvoked: payload.providerInvoked === false ? false : true,
        model: payload.model,
        provider: payload.provider,
        requestId: payload.requestId,
        latencyMs: payload.latencyMs,
        usage: payload.usage,
        evidenceEnvelopeHash: payload.evidenceEnvelopeHash,
        frontierRef: payload.frontierRef,
        traversedRelationIds: Object.freeze(traversedRelationIds),
        packetNodeIds: Object.freeze(packetNodeIds),
        preparedProductAction: payload.preparedProductAction ?? undefined,
        productSnapshot: payload.productSnapshot,
        productEvaluation: payload.productEvaluation,
        providerPolicy: payload.providerPolicy,
      });
    },
  });
}
