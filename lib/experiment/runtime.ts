import type {
  ExperimentScenario,
  InformationFrontier,
  InformationNode,
  InformationPacket,
  InformationRelation,
  InformationStage,
  ObjectAnchor,
  QueryResolution,
} from "./types";

const STAGE_ORDER: Readonly<Record<InformationStage, number>> = Object.freeze({ history: 0, e0: 1 });
const TURN_MARKER_PATTERN = /\[\[([A-Z0-9:@._+-]+)\|([^\]\r\n]+)\]\]/g;

function normalized(value: string): string {
  return value.toLocaleLowerCase("zh-CN").replace(/[\s，。！？、；：,.!?;:()（）【】+=@\u005b\u005d]/gu, "");
}

function unique<T>(values: readonly T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new Error(`${label}_must_be_unique`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shortDigest(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function markFirstUnmarked(value: string, term: string, nodeId: string): string | null {
  const existingMarkerPattern = /\[\[[A-Z0-9:@._+-]+\|[^\]\r\n]+\]\]/g;
  const termPattern = new RegExp(escapeRegExp(term), "iu");
  let cursor = 0;
  for (const marker of value.matchAll(existingMarkerPattern)) {
    const markerIndex = marker.index ?? 0;
    const plainSegment = value.slice(cursor, markerIndex);
    const match = termPattern.exec(plainSegment);
    if (match !== null && match.index !== undefined) {
      const absoluteIndex = cursor + match.index;
      const label = match[0];
      return `${value.slice(0, absoluteIndex)}[[${nodeId}|${label}]]${value.slice(absoluteIndex + label.length)}`;
    }
    cursor = markerIndex + marker[0].length;
  }
  const tail = value.slice(cursor);
  const match = termPattern.exec(tail);
  if (match === null || match.index === undefined) return null;
  const absoluteIndex = cursor + match.index;
  const label = match[0];
  return `${value.slice(0, absoluteIndex)}[[${nodeId}|${label}]]${value.slice(absoluteIndex + label.length)}`;
}

export interface GroundedMessage {
  message: string;
  nodeIds: readonly string[];
}

export interface ScenarioAdapter {
  readonly scenario: ExperimentScenario;
  node(nodeId: string): InformationNode;
  anchor(objectRef: string): ObjectAnchor;
  frontier(
    stage: InformationStage,
    revealedNodeIds?: readonly string[],
    contextNodeIds?: readonly string[],
  ): InformationFrontier;
  resolveQuery(
    query: string,
    stage: InformationStage,
    contextNodeIds?: readonly string[],
    revealedNodeIds?: readonly string[],
  ): QueryResolution;
  buildPacket(
    query: string,
    stage: InformationStage,
    contextNodeIds?: readonly string[],
    revealedNodeIds?: readonly string[],
  ): InformationPacket;
  markGroundedPhrases(message: string, nodeIds: readonly string[]): GroundedMessage;
}

export function createScenarioAdapter(scenario: ExperimentScenario): ScenarioAdapter {
  assertUnique(scenario.informationNodes.map((item) => item.nodeId), "scenario_node_ids");
  assertUnique(scenario.objectAnchors.map((item) => item.objectRef), "scenario_object_refs");
  assertUnique(scenario.objectAnchors.map((item) => item.nodeId), "scenario_object_node_ids");
  assertUnique(scenario.turns.map((item) => item.turnId), "scenario_turn_ids");
  assertUnique(scenario.informationRelations.map((item) => item.relationId), "scenario_relation_ids");

  if (scenario.baselineOrdinal >= scenario.triggerOrdinal) {
    throw new Error("scenario_trigger_must_follow_baseline");
  }

  const nodeById = new Map(scenario.informationNodes.map((item) => [item.nodeId, item]));
  const anchorByRef = new Map(scenario.objectAnchors.map((item) => [item.objectRef, item]));
  const firstRevealByNode = new Map<string, number>();

  for (const turn of scenario.turns) {
    const markers = [...turn.assistantLead.matchAll(TURN_MARKER_PATTERN)];
    if (turn.phase === "project_history" && markers.length === 0) {
      throw new Error(`scenario_history_turn_missing_anchor:${turn.turnId}`);
    }
    for (const marker of markers) {
      const nodeId = marker[1] ?? "";
      const label = (marker[2] ?? "").trim();
      const markedNode = nodeById.get(nodeId);
      if (markedNode === undefined || !turn.informationNodeIds.includes(nodeId)) {
        throw new Error(`scenario_turn_marker_outside_projection:${turn.turnId}:${nodeId}`);
      }
      if (!markedNode.groundingPhrases.includes(label)) {
        throw new Error(`scenario_turn_marker_not_grounded:${turn.turnId}:${nodeId}`);
      }
    }
    for (const nodeId of turn.informationNodeIds) {
      if (!nodeById.has(nodeId)) throw new Error(`scenario_turn_unknown_node:${nodeId}`);
      if (!firstRevealByNode.has(nodeId)) firstRevealByNode.set(nodeId, turn.logicalRevealOrdinal);
    }
  }

  for (const item of scenario.informationNodes) {
    if (!item.body.includes(item.chatAnchorText)) {
      throw new Error(`scenario_chat_anchor_missing:${item.nodeId}`);
    }
    if (item.groundingPhrases.length === 0 || !item.groundingPhrases.includes(item.chatAnchorText)) {
      throw new Error(`scenario_grounding_phrases_invalid:${item.nodeId}`);
    }
    if (item.scopeTags.length === 0) throw new Error(`scenario_scope_missing:${item.nodeId}`);
    if (item.availableOperations.length === 0) throw new Error(`scenario_operations_missing:${item.nodeId}`);
    for (const related of item.relatedNodeIds) {
      if (!nodeById.has(related)) throw new Error(`scenario_unknown_related_node:${related}`);
    }
    for (const responseNodeId of item.queryResponseNodeIds) {
      if (!nodeById.has(responseNodeId)) throw new Error(`scenario_unknown_query_response_node:${responseNodeId}`);
    }
    if (!item.queryResponseNodeIds.includes(item.nodeId)) {
      throw new Error(`scenario_query_response_missing_primary:${item.nodeId}`);
    }
  }

  for (const stage of Object.keys(scenario.frontierRoots) as InformationStage[]) {
    for (const nodeId of scenario.frontierRoots[stage]) {
      const item = nodeById.get(nodeId);
      if (item === undefined) throw new Error(`scenario_frontier_unknown_node:${nodeId}`);
      if (STAGE_ORDER[item.availableFromStage] > STAGE_ORDER[stage]) {
        throw new Error(`scenario_frontier_node_not_eligible:${nodeId}`);
      }
    }
  }

  for (const relation of scenario.informationRelations) {
    if (!nodeById.has(relation.sourceNodeId)) {
      throw new Error(`scenario_relation_unknown_source:${relation.sourceNodeId}`);
    }
    if (!nodeById.has(relation.targetNodeId)) {
      throw new Error(`scenario_relation_unknown_target:${relation.targetNodeId}`);
    }
    if (relation.sourceNodeId === relation.targetNodeId) {
      throw new Error(`scenario_relation_self_loop:${relation.relationId}`);
    }
  }

  for (const item of scenario.objectAnchors) {
    const projectedNode = nodeById.get(item.nodeId);
    if (projectedNode === undefined || projectedNode.title !== item.label) {
      throw new Error(`scenario_object_projection_mismatch:${item.objectRef}`);
    }
    const firstReveal = firstRevealByNode.get(item.nodeId);
    if (firstReveal !== undefined && firstReveal !== item.logicalRevealOrdinal) {
      throw new Error(`scenario_object_reveal_mismatch:${item.objectRef}`);
    }
    if (firstReveal === undefined) {
      const eligibilityOrdinal = projectedNode.availableFromStage === "history"
        ? scenario.baselineOrdinal
        : scenario.triggerOrdinal;
      if (item.logicalRevealOrdinal !== eligibilityOrdinal) {
        throw new Error(`scenario_object_eligibility_mismatch:${item.objectRef}`);
      }
    }
  }

  const node = (nodeId: string): InformationNode => {
    const item = nodeById.get(nodeId);
    if (item === undefined) throw new Error(`scenario_unknown_node:${nodeId}`);
    return item;
  };

  const eligibleNodes = (stage: InformationStage): InformationNode[] => scenario.informationNodes
    .filter((item) => STAGE_ORDER[item.availableFromStage] <= STAGE_ORDER[stage]);

  const validNodeIds = (values: readonly string[], stage: InformationStage): string[] => {
    const eligible = new Set(eligibleNodes(stage).map((item) => item.nodeId));
    return unique(values.filter((nodeId) => eligible.has(nodeId)));
  };

  const rootsThrough = (stage: InformationStage): string[] => unique(
    (Object.keys(scenario.frontierRoots) as InformationStage[])
      .filter((candidate) => STAGE_ORDER[candidate] <= STAGE_ORDER[stage])
      .flatMap((candidate) => [...scenario.frontierRoots[candidate]]),
  );

  const stageRelations = (stage: InformationStage): InformationRelation[] => {
    const eligible = new Set(eligibleNodes(stage).map((item) => item.nodeId));
    return scenario.informationRelations.filter(
      (relation) => eligible.has(relation.sourceNodeId) && eligible.has(relation.targetNodeId),
    );
  };

  const buildFrontier = (
    stage: InformationStage,
    revealedNodeIds: readonly string[] = [],
    contextNodeIds: readonly string[] = [],
  ): InformationFrontier => {
    const eligible = eligibleNodes(stage).map((item) => item.nodeId);
    const roots = rootsThrough(stage);
    const revealed = validNodeIds(revealedNodeIds, stage);
    const context = validNodeIds(contextNodeIds, stage);
    const published = unique([...roots, ...revealed, ...context]);
    const focus = new Set(context.length > 0 ? context : published);
    const relations = stageRelations(stage).filter(
      (relation) => focus.has(relation.sourceNodeId) || focus.has(relation.targetNodeId),
    );
    const probeNodes = unique(relations.flatMap((relation) => [relation.sourceNodeId, relation.targetNodeId]))
      .filter((nodeId) => !published.includes(nodeId));
    const frontierRef = `FRONTIER:${scenario.informationSpaceVersion}:${stage}:${shortDigest([
      ...published.slice().sort(),
      "|",
      ...context.slice().sort(),
    ].join("\n"))}`;
    return Object.freeze({
      schemaVersion: "information-frontier-v4-pilot.1" as const,
      informationSpaceVersion: scenario.informationSpaceVersion,
      frontierRef,
      stage,
      publishedNodeIds: Object.freeze(published),
      eligibleNodeIds: Object.freeze(eligible),
      availableProbeNodeIds: Object.freeze(probeNodes),
      availableRelationIds: Object.freeze(relations.map((relation) => relation.relationId)),
      contextNodeIds: Object.freeze(context),
    });
  };

  const traversedRelations = (
    stage: InformationStage,
    contextNodeIds: readonly string[],
    responseNodeIds: readonly string[],
  ): string[] => {
    const context = new Set(contextNodeIds);
    const response = new Set(responseNodeIds);
    return stageRelations(stage)
      .filter((relation) => (
        (context.has(relation.sourceNodeId) && response.has(relation.targetNodeId))
        || (context.has(relation.targetNodeId) && response.has(relation.sourceNodeId))
        || (response.has(relation.sourceNodeId) && response.has(relation.targetNodeId))
      ))
      .map((relation) => relation.relationId);
  };

  const adapter: ScenarioAdapter = {
    scenario,
    node,
    anchor(objectRef: string): ObjectAnchor {
      const item = anchorByRef.get(objectRef);
      if (item === undefined) throw new Error(`scenario_unknown_object:${objectRef}`);
      return item;
    },
    frontier: buildFrontier,
    resolveQuery(
      query: string,
      stage: InformationStage,
      contextNodeIds: readonly string[] = [],
      revealedNodeIds: readonly string[] = [],
    ): QueryResolution {
      const frontier = buildFrontier(stage, revealedNodeIds, contextNodeIds);
      const needle = normalized(query);
      if (needle.length < 2) {
        return Object.freeze({
          matched: false,
          nodeIds: [],
          message: "我没抓到你在接哪一点。你可以再多说一句。",
          frontierRef: frontier.frontierRef,
          traversedRelationIds: [],
        });
      }

      const context = new Set(frontier.contextNodeIds);
      // Context may disambiguate an actual reference; it is not a lexical hit.
      const scored = eligibleNodes(stage).map((item) => {
        const aliases = unique([item.title, item.nodeId, item.sourceLabel, ...item.queryAliases]
          .map(normalized)
          .filter((alias) => alias.length >= 2));
        let score = 0;
        const spans: { start: number; end: number }[] = [];
        for (const alias of aliases) {
          let start = needle.indexOf(alias);
          if (start >= 0) {
            score = Math.max(score, 24 + alias.length);
            while (start >= 0) {
              spans.push({ start, end: start + alias.length });
              start = needle.indexOf(alias, start + alias.length);
            }
          } else if (alias.includes(needle) && needle.length >= 4) {
            score = Math.max(score, 10 + needle.length);
          }
        }
        return { item, score, spans };
      }).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score);

      const clarify = (items: readonly InformationNode[]): QueryResolution => Object.freeze({
        matched: false,
        nodeIds: [],
        message: `这句话还不能唯一确定你指的内容：${items.map((item) => item.title).join("；")}。请补充你指的是哪一部分，也可以明确要求同时查看。`,
        frontierRef: frontier.frontierRef,
        traversedRelationIds: [],
      });

      if (scored.length === 0) {
        const contextualMatches = frontier.contextNodeIds
          .map((nodeId) => nodeById.get(nodeId))
          .filter((item): item is InformationNode => item !== undefined);
        const refersBack = /^(?:那|那么|所以)?(?:这个|那个|这点|那点|刚才那点|刚才那个|刚才这段)(?:呢|是什么|是什么意思|说明什么|意味着什么|再解释一下|再详细说说|详细说说)?$/u.test(needle)
          || /^(?:请)?(?:再解释一下|再详细说说|继续解释刚才那点)$/u.test(needle);
        if (contextualMatches.length > 1 && refersBack) return clarify(contextualMatches);
        if (contextualMatches.length === 1 && refersBack) {
          const responseNodeIds = unique(contextualMatches.flatMap((item) => [...item.queryResponseNodeIds]))
            .filter((nodeId) => frontier.eligibleNodeIds.includes(nodeId));
          return Object.freeze({
            matched: true,
            nodeIds: Object.freeze(responseNodeIds),
            message: `我接着刚才那组信息说。\n\n${contextualMatches.map((item) => item.queryResponseLead).join("\n\n")}`,
            frontierRef: frontier.frontierRef,
            traversedRelationIds: Object.freeze(traversedRelations(stage, frontier.contextNodeIds, responseNodeIds)),
          });
        }
        return Object.freeze({
          matched: false,
          nodeIds: [],
          message: stage === "history"
            ? "我还没完全抓到你指的是哪一段。你是在问现在怎么保存和找回，还是哪些行为以后不能改？"
            : "我还没完全抓到你指的是哪一段。你可以直接问观察、某个具体案例、条目当时的状态，或这些数字从哪里来。",
          frontierRef: frontier.frontierRef,
          traversedRelationIds: [],
        });
      }

      // A longer reference owns its span: "Search offline sync" must not also
      // retrieve every node with the shorter aliases "Search" or "offline sync".
      // Independent spans remain independent, with no three-target limit.
      const allSpans = scored.flatMap((entry) => entry.spans);
      const explicitMatches = scored.map((entry) => ({
        ...entry,
        spans: entry.spans.filter((span) => !allSpans.some((other) => (
          other.start <= span.start && other.end >= span.end
          && (other.start < span.start || other.end > span.end)
        ))),
      })).filter((entry) => entry.spans.length > 0);
      const matches: InformationNode[] = [];
      if (explicitMatches.length > 0) {
        const spanKeys = unique(explicitMatches.flatMap((entry) => entry.spans.map((span) => `${span.start}:${span.end}`)));
        for (const key of spanKeys) {
          const candidates = explicitMatches.filter((entry) => entry.spans.some((span) => `${span.start}:${span.end}` === key));
          const inContext = candidates.filter((entry) => context.has(entry.item.nodeId));
          const selected = candidates.length === 1 ? candidates : inContext;
          if (selected.length !== 1) return clarify(candidates.map((entry) => entry.item));
          if (!matches.includes(selected[0].item)) matches.push(selected[0].item);
        }
      } else {
        const best = scored[0]?.score ?? 0;
        const candidates = scored.filter((entry) => entry.score === best);
        const inContext = candidates.filter((entry) => context.has(entry.item.nodeId));
        const selected = candidates.length === 1 ? candidates : inContext;
        if (selected.length !== 1) return clarify(candidates.map((entry) => entry.item));
        matches.push(selected[0].item);
      }
      const responseNodeIds = unique(matches.flatMap((item) => [...item.queryResponseNodeIds]))
        .filter((nodeId) => frontier.eligibleNodeIds.includes(nodeId));
      return Object.freeze({
        matched: true,
        nodeIds: Object.freeze(responseNodeIds),
        message: matches.length === 1
          ? matches[0].queryResponseLead
          : `你这句话确实同时牵涉几层，我不把它们拆成几轮小问答。\n\n${matches.map((item) => item.queryResponseLead).join("\n\n")}`,
        frontierRef: frontier.frontierRef,
        traversedRelationIds: Object.freeze(traversedRelations(stage, frontier.contextNodeIds, responseNodeIds)),
      });
    },
    buildPacket(
      query: string,
      stage: InformationStage,
      contextNodeIds: readonly string[] = [],
      revealedNodeIds: readonly string[] = [],
    ): InformationPacket {
      const frontier = buildFrontier(stage, revealedNodeIds, contextNodeIds);
      const resolution = this.resolveQuery(query, stage, contextNodeIds, revealedNodeIds);
      // The response bundle is authored with the query. Previously disclosed
      // Chat context can support synthesis, but an adjacent node is not a request.
      const packetNodeIds = unique([
        ...resolution.nodeIds,
        ...frontier.contextNodeIds,
      ]).filter((nodeId) => frontier.eligibleNodeIds.includes(nodeId));
      const packetSet = new Set(packetNodeIds);
      const relations = stageRelations(stage).filter(
        (relation) => packetSet.has(relation.sourceNodeId) && packetSet.has(relation.targetNodeId),
      );
      return Object.freeze({
        frontier,
        resolution,
        nodes: Object.freeze(packetNodeIds.map(node)),
        relations: Object.freeze(relations),
      });
    },
    markGroundedPhrases(message: string, nodeIds: readonly string[]): GroundedMessage {
      let annotated = message;
      const markedNodeIds: string[] = [];
      for (const nodeId of unique(nodeIds)) {
        const item = nodeById.get(nodeId);
        if (item === undefined) continue;
        const terms = unique(item.groundingPhrases)
          .filter((term) => term.length >= 2 && !term.includes("[[") && !term.includes("]]"))
          .sort((left, right) => right.length - left.length);
        for (const term of terms) {
          const marked = markFirstUnmarked(annotated, term, nodeId);
          if (marked === null) continue;
          annotated = marked;
          markedNodeIds.push(nodeId);
          break;
        }
      }
      return Object.freeze({ message: annotated, nodeIds: Object.freeze(markedNodeIds) });
    },
  };

  return Object.freeze(adapter);
}
