import type { ExperimentScenario, InformationNode, ObjectAnchor } from "../lib/experiment/types";
import { withEvaluationFacts } from "./with-evaluation-facts";

export interface PublicProductFact {
  id: string;
  title: string;
  body: string;
  kind: string;
  revisionId: string | null;
  asOfProductStateVersion: number;
  isCurrentSnapshot?: boolean;
  evidenceClass: string;
  source: string;
  queryAliases?: readonly string[];
  scopeTags?: readonly string[];
  relatedFactIds?: readonly string[];
  canonicalMaterial?: boolean;
}

export interface ProductSessionSnapshot {
  sessionId: string;
  sessionVersion: number;
  currentRevisionId: string;
  candidateRevisionId: string | null;
  publicFacts: readonly PublicProductFact[];
  storageClass: string;
  formalStudyReady: false;
}

export interface PreparedProductAction {
  preparedActionId: string;
  participantRequest: string;
  operation: { kind: string; reason?: string; reopenCondition?: string; pendingCandidateId?: string | null };
  review: { summary: string; currentRevisionBefore: string; currentRevisionAfter: string; currentProductWillChange: boolean };
  requiredConfirmation: Record<string, unknown>;
}

export function withProductFacts(base: ExperimentScenario, facts: readonly PublicProductFact[]): ExperimentScenario {
  if (facts.length === 0) return base;
  const nodes: InformationNode[] = facts.filter((fact) => !fact.kind.startsWith("evaluation_")).map((fact) => ({
    schemaVersion: 1,
    nodeId: fact.id,
    title: fact.isCurrentSnapshot === false ? `历史快照 · ${fact.title}` : fact.title,
    body: `${fact.title}\n${fact.isCurrentSnapshot === false ? `这是产品状态序号 ${fact.asOfProductStateVersion} 的历史快照，不授权当前状态。\n` : ""}${fact.body}`,
    chatAnchorText: fact.title,
    groundingPhrases: [fact.title],
    sourceLabel: `${fact.source} · ${fact.revisionId} · ${fact.evidenceClass}`,
    relatedNodeIds: [],
    queryAliases: [fact.id, ...(fact.queryAliases ?? []),
      ...(fact.revisionId && fact.isCurrentSnapshot !== false ? [fact.revisionId] : []),
      ...(fact.isCurrentSnapshot !== false ? [fact.title] : []),
      ...(fact.isCurrentSnapshot !== false && fact.kind.includes("current") ? ["当前工作区", "当前产品状态", "实际产品", "六条目"] : []),
      ...(fact.isCurrentSnapshot !== false && fact.kind.includes("candidate") ? ["当前候选", "候选状态", "候选变更"] : []),
      ...(fact.isCurrentSnapshot !== false && (fact.kind.includes("receipt") || fact.kind.includes("check")) ? ["当前检查回执", "工程检查", "候选验证结果"] : []),
    ],
    queryResponseLead: `${fact.title}\n${fact.isCurrentSnapshot === false ? `历史状态序号 ${fact.asOfProductStateVersion}，不授权当前状态。\n` : ""}${fact.body}`,
    queryResponseNodeIds: [fact.id],
    epistemicDepth: "L3",
    kind: "observation",
    temporalStage: "e0_observation",
    epistemicStatus: "observed",
    availableFromStage: "e0",
    scopeTags: ["six-item-product-kernel", fact.evidenceClass],
    availableOperations: ["inspect", "compare_history", "revisit"],
  }));
  const anchors: ObjectAnchor[] = nodes.map((node) => ({
    schemaVersion: 1, objectRef: `OBJECT:${node.nodeId}`, nodeId: node.nodeId,
    label: node.title, role: "evidence", logicalRevealOrdinal: base.triggerOrdinal,
  }));
  return withEvaluationFacts({
    ...base,
    informationNodes: [...base.informationNodes, ...nodes],
    objectAnchors: [...base.objectAnchors, ...anchors],
  }, facts);
}
