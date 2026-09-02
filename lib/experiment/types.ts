export type ExperimentCondition = "A" | "B";

export type ExperimentPhase = "baseline" | "trigger" | "complete";

export type InformationRole = "resource" | "evidence" | "constraint" | "verification";

export interface InformationNode {
  schemaVersion: 1;
  nodeId: string;
  title: string;
  body: string;
  chatAnchorText: string;
  sourceLabel: string;
  relatedNodeIds: readonly string[];
  queryAliases: readonly string[];
  queryResponseLead: string;
  queryResponseNodeIds: readonly string[];
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
  turns: readonly ScenarioTurn[];
  objectAnchors: readonly ObjectAnchor[];
}

export interface QueryResolution {
  matched: boolean;
  nodeIds: readonly string[];
  message: string;
}
