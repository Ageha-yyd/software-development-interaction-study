"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import {
  createDeterministicAgentGateway,
  createRemoteAgentGateway,
  stripAgentObjectMarkup,
} from "../../lib/experiment/agent-gateway";
import type { AgentMode } from "../../lib/experiment/agent-gateway";
import { createScenarioAdapter } from "../../lib/experiment/runtime";
import { BrowserTelemetrySession } from "../../lib/experiment/telemetry";
import { withProductFacts } from "../../scenarios/with-product-facts";
import type { ProductSessionSnapshot, PreparedProductAction } from "../../scenarios/with-product-facts";
import type { ExperimentEvent } from "../../lib/experiment/telemetry";
import type {
  ExperimentCondition,
  ExperimentPhase,
  ExperimentScenario,
  InformationNode,
  InformationOperation,
  InformationRelation,
  InformationRole,
  InformationStage,
  ScenarioTurn,
} from "../../lib/experiment/types";
import styles from "./experiment-shell.module.css";

interface ExperimentShellProps {
  scenario: ExperimentScenario;
  assignedCondition?: ExperimentCondition;
  startAtTrigger?: boolean;
  baselineRequiresExchange?: boolean;
  baselineContinueEnabled?: boolean;
  enableProductActions?: boolean;
  onBaselineContinue?: () => void;
  onTelemetry?: (entries: readonly ExperimentEvent[]) => void;
  onInteractionState?: (state: InteractionState) => void;
  footer?: ReactNode;
}

export interface InteractionState {
  scenarioId: string;
  ready: boolean;
  waiting: boolean;
  phase: ExperimentPhase;
  exposure: { sessionId: string; sequence: number; monotonicMs: number } | null;
  productSessionId?: string;
  productSessionVersion?: number;
  currentProductRevisionId?: string;
  candidateProductRevisionId?: string | null;
}

interface DynamicMessage {
  id: string;
  role: "user" | "assistant" | "system";
  origin: "participant" | "workflow" | "agent" | "system";
  text: string;
  phase: ExperimentPhase;
  nodeIds?: readonly string[];
  agentMode?: AgentMode;
}

interface AgentRuntime {
  mode: AgentMode;
  model: string;
  provider: string;
  configurationStatus: "ready" | "missing" | "unavailable";
}

interface ObjectPosition {
  x: number;
  y: number;
}

interface ObjectDragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
}

const CONDITION_STORAGE_KEY = "software-development-study-condition";
const LOCAL_AGENT_RUNTIME: AgentRuntime = {
  mode: "deterministic_local_lookup",
  model: "local frozen resolver",
  provider: "local",
  configurationStatus: "missing",
};

const ROLE_LABELS: Record<InformationRole, string> = {
  resource: "资源",
  evidence: "证据",
  constraint: "约束",
  verification: "验证",
};

const KIND_LABELS: Record<InformationNode["kind"], string> = {
  goal: "稳定目标",
  constraint: "约束",
  decision: "历史决定",
  revision: "版本",
  observation: "观察",
  boundary: "证据边界",
  cohort: "群组切片",
  trace: "具体轨迹",
  entity_state: "实体时点状态",
  relation_state: "关系时点状态",
  raw_event_set: "原始事件组",
  raw_event: "原始事件",
  verification_receipt: "验证回执",
};

const TEMPORAL_LABELS: Record<InformationNode["temporalStage"], string> = {
  product_history: "产品历史",
  current_r0: "当前 R0",
  e0_observation: "E0 观察",
};

const STATUS_LABELS: Record<InformationNode["epistemicStatus"], string> = {
  stable: "稳定",
  current: "当前有效",
  observed: "已观察",
  uncertain: "仍不确定",
  verified: "已核验",
};

const OPERATION_LABELS: Record<InformationOperation, string> = {
  inspect: "查看",
  expand_scope: "展开范围",
  inspect_case: "查看案例",
  trace_source: "追到来源",
  compare_history: "对照历史",
  request_evidence: "请求证据",
  verify_provenance: "核对来源链",
  revisit: "回访",
};

const RELATION_LABELS: Record<InformationRelation["kind"], string> = {
  supports: "支持",
  depends_on: "依赖",
  constrained_by: "受约束于",
  illustrated_by: "由案例说明",
  same_item_at_time: "同一条目时点",
  membership_at_time: "当时归属",
  derived_from: "来源于",
  verified_by: "由回执核验",
  verifies: "核验",
  reopens: "重新打开",
};

function assignedCondition(): ExperimentCondition {
  const params = new URLSearchParams(window.location.search);
  const preview = params.get("preview") === "1";
  const requested = params.get("condition");
  if (preview && (requested === "A" || requested === "B")) return requested;
  const saved = window.sessionStorage.getItem(CONDITION_STORAGE_KEY);
  if (saved === "A" || saved === "B") return saved;
  const assigned = Math.random() < 0.5 ? "A" : "B";
  window.sessionStorage.setItem(CONDITION_STORAGE_KEY, assigned);
  return assigned;
}

function messageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function eventMonotonicMs(): number {
  return performance.now();
}

