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
import type {
  ExperimentCondition,
  ExperimentPhase,
  ExperimentScenario,
  InformationNode,
  InformationRole,
  ScenarioTurn,
} from "../../lib/experiment/types";
import styles from "./experiment-shell.module.css";

interface ExperimentShellProps {
  scenario: ExperimentScenario;
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

export default function ExperimentShell({ scenario }: ExperimentShellProps) {
  const adapter = useMemo(() => createScenarioAdapter(scenario), [scenario]);
  const localGateway = useMemo(() => createDeterministicAgentGateway(adapter), [adapter]);
  const remoteGateway = useMemo(() => createRemoteAgentGateway(), []);
  const telemetryRef = useRef<BrowserTelemetrySession | null>(null);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const objectModalRef = useRef<HTMLElement | null>(null);
  const objectDragRef = useRef<ObjectDragState | null>(null);

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

  const currentOrdinal = phase === "baseline" ? scenario.baselineOrdinal : scenario.triggerOrdinal;
  const visibleTurns = adapter.turnsThrough(currentOrdinal);
  const activeAnchor = activeObjectRef === null ? null : adapter.anchor(activeObjectRef);
  const activeNode = activeAnchor === null ? null : adapter.node(activeAnchor.nodeId);

  function logEvent(
    event: string,
    payload: Record<string, unknown> = {},
    overrides?: { condition?: ExperimentCondition; phase?: ExperimentPhase },
  ): void {
    const session = telemetryRef.current;
    if (session === null) return;
    session.append(overrides?.condition ?? condition, overrides?.phase ?? phase, event, payload);
    setLogCount(session.entries().length);
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let configurationTimeout: number | undefined;
    const handle = window.setTimeout(() => {
      void (async () => {
        const params = new URLSearchParams(window.location.search);
        const isPreview = params.get("preview") === "1";
        const assigned = assignedCondition();
        let runtime = LOCAL_AGENT_RUNTIME;
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
        if (cancelled) return;
        const telemetry = new BrowserTelemetrySession(scenario.scenarioId);
        telemetryRef.current = telemetry;
        setPreview(isPreview);
        setCondition(assigned);
        setAgentRuntime(runtime);
        setReady(true);
        telemetry.append(assigned, "baseline", "session_started", {
          preview: isPreview,
          assignmentSource: isPreview && params.get("condition") === assigned ? "researcher_preview" : "session_assignment",
          agentMode: runtime.mode,
          agentModel: runtime.model,
          agentProvider: runtime.provider,
          agentConfigurationStatus: runtime.configurationStatus,
          formalDataCollection: false,
        });
        setLogCount(1);
      })();
    }, 0);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(handle);
      if (configurationTimeout !== undefined) window.clearTimeout(configurationTimeout);
    };
  }, [scenario.scenarioId]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, phase]);

  function resetSession(nextCondition: ExperimentCondition, event = "preview_session_reset"): void {
    const telemetry = new BrowserTelemetrySession(scenario.scenarioId);
    telemetryRef.current = telemetry;
    setCondition(nextCondition);
    setPhase("baseline");
    setActiveObjectRef(null);
    setObjectPosition(null);
    objectDragRef.current = null;
    setSelectedObjectRefs([]);
    setMessages([]);
    setQuery("");
    setWaiting(false);
    telemetry.append(nextCondition, "baseline", event, {
      preview: true,
      agentMode: agentRuntime.mode,
      agentModel: agentRuntime.model,
      agentProvider: agentRuntime.provider,
      agentConfigurationStatus: agentRuntime.configurationStatus,
      formalDataCollection: false,
    });
    setLogCount(1);
  }

  function switchCondition(nextCondition: ExperimentCondition): void {
    if (!preview || nextCondition === condition) return;
    const url = new URL(window.location.href);
    url.searchParams.set("preview", "1");
    url.searchParams.set("condition", nextCondition);
    window.history.replaceState({}, "", url);
    resetSession(nextCondition, "preview_condition_switched");
  }

  function revealTrigger(): void {
    if (phase !== "baseline") return;
    const triggerTurn = scenario.turns.find((turn) => turn.phase === "trigger");
    if (triggerTurn === undefined) return;
    const interactionStartMonotonicMs = eventMonotonicMs();
    logEvent("trigger_reveal_started", { interactionStartMonotonicMs });
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
        id: messageId("trigger-agent"),
        role: "assistant",
        origin: "agent",
        text: triggerTurn.assistantLead,
        phase: "trigger",
        nodeIds: triggerTurn.presentedNodeIds ?? triggerTurn.informationNodeIds,
      },
    ]);
    setPhase("trigger");
    setActiveObjectRef(null);
    setObjectPosition(null);
    logEvent("trigger_revealed", { revealOrdinal: scenario.triggerOrdinal }, { phase: "trigger" });
    logEvent("agent_response_recorded", {
      matched: true,
      nodeIds: triggerTurn.presentedNodeIds ?? triggerTurn.informationNodeIds,
      mode: "frozen_trigger_turn",
      responseText: triggerTurn.assistantLead,
    }, { phase: "trigger" });
  }

  function objectAnchorPosition(anchorElement: HTMLElement): ObjectPosition {
    const anchorRect = anchorElement.getBoundingClientRect();
    const viewportPadding = 10;
    const gap = 10;
    const cardWidth = Math.min(370, window.innerWidth - viewportPadding * 2);
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
    if (item.logicalRevealOrdinal > currentOrdinal) return;
    const initialPosition = objectAnchorPosition(anchorElement);
    logEvent("object_action_started", { objectRef, surface, interactionStartMonotonicMs, initialPosition });
    setObjectPosition(initialPosition);
    setActiveObjectRef(objectRef);
    logEvent("object_detail_visible", { objectRef, nodeId: item.nodeId, surface, initialPosition });
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
    const width = modalRect?.width ?? 370;
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

  async function submitQuery(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = query.trim();
    if (text.length === 0 || waiting) return;
    const interactionStartMonotonicMs = eventMonotonicMs();
    const requestPhase = phase;
    const previousResponseNodeIds = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && (message.nodeIds?.length ?? 0) > 0)?.nodeIds;
    const baselineContextNodeIds = visibleTurns
      .filter((turn) => turn.phase === "baseline_summary")
      .at(-1)?.informationNodeIds ?? [];
    const contextNodeIds = previousResponseNodeIds ?? baselineContextNodeIds;
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
      visibleOrdinal: currentOrdinal,
      agentMode: agentRuntime.mode,
      agentModel: agentRuntime.model,
    });

    try {
      const transcript = [
        ...messages
          .filter((message): message is DynamicMessage & { role: "user" | "assistant" } => message.role === "user" || message.role === "assistant")
          .slice(-14)
          .map((message) => ({ role: message.role, content: stripAgentObjectMarkup(message.text) })),
        { role: "user" as const, content: text },
      ];
      const gateway = agentRuntime.mode === "remote_chat_completion" ? remoteGateway : localGateway;
      const response = await gateway.respond({
        scenarioId: scenario.scenarioId,
        query: text,
        visibleOrdinal: currentOrdinal,
        contextNodeIds,
        messages: transcript,
      });
      setMessages((current) => [...current, {
        id: messageId("assistant"),
        role: "assistant",
        origin: "agent",
        text: response.message,
        phase: requestPhase,
        nodeIds: response.nodeIds,
        agentMode: response.mode,
      }]);
      logEvent("agent_response_recorded", {
        matched: response.matched,
        nodeIds: response.nodeIds,
        groundedNodeIds: response.groundedNodeIds ?? response.nodeIds,
        mode: response.mode,
        responseText: response.message,
        model: response.model ?? agentRuntime.model,
        provider: response.provider ?? agentRuntime.provider,
        requestId: response.requestId ?? null,
        latencyMs: response.latencyMs ?? null,
        usage: response.usage ?? null,
        evidenceEnvelopeHash: response.evidenceEnvelopeHash ?? null,
      }, { phase: requestPhase });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_agent_error";
      setMessages((current) => [...current, {
        id: messageId("system"),
        role: "system",
        origin: "system",
        text: agentRuntime.mode === "remote_chat_completion"
          ? "模型暂时没有返回可用回答。你可以重试，本会话不会自动切换到另一个回答器。"
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
      setWaiting(false);
    }
  }

  function renderNode(item: InformationNode, turnId: string) {
    const object = scenario.objectAnchors.find((anchor) => anchor.nodeId === item.nodeId);
    const canOpen = condition === "B" && object !== undefined && object.logicalRevealOrdinal <= currentOrdinal;
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

  function renderAgentTurn(turn: ScenarioTurn) {
    return (
      <section key={turn.turnId} data-turn-id={turn.turnId}>
        <article className={styles.agentMessage} aria-label={`Agent ${turn.turnId}`}>
          <div className={styles.agentContent}>
            <p>{turn.assistantLead}</p>
            <div className={styles.nodeList}>
              {(turn.presentedNodeIds ?? turn.informationNodeIds).map((nodeId) => renderNode(adapter.node(nodeId), turn.turnId))}
            </div>
          </div>
        </article>
      </section>
    );
  }

  function renderRemoteAgentText(message: DynamicMessage): ReactNode[] {
    const rendered: ReactNode[] = [];
    const allowedNodeIds = new Set(message.nodeIds ?? []);
    const pattern = /\[\[([A-Z0-9:_-]+)\|([^\]\r\n]+)\]\]/g;
    let cursor = 0;
    for (const match of message.text.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > cursor) rendered.push(message.text.slice(cursor, index));
      const nodeId = match[1] ?? "";
      const label = match[2] ?? "";
      const node = scenario.informationNodes.find((item) => item.nodeId === nodeId);
      const object = scenario.objectAnchors.find((item) => item.nodeId === nodeId);
      const canOpen = condition === "B"
        && allowedNodeIds.has(nodeId)
        && node !== undefined
        && object !== undefined
        && object.logicalRevealOrdinal <= currentOrdinal;
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
    if (cursor < message.text.length) rendered.push(message.text.slice(cursor));
    return rendered;
  }

  if (!ready) {
    return (
      <main className={styles.loadingScreen}>
        <div className={styles.loadingMark}>SD</div>
        <h1>{scenario.title}</h1>
        <p>正在准备冻结实验基线…</p>
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
          {preview && (
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
            <span>ENGINEERING PREVIEW · 非正式采集</span>
          </div>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.appHeader}>
          <div className={styles.headerTitle}>
            <strong>{scenario.shortTitle}</strong>
            <small>{scenario.episodeId}</small>
          </div>
          {preview && (
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
              <section className={styles.agentMessage} aria-label="Agent 会话说明">
                <div className={styles.agentContent}>
                  <p>{scenario.description}</p>
                </div>
              </section>
              {visibleTurns
                .filter((turn) => turn.phase === "baseline_summary")
                .map(renderAgentTurn)}
              {messages.map((message) => (
                <article
                  className={message.role === "user" ? styles.userMessage : message.role === "assistant" ? styles.agentMessage : styles.systemMessage}
                  key={message.id}
                  aria-label={message.role === "user" ? "Participant" : message.role === "assistant" ? "Agent" : "System"}
                >
                  <div className={message.role === "assistant" ? styles.agentContent : styles.messageBody}>
                    <p>{message.agentMode === "remote_chat_completion" ? renderRemoteAgentText(message) : message.text}</p>
                    {message.agentMode !== "remote_chat_completion" && message.nodeIds?.map((nodeId) => renderNode(adapter.node(nodeId), message.id))}
                  </div>
                </article>
              ))}
              {waiting && (
                <div className={styles.thinking} aria-label="正在查找冻结材料"><i /><i /><i /></div>
              )}

              {phase === "baseline" && (
                <section className={styles.workflowMessage} aria-label="Agent 下一步操作">
                  <div className={styles.workflowContent}>
                    <p>我这边还有一份四日试用记录。你想现在看，也可以先继续问当前版本。</p>
                    <button type="button" onClick={revealTrigger}>{scenario.baselineActionLabel}<span>→</span></button>
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
                disabled={waiting}
              />
              <button type="submit" disabled={waiting || query.trim().length === 0} aria-label="发送查询">↑</button>
              {condition === "B" && selectedObjectRefs.length > 0 && (
                <div className={styles.selectedReferences}>已选择 {selectedObjectRefs.length} 个对象，可在对应消息中取消。</div>
              )}
            </form>
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
            style={{ left: objectPosition.x, top: objectPosition.y }}
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
              </dl>
            </div>
            <footer>
              <div>
                <strong>可选操作</strong>
                <small>对象内容与 Chat 中的信息相同，选择不是提交要求。</small>
              </div>
              <button type="button" onClick={() => toggleObjectSelection(activeAnchor.objectRef)}>
                {selectedObjectRefs.includes(activeAnchor.objectRef) ? "取消选择" : "选入当前考虑"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
