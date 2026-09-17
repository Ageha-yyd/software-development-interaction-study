import type { ExperimentScenario, InformationNode, ObjectAnchor } from "../lib/experiment/types";
import type { PublicProductFact } from "./with-product-facts";

/** Only published and actually delivered material enters this projection. */
export interface PublicEvaluationFact extends PublicProductFact {
  publicationId: string;
  windowId: string;
  queryAliases: readonly string[];
  scopeTags: readonly string[];
  relatedFactIds: readonly string[];
  canonicalMaterial: true;
}

export function withEvaluationFacts(base: ExperimentScenario, facts: readonly PublicProductFact[]): ExperimentScenario {
  const delivered = facts.filter((fact): fact is PublicEvaluationFact => fact.kind.startsWith("evaluation_"));
  if (!delivered.length) return base;
  const visible = new Set([...base.informationNodes.map((node) => node.nodeId), ...delivered.map((fact) => fact.id)]);
  const nodes: InformationNode[] = delivered.map((fact) => ({
    schemaVersion: 1, nodeId: fact.id, title: fact.title, body: fact.body,
    chatAnchorText: fact.title, groundingPhrases: [fact.title],
    sourceLabel: `${fact.source} · ${fact.windowId} · ${fact.evidenceClass}`,
    relatedNodeIds: (fact.relatedFactIds ?? []).filter((id) => visible.has(id)),
    queryAliases: [fact.id, fact.title, ...(fact.queryAliases ?? [])],
    queryResponseLead: fact.body, queryResponseNodeIds: [fact.id],
    epistemicDepth: "L3", kind: fact.kind === "evaluation_page" ? "raw_event_set" : "observation",
    temporalStage: "e0_observation", epistemicStatus: "observed", availableFromStage: "e0",
    scopeTags: ["published-evaluation-material", "canonical-material", ...(fact.scopeTags ?? [])],
    availableOperations: ["inspect", "trace_source", "compare_history", "revisit"],
  }));
  const anchors: ObjectAnchor[] = nodes.map((node) => ({
    schemaVersion: 1, objectRef: `OBJECT:${node.nodeId}`, nodeId: node.nodeId,
    label: node.title, role: "evidence", logicalRevealOrdinal: base.triggerOrdinal,
  }));
  return { ...base, informationNodes: [...base.informationNodes, ...nodes], objectAnchors: [...base.objectAnchors, ...anchors] };
}