function clampPosition(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export default function ExperimentShell({
  scenario, assignedCondition: controlledCondition, startAtTrigger = false, baselineRequiresExchange = true,
  onBaselineContinue, onTelemetry, onInteractionState, footer, enableProductActions = false, baselineContinueEnabled = true,
}: ExperimentShellProps) {
  const [productSnapshot, setProductSnapshot] = useState<ProductSessionSnapshot | null>(null);
  const [preparedAction, setPreparedAction] = useState<PreparedProductAction | null>(null);
  const [productInitializing, setProductInitializing] = useState(false);
  const [productAuthorityUncertain, setProductAuthorityUncertain] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [telemetryStorageWarning, setTelemetryStorageWarning] = useState(false);
  const baseAdapter = useMemo(() => createScenarioAdapter(scenario), [scenario]);
  const effectiveScenario = useMemo(() => withProductFacts(scenario, productSnapshot?.publicFacts ?? []), [scenario, productSnapshot]);
  const adapter = useMemo(() => createScenarioAdapter(effectiveScenario), [effectiveScenario]);
  const localGateway = useMemo(() => createDeterministicAgentGateway(adapter), [adapter]);
  const remoteGateway = useMemo(() => createRemoteAgentGateway(), []);
  const telemetryRef = useRef<BrowserTelemetrySession | null>(null);
  const sessionGenerationRef = useRef(0);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const objectModalRef = useRef<HTMLElement | null>(null);
  const objectReturnFocusRef = useRef<HTMLElement | null>(null);
  const objectDragRef = useRef<ObjectDragState | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const [triggerMessageId, setTriggerMessageId] = useState<string | null>(null);
  const [exposure, setExposure] = useState<InteractionState["exposure"]>(null);
  const telemetryCallbackRef = useRef(onTelemetry);
  useEffect(() => { telemetryCallbackRef.current = onTelemetry; }, [onTelemetry]);

  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(false);
  const [condition, setCondition] = useState<ExperimentCondition>("A");
  const [phase, setPhase] = useState<Exclude<ExperimentPhase, "complete">>("baseline");
  const [activeObjectRef, setActiveObjectRef] = useState<string | null>(null);
  const [objectPosition, setObjectPosition] = useState<ObjectPosition | null>(null);
  const [selectedObjectRefs, setSelectedObjectRefs] = useState<readonly string[]>([]);
  const [messages, setMessages] = useState<readonly DynamicMessage[]>([]);
  const [query, setQuery] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [agentRuntime, setAgentRuntime] = useState<AgentRuntime>(LOCAL_AGENT_RUNTIME);
  const [revealedNodeIds, setRevealedNodeIds] = useState<readonly string[]>(scenario.frontierRoots.history);

  const frontierStage: InformationStage = phase === "baseline" ? "history" : "e0";
  const historyTurns = scenario.turns.filter((turn) => turn.phase === "project_history");
  const baselineSummaryTurn = scenario.turns.find((turn) => turn.phase === "baseline_summary");
  const baselineExchangeComplete = !baselineRequiresExchange || messages.some((message) => (
    message.phase === "baseline" && message.role === "assistant" && message.origin === "agent"
  ));
  const activeAnchor = activeObjectRef === null ? null : adapter.anchor(activeObjectRef);
  const activeNode = activeAnchor === null ? null : adapter.node(activeAnchor.nodeId);
  const currentFrontier = adapter.frontier(frontierStage, revealedNodeIds);
  const activeRelations = activeNode === null ? [] : effectiveScenario.informationRelations
    .filter((relation) => relation.sourceNodeId === activeNode.nodeId || relation.targetNodeId === activeNode.nodeId)
    .map((relation) => {
      const neighborId = relation.sourceNodeId === activeNode.nodeId ? relation.targetNodeId : relation.sourceNodeId;
      const neighborAnchor = effectiveScenario.objectAnchors.find((anchor) => anchor.nodeId === neighborId);
      return neighborAnchor === undefined || !currentFrontier.eligibleNodeIds.includes(neighborId)
        ? null
        : { relation, node: adapter.node(neighborId), anchor: neighborAnchor };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const selectedObjects = selectedObjectRefs.map((objectRef) => {
    const anchor = adapter.anchor(objectRef);
    return { anchor, node: adapter.node(anchor.nodeId) };
  });

  function logEvent(
    event: string,
    payload: Record<string, unknown> = {},
    overrides?: { condition?: ExperimentCondition; phase?: ExperimentPhase },
  ): void {
    const session = telemetryRef.current;
    if (session === null) return;
    session.append(overrides?.condition ?? condition, overrides?.phase ?? phase, event, payload);
    setTelemetryStorageWarning(session.persistenceError !== null);
    setLogCount(session.entries().length);
    telemetryCallbackRef.current?.(session.entries());
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let configurationTimeout: number | undefined;
    const handle = window.setTimeout(() => {
      void (async () => {
        const params = new URLSearchParams(window.location.search);
        const isPreview = params.get("preview") === "1";
        const forceLocalAgent = isPreview && params.get("agent") === "local";
        const assigned = controlledCondition ?? assignedCondition();
        let runtime = forceLocalAgent
          ? { ...LOCAL_AGENT_RUNTIME, configurationStatus: "ready" as const }
          : LOCAL_AGENT_RUNTIME;
        if (!forceLocalAgent) {
          try {
            configurationTimeout = window.setTimeout(() => controller.abort(), 5_000);
            const response = await fetch("/api/software-agent", { signal: controller.signal });
            const payload = await response.json() as { configured?: boolean; model?: string; provider?: string };
            if (response.ok && payload.configured) {
              runtime = {
                mode: "remote_chat_completion",
                model: payload.model ?? "configured model",
                provider: payload.provider ?? "openai-compatible",
                configurationStatus: "ready",
              };
            } else if (!response.ok) {
              runtime = { ...LOCAL_AGENT_RUNTIME, configurationStatus: "unavailable" };
            }
          } catch {
            runtime = { ...LOCAL_AGENT_RUNTIME, configurationStatus: "unavailable" };
          } finally {
            if (configurationTimeout !== undefined) window.clearTimeout(configurationTimeout);
          }
        }
        if (cancelled) return;
        const telemetry = new BrowserTelemetrySession(scenario.scenarioId);
        telemetryRef.current = telemetry;
        setPreview(isPreview);
        setCondition(assigned);
        setAgentRuntime(runtime);
        setReady(true);
        telemetry.append(assigned, "baseline", "session_started", {
          preview: isPreview,
          informationSpaceVersion: scenario.informationSpaceVersion,
          frontierStage: "history",
          frontierRef: baseAdapter.frontier("history").frontierRef,
          assignmentSource: isPreview && params.get("condition") === assigned ? "researcher_preview" : "session_assignment",
          agentMode: runtime.mode,
          agentModel: runtime.model,
          agentProvider: runtime.provider,
          agentConfigurationStatus: runtime.configurationStatus,
          previewAgentOverride: forceLocalAgent ? "local" : null,
          formalDataCollection: false,
        });
        setLogCount(1);
        telemetryCallbackRef.current?.(telemetry.entries());
        if (startAtTrigger) {
          const trigger = scenario.turns.find((turn) => turn.phase === "trigger");
          if (trigger !== undefined) {
            const resultMessageId = messageId("result");
            setTriggerMessageId(resultMessageId);
            setPhase("trigger");
            setRevealedNodeIds([...scenario.frontierRoots.history, ...trigger.informationNodeIds]);
            setMessages([
              { id: messageId("task"), role: "user", origin: "workflow", text: trigger.user, phase: "trigger" },
              { id: resultMessageId, role: "assistant", origin: "agent", text: trigger.assistantLead, phase: "trigger", nodeIds: trigger.informationNodeIds },
            ]);
            telemetry.append(assigned, "trigger", "trigger_render_requested", { informationSpaceVersion: scenario.informationSpaceVersion });
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      sessionGenerationRef.current += 1;
      controller.abort();
      window.clearTimeout(handle);
      if (configurationTimeout !== undefined) window.clearTimeout(configurationTimeout);
    };
  }, [baseAdapter, scenario, controlledCondition, startAtTrigger]);

  useEffect(() => {
    if (!enableProductActions || !ready || phase !== "trigger") return;
    let cancelled = false;
    const generation = sessionGenerationRef.current;
    const timer = window.setTimeout(() => {
      setProductInitializing(true);
      void fetch("/api/software-product", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create" }),
      }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "product_session_create_failed");
        if (cancelled || generation !== sessionGenerationRef.current) return;
        setProductSnapshot(payload);
        setProductError(null);
        const session = telemetryRef.current;
        if (session) {
          session.append(condition, "trigger", "product_session_created", {
            productSessionId: payload.sessionId, productSessionVersion: payload.sessionVersion,
            currentRevisionId: payload.currentRevisionId, storageClass: payload.storageClass,
            publicFacts: payload.publicFacts, formalStudyReady: false,
          });
          telemetryCallbackRef.current?.(session.entries());
        }
      }).catch((error: unknown) => {
        if (!cancelled && generation === sessionGenerationRef.current) setProductError(error instanceof Error ? error.message : "product_session_create_failed");
      }).finally(() => { if (!cancelled && generation === sessionGenerationRef.current) setProductInitializing(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [enableProductActions, ready, phase, condition]);

  useEffect(() => {
    if (!ready || phase !== "trigger" || exposure !== null || !triggerElementRef.current) return;
    const target = triggerElementRef.current;
    let firstFrame = 0;
    let secondFrame = 0;
    let recorded = false;
    const isVisible = () => {
      const box = target.getBoundingClientRect();
      return document.visibilityState === "visible" && box.bottom > 0 && box.top < window.innerHeight;
    };
    const considerExposure = () => {
      if (recorded || firstFrame || !isVisible()) return;
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          firstFrame = 0;
          if (recorded || !isVisible()) return;
          const session = telemetryRef.current;
          if (!session) return;
          recorded = true;
          const event = session.append(condition, "trigger", "trigger_stable_visible", {
            informationSpaceVersion: scenario.informationSpaceVersion,
            visibilityState: document.visibilityState,
            exposureMethod: "trigger_intersects_viewport_across_two_frames",
            entireTextRead: false,
            humanAttentionObserved: false,
          });
          setExposure({ sessionId: event.sessionId, sequence: event.sequence, monotonicMs: event.monotonicMs });
          telemetryCallbackRef.current?.(session.entries());
        });
      });
    };
    const observer = new IntersectionObserver(considerExposure);
    observer.observe(target);
    document.addEventListener("visibilitychange", considerExposure);
    considerExposure();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", considerExposure);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [ready, phase, condition, scenario.informationSpaceVersion, exposure]);

  useEffect(() => {
    onInteractionState?.({ scenarioId: scenario.scenarioId, ready,
      waiting: waiting || productInitializing || preparedAction !== null || productAuthorityUncertain
        || (enableProductActions && phase === "trigger" && productSnapshot === null), phase, exposure,
      productSessionId: productSnapshot?.sessionId, productSessionVersion: productSnapshot?.sessionVersion,
      currentProductRevisionId: productSnapshot?.currentRevisionId,
      candidateProductRevisionId: productSnapshot?.candidateRevisionId,
    });
  }, [scenario.scenarioId, ready, waiting, phase, exposure, onInteractionState, productInitializing, productSnapshot, preparedAction, productAuthorityUncertain, enableProductActions]);

  useEffect(() => {
    if (messages.at(-1)?.id === triggerMessageId) {
      triggerElementRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    } else conversationEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, phase, triggerMessageId]);

  useEffect(() => {
    if (activeObjectRef === null) return;
    const modal = objectModalRef.current;
    if (!modal) return;
    const focusables = () => [...modal.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button:not([disabled]), a[href], textarea:not([disabled]), [tabindex="0"]')];
    focusables()[0]?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        const session = telemetryRef.current;
        session?.append(condition, phase, "object_detail_closed", { objectRef: activeObjectRef, input: "keyboard_escape" });
        if (session) telemetryCallbackRef.current?.(session.entries());
        setActiveObjectRef(null);
        setObjectPosition(null);
      } else if (event.key === "Tab") {
        const entries = focusables();
        const first = entries[0];
        const last = entries.at(-1);
        if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      objectReturnFocusRef.current?.focus({ preventScroll: true });
    };
  }, [activeObjectRef, condition, phase]);

  function resetSession(nextCondition: ExperimentCondition, event = "preview_session_reset"): void {
    sessionGenerationRef.current += 1;
    const telemetry = new BrowserTelemetrySession(scenario.scenarioId);
    telemetryRef.current = telemetry;
    setCondition(nextCondition);
    setPhase("baseline");
    setExposure(null);
    setTriggerMessageId(null);
    setActiveObjectRef(null);
    setObjectPosition(null);
    objectDragRef.current = null;
    setSelectedObjectRefs([]);
    setRevealedNodeIds(scenario.frontierRoots.history);
    setMessages([]);
    setProductSnapshot(null);
    setPreparedAction(null);
    setProductError(null);
    setProductInitializing(false);
    setProductAuthorityUncertain(false);
    setTelemetryStorageWarning(false);
    setQuery("");
    setWaiting(false);
    telemetry.append(nextCondition, "baseline", event, {
      preview: true,
      informationSpaceVersion: scenario.informationSpaceVersion,
      frontierStage: "history",
      frontierRef: adapter.frontier("history").frontierRef,
      agentMode: agentRuntime.mode,
      agentModel: agentRuntime.model,
      agentProvider: agentRuntime.provider,
      agentConfigurationStatus: agentRuntime.configurationStatus,
      formalDataCollection: false,
    });
    setLogCount(1);
  }

  function switchCondition(nextCondition: ExperimentCondition): void {
    if (!preview || controlledCondition !== undefined || nextCondition === condition) return;
    const url = new URL(window.location.href);
    url.searchParams.set("preview", "1");
    url.searchParams.set("condition", nextCondition);
    window.history.replaceState({}, "", url);
    resetSession(nextCondition, "preview_condition_switched");
  }

  function revealTrigger(): void {
    if (phase !== "baseline" || !baselineExchangeComplete || !baselineContinueEnabled) return;
    if (onBaselineContinue) { onBaselineContinue(); return; }
    const triggerTurn = scenario.turns.find((turn) => turn.phase === "trigger");
    if (triggerTurn === undefined) return;
    const interactionStartMonotonicMs = eventMonotonicMs();
    const triggerNodeIds = triggerTurn.informationNodeIds;
    const resultMessageId = messageId("trigger-agent");
    setTriggerMessageId(resultMessageId);
    const nextRevealedNodeIds = [...revealedNodeIds, ...triggerNodeIds]
      .filter((nodeId, index, values) => values.indexOf(nodeId) === index);
    const nextFrontier = adapter.frontier("e0", nextRevealedNodeIds, triggerNodeIds);
    logEvent("trigger_reveal_started", { interactionStartMonotonicMs });
    logEvent(baselineRequiresExchange ? "baseline_observation_authorized" : "pre_result_goal_acknowledged", {
      interactionStartMonotonicMs,
      liveBaselineMessageCount: messages.filter((message) => message.phase === "baseline").length,
    });
    setMessages((current) => [
      ...current,
      {
        id: messageId("trigger-action"),
        role: "user",
        origin: "workflow",
        text: triggerTurn.user,
        phase: "trigger",
      },
      {
        id: resultMessageId,
        role: "assistant",
        origin: "agent",
        text: triggerTurn.assistantLead,
        phase: "trigger",
        nodeIds: triggerNodeIds,
      },
    ]);
    setPhase("trigger");
    setRevealedNodeIds(nextRevealedNodeIds);
    setActiveObjectRef(null);
    setObjectPosition(null);
    logEvent("trigger_revealed", {
      revealOrdinal: scenario.triggerOrdinal,
      informationSpaceVersion: scenario.informationSpaceVersion,
      frontierStage: "e0",
      frontierRef: nextFrontier.frontierRef,
      newlyVisibleNodeIds: triggerNodeIds,
      availableProbeNodeIds: nextFrontier.availableProbeNodeIds,
    }, { phase: "trigger" });
    logEvent("agent_response_recorded", {
      matched: true,
      nodeIds: triggerNodeIds,
      frontierRef: nextFrontier.frontierRef,
      mode: "frozen_trigger_turn",
      responseText: triggerTurn.assistantLead,
    }, { phase: "trigger" });
  }

  function objectAnchorPosition(anchorElement: HTMLElement): ObjectPosition {
    const anchorRect = anchorElement.getBoundingClientRect();
    const viewportPadding = 10;
    const gap = 10;
    const cardWidth = Math.min(420, window.innerWidth - viewportPadding * 2);
    const estimatedCardHeight = Math.min(360, window.innerHeight - viewportPadding * 2);
    const rightPosition = anchorRect.right + gap;
    const leftPosition = anchorRect.left - cardWidth - gap;
    const x = rightPosition + cardWidth <= window.innerWidth - viewportPadding
      ? rightPosition
      : leftPosition >= viewportPadding
        ? leftPosition
        : clampPosition(anchorRect.left, viewportPadding, window.innerWidth - cardWidth - viewportPadding);
    const maximumY = Math.max(viewportPadding, window.innerHeight - estimatedCardHeight - viewportPadding);
    const minimumY = Math.min(54, maximumY);
    const y = clampPosition(anchorRect.top - 10, minimumY, maximumY);
    return { x, y };
  }

  function openObject(objectRef: string, surface: "inline", anchorElement: HTMLElement): void {
    if (condition !== "B") return;
    const interactionStartMonotonicMs = eventMonotonicMs();
    const item = adapter.anchor(objectRef);
    if (!revealedNodeIds.includes(item.nodeId)) return;
    const initialPosition = objectAnchorPosition(anchorElement);
    objectReturnFocusRef.current = anchorElement;
    logEvent("object_action_started", { objectRef, surface, interactionStartMonotonicMs, initialPosition });
    setObjectPosition(initialPosition);
    setActiveObjectRef(objectRef);
    logEvent("object_detail_visible", { objectRef, nodeId: item.nodeId, surface, initialPosition });
    const shownNode = adapter.node(item.nodeId);
    logEvent("evidence_text_presented", { sources: [{ text: shownNode.body, source: shownNode.sourceLabel, exactRevision: nodeSubjectRevision(shownNode.nodeId) }],
      presentation: "requested_detail_body", entireTextRead: false, humanAttentionObserved: false });
  }

  function nodeSubjectRevision(nodeId: string): string | null {
    const productFact = productSnapshot?.publicFacts.find((fact) => fact.id === nodeId);
    return productFact ? productFact.revisionId : scenario.subjectRevisionRef ?? null;
  }

  function closeObject(): void {
    if (activeObjectRef !== null) logEvent("object_detail_closed", { objectRef: activeObjectRef });
    objectDragRef.current = null;
    setActiveObjectRef(null);
    setObjectPosition(null);
  }

  function startObjectDrag(event: ReactPointerEvent<HTMLElement>): void {
    if (objectPosition === null || (event.target as HTMLElement).closest("button") !== null) return;
    event.preventDefault();
    objectDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: objectPosition.x,
      originY: objectPosition.y,
      currentX: objectPosition.x,
      currentY: objectPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveObjectDrag(event: ReactPointerEvent<HTMLElement>): void {
    const drag = objectDragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const modalRect = objectModalRef.current?.getBoundingClientRect();
    const width = modalRect?.width ?? 420;
    const height = modalRect?.height ?? 320;
    const viewportPadding = 8;
    const nextPosition = {
      x: clampPosition(
        drag.originX + event.clientX - drag.startX,
        viewportPadding,
        window.innerWidth - width - viewportPadding,
      ),
      y: clampPosition(
        drag.originY + event.clientY - drag.startY,
        viewportPadding,
        window.innerHeight - height - viewportPadding,
      ),
    };
    drag.currentX = nextPosition.x;
    drag.currentY = nextPosition.y;
    setObjectPosition(nextPosition);
  }

  function endObjectDrag(event: ReactPointerEvent<HTMLElement>): void {
    const drag = objectDragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    objectDragRef.current = null;
    if (Math.abs(drag.currentX - drag.originX) > 1 || Math.abs(drag.currentY - drag.originY) > 1) {
      logEvent("object_card_moved", {
        objectRef: activeObjectRef,
        from: { x: drag.originX, y: drag.originY },
        to: { x: drag.currentX, y: drag.currentY },
      });
    }
  }

  function toggleObjectSelection(objectRef: string): void {
    if (condition !== "B") return;
    const selected = selectedObjectRefs.includes(objectRef);
    const next = selected
      ? selectedObjectRefs.filter((item) => item !== objectRef)
      : [...selectedObjectRefs, objectRef];
    setSelectedObjectRefs(next);
    logEvent(selected ? "object_deselected" : "object_selected", {
      objectRef,
      selectedObjectRefs: next,
    });
  }

  function openRelatedObject(nodeId: string, relationId: string): void {
    if (condition !== "B" || activeNode === null) return;
    const frontier = adapter.frontier(frontierStage, revealedNodeIds);
    if (!frontier.eligibleNodeIds.includes(nodeId)) return;
    const anchor = effectiveScenario.objectAnchors.find((item) => item.nodeId === nodeId);
    if (anchor === undefined) return;
    const fromNodeId = activeNode.nodeId;
    setRevealedNodeIds((current) => current.includes(nodeId) ? current : [...current, nodeId]);
    setActiveObjectRef(anchor.objectRef);
    logEvent("object_relation_navigated", {
      relationId,
      fromNodeId,
      toNodeId: nodeId,
      frontierRef: frontier.frontierRef,
    });
    const shownNode = adapter.node(nodeId);
    logEvent("evidence_text_presented", { sources: [{ text: shownNode.body, source: shownNode.sourceLabel, exactRevision: nodeSubjectRevision(shownNode.nodeId) }],
      presentation: "requested_related_detail_body", entireTextRead: false, humanAttentionObserved: false });
  }

  function operationPrompt(operation: InformationOperation, node: InformationNode): string {
    const quotedTitle = `“${node.title}”`;
    const prompts: Record<InformationOperation, string> = {
      inspect: `请继续解释${quotedTitle}，只说当前材料能确认的内容。`,
      expand_scope: `请沿${quotedTitle}展开一层范围，并保留不能推出的结论。`,
      inspect_case: `请沿${quotedTitle}给我一个具体案例，并说明它代表什么、不代表什么。`,
      trace_source: `请把${quotedTitle}追到原始事件和来源回执。`,
      compare_history: `请把${quotedTitle}与相关历史决定或同一对象的其他时点对照。`,
      request_evidence: `围绕${quotedTitle}，当前还缺什么证据，什么结论暂时不能下？`,
      verify_provenance: `请核对${quotedTitle}的来源链、验证范围和证据边界。`,
      revisit: `请重新审视${quotedTitle}，说明哪些仍有效、哪些问题被重新打开。`,
    };
    return prompts[operation];
  }

  function prepareObjectQuestion(operation: InformationOperation): void {
    if (condition !== "B" || activeNode === null || activeAnchor === null) return;
    const prompt = operationPrompt(operation, activeNode);
    setQuery(prompt);
    logEvent("object_question_prepared", {
      objectRef: activeAnchor.objectRef,
      nodeId: activeNode.nodeId,
      operation,
      prompt,
    });
    closeObject();
    window.setTimeout(() => document.getElementById("experiment-query")?.focus(), 0);
  }

  function prepareWorkingSetQuestion(): void {
    if (condition !== "B" || selectedObjects.length === 0) return;
    const titles = selectedObjects.map(({ node }) => `“${node.title}”`).join("、");
    const prompt = selectedObjects.length === 1
      ? `请继续分析${titles}，说明它与当前问题的关系，以及现有证据边界。`
      : `请比较${titles}，说明它们之间的关系、共同支持什么，以及当前证据边界。`;
    setQuery(prompt);
    logEvent("object_working_set_question_prepared", {
      objectRefs: selectedObjects.map(({ anchor }) => anchor.objectRef),
      nodeIds: selectedObjects.map(({ node }) => node.nodeId),
      prompt,
    });
    window.setTimeout(() => document.getElementById("experiment-query")?.focus(), 0);
  }

  async function submitQuery(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = query.trim();
    if (text.length === 0 || waiting || productInitializing || productAuthorityUncertain) return;
    const generation = sessionGenerationRef.current;
    if (preparedAction) {
      logEvent("product_prepared_action_left_unexecuted", { preparedActionId: preparedAction.preparedActionId, reason: "participant_sent_new_message" });
      setPreparedAction(null);
    }
    const interactionStartMonotonicMs = eventMonotonicMs();
    const requestPhase = phase;
    const previousResponseNodeIds = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && (message.nodeIds?.length ?? 0) > 0)?.nodeIds;
    const baselineContextNodeIds = baselineSummaryTurn?.informationNodeIds
      ?? historyTurns.flatMap((turn) => turn.informationNodeIds);
    const contextNodeIds = previousResponseNodeIds ?? baselineContextNodeIds;
    const requestFrontier = adapter.frontier(frontierStage, revealedNodeIds, contextNodeIds);
    setMessages((current) => [...current, {
      id: messageId("user"),
      role: "user",
      origin: "participant",
      text,
      phase: requestPhase,
    }]);
    setQuery("");
    setWaiting(true);
    logEvent("chat_action_started", {
      interactionStartMonotonicMs,
      rawText: text,
      informationSpaceVersion: scenario.informationSpaceVersion,
      frontierStage,
      frontierRef: requestFrontier.frontierRef,
      revealedNodeIds,
      agentMode: agentRuntime.mode,
      agentModel: agentRuntime.model,
    });

    try {
      const liveTranscript = messages
          .filter((message): message is DynamicMessage & { role: "user" | "assistant" } => message.role === "user" || message.role === "assistant")
          .map((message) => ({ role: message.role, content: stripAgentObjectMarkup(message.text) }));
      const historyTranscript = historyTurns.flatMap((turn) => [
        { role: "user" as const, content: turn.user },
        { role: "assistant" as const, content: stripAgentObjectMarkup(turn.assistantLead) },
      ]);
      const transcript = [
        ...historyTranscript,
        ...liveTranscript,
        { role: "user" as const, content: text },
      ];
      const gateway = agentRuntime.mode === "remote_chat_completion" ? remoteGateway : localGateway;
      const response = await gateway.respond({
        scenarioId: scenario.scenarioId,
        query: text,
        frontierStage,
        contextNodeIds,
        revealedNodeIds,
        messages: transcript,
        ...(enableProductActions && frontierStage === "e0" && productSnapshot ? { productSessionId: productSnapshot.sessionId } : {}),
      });
      if (generation !== sessionGenerationRef.current) return;
      if (response.productSnapshot) setProductSnapshot(response.productSnapshot);
      if (response.preparedProductAction) {
        setPreparedAction(response.preparedProductAction);
        logEvent("product_action_prepared_for_review", { preparedAction: response.preparedProductAction, productSessionId: response.productSnapshot?.sessionId });
      }
      const groundedNodeIds = response.groundedNodeIds ?? response.nodeIds;
      // Only output mentions become Chat context. Retrieval and object-panel
      // exposure are separate events and do not imply that a fact was read.
      const responseContextNodeIds = [...groundedNodeIds]
        .filter((nodeId, index, values) => values.indexOf(nodeId) === index);
      setRevealedNodeIds((current) => [...current, ...responseContextNodeIds]
        .filter((nodeId, index, values) => values.indexOf(nodeId) === index));
      setMessages((current) => [...current, {
        id: messageId("assistant"),
        role: "assistant",
        origin: "agent",
        text: response.message,
        phase: requestPhase,
        nodeIds: responseContextNodeIds,
        agentMode: response.mode,
      }]);
      logEvent("agent_response_recorded", {
        matched: response.matched,
        nodeIds: response.nodeIds,
        requestedNodeIds: response.requestedNodeIds ?? [],
        groundedNodeIds: response.groundedNodeIds ?? response.nodeIds,
        mode: response.mode,
        responseText: response.message,
        model: response.model ?? agentRuntime.model,
        provider: response.provider ?? agentRuntime.provider,
        deliveryKind: response.deliveryKind ?? null,
        configuredAgentMode: response.configuredAgentMode ?? agentRuntime.mode,
        providerInvoked: response.providerInvoked ?? null,
        providerPolicy: response.providerPolicy ?? null,
        requestId: response.requestId ?? null,
        latencyMs: response.latencyMs ?? null,
        usage: response.usage ?? null,
        evidenceEnvelopeHash: response.evidenceEnvelopeHash ?? null,
        informationSpaceVersion: scenario.informationSpaceVersion,
        frontierStage,
        frontierRef: response.frontierRef,
        traversedRelationIds: response.traversedRelationIds ?? [],
        packetNodeIds: response.packetNodeIds ?? [],
      }, { phase: requestPhase });
      if (requestPhase === "baseline" && !baselineExchangeComplete) {
        logEvent("baseline_takeover_exchange_completed", {
          participantText: text,
          responseNodeIds: responseContextNodeIds,
        }, { phase: requestPhase });
      }
    } catch (error) {
      if (generation !== sessionGenerationRef.current) return;
      const message = error instanceof Error ? error.message : "unknown_agent_error";
      setMessages((current) => [...current, {
        id: messageId("system"),
        role: "system",
        origin: "system",
        text: agentRuntime.mode === "remote_chat_completion"
          ? (message.includes("transcript_") || message.includes("request_too_large") || message.includes("服务上限") || message.includes("容量")
            ? "本次完整对话超出服务容量，尚未发送或截断历史。请保留本次记录，由研究者处理容量限制。"
            : "模型暂时没有返回可用回答。你可以重试，本会话不会自动切换到另一个回答器。")
          : "本地冻结信息解析暂时不可用；本次请求已记为技术错误。",
        phase: requestPhase,
      }]);
      logEvent("agent_response_failed", {
        error: message,
        mode: agentRuntime.mode,
        model: agentRuntime.model,
        provider: agentRuntime.provider,
      }, { phase: requestPhase });
    } finally {
      if (generation === sessionGenerationRef.current) setWaiting(false);
    }
  }

  async function confirmProductAction(): Promise<void> {
    if (!preparedAction || !productSnapshot || waiting || productAuthorityUncertain) return;
    const plan = preparedAction;
    const generation = sessionGenerationRef.current;
    setWaiting(true);
    setProductAuthorityUncertain(true);
    logEvent("product_action_confirmation_submitted", { preparedActionId: plan.preparedActionId, review: plan.review, confirmation: plan.requiredConfirmation });
    const confirmationText = `确认执行已审阅操作：${plan.review.summary}${plan.operation.reason ? `\n记录依据：${plan.operation.reason}` : ""}${plan.operation.reopenCondition ? `\n重开条件：${plan.operation.reopenCondition}` : ""}`;
    logEvent("participant_confirmation_recorded", { confirmationText, preparedActionId: plan.preparedActionId, authoredReason: false });
    setMessages((current) => [...current, { id: messageId("confirmation"), role: "user", origin: "participant", text: confirmationText, phase: "trigger" }]);
    try {
      const response = await fetch("/api/software-product", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", sessionId: productSnapshot.sessionId,
          confirmation: { ...plan.requiredConfirmation, participantConfirmed: true } }),
      });
      const payload = await response.json();
      if (generation !== sessionGenerationRef.current) return;
      if (payload.snapshot) {
        setProductSnapshot(payload.snapshot);
        setProductAuthorityUncertain(false);
      }
      logEvent("product_action_execution_returned", {
        status: payload.status ?? "unavailable", productSessionId: productSnapshot.sessionId,
        event: payload.event ?? null, result: payload.result ?? null,
        productSessionVersion: payload.snapshot?.sessionVersion ?? null,
        currentRevisionId: payload.snapshot?.currentRevisionId ?? null,
        candidateRevisionId: payload.snapshot?.candidateRevisionId ?? null,
        publicFacts: payload.snapshot?.publicFacts?.filter((fact: { isCurrentSnapshot?: boolean }) => fact.isCurrentSnapshot !== false) ?? [],
      });
      if (!response.ok || payload.status !== "executed") throw new Error(payload.error ?? payload.result?.error ?? "操作未执行；版本或确认已失效，请重新说明请求。");
      const snapshot = payload.snapshot as ProductSessionSnapshot;
      const facts = snapshot.publicFacts.filter((fact) => fact.isCurrentSnapshot !== false && fact.source === "executable_product_session" && fact.kind !== "product_item");
      const inspectionText = payload.result?.kind === "inspect"
        ? `\n请求视图 ${payload.result.view}，版本 ${payload.result.revisionId}，返回 ${payload.result.items.length} 条：\n${JSON.stringify(payload.result.items, null, 2)}\n`
        : "";
      const resultText = inspectionText + facts.map((fact) => `[[${fact.id}|${fact.title}]]\n${fact.body}`).join("\n\n");
      const responseText = `操作已执行。\n${resultText}`;
      logEvent("agent_response_recorded", { responseText, mode: "executed_product_operation", deliveryKind: "product_operation_result",
        nodeIds: facts.map((fact) => fact.id), groundedNodeIds: facts.map((fact) => fact.id),
        productSessionId: snapshot.sessionId, productSessionVersion: snapshot.sessionVersion,
        providerInvoked: false, currentRevisionId: snapshot.currentRevisionId });
      setRevealedNodeIds((current) => [...new Set([...current, ...facts.map((fact) => fact.id)])]);
      setMessages((current) => [...current,
        { id: messageId("execution"), role: "assistant", origin: "agent", text: responseText, phase: "trigger", nodeIds: facts.map((fact) => fact.id) },
      ]);
      setProductError(null);
    } catch (error) {
      if (generation !== sessionGenerationRef.current) return;
      const reason = error instanceof Error ? error.message : "product_execution_failed";
      setProductError(reason);
      logEvent("product_action_execution_failed", { error: reason, preparedActionId: plan.preparedActionId });
      // The request may already have committed. Never replay it or permit a
      // disposition against the pre-request snapshot after a lost response.
      await reconcileProductAuthority(productSnapshot.sessionId, generation);
    } finally {
      if (generation === sessionGenerationRef.current) { setPreparedAction(null); setWaiting(false); }
    }
  }

  async function reconcileProductAuthority(sessionId: string, generation = sessionGenerationRef.current): Promise<void> {
    setProductAuthorityUncertain(true);
    setWaiting(true);
    try {
      const response = await fetch("/api/software-product", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", sessionId }),
      });
      const snapshot = await response.json() as ProductSessionSnapshot;
      if (generation !== sessionGenerationRef.current) return;
      if (!response.ok || snapshot.sessionId !== sessionId || !Array.isArray(snapshot.publicFacts)) throw new Error("product_authority_not_reconciled");
      setProductSnapshot(snapshot);
      setProductAuthorityUncertain(false);
      setProductError(null);
      const facts = snapshot.publicFacts.filter((fact) => fact.isCurrentSnapshot !== false && fact.source === "executable_product_session" && fact.kind !== "product_item");
      const responseText = `上次请求的响应未完整取得；已重新读取同一会话的实际状态，没有重放操作。\n${facts.map((fact) => `[[${fact.id}|${fact.title}]]\n${fact.body}`).join("\n\n")}`;
      logEvent("product_authority_reconciled", { productSessionId: sessionId, productSessionVersion: snapshot.sessionVersion,
        currentRevisionId: snapshot.currentRevisionId, originalExecutionResponseMissing: true, actionReplayed: false });
      logEvent("agent_response_recorded", { mode: "authoritative_product_status_read", deliveryKind: "product_status_reconciliation",
        responseText, nodeIds: facts.map((fact) => fact.id), providerInvoked: false });
      setRevealedNodeIds((current) => [...new Set([...current, ...facts.map((fact) => fact.id)])]);
      setMessages((current) => [...current, { id: messageId("reconciled"), role: "assistant", origin: "agent", phase: "trigger", text: responseText, nodeIds: facts.map((fact) => fact.id) }]);
    } catch (error) {
      if (generation !== sessionGenerationRef.current) return;
      setProductError("尚不能核对当前产品状态；这次请求可能已经执行，请先重新核对状态。");
      logEvent("product_authority_reconciliation_failed", { productSessionId: sessionId, error: error instanceof Error ? error.message : "unknown", dispositionBlocked: true });
    } finally { if (generation === sessionGenerationRef.current) setWaiting(false); }
  }

  function renderNode(item: InformationNode, turnId: string) {
    const object = effectiveScenario.objectAnchors.find((anchor) => anchor.nodeId === item.nodeId);
    const canOpen = condition === "B" && object !== undefined && revealedNodeIds.includes(item.nodeId);
    const anchorIndex = item.body.indexOf(item.chatAnchorText);
    const beforeAnchor = item.body.slice(0, anchorIndex);
    const afterAnchor = item.body.slice(anchorIndex + item.chatAnchorText.length);
    return (
      <div className={styles.informationNode} key={`${turnId}-${item.nodeId}`}>
        <p>
          <span>{beforeAnchor}</span>
          {canOpen ? (
            <button
              type="button"
              className={styles.objectLink}
              aria-label={item.title}
              title={`打开对象：${item.title}`}
              onClick={(event) => openObject(object.objectRef, "inline", event.currentTarget)}
            >
              {item.chatAnchorText}
            </button>
          ) : <span>{item.chatAnchorText}</span>}
          <span>{afterAnchor}</span>
        </p>
      </div>
    );
  }

  function renderHistoryTurn(turn: ScenarioTurn) {
    const historyMessage: DynamicMessage = {
      id: `history-${turn.turnId}`,
      role: "assistant",
      origin: "workflow",
      text: turn.assistantLead,
      phase: "baseline",
      nodeIds: turn.informationNodeIds,
    };
    return (
      <section className={styles.turnPair} key={turn.turnId} data-turn-id={turn.turnId}>
        <article className={styles.userMessage} aria-label={`Participant ${turn.turnId}`}>
          <div className={styles.messageBody}><p>{turn.user}</p></div>
        </article>
        <article className={styles.agentMessage} aria-label={`Agent ${turn.turnId}`}>
          <div className={styles.agentContent}>
            <p>{renderAgentText(historyMessage)}</p>
            {(turn.presentedNodeIds?.length ?? 0) > 0 && (
              <div className={styles.nodeList}>
                {(turn.presentedNodeIds ?? []).map((nodeId) => renderNode(adapter.node(nodeId), turn.turnId))}
              </div>
            )}
          </div>
        </article>
      </section>
    );
  }

  function renderAgentText(message: DynamicMessage): ReactNode[] {
    const rendered: ReactNode[] = [];
    const allowedNodeIds = new Set(message.nodeIds ?? []);
    const pattern = /\[\[([A-Z0-9:@._+-]+)\|([^\]\r\n]+)\]\]/g;
    let cursor = 0;
    for (const match of message.text.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > cursor) rendered.push(...renderPlainChatText(message.text.slice(cursor, index), `${message.id}-${cursor}`));
      const nodeId = match[1] ?? "";
      const label = match[2] ?? "";
      const node = effectiveScenario.informationNodes.find((item) => item.nodeId === nodeId);
      const object = effectiveScenario.objectAnchors.find((item) => item.nodeId === nodeId);
      const canOpen = condition === "B"
        && allowedNodeIds.has(nodeId)
        && node !== undefined
        && object !== undefined;
      if (canOpen) {
        rendered.push(
          <button
            type="button"
            className={styles.objectLink}
            key={`${message.id}-${index}`}
            aria-label={node.title}
            title={`打开对象：${node.title}`}
            onClick={(event) => openObject(object.objectRef, "inline", event.currentTarget)}
          >
            {label}
          </button>,
        );
      } else {
        rendered.push(<span key={`${message.id}-${index}`}>{label}</span>);
      }
      cursor = index + match[0].length;
    }
    if (cursor < message.text.length) rendered.push(...renderPlainChatText(message.text.slice(cursor), `${message.id}-${cursor}`));
    return rendered;
  }

  function renderPlainChatText(text: string, prefix: string): ReactNode[] {
    // Only this same-origin evidence export route is a downloadable artifact.
    // Model-generated arbitrary links never acquire download authority here.
    const pattern = /\[([^\]\r\n]{1,100})\]\((\/api\/product-evaluation\?sessionId=[A-Za-z0-9%._-]+&publicationId=[A-Za-z0-9%._:-]+)\)/g;
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      parts.push(text.slice(cursor, index));
      parts.push(<a key={`${prefix}-${index}`} href={match[2]} onClick={() => logEvent("evaluation_download_requested", {
        href: match[2], downloadCompleted: null, materialRead: false,
      })}>{match[1]}</a>);
      cursor = index + match[0].length;
    }
    parts.push(text.slice(cursor));
    return parts;
  }

  if (!ready) {
    return (
      <main className={styles.loadingScreen}>
        <div className={styles.loadingMark}>SD</div>
        <h1>{scenario.title}</h1>
        <p>正在准备 v4 信息空间试用…</p>
      </main>
    );
  }

  return (
    <main className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            <i />
          </div>
          <div>
            <strong>Chat Agent</strong>
            <small>Software development study</small>
          </div>
        </div>

        <div className={styles.primaryNav}>
          <div className={styles.chatNavItem} aria-current="page">
            <span className={styles.chatIcon} aria-hidden="true" />
            <strong>Chat</strong>
          </div>
          {preview && controlledCondition === undefined && (
            <button type="button" className={styles.newChatButton} onClick={() => resetSession(condition)}>
              <span aria-hidden="true">＋</span>
              <span>重新开始当前预览</span>
            </button>
          )}
        </div>

        <nav className={styles.sessionNav} aria-label="实验会话">
          <span className={styles.navLabel}>最近对话</span>
          <div className={styles.assignedConversation} aria-current="page">
            <span className={styles.chatIcon} aria-hidden="true" />
            <div>
              <strong>{scenario.shortTitle}</strong>
              <small>{scenario.episodeId}</small>
            </div>
          </div>
        </nav>

        <div className={styles.sidebarUtilities}>
          {preview && (
            <button type="button" className={styles.logButton} onClick={() => telemetryRef.current?.download()}>
              <span aria-hidden="true">↓</span>
              <span>下载日志 · {logCount} 个事件</span>
            </button>
          )}
          <div className={styles.previewNote}>
            <i />
            <span>V4 INFORMATION SPACE PILOT · 非正式采集</span>
          </div>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.appHeader}>
          <div className={styles.headerTitle}>
            <strong>{scenario.shortTitle}</strong>
            <small>{scenario.episodeId}</small>
          </div>
          {preview && controlledCondition === undefined && (
            <div className={styles.researcherControls}>
              <span className={styles.agentStatus} data-mode={agentRuntime.mode}>
                <i aria-hidden="true" />
                {agentRuntime.mode === "remote_chat_completion" ? agentRuntime.model : "Local fallback"}
              </span>
              <span>预览条件</span>
              <div className={styles.conditionSwitch} aria-label="研究者条件切换">
                <button
                  type="button"
                  className={condition === "A" ? styles.activeCondition : undefined}
                  aria-current={condition === "A" ? "page" : undefined}
                  onClick={() => switchCondition("A")}
                >
                  A · Chat
                </button>
                <button
                  type="button"
                  className={condition === "B" ? styles.activeCondition : undefined}
                  aria-current={condition === "B" ? "page" : undefined}
                  onClick={() => switchCondition("B")}
                >
                  B · Chat + Object
                </button>
              </div>
            </div>
          )}
        </header>

        <div className={styles.conversation}>
          <div className={styles.conversationInner}>
            <div className={styles.messageStream} aria-label="Chat 对话">
              {historyTurns.map(renderHistoryTurn)}
              {messages.map((message) => (
                <article
                  ref={message.id === triggerMessageId ? triggerElementRef : undefined}
                  className={message.role === "user" ? styles.userMessage : message.role === "assistant" ? styles.agentMessage : styles.systemMessage}
                  key={message.id}
                  aria-label={message.role === "user" ? "Participant" : message.role === "assistant" ? "Agent" : "System"}
                >
                  <div className={message.role === "assistant" ? styles.agentContent : styles.messageBody}>
                    <p>{message.role === "assistant" ? renderAgentText(message) : message.text}</p>
                  </div>
                </article>
              ))}
              {(waiting || productInitializing) && (
                <div className={styles.thinking} aria-label="正在查找冻结材料"><i /><i /><i /></div>
              )}
              {preparedAction && (
                <section className={styles.productReview} aria-label="待确认产品操作">
                  <h3>请核对本次操作</h3>
                  <p>你的请求：{preparedAction.participantRequest}</p>
                  <p>{preparedAction.review.summary}</p>
                  {preparedAction.operation.reason !== undefined && <p>将记录的依据：{preparedAction.operation.reason}</p>}
                  {preparedAction.operation.reopenCondition !== undefined && <p>将记录的重开条件：{preparedAction.operation.reopenCondition}</p>}
                  {preparedAction.operation.pendingCandidateId !== undefined && <p>待定候选：{preparedAction.operation.pendingCandidateId ?? "无"}</p>}
                  <p>当前产品：{preparedAction.review.currentRevisionBefore} → {preparedAction.review.currentRevisionAfter}。</p>
                  <p>{preparedAction.review.currentProductWillChange ? "确认后会改变当前产品。" : "确认后当前产品版本保持不变。"}</p>
                  <div>
                    <button type="button" disabled={waiting} onClick={confirmProductAction}>确认执行此操作</button>
                    <button type="button" disabled={waiting} onClick={() => {
                      logEvent("product_prepared_action_left_unexecuted", { preparedActionId: preparedAction.preparedActionId, reason: "participant_declined_confirmation" });
                      setPreparedAction(null);
                    }}>暂不执行</button>
                  </div>
                </section>
              )}
              {productError && <p className={styles.systemMessage} role="alert">{productError}</p>}
              {productAuthorityUncertain && productSnapshot && <button type="button" disabled={waiting} onClick={() => reconcileProductAuthority(productSnapshot.sessionId)}>重新核对产品状态</button>}
              {telemetryStorageWarning && <p role="alert">浏览器本地记录保存失败；完整记录仍在本页内存中，请在离开前下载审阅包。</p>}

              {phase === "baseline" && !baselineExchangeComplete && !waiting && (
                <section className={styles.workflowMessage} aria-label="当前参与者接管">
                  <div className={styles.workflowContent}>
                    <p>{scenario.description}</p>
                  </div>
                </section>
              )}

              {phase === "baseline" && baselineExchangeComplete && (
                <section className={styles.workflowMessage} aria-label="Agent 下一步操作">
                  <div className={styles.workflowContent}>
                    <p>{onBaselineContinue ? "你可以继续核对项目，也可以结束这段共同接管。" : !baselineRequiresExchange ? "请先了解共同目标，准备好后查看这次任务的结果。" : "我这边还有一份四日试用记录。你想现在看，也可以先继续问当前版本。"}</p>
                    <button type="button" disabled={waiting || !baselineContinueEnabled} onClick={revealTrigger}>{onBaselineContinue ? "完成接管，进入共同任务" : scenario.baselineActionLabel}<span>→</span></button>
                  </div>
                </section>
              )}

            </div>

            <form className={styles.composer} onSubmit={submitQuery}>
              <textarea
                id="experiment-query"
                aria-label="完整 Chat"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="向 Agent 发送消息"
                disabled={waiting || productInitializing || productAuthorityUncertain}
              />
              <button type="submit" disabled={waiting || productInitializing || productAuthorityUncertain || query.trim().length === 0} aria-label="发送查询">↑</button>
              {condition === "B" && selectedObjectRefs.length > 0 && (
                <div className={styles.selectedReferences} aria-label="对象工作集">
                  <span>工作集</span>
                  <div>
                    {selectedObjects.map(({ anchor, node }) => (
                      <button key={anchor.objectRef} type="button" onClick={() => toggleObjectSelection(anchor.objectRef)} title="从工作集移除">
                        {node.title}<b aria-hidden="true">×</b>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={prepareWorkingSetQuestion}>生成可编辑追问</button>
                </div>
              )}
            </form>
            {footer}
            <div ref={conversationEndRef} />
          </div>
        </div>
      </section>

      {activeNode !== null && activeAnchor !== null && objectPosition !== null && (
        <div className={styles.objectBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeObject()}>
          <section
            ref={objectModalRef}
            className={styles.objectModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="object-title"
            style={{ left: objectPosition.x, top: objectPosition.y, maxHeight: `calc(100vh - ${objectPosition.y + 10}px)` }}
          >
            <header
              title="拖动卡片"
              onPointerDown={startObjectDrag}
              onPointerMove={moveObjectDrag}
              onPointerUp={endObjectDrag}
              onPointerCancel={endObjectDrag}
            >
              <div>
                <span>{ROLE_LABELS[activeAnchor.role]}对象</span>
                <h2 id="object-title">{activeNode.title}</h2>
              </div>
              <span className={styles.dragGrip} aria-hidden="true">⠿</span>
              <button type="button" onClick={closeObject} aria-label="关闭对象详情">关闭</button>
            </header>
            <div className={styles.objectBody}>
              <p>{activeNode.body}</p>
              <dl>
                <div><dt>来源</dt><dd>{activeNode.sourceLabel}</dd></div>
                {controlledCondition === undefined && <div><dt>正文锚点</dt><dd>“{activeNode.chatAnchorText}”</dd></div>}
                {controlledCondition === undefined && <div><dt>信息坐标</dt><dd>{activeNode.epistemicDepth} · {KIND_LABELS[activeNode.kind]} · {TEMPORAL_LABELS[activeNode.temporalStage]}</dd></div>}
                <div><dt>当前状态</dt><dd>{STATUS_LABELS[activeNode.epistemicStatus]}</dd></div>
              </dl>
            </div>
            {activeRelations.length > 0 && (
              <section className={styles.objectRelations} aria-label="相邻信息">
                <strong>相邻信息</strong>
                <div>
                  {activeRelations.map(({ relation, node }) => (
                    <button type="button" key={relation.relationId} onClick={() => openRelatedObject(node.nodeId, relation.relationId)}>
                      <span>{RELATION_LABELS[relation.kind]}</span>
                      <b>{node.title}</b>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className={styles.objectActions} aria-label="继续探索">
              <strong>继续探索</strong>
              <div>
                {activeNode.availableOperations.slice(0, 4).map((operation) => (
                  <button type="button" key={operation} onClick={() => prepareObjectQuestion(operation)}>
                    {OPERATION_LABELS[operation]}
                  </button>
                ))}
              </div>
              <small>只生成可编辑问题，不会自动发送。</small>
            </section>
            <footer>
              <div>
                <strong>当前工作集</strong>
                <small>固定只用于整理；选择不是提交要求，也不会改变 Agent 输入。</small>
              </div>
              <button type="button" onClick={() => toggleObjectSelection(activeAnchor.objectRef)}>
                {selectedObjectRefs.includes(activeAnchor.objectRef) ? "从工作集移除" : "固定到工作集"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
