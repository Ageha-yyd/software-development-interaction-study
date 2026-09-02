import type { QueryResolution } from "./types";
import type { ScenarioAdapter } from "./runtime";

export type AgentMode = "deterministic_local_lookup" | "remote_chat_completion";

export interface AgentTranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentRequest {
  scenarioId: string;
  query: string;
  visibleOrdinal: number;
  contextNodeIds?: readonly string[];
  messages?: readonly AgentTranscriptMessage[];
}

export interface AgentResponse extends QueryResolution {
  mode: AgentMode;
  groundedNodeIds?: readonly string[];
  model?: string;
  provider?: string;
  requestId?: string;
  latencyMs?: number;
  usage?: unknown;
  evidenceEnvelopeHash?: string;
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
      const resolution = adapter.resolveQuery(request.query, request.visibleOrdinal, request.contextNodeIds);
      return Object.freeze({ ...resolution, mode: "deterministic_local_lookup" });
    },
  });
}

export function stripAgentObjectMarkup(value: string): string {
  return value.replace(/\[\[([A-Z0-9:_-]+)\|([^\]\r\n]+)\]\]/g, "$2");
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
          visibleOrdinal: request.visibleOrdinal,
          contextNodeIds: request.contextNodeIds ?? [],
        }),
      });
      const payload = await response.json() as {
        error?: string;
        matched?: boolean;
        message?: string;
        nodeIds?: unknown;
        groundedNodeIds?: unknown;
        mode?: unknown;
        model?: string;
        provider?: string;
        requestId?: string;
        latencyMs?: number;
        usage?: unknown;
        evidenceEnvelopeHash?: string;
      };
      if (!response.ok || typeof payload.message !== "string" || payload.mode !== "remote_chat_completion") {
        throw new Error(payload.error ?? `software_agent_request_failed:${response.status}`);
      }
      const nodeIds = Array.isArray(payload.nodeIds) ? payload.nodeIds.filter((item): item is string => typeof item === "string") : [];
      const groundedNodeIds = Array.isArray(payload.groundedNodeIds)
        ? payload.groundedNodeIds.filter((item): item is string => typeof item === "string")
        : [];
      return Object.freeze({
        matched: Boolean(payload.matched),
        message: payload.message,
        nodeIds: Object.freeze(nodeIds),
        groundedNodeIds: Object.freeze(groundedNodeIds),
        mode: "remote_chat_completion" as const,
        model: payload.model,
        provider: payload.provider,
        requestId: payload.requestId,
        latencyMs: payload.latencyMs,
        usage: payload.usage,
        evidenceEnvelopeHash: payload.evidenceEnvelopeHash,
      });
    },
  });
}
