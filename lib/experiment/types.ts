export type ExperimentCondition = "A" | "B";

export type ExperimentPhase = "baseline" | "trigger" | "complete";

export type InformationRole = "resource" | "evidence" | "constraint" | "verification";

export type InformationStage = "history" | "e0";

export type InformationDepth = "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7" | "L8";

export type InformationKind =
  | "goal"
  | "constraint"
  | "decision"
  | "revision"
  | "observation"
  | "boundary"
  | "cohort"
  | "trace"
  | "entity_state"
  | "relation_state"
  | "raw_event_set"
  | "raw_event"
  | "verification_receipt";

export type InformationTemporalStage = "product_history" | "current_r0" | "e0_observation";

export type InformationStatus = "stable" | "current" | "observed" | "uncertain" | "verified";

export type InformationOperation =
  | "inspect"
  | "expand_scope"
  | "inspect_case"
  | "trace_source"
  | "compare_history"
  | "request_evidence"
  | "verify_provenance"
  | "revisit";

export type InformationRelationKind =
  | "supports"
  | "depends_on"
  | "constrained_by"
  | "illustrated_by"
  | "same_item_at_time"
  | "membership_at_time"
  | "derived_from"
  | "verified_by"
  | "verifies"
  | "reopens";

export interface InformationNode {
  schemaVersion: 1;
  nodeId: string;
  title: string;
  body: string;
  chatAnchorText: string;
  groundingPhrases: readonly string[];
  sourceLabel: string;
  relatedNodeIds: readonly string[];
  queryAliases: readonly string[];
  queryResponseLead: string;
  queryResponseNodeIds: readonly string[];
  epistemicDepth: InformationDepth;
  kind: InformationKind;
  temporalStage: InformationTemporalStage;
  epistemicStatus: InformationStatus;
  availableFromStage: InformationStage;
  scopeTags: readonly string[];
  availableOperations: readonly InformationOperation[];
}

export interface InformationRelation {
  schemaVersion: 1;
  relationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: InformationRelationKind;
}

export interface ScenarioTurn {
  schemaVersion: 1;
  turnId: string;
  phase: "project_history" | "baseline_summary" | "trigger";
  user: string;
  assistantLead: string;
  informationNodeIds: readonly string[];
  presentedNodeIds?: readonly string[];
  logicalRevealOrdinal: number;
}

export interface ObjectAnchor {
  schemaVersion: 1;
  objectRef: string;
  nodeId: string;
  label: string;
  role: InformationRole;
  logicalRevealOrdinal: number;
}

export interface ExperimentScenario {
  schemaVersion: 1;
  scenarioId: string;
  episodeId: string;
  informationSpaceVersion: "v4-pilot.1" | "v4.2-e0";
  subjectRevisionRef?: string;
  title: string;
  shortTitle: string;
  description: string;
  baselineOrdinal: number;
  triggerOrdinal: number;
  baselineActionLabel: string;
  intentPrompt: string;
  intentPlaceholder: string;
  completionMessage: string;
  informationNodes: readonly InformationNode[];
  informationRelations: readonly InformationRelation[];
  frontierRoots: Readonly<Record<InformationStage, readonly string[]>>;
  turns: readonly ScenarioTurn[];
  objectAnchors: readonly ObjectAnchor[];
}

export interface QueryResolution {
  matched: boolean;
  nodeIds: readonly string[];
  message: string;
  frontierRef: string;
  traversedRelationIds: readonly string[];
}

export interface InformationFrontier {
  schemaVersion: "information-frontier-v4-pilot.1";
  informationSpaceVersion: ExperimentScenario["informationSpaceVersion"];
  frontierRef: string;
  stage: InformationStage;
  publishedNodeIds: readonly string[];
  eligibleNodeIds: readonly string[];
  availableProbeNodeIds: readonly string[];
  availableRelationIds: readonly string[];
  contextNodeIds: readonly string[];
}

export interface InformationPacket {
  frontier: InformationFrontier;
  resolution: QueryResolution;
  nodes: readonly InformationNode[];
  relations: readonly InformationRelation[];
}
