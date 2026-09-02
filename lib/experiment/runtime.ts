import type {
  ExperimentScenario,
  InformationNode,
  ObjectAnchor,
  QueryResolution,
  ScenarioTurn,
} from "./types";

function normalized(value: string): string {
  return value.toLocaleLowerCase("zh-CN").replace(/[\s，。！？、；：,.!?;:()（）【】]/gu, "");
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${label}_must_be_unique`);
}

export interface ScenarioAdapter {
  readonly scenario: ExperimentScenario;
  node(nodeId: string): InformationNode;
  anchor(objectRef: string): ObjectAnchor;
  turnsThrough(ordinal: number): readonly ScenarioTurn[];
  visibleNodes(ordinal: number): readonly InformationNode[];
  visibleAnchors(ordinal: number): readonly ObjectAnchor[];
  resolveQuery(query: string, ordinal: number, contextNodeIds?: readonly string[]): QueryResolution;
}

export function createScenarioAdapter(scenario: ExperimentScenario): ScenarioAdapter {
  assertUnique(scenario.informationNodes.map((item) => item.nodeId), "scenario_node_ids");
  assertUnique(scenario.objectAnchors.map((item) => item.objectRef), "scenario_object_refs");
  assertUnique(scenario.turns.map((item) => item.turnId), "scenario_turn_ids");

  if (scenario.baselineOrdinal >= scenario.triggerOrdinal) {
    throw new Error("scenario_trigger_must_follow_baseline");
  }

  const nodeById = new Map(scenario.informationNodes.map((item) => [item.nodeId, item]));
  const anchorByRef = new Map(scenario.objectAnchors.map((item) => [item.objectRef, item]));
  const firstRevealByNode = new Map<string, number>();

  for (const turn of scenario.turns) {
    for (const nodeId of turn.informationNodeIds) {
      if (!nodeById.has(nodeId)) throw new Error(`scenario_turn_unknown_node:${nodeId}`);
      if (!firstRevealByNode.has(nodeId)) firstRevealByNode.set(nodeId, turn.logicalRevealOrdinal);
    }
  }

  for (const item of scenario.informationNodes) {
    if (!item.body.includes(item.chatAnchorText)) {
      throw new Error(`scenario_chat_anchor_missing:${item.nodeId}`);
    }
    for (const related of item.relatedNodeIds) {
      if (!nodeById.has(related)) throw new Error(`scenario_unknown_related_node:${related}`);
    }
    for (const responseNodeId of item.queryResponseNodeIds) {
      if (!nodeById.has(responseNodeId)) throw new Error(`scenario_unknown_query_response_node:${responseNodeId}`);
    }
    if (!item.queryResponseNodeIds.includes(item.nodeId)) {
      throw new Error(`scenario_query_response_missing_primary:${item.nodeId}`);
    }
    if (!firstRevealByNode.has(item.nodeId)) throw new Error(`scenario_node_never_revealed:${item.nodeId}`);
  }

  for (const item of scenario.objectAnchors) {
    const node = nodeById.get(item.nodeId);
    if (node === undefined || node.title !== item.label) {
      throw new Error(`scenario_object_projection_mismatch:${item.objectRef}`);
    }
    if (firstRevealByNode.get(item.nodeId) !== item.logicalRevealOrdinal) {
      throw new Error(`scenario_object_reveal_mismatch:${item.objectRef}`);
    }
  }

  const node = (nodeId: string): InformationNode => {
    const item = nodeById.get(nodeId);
    if (item === undefined) throw new Error(`scenario_unknown_node:${nodeId}`);
    return item;
  };

  const visibleNodeIds = (ordinal: number): Set<string> => new Set(
    scenario.turns
      .filter((turn) => turn.logicalRevealOrdinal <= ordinal)
      .flatMap((turn) => [...turn.informationNodeIds]),
  );

  return Object.freeze({
    scenario,
    node,
    anchor(objectRef: string): ObjectAnchor {
      const item = anchorByRef.get(objectRef);
      if (item === undefined) throw new Error(`scenario_unknown_object:${objectRef}`);
      return item;
    },
    turnsThrough(ordinal: number): readonly ScenarioTurn[] {
      return scenario.turns.filter((turn) => turn.logicalRevealOrdinal <= ordinal);
    },
    visibleNodes(ordinal: number): readonly InformationNode[] {
      const visible = visibleNodeIds(ordinal);
      return scenario.informationNodes.filter((item) => visible.has(item.nodeId));
    },
    visibleAnchors(ordinal: number): readonly ObjectAnchor[] {
      const visible = visibleNodeIds(ordinal);
      return scenario.objectAnchors.filter(
        (item) => item.logicalRevealOrdinal <= ordinal && visible.has(item.nodeId),
      );
    },
    resolveQuery(query: string, ordinal: number, contextNodeIds: readonly string[] = []): QueryResolution {
      const needle = normalized(query);
      if (needle.length < 2) {
        return Object.freeze({ matched: false, nodeIds: [], message: "我没抓到你在接哪一点。你可以再多说一句。" });
      }

      const scored = this.visibleNodes(ordinal).map((item) => {
        const aliases = [item.title, item.nodeId, item.sourceLabel, ...item.queryAliases]
          .map(normalized)
          .filter((alias) => alias.length >= 2);
        let score = 0;
        let explicit = false;
        for (const alias of aliases) {
          if (needle.includes(alias)) {
            explicit = true;
            score = Math.max(score, 20 + alias.length);
          }
          else if (alias.includes(needle) && needle.length >= 4) score = Math.max(score, 8 + needle.length);
        }
        return { item, score, explicit };
      }).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score);

      if (scored.length === 0) {
        const visible = visibleNodeIds(ordinal);
        const contextualMatches = contextNodeIds
          .filter((nodeId, index) => contextNodeIds.indexOf(nodeId) === index && visible.has(nodeId))
          .map((nodeId) => nodeById.get(nodeId))
          .filter((item): item is InformationNode => item !== undefined)
          .slice(0, 2);
        if (contextualMatches.length > 0 && /^(那|这个|那个|刚才|嗯|对|所以|先|再|看)/u.test(query.trim())) {
          const responseNodeIds = contextualMatches
            .flatMap((item) => [...item.queryResponseNodeIds])
            .filter((nodeId, index, values) => visible.has(nodeId) && values.indexOf(nodeId) === index);
          return Object.freeze({
            matched: true,
            nodeIds: Object.freeze(responseNodeIds),
            message: `我接着刚才那组信息说。\n\n${contextualMatches.map((item) => item.queryResponseLead).join("\n\n")}`,
          });
        }
        return Object.freeze({
          matched: false,
          nodeIds: [],
          message: ordinal < scenario.triggerOrdinal
            ? "我还没完全抓到你指的是哪一段。你是在问现在怎么保存和找回，还是哪些行为以后不能改？"
            : "我还没完全抓到你指的是哪一段。你是在问现在的产品规则，还是刚才那组试用结果？",
        });
      }

      const best = scored[0]?.score ?? 0;
      const explicitMatches = scored.filter((entry) => entry.explicit).slice(0, 3);
      const matches = (explicitMatches.length >= 2
        ? explicitMatches
        : scored.filter((entry) => entry.score === best).slice(0, 3)
      ).map((entry) => entry.item);
      const visible = visibleNodeIds(ordinal);
      const responseNodeIds = matches
        .flatMap((item) => [...item.queryResponseNodeIds])
        .filter((nodeId, index, values) => visible.has(nodeId) && values.indexOf(nodeId) === index);
      return Object.freeze({
        matched: true,
        nodeIds: Object.freeze(responseNodeIds),
        message: matches.length === 1
          ? matches[0].queryResponseLead
          : `你这句话确实同时牵涉几层，我不把它们拆成几轮小问答。\n\n${matches.map((item) => item.queryResponseLead).join("\n\n")}`,
      });
    },
  });
}
