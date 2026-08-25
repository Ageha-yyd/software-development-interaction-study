"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  APP_BUILD_VERSION,
  canonicalJson,
  Condition,
  countCharacters,
  deadlineReached,
  deriveExplicitStrategy,
  FACTS,
  FactId,
  exposureEligible,
  isExplicitDraftConfirmation,
  makeSeededProbe,
  parseFactOperations,
  METRIC_CONFIG_VERSION,
  PARSER_VERSION,
  SCENARIO_VERSION,
  stableHash,
  StockId,
  STRATEGY_FIELDS,
  STRATEGY_V1,
  StrategyField,
  StrategyState,
  strategySummary,
  validateFinalSubmission,
  validateFrozenContextTrace,
} from "./experiment-core";

type ExperimentPhase =
  | "briefing"
  | "history"
  | "main_task"
  | "questionnaire"
  | "unaided_probe"
  | "aided_probe"
  | "complete";

type Actor = "participant" | "agent" | "system";
type Surface = "task" | "chat" | "widget" | "probe" | "questionnaire" | "browser";

type EventRecord = {
  schema_version: "stock-v3.0";
  session_id: string;
  participant_id_hash: string;
  condition: Condition;
  sequence_no: number;
  event_id: string;
  timestamp_monotonic_ms: number;
  timestamp_utc: string;
  round_id: string;
  actor: Actor;
  surface: Surface;
  event_type: string;
  payload: Record<string, unknown>;
};

type Message = {
  id: string;
  role: "user" | "agent" | "marker";
  text: string;
  factIds?: FactId[];
};

type AgentContextSnapshot = {
  eventId: string;
  interactionId: string;
  strategyVersion: number;
  strategy: StrategyState;
  evidenceVersion: number;
  evidence: FactId[];
};

type FrozenContext = {
  contextId: string;
  terminalTrigger: "final_submit_lock_acquired" | "deadline_triggered";
  terminalLockEventId: string;
  terminalLockSequenceNo: number;
  strategyVersion: number;
  strategy: StrategyState;
  evidenceVersion: number;
  evidence: FactId[];
  lastAgentContext: AgentContextSnapshot | null;
};

type TerminalState =
  | { status: "open" }
  | { status: "locked"; winner: "submit" | "deadline"; contextId: string; terminalLockEventId: string };

type ProbeTerminalState =
  | { status: "idle" }
  | { status: "open"; variantId: string; deadlineAt: number | null }
  | { status: "locked"; winner: "submit" | "deadline"; variantId: string };

type ExperimentConfig = {
  hMs: number | null;
  lMs: number | null;
  probeVariantIndex: number | null;
  assignmentId: string;
  preview: boolean;
};

type ScaleAnswers = Record<string, number>;
type CauseMeta = { causeEventId: string; messageId?: string };

const AGENT_WAIT_MS = 900;
const FINAL_PROMPT = "请选择一只最值得进一步研究的股票，并提交100—150个字符的理由，标点计入字符数。理由中请引用至少两条此前出现的具体事实；这些事实应涉及至少两个不同方面，并说明它们如何符合当前Strategy、影响你的选择、比较或权衡。同时指出至少一项仍需核查的风险。";

const chartSeries = [
  { id: "ALFA", color: "#2d6d52", values: [100, 104, 101, 110, 107, 118, 113, 126, 119, 132, 128, 136] },
  { id: "BETA", color: "#9a6b2f", values: [100, 101, 102, 103, 102, 104, 105, 106, 105, 107, 108, 109] },
  { id: "GAMMA", color: "#6d5aa6", values: [100, 102, 104, 103, 107, 109, 108, 112, 111, 114, 113, 117] },
] as const;

const tlxQuestions = [
  ["mental_demand", "心理需求", "在调整阶段，这项任务在心理和思考上有多费力？"],
  ["physical_demand", "身体需求", "在调整阶段，这项任务在身体操作上有多费力？"],
  ["temporal_demand", "时间需求", "在调整阶段，你感受到的时间压力有多大？"],
  ["performance_cost", "表现负担", "你对自己在调整阶段的表现有多不满意？"],
  ["effort", "努力程度", "为了完成调整阶段，你付出了多少努力？"],
  ["frustration", "挫败程度", "调整阶段让你感到多焦虑、沮丧或烦躁？"],
] as const;

const mechanismQuestions = [
  ["Q_RETRIEVAL_EFFORT", "为了重新找到前面出现的有用信息，我投入了很多精力。"],
  ["Q_TRANSLATION_EFFORT", "将新的资金需求转化为具体判断策略让我感到费力。"],
  ["Q_STATE_CERTAINTY", "在提交最终判断时，我确信任务结束时系统保存的是我确认过的Strategy。"],
  ["Q_CONTROL", "在调整判断依据和Strategy时，我感到自己能够控制整个过程。"],
] as const;

function AgentMark() {
  return <div className="agent-avatar" aria-hidden="true">AI</div>;
}

function FactText({ id, active, onOpen }: { id: FactId; active: boolean; onOpen: (id: FactId) => void }) {
  const fact = FACTS[id];
  const common = { "data-fact-id": id, "data-fact-surface": "history", "data-content-hash": stableHash(fact.detail) };
  if (!active) return <strong className="fact-static" {...common}>{fact.label}</strong>;
  return <button type="button" className="fact-link" {...common} onClick={() => onOpen(id)}>{fact.label}</button>;
}

function PriceChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.clearRect(0, 0, width, height);
      context.strokeStyle = "#e3e9e5";
      context.lineWidth = 1;
      for (let index = 0; index < 4; index += 1) {
        const y = 18 + index * ((height - 36) / 3);
        context.beginPath();
        context.moveTo(42, y);
        context.lineTo(width - 18, y);
        context.stroke();
      }
      const values = chartSeries.flatMap((series) => [...series.values]);
      const min = Math.min(...values) - 3;
      const max = Math.max(...values) + 3;
      chartSeries.forEach((series) => {
        context.strokeStyle = series.color;
        context.lineWidth = 2.5;
        context.beginPath();
        series.values.forEach((value, index) => {
          const x = 42 + index * ((width - 66) / (series.values.length - 1));
          const y = height - 20 - ((value - min) / (max - min)) * (height - 40);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return <section className="price-chart" aria-label="ALFA、BETA、GAMMA 的模拟归一化价格走势">
    <div className="chart-head">
      <div><span className="object-type">STATIC GRAPH</span><h3>模拟归一化价格走势</h3></div>
      <span>起点 = 100 · 仅供实验</span>
    </div>
    <canvas ref={canvasRef} />
    <div className="chart-legend">{chartSeries.map((series) => <span key={series.id}><i style={{ background: series.color }} />{series.id}</span>)}</div>
  </section>;
}

function StrategyEditor({
  value,
  onChange,
  disabled = false,
  empty = false,
}: {
  value: Partial<StrategyState>;
  onChange: (field: StrategyField, value: string) => void;
  disabled?: boolean;
  empty?: boolean;
}) {
  return <div className="strategy-fields probe-fields">
    {STRATEGY_FIELDS.map((field) => <label key={field.key}>{field.label}
      <select
        value={value[field.key] ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(field.key, event.target.value)}
      >
        {empty && <option value="">请选择</option>}
        {field.values.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>)}
  </div>;
}

export default function Home() {
  const [condition, setCondition] = useState<Condition | null>(null);
  const [config, setConfig] = useState<ExperimentConfig | null>(null);
  const [phase, setPhase] = useState<ExperimentPhase>("briefing");
  const [historyRound, setHistoryRound] = useState(0);
  const [provisionalStock, setProvisionalStock] = useState<StockId | "">("");
  const [provisionalReason, setProvisionalReason] = useState("");
  const [conditionActive, setConditionActive] = useState(false);
  const [constraintQualified, setConstraintQualified] = useState(false);
  const [activeFact, setActiveFact] = useState<FactId | null>(null);
  const [focused, setFocused] = useState<FactId[]>([]);
  const [evidence, setEvidence] = useState<FactId[]>([]);
  const [evidenceVersion, setEvidenceVersion] = useState(0);
  const [strategy, setStrategy] = useState<StrategyState>({ ...STRATEGY_V1 });
  const [strategyDraft, setStrategyDraft] = useState<StrategyState>({ ...STRATEGY_V1 });
  const [strategyVersion, setStrategyVersion] = useState(1);
  const [strategyHistory, setStrategyHistory] = useState<StrategyState[]>([]);
  const [pendingChatStrategy, setPendingChatStrategy] = useState<StrategyState | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [strategyHints, setStrategyHints] = useState<StrategyField[]>([]);
  const [postT0StrategyConfirmCount, setPostT0StrategyConfirmCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [agentWaiting, setAgentWaiting] = useState(false);
  const [statusNotice, setStatusNotice] = useState("");
  const [finalStock, setFinalStock] = useState<StockId | "">("");
  const [finalReason, setFinalReason] = useState("");
  const [finalError, setFinalError] = useState("");
  const [frozenContext, setFrozenContext] = useState<FrozenContext | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [tlxAnswers, setTlxAnswers] = useState<ScaleAnswers>({});
  const [mechanismAnswers, setMechanismAnswers] = useState<ScaleAnswers>({});
  const [unaidedStrategy, setUnaidedStrategy] = useState<Partial<StrategyState>>({});
  const [stateConfidence, setStateConfidence] = useState(4);
  const [aidedStrategy, setAidedStrategy] = useState<StrategyState | null>(null);
  const [probeMeta, setProbeMeta] = useState<ReturnType<typeof makeSeededProbe> | null>(null);
  const [lookupVisible, setLookupVisible] = useState(false);
  const [lookupQualified, setLookupQualified] = useState(false);
  const [lookupWaiting, setLookupWaiting] = useState(false);
  const [lookupMode, setLookupMode] = useState<"chat" | "widget" | null>(null);

  const conditionRef = useRef<Condition>("chat_widget");
  const configRef = useRef<ExperimentConfig>({ hMs: null, lMs: null, probeVariantIndex: null, assignmentId: "pending", preview: false });
  const sessionRef = useRef("pending");
  const participantHashRef = useRef("pending");
  const sequenceRef = useRef(0);
  const eventsRef = useRef<EventRecord[]>([]);
  const roundRef = useRef("00");
  const constraintAtRef = useRef<number | null>(null);
  const deadlineAtRef = useRef<number | null>(null);
  const deadlineTimerRef = useRef<number | null>(null);
  const probeTimerRef = useRef<number | null>(null);
  const terminalRef = useRef<TerminalState>({ status: "open" });
  const probeTerminalRef = useRef<ProbeTerminalState>({ status: "idle" });
  const probeSetupKeyRef = useRef<string | null>(null);
  const focusedRef = useRef<FactId[]>([]);
  const evidenceRef = useRef<{ version: number; factIds: FactId[] }>({ version: 0, factIds: [] });
  const strategyRef = useRef<{ version: number; fields: StrategyState }>({ version: 1, fields: { ...STRATEGY_V1 } });
  const strategyHistoryRef = useRef<StrategyState[]>([]);
  const postConfirmRef = useRef(0);
  const lastAgentContextRef = useRef<AgentContextSnapshot | null>(null);
  const activePopupRef = useRef<{ viewId: string; factId: FactId; startedAt: number } | null>(null);
  const factPopupElementRef = useRef<HTMLElement | null>(null);
  const updateRef = useRef<HTMLElement | null>(null);
  const lookupRef = useRef<HTMLDivElement | null>(null);

  const appendEvent = useCallback((eventType: string, actor: Actor, surface: Surface, payload: Record<string, unknown> = {}, roundId = roundRef.current, timestampMonotonicMs = Math.round(performance.now())) => {
    sequenceRef.current += 1;
    const record: EventRecord = {
      schema_version: "stock-v3.0",
      session_id: sessionRef.current,
      participant_id_hash: participantHashRef.current,
      condition: conditionRef.current,
      sequence_no: sequenceRef.current,
      event_id: crypto.randomUUID(),
      timestamp_monotonic_ms: timestampMonotonicMs,
      timestamp_utc: new Date().toISOString(),
      round_id: roundId,
      actor,
      surface,
      event_type: eventType,
      payload,
    };
    eventsRef.current.push(record);
    setEvents([...eventsRef.current]);
    try {
      localStorage.setItem(`stock-intent-lab:${sessionRef.current}`, eventsRef.current.map((event) => JSON.stringify(event)).join("\n"));
    } catch {
      // Export remains available even when browser storage is unavailable.
    }
    return record;
  }, []);

  const clearTimers = useCallback(() => {
    if (deadlineTimerRef.current !== null) window.clearTimeout(deadlineTimerRef.current);
    if (probeTimerRef.current !== null) window.clearTimeout(probeTimerRef.current);
    deadlineTimerRef.current = null;
    probeTimerRef.current = null;
  }, []);

  const resetRuntime = useCallback((nextCondition: Condition) => {
    clearTimers();
    conditionRef.current = nextCondition;
    sessionRef.current = crypto.randomUUID();
    participantHashRef.current = participantHashRef.current === "pending" ? stableHash(sessionRef.current) : participantHashRef.current;
    sequenceRef.current = 0;
    eventsRef.current = [];
    roundRef.current = "00";
    constraintAtRef.current = null;
    deadlineAtRef.current = null;
    terminalRef.current = { status: "open" };
    probeTerminalRef.current = { status: "idle" };
    probeSetupKeyRef.current = null;
    focusedRef.current = [];
    evidenceRef.current = { version: 0, factIds: [] };
    strategyRef.current = { version: 1, fields: { ...STRATEGY_V1 } };
    strategyHistoryRef.current = [];
    postConfirmRef.current = 0;
    lastAgentContextRef.current = null;
    activePopupRef.current = null;

    setCondition(nextCondition);
    setPhase("briefing");
    setHistoryRound(0);
    setProvisionalStock("");
    setProvisionalReason("");
    setConditionActive(false);
    setConstraintQualified(false);
    setActiveFact(null);
    setFocused([]);
    setEvidence([]);
    setEvidenceVersion(0);
    setStrategy({ ...STRATEGY_V1 });
    setStrategyDraft({ ...STRATEGY_V1 });
    setStrategyVersion(1);
    setStrategyHistory([]);
    setPendingChatStrategy(null);
    setDiffOpen(false);
    setStrategyHints([]);
    setPostT0StrategyConfirmCount(0);
    setMessages([]);
    setChatInput("");
    setAgentWaiting(false);
    setStatusNotice("");
    setFinalStock("");
    setFinalReason("");
    setFinalError("");
    setFrozenContext(null);
    setEvents([]);
    setTlxAnswers({});
    setMechanismAnswers({});
    setUnaidedStrategy({});
    setStateConfidence(4);
    setAidedStrategy(null);
    setProbeMeta(null);
    setLookupVisible(false);
    setLookupQualified(false);
    setLookupWaiting(false);
    setLookupMode(null);
  }, [clearTimers]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("condition");
    const assigned: Condition = requested === "chat" || requested === "chat_only"
      ? "chat_only"
      : requested === "widget" || requested === "chat_widget"
        ? "chat_widget"
        : crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0 ? "chat_only" : "chat_widget";
    const hSeconds = Number(params.get("h"));
    const lSeconds = Number(params.get("l"));
    const rawProbeIndex = params.get("probe");
    const requestedProbeIndex = rawProbeIndex === null || rawProbeIndex.trim() === "" ? Number.NaN : Number(rawProbeIndex);
    const assignmentId = params.get("assignment") || crypto.randomUUID();
    const participantRaw = params.get("participant") || crypto.randomUUID();
    const nextConfig = {
      hMs: Number.isFinite(hSeconds) && hSeconds > 0 ? Math.round(hSeconds * 1000) : null,
      lMs: Number.isFinite(lSeconds) && lSeconds > 0 ? Math.round(lSeconds * 1000) : null,
      probeVariantIndex: Number.isInteger(requestedProbeIndex) && requestedProbeIndex >= 0 && requestedProbeIndex < STRATEGY_FIELDS.length ? requestedProbeIndex : null,
      assignmentId,
      preview: params.get("preview") === "1",
    };
    void crypto.subtle.digest("SHA-256", new TextEncoder().encode(participantRaw)).then((digest) => {
      if (cancelled) return;
      participantHashRef.current = `sha256-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
      configRef.current = nextConfig;
      setConfig(nextConfig);
      resetRuntime(assigned);
    });
    return () => { cancelled = true; };
  }, [resetRuntime]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (phase === "briefing" || sessionRef.current === "pending") return;
    const onVisibility = () => appendEvent("page_visibility_changed", "system", "browser", { visibility_state: document.visibilityState });
    const onFocus = () => appendEvent("window_focus_changed", "system", "browser", { focused: document.hasFocus() });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onFocus);
    };
  }, [appendEvent, phase]);

  const endPopupForTerminal = useCallback((timestampMonotonicMs = Math.round(performance.now())) => {
    const openPopup = activePopupRef.current;
    if (!openPopup) return;
    appendEvent("fact_view_ended", "system", "widget", {
      view_instance_id: openPopup.viewId,
      fact_id: openPopup.factId,
      content_hash: stableHash(FACTS[openPopup.factId].detail),
      surface: "widget_popup",
      initiation: "popup",
      duration_ms: Math.max(0, Math.round(performance.now() - openPopup.startedAt)),
      end_reason: "terminal_requested",
    }, "11", timestampMonotonicMs);
    activePopupRef.current = null;
  }, [appendEvent]);

  const freezeContext = useCallback((
    terminalTrigger: FrozenContext["terminalTrigger"],
    terminalLockEvent: EventRecord,
    contextId: string,
    timestampMonotonicMs = terminalLockEvent.timestamp_monotonic_ms,
  ) => {
    const snapshot: FrozenContext = {
      contextId,
      terminalTrigger,
      terminalLockEventId: terminalLockEvent.event_id,
      terminalLockSequenceNo: terminalLockEvent.sequence_no,
      strategyVersion: strategyRef.current.version,
      strategy: { ...strategyRef.current.fields },
      evidenceVersion: evidenceRef.current.version,
      evidence: [...evidenceRef.current.factIds],
      lastAgentContext: lastAgentContextRef.current ? {
        ...lastAgentContextRef.current,
        strategy: { ...lastAgentContextRef.current.strategy },
        evidence: [...lastAgentContextRef.current.evidence],
      } : null,
    };
    const snapshotValidation = validateFrozenContextTrace({
      events: eventsRef.current,
      contextId,
      terminalTrigger,
      terminalLockEventId: terminalLockEvent.event_id,
      terminalLockSequenceNo: terminalLockEvent.sequence_no,
      strategyVersion: snapshot.strategyVersion,
      strategy: snapshot.strategy,
      evidenceVersion: snapshot.evidenceVersion,
      evidence: snapshot.evidence,
      lastAgentContext: snapshot.lastAgentContext,
    });
    appendEvent("task_context_frozen", "system", "task", {
      context_id: contextId,
      terminal_trigger: terminalTrigger,
      terminal_lock_event_id: terminalLockEvent.event_id,
      terminal_lock_sequence_no: terminalLockEvent.sequence_no,
      snapshot_validation_passed: snapshotValidation.valid,
      snapshot_validation_errors: snapshotValidation.errors,
      confirmed_strategy_version: snapshot.strategyVersion,
      confirmed_strategy_fields: snapshot.strategy,
      confirmed_evidence_version: snapshot.evidenceVersion,
      confirmed_evidence_fact_ids: snapshot.evidence,
      last_agent_context_event_id: snapshot.lastAgentContext?.eventId ?? null,
      last_consumed_strategy_version: snapshot.lastAgentContext?.strategyVersion ?? null,
      last_consumed_strategy_fields: snapshot.lastAgentContext?.strategy ?? null,
      last_consumed_evidence_version: snapshot.lastAgentContext?.evidenceVersion ?? null,
      last_consumed_evidence_fact_ids: snapshot.lastAgentContext?.evidence ?? null,
    }, "11", timestampMonotonicMs);
    setFrozenContext(snapshot);
    setActiveFact(null);
    return snapshot;
  }, [appendEvent]);

  const winDeadline = useCallback((cause: "timer" | "late_submit" | "action_guard", timestampMonotonicMs = Math.round(performance.now())) => {
    if (terminalRef.current.status === "locked") return null;
    endPopupForTerminal(timestampMonotonicMs);
    const contextId = crypto.randomUUID();
    const deadlineEvent = appendEvent("deadline_triggered", "system", "task", {
      context_id: contextId,
      cause,
      deadline_at_monotonic_ms: deadlineAtRef.current,
      observed_at_monotonic_ms: Math.round(performance.now()),
    }, "11", timestampMonotonicMs);
    terminalRef.current = { status: "locked", winner: "deadline", contextId, terminalLockEventId: deadlineEvent.event_id };
    if (deadlineTimerRef.current !== null) window.clearTimeout(deadlineTimerRef.current);
    freezeContext("deadline_triggered", deadlineEvent, contextId, timestampMonotonicMs);
    appendEvent("deadline_reached", "system", "task", { context_id: contextId }, "11", timestampMonotonicMs);
    setPhase("questionnaire");
    return deadlineEvent;
  }, [appendEvent, endPopupForTerminal, freezeContext]);

  const ensureMainTaskOpen = useCallback((timestampMonotonicMs = Math.round(performance.now())) => {
    if (terminalRef.current.status === "locked") return false;
    const deadlineAt = deadlineAtRef.current;
    if (deadlineAt !== null && deadlineReached(timestampMonotonicMs, deadlineAt)) {
      winDeadline("action_guard", timestampMonotonicMs);
      return false;
    }
    return true;
  }, [winDeadline]);

  const winProbeDeadline = useCallback((timestampMonotonicMs = Math.round(performance.now()), cause = "timer") => {
    const current = probeTerminalRef.current;
    if (current.status !== "open" || current.deadlineAt === null) return false;
    const deadlineAt = current.deadlineAt;
    probeTerminalRef.current = { status: "locked", winner: "deadline", variantId: current.variantId };
    if (probeTimerRef.current !== null) window.clearTimeout(probeTimerRef.current);
    appendEvent("aided_probe_deadline_reached", "system", "probe", {
      probe_variant_id: current.variantId,
      cause,
      deadline_at_monotonic_ms: deadlineAt,
      observed_at_monotonic_ms: timestampMonotonicMs,
    }, "P2", timestampMonotonicMs);
    appendEvent("session_completed", "system", "task", {
      context_id: frozenContext?.contextId ?? null,
      completion_reason: "aided_probe_timeout",
    }, "END", timestampMonotonicMs);
    setLookupWaiting(false);
    setPhase("complete");
    return true;
  }, [appendEvent, frozenContext]);

  const ensureAidedProbeOpen = useCallback((timestampMonotonicMs = Math.round(performance.now())) => {
    const current = probeTerminalRef.current;
    if (current.status !== "open") return false;
    if (deadlineReached(timestampMonotonicMs, current.deadlineAt)) {
      winProbeDeadline(timestampMonotonicMs, "action_guard");
      return false;
    }
    return true;
  }, [winProbeDeadline]);

  const qualifyConstraint = useCallback(() => {
    if (constraintAtRef.current !== null || terminalRef.current.status === "locked") return;
    const t0MonotonicMs = Math.round(performance.now());
    constraintAtRef.current = t0MonotonicMs;
    roundRef.current = "08";
    appendEvent("constraint_exposure_qualified", "system", "task", {
      visible_ratio_threshold: 0.8,
      continuous_visible_ms: 500,
      h_ms: configRef.current.hMs,
    }, "08", t0MonotonicMs);
    setConstraintQualified(true);
    roundRef.current = "09";
    if (configRef.current.hMs !== null) {
      const deadlineAt = t0MonotonicMs + configRef.current.hMs;
      deadlineAtRef.current = deadlineAt;
      const fireAtAbsoluteDeadline = () => {
        const remaining = deadlineAt - performance.now();
        if (remaining > 0) {
          deadlineTimerRef.current = window.setTimeout(fireAtAbsoluteDeadline, remaining);
          return;
        }
        winDeadline("timer", Math.round(performance.now()));
      };
      deadlineTimerRef.current = window.setTimeout(fireAtAbsoluteDeadline, Math.max(0, deadlineAt - performance.now()));
    }
  }, [appendEvent, winDeadline]);

  useEffect(() => {
    if (!conditionActive || constraintQualified || !updateRef.current) return;
    let timer: number | null = null;
    let visibleRatio = 0;
    const isEligible = () => exposureEligible(visibleRatio, document.visibilityState === "visible", document.hasFocus(), 0.8);
    const cancelPending = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };
    const evaluate = () => {
      if (!isEligible()) {
        cancelPending();
        return;
      }
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        if (isEligible()) qualifyConstraint();
      }, 500);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visibleRatio = entry.intersectionRatio;
      evaluate();
    }, { threshold: [0, 0.8, 1] });
    observer.observe(updateRef.current);
    document.addEventListener("visibilitychange", evaluate);
    window.addEventListener("focus", evaluate);
    window.addEventListener("blur", evaluate);
    return () => {
      observer.disconnect();
      cancelPending();
      document.removeEventListener("visibilitychange", evaluate);
      window.removeEventListener("focus", evaluate);
      window.removeEventListener("blur", evaluate);
    };
  }, [conditionActive, constraintQualified, qualifyConstraint]);

  useEffect(() => {
    if (!constraintQualified || phase !== "main_task") return;
    const activeViews = new Map<Element, { viewId: string; factId: FactId; startedAt: number }>();
    const endView = (element: Element, reason: string) => {
      const active = activeViews.get(element);
      if (!active) return;
      appendEvent("fact_view_ended", "system", "task", {
        view_instance_id: active.viewId,
        fact_id: active.factId,
        content_hash: stableHash(FACTS[active.factId].detail),
        surface: "history",
        initiation: "scroll",
        duration_ms: Math.max(0, Math.round(performance.now() - active.startedAt)),
        end_reason: reason,
        post_terminal: terminalRef.current.status === "locked",
      });
      activeViews.delete(element);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.getAttribute("data-fact-id") as FactId | null;
        if (!id) continue;
        const eligible = entry.intersectionRatio >= 0.5 && document.visibilityState === "visible" && document.hasFocus();
        if (eligible && !activeViews.has(entry.target)) {
          const viewId = crypto.randomUUID();
          const startedAt = performance.now();
          activeViews.set(entry.target, { viewId, factId: id, startedAt });
          appendEvent("fact_view_started", "system", "task", {
            view_instance_id: viewId,
            fact_id: id,
            content_hash: stableHash(FACTS[id].detail),
            surface: "history",
            initiation: "scroll",
          });
        } else if (!eligible) endView(entry.target, "left_viewport_or_focus");
      }
    }, { threshold: [0, 0.5, 1] });
    const elements = document.querySelectorAll("[data-fact-id][data-fact-surface='history']");
    elements.forEach((element) => observer.observe(element));
    const closeAll = () => activeViews.forEach((_value, element) => endView(element, "visibility_or_focus_change"));
    document.addEventListener("visibilitychange", closeAll);
    window.addEventListener("blur", closeAll);
    return () => {
      observer.disconnect();
      closeAll();
      document.removeEventListener("visibilitychange", closeAll);
      window.removeEventListener("blur", closeAll);
    };
  }, [appendEvent, constraintQualified, phase]);

  useEffect(() => {
    if (!constraintQualified || phase !== "main_task") return;
    const activeViews = new Map<Element, { viewId: string; factId: FactId; startedAt: number }>();
    const observed = new Set<Element>();
    const endView = (element: Element, reason: string) => {
      const active = activeViews.get(element);
      if (!active) return;
      appendEvent("fact_view_ended", "system", "chat", {
        view_instance_id: active.viewId,
        fact_id: active.factId,
        content_hash: stableHash(FACTS[active.factId].detail),
        surface: "requested_agent_reply",
        initiation: "explicit_chat_request",
        duration_ms: Math.max(0, Math.round(performance.now() - active.startedAt)),
        end_reason: reason,
        post_terminal: terminalRef.current.status === "locked",
      });
      activeViews.delete(element);
    };
    const evaluate = (element: Element, ratio?: number) => {
      const id = element.getAttribute("data-fact-id") as FactId | null;
      if (!id) return;
      const rect = element.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const actualRatio = ratio ?? (rect.height > 0 ? visibleHeight / rect.height : 0);
      const eligible = actualRatio >= 0.5 && document.visibilityState === "visible" && document.hasFocus() && terminalRef.current.status === "open";
      if (eligible && !activeViews.has(element)) {
        const viewId = crypto.randomUUID();
        activeViews.set(element, { viewId, factId: id, startedAt: performance.now() });
        appendEvent("fact_view_started", "system", "chat", {
          view_instance_id: viewId,
          fact_id: id,
          content_hash: stableHash(FACTS[id].detail),
          surface: "requested_agent_reply",
          initiation: "explicit_chat_request",
        });
      } else if (!eligible) endView(element, "left_viewport_or_focus");
    };
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => evaluate(entry.target, entry.intersectionRatio)), { threshold: [0, 0.5, 1] });
    const register = (root: ParentNode) => {
      const candidates: Element[] = [];
      if (root instanceof Element && root.matches("[data-fact-surface='requested_agent_reply']")) candidates.push(root);
      root.querySelectorAll?.("[data-fact-surface='requested_agent_reply']").forEach((element) => candidates.push(element));
      candidates.forEach((element) => {
        if (observed.has(element)) return;
        observed.add(element);
        observer.observe(element);
      });
    };
    register(document);
    const mutation = new MutationObserver((records) => records.forEach((record) => {
      record.addedNodes.forEach((node) => { if (node instanceof Element) register(node); });
      record.removedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        const removed = [node, ...node.querySelectorAll("[data-fact-surface='requested_agent_reply']")];
        removed.forEach((element) => {
          endView(element, "content_removed");
          observer.unobserve(element);
          observed.delete(element);
        });
      });
    }));
    mutation.observe(document.body, { childList: true, subtree: true });
    const reevaluate = () => observed.forEach((element) => evaluate(element));
    document.addEventListener("visibilitychange", reevaluate);
    window.addEventListener("focus", reevaluate);
    window.addEventListener("blur", reevaluate);
    return () => {
      mutation.disconnect();
      observer.disconnect();
      activeViews.forEach((_value, element) => endView(element, "observer_cleanup"));
      document.removeEventListener("visibilitychange", reevaluate);
      window.removeEventListener("focus", reevaluate);
      window.removeEventListener("blur", reevaluate);
    };
  }, [appendEvent, constraintQualified, phase]);

  useEffect(() => {
    const element = factPopupElementRef.current;
    if (!activeFact || !element || !constraintQualified || phase !== "main_task") return;
    const evaluate = (ratio?: number) => {
      const rect = element.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const actualRatio = ratio ?? (rect.height > 0 ? visibleHeight / rect.height : 0);
      const eligible = actualRatio >= 0.5 && document.visibilityState === "visible" && document.hasFocus() && terminalRef.current.status === "open";
      if (eligible && !activePopupRef.current) {
        const viewId = crypto.randomUUID();
        activePopupRef.current = { viewId, factId: activeFact, startedAt: performance.now() };
        appendEvent("fact_view_started", "system", "widget", {
          view_instance_id: viewId,
          fact_id: activeFact,
          content_hash: stableHash(FACTS[activeFact].detail),
          surface: "widget_popup",
          initiation: "popup",
        });
      } else if (!eligible && activePopupRef.current) {
        const active = activePopupRef.current;
        appendEvent("fact_view_ended", "system", "widget", {
          view_instance_id: active.viewId,
          fact_id: active.factId,
          content_hash: stableHash(FACTS[active.factId].detail),
          surface: "widget_popup",
          initiation: "popup",
          duration_ms: Math.max(0, Math.round(performance.now() - active.startedAt)),
          end_reason: "left_viewport_or_focus",
          post_terminal: terminalRef.current.status === "locked",
        });
        activePopupRef.current = null;
      }
    };
    const observer = new IntersectionObserver(([entry]) => evaluate(entry.intersectionRatio), { threshold: [0, 0.5, 1] });
    observer.observe(element);
    const reevaluate = () => evaluate();
    document.addEventListener("visibilitychange", reevaluate);
    window.addEventListener("focus", reevaluate);
    window.addEventListener("blur", reevaluate);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", reevaluate);
      window.removeEventListener("focus", reevaluate);
      window.removeEventListener("blur", reevaluate);
    };
  }, [activeFact, appendEvent, constraintQualified, phase]);

  useEffect(() => {
    if (phase === "unaided_probe") appendEvent("unaided_probe_exposed", "system", "probe", { fields: STRATEGY_FIELDS.map((field) => field.key) }, "P1");
  }, [appendEvent, phase]);

  useEffect(() => {
    if (phase !== "aided_probe" || !frozenContext) return;
    const seeded = makeSeededProbe(frozenContext.strategy, participantHashRef.current, configRef.current.probeVariantIndex);
    const setupKey = `${frozenContext.contextId}:${seeded.variantId}`;
    if (probeSetupKeyRef.current === setupKey) return;
    probeSetupKeyRef.current = setupKey;
    const exposedAt = Math.round(performance.now());
    const deadlineAt = configRef.current.lMs === null ? null : exposedAt + configRef.current.lMs;
    probeTerminalRef.current = { status: "open", variantId: seeded.variantId, deadlineAt };
    setProbeMeta(seeded);
    setAidedStrategy({ ...seeded.summary });
    appendEvent("aided_probe_exposed", "system", "probe", {
      probe_variant_id: seeded.variantId,
      seeded_field: seeded.seededField,
      l_ms: configRef.current.lMs,
      probe_exposed_at_monotonic_ms: exposedAt,
      probe_deadline_at_monotonic_ms: deadlineAt,
      probe_assignment_source: configRef.current.probeVariantIndex === null ? "participant_hash" : "counterbalanced_url_assignment",
      sv0: seeded.summary,
    }, "P2", exposedAt);
    if (deadlineAt !== null) {
      const fireAtAbsoluteDeadline = () => {
        const remaining = deadlineAt - performance.now();
        if (remaining > 0) {
          probeTimerRef.current = window.setTimeout(fireAtAbsoluteDeadline, remaining);
          return;
        }
        winProbeDeadline(Math.round(performance.now()), "timer");
      };
      probeTimerRef.current = window.setTimeout(fireAtAbsoluteDeadline, Math.max(0, deadlineAt - performance.now()));
    }
  }, [appendEvent, frozenContext, phase, winProbeDeadline]);

  const startTask = () => {
    if (!condition || !config) return;
    setPhase("history");
    roundRef.current = "00";
    appendEvent("session_started", "system", "task", {
      app_build_hash: APP_BUILD_VERSION,
      scenario_version: SCENARIO_VERSION,
      parser_version: PARSER_VERSION,
      metric_config_version: METRIC_CONFIG_VERSION,
      h_ms: config.hMs,
      l_ms: config.lMs,
      probe_variant_index: config.probeVariantIndex,
      assignment_id: config.assignmentId,
    }, "00");
    appendEvent("condition_assigned", "system", "task", { assignment_id: config.assignmentId }, "00");
    appendEvent("round_exposed", "system", "task", { round_id: "00" }, "00");
    appendEvent("round_exposed", "system", "task", { round_id: "01" }, "01");
  };

  const exposeRound = (historyStep: number) => {
    setHistoryRound(historyStep);
    roundRef.current = String(historyStep + 1).padStart(2, "0");
    appendEvent("round_exposed", "system", "task", { round_id: roundRef.current });
    window.setTimeout(() => document.querySelector(`[data-round='${roundRef.current}']`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  };

  const submitProvisional = () => {
    const length = countCharacters(provisionalReason);
    if (!provisionalStock || length < 8) return;
    roundRef.current = "07";
    appendEvent("provisional_decision_submitted", "participant", "task", {
      stock: provisionalStock,
      rationale: provisionalReason.trim(),
      rationale_length: length,
    }, "07");
    appendEvent("interaction_condition_activated", "system", "task", { assignment_id: configRef.current.assignmentId }, "07");
    setConditionActive(true);
    setPhase("main_task");
    roundRef.current = "08";
    appendEvent("round_exposed", "system", "task", { round_id: "08" }, "08");
    window.setTimeout(() => updateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  };

  const chooseProvisionalStock = (stock: StockId) => {
    setProvisionalStock(stock);
    appendEvent("provisional_stock_selected", "participant", "task", { stock }, "07");
  };

  const chooseFinalStock = (stock: StockId) => {
    if (!ensureMainTaskOpen()) return;
    setFinalStock(stock);
    setFinalError("");
    appendEvent("final_stock_selected", "participant", "task", { stock }, "11");
  };

  const closeActiveFact = (reason = "popup_closed") => {
    const active = activePopupRef.current;
    if (active) {
      appendEvent("fact_view_ended", "system", "widget", {
        view_instance_id: active.viewId,
        fact_id: active.factId,
        content_hash: stableHash(FACTS[active.factId].detail),
        surface: "widget_popup",
        initiation: "popup",
        duration_ms: Math.max(0, Math.round(performance.now() - active.startedAt)),
        end_reason: reason,
      });
      activePopupRef.current = null;
    }
    setActiveFact(null);
  };

  const openFact = (id: FactId) => {
    if (!ensureMainTaskOpen()) return;
    closeActiveFact("another_popup_opened");
    setActiveFact(id);
    appendEvent("widget_action", "participant", "widget", { action: "open_fact", fact_id: id });
    window.setTimeout(() => factPopupElementRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30);
  };

  const focusFact = (id: FactId, surface: "chat" | "widget", cause?: CauseMeta) => {
    if (!ensureMainTaskOpen()) return;
    const widgetCause = surface === "widget"
      ? appendEvent("widget_action", "participant", "widget", { action: "focus_fact", fact_id: id })
      : null;
    if (focusedRef.current.includes(id)) return;
    const next = [...focusedRef.current, id];
    focusedRef.current = next;
    setFocused(next);
    appendEvent("focus_set_snapshot", "participant", surface, {
      fact_ids: next,
      action: "add",
      changed_fact_id: id,
      cause_event_id: cause?.causeEventId ?? widgetCause?.event_id ?? null,
      message_id: cause?.messageId ?? null,
    });
  };

  const changeEvidence = (id: FactId, action: "add" | "remove", surface: "chat" | "widget", cause?: CauseMeta) => {
    if (!ensureMainTaskOpen()) return;
    const widgetCause = surface === "widget"
      ? appendEvent("widget_action", "participant", "widget", { action: `${action}_evidence`, fact_id: id })
      : null;
    const current = evidenceRef.current.factIds;
    const next = action === "add" ? (current.includes(id) ? current : [...current, id]) : current.filter((factId) => factId !== id);
    if (next.length === current.length && next.every((value, index) => value === current[index])) {
      return;
    }
    const version = evidenceRef.current.version + 1;
    evidenceRef.current = { version, factIds: next };
    setEvidence([...next]);
    setEvidenceVersion(version);
    appendEvent("evidence_confirmed_snapshot", "participant", surface, {
      evidence_version: version,
      fact_ids: next,
      action,
      changed_fact_id: id,
      cause_event_id: cause?.causeEventId ?? widgetCause?.event_id ?? null,
      message_id: cause?.messageId ?? null,
    });
  };

  const updateDraft = <K extends StrategyField>(key: K, value: StrategyState[K]) => {
    if (!ensureMainTaskOpen()) return;
    const next = { ...strategyDraft, [key]: value };
    const cause = appendEvent("widget_action", "participant", "widget", { action: "edit_strategy_field", field: key, value });
    setStrategyDraft(next);
    setDiffOpen(false);
    setStrategyHints([]);
    appendEvent("strategy_draft_snapshot", "participant", "widget", {
      draft_id: stableHash(canonicalJson(next)),
      base_strategy_version: strategyRef.current.version,
      fields: next,
      changed_field: key,
      cause_event_id: cause.event_id,
    });
  };

  const confirmStrategy = (next: StrategyState, surface: "chat" | "widget", confirmationType: "changed" | "unchanged" | "undo", cause?: CauseMeta) => {
    if (!ensureMainTaskOpen()) return;
    const widgetCause = surface === "widget"
      ? appendEvent("widget_action", "participant", "widget", { action: "confirm_strategy", confirmation_type: confirmationType })
      : null;
    const current = strategyRef.current;
    const version = current.version + 1;
    const previous = { ...current.fields };
    strategyRef.current = { version, fields: { ...next } };
    strategyHistoryRef.current = [...strategyHistoryRef.current, previous];
    setStrategyHistory((history) => [...history, previous]);
    setStrategy({ ...next });
    setStrategyDraft({ ...next });
    setStrategyVersion(version);
    setPendingChatStrategy(null);
    setDiffOpen(false);
    setStatusNotice(`Strategy V${version} 已确认`);
    postConfirmRef.current += 1;
    setPostT0StrategyConfirmCount(postConfirmRef.current);
    appendEvent("strategy_confirmed_snapshot", "participant", surface, {
      strategy_version: version,
      fields: next,
      confirmation_type: confirmationType,
      cause_event_id: cause?.causeEventId ?? widgetCause?.event_id ?? null,
      message_id: cause?.messageId ?? null,
    });
  };

  const undoStrategy = (surface: "chat" | "widget", cause?: CauseMeta) => {
    if (!ensureMainTaskOpen() || strategyHistoryRef.current.length === 0) return false;
    const widgetCause = surface === "widget"
      ? appendEvent("widget_action", "participant", "widget", { action: "undo_strategy" })
      : null;
    const restored = strategyHistoryRef.current[strategyHistoryRef.current.length - 1];
    const version = strategyRef.current.version + 1;
    strategyRef.current = { version, fields: { ...restored } };
    strategyHistoryRef.current = strategyHistoryRef.current.slice(0, -1);
    setStrategyHistory((history) => history.slice(0, -1));
    setStrategy({ ...restored });
    setStrategyDraft({ ...restored });
    setStrategyVersion(version);
    setPendingChatStrategy(null);
    setDiffOpen(false);
    postConfirmRef.current += 1;
    setPostT0StrategyConfirmCount(postConfirmRef.current);
    appendEvent("strategy_confirmed_snapshot", "participant", surface, {
      strategy_version: version,
      fields: restored,
      confirmation_type: "undo",
      cause_event_id: cause?.causeEventId ?? widgetCause?.event_id ?? null,
      message_id: cause?.messageId ?? null,
    });
    setStatusNotice(`已撤销并确认 Strategy V${version}`);
    return true;
  };

  const addMessage = (role: Message["role"], text: string, factIds?: FactId[]) => {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role, text, factIds }]);
  };

  const deliverAgentReply = (interactionId: string, text: string, purpose: string, factIds: FactId[] = []) => {
    setAgentWaiting(true);
    window.setTimeout(() => {
      if (!ensureMainTaskOpen()) {
        appendEvent("agent_response_fully_rendered", "agent", "chat", { interaction_id: interactionId, purpose, post_terminal: true });
        setAgentWaiting(false);
        return;
      }
      appendEvent("agent_first_content_rendered", "agent", "chat", { interaction_id: interactionId, purpose });
      addMessage("agent", text, factIds);
      appendEvent("agent_response_fully_rendered", "agent", "chat", { interaction_id: interactionId, purpose });
      setAgentWaiting(false);
    }, AGENT_WAIT_MS);
  };

  const consumeAgentContext = (surface: "chat" | "widget", cause?: CauseMeta) => {
    if (!ensureMainTaskOpen() || agentWaiting) return;
    roundRef.current = "10";
    const widgetCause = surface === "widget"
      ? appendEvent("widget_action", "participant", "widget", { action: "consume_confirmed_context" }, "10")
      : null;
    const interactionId = crypto.randomUUID();
    const snapshot = {
      strategyVersion: strategyRef.current.version,
      strategy: { ...strategyRef.current.fields },
      evidenceVersion: evidenceRef.current.version,
      evidence: [...evidenceRef.current.factIds],
    };
    appendEvent("agent_request_started", "participant", surface, {
      interaction_id: interactionId,
      purpose: "evidence_summary",
      fixed_wait_ms: AGENT_WAIT_MS,
      cause_event_id: cause?.causeEventId ?? widgetCause?.event_id ?? null,
      message_id: cause?.messageId ?? null,
    }, "10");
    const consumed = appendEvent("agent_context_consumed", "agent", "chat", {
      interaction_id: interactionId,
      purpose: "evidence_summary",
      template_id: "confirmed_state_summary-v2.1",
      strategy_version: snapshot.strategyVersion,
      strategy_fields: snapshot.strategy,
      evidence_version: snapshot.evidenceVersion,
      evidence_fact_ids: snapshot.evidence,
      cause_event_id: cause?.causeEventId ?? widgetCause?.event_id ?? null,
      message_id: cause?.messageId ?? null,
    }, "10");
    lastAgentContextRef.current = { eventId: consumed.event_id, interactionId, ...snapshot };
    const evidenceText = snapshot.evidence.length === 0
      ? "当前Strategy已应用，但你还没有确认任何决策依据。我不会自动把前文信息加入判断。你可以返回前文补充依据，也可以继续完成最终判断。"
      : `当前已确认的Strategy为：${strategySummary(snapshot.strategy)}以下说明只使用你已经加入的决策依据：${snapshot.evidence.map((id) => `${FACTS[id].stock}「${FACTS[id].label}」`).join("；")}。这些依据目前覆盖：${[...new Set(snapshot.evidence.map((id) => FACTS[id].targetDimension).filter(Boolean))].join("、") || "未覆盖目标维度"}。未加入依据的早期信息不会被自动补充。`;
    addMessage("marker", "ROUND 10 · Agent消费已确认状态");
    if (surface === "widget") addMessage("user", "使用我已经确认的Strategy和Evidence继续分析。");
    deliverAgentReply(interactionId, evidenceText, "evidence_summary");
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || agentWaiting || !ensureMainTaskOpen()) return;
    setChatInput("");
    addMessage("user", text);
    roundRef.current = "09";
    const messageId = crypto.randomUUID();
    appendEvent("chat_message_submitted", "participant", "chat", { message_id: messageId, text, input_length: countCharacters(text) }, "09");
    const factOps = parseFactOperations(text);
    const conflictingFactIds = factOps.add.filter((id) => factOps.remove.includes(id));
    const addFacts = factOps.add.filter((id) => !conflictingFactIds.includes(id));
    const removeFacts = factOps.remove.filter((id) => !conflictingFactIds.includes(id));
    const derived = deriveExplicitStrategy(text, strategyRef.current.fields);
    const hasStrategyIntent = derived.changedFields.length > 0 || /策略|调整|改|设为|优先|资金需求|研究期限|总体视角|更(?:加)?(?:看重|重视)|难接受/.test(text);
    const wantsUndo = /撤销|undo/i.test(text);
    const wantsState = /当前策略|策略是什么|总结策略|查看策略/.test(text);
    const wantsConsume = /使用.{0,8}依据|消费.{0,8}依据|根据.{0,8}依据|汇总.{0,8}依据/.test(text);
    const explicitDraftConfirmation = isExplicitDraftConfirmation(text);
    const confirmsPending = explicitDraftConfirmation && pendingChatStrategy !== null;
    const confirmsUnchanged = !confirmsPending && /(保持|沿用|继续使用).{0,8}(当前|原来|不变|策略).{0,8}(确认|可以|继续)|确认.{0,8}(保持|沿用|当前策略)/.test(text);
    const actions: Record<string, unknown>[] = [];
    if (wantsUndo) actions.push({ type: "strategy_undo" });
    if (wantsState) actions.push({ type: "query_state" });
    if (wantsConsume) actions.push({ type: "consume_context" });
    if (confirmsPending) actions.push({ type: "confirm_strategy", fields: pendingChatStrategy });
    else if (confirmsUnchanged) actions.push({ type: "confirm_strategy", fields: strategyRef.current.fields });
    else if (hasStrategyIntent && derived.changedFields.length > 0) actions.push(...derived.changedFields.map((field) => ({ type: "strategy_set", field, value: derived.next[field] })));
    actions.push(...removeFacts.map((id) => ({ type: "evidence_remove", fact_id: id })));
    actions.push(...addFacts.map((id) => ({ type: "evidence_add", fact_id: id })));
    actions.push(...factOps.focus.map((id) => ({ type: "focus_add", fact_id: id })));
    actions.push(...factOps.query.map((id) => ({ type: "query_fact", fact_id: id })));
    const consumeConflict = wantsConsume && actions.some((action) => action.type !== "consume_context");
    if (factOps.ambiguousClauses.length > 0 || conflictingFactIds.length > 0 || consumeConflict || actions.length === 0) actions.push({ type: "clarification" });

    const parseEvent = appendEvent("chat_parse_result", "system", "chat", {
      message_id: messageId,
      parser_version: PARSER_VERSION,
      actions,
      ambiguity_detected: actions.some((action) => action.type === "clarification"),
      ambiguous_clauses: factOps.ambiguousClauses,
      conflicting_fact_ids: conflictingFactIds,
      consume_conflict: consumeConflict,
      result: actions.some((action) => action.type === "clarification") ? "clarification" : "applied",
    }, "09");
    const cause = { causeEventId: parseEvent.event_id, messageId };
    const replyParts: string[] = [];
    let purpose = "clarification";
    let replyFacts: FactId[] = [];

    if (wantsUndo) {
      const succeeded = undoStrategy("chat", cause);
      replyParts.push(succeeded ? `已撤销最近一次确认。当前策略：${strategySummary(strategyRef.current.fields)}` : "当前没有可撤销的Strategy版本。");
      purpose = "strategy_confirmation";
    }
    if (confirmsPending && pendingChatStrategy) {
      const changed = canonicalJson(pendingChatStrategy) !== canonicalJson(strategyRef.current.fields);
      confirmStrategy(pendingChatStrategy, "chat", changed ? "changed" : "unchanged", cause);
      replyParts.push(`已确认 Strategy V${strategyRef.current.version}：${strategySummary(strategyRef.current.fields)}`);
      purpose = "strategy_confirmation";
    } else if (confirmsUnchanged) {
      confirmStrategy({ ...strategyRef.current.fields }, "chat", "unchanged", cause);
      replyParts.push(`已确认继续使用 Strategy V${strategyRef.current.version}：${strategySummary(strategyRef.current.fields)}`);
      purpose = "strategy_confirmation";
    } else if (hasStrategyIntent && derived.changedFields.length > 0) {
      setPendingChatStrategy(derived.next);
      appendEvent("strategy_draft_snapshot", "participant", "chat", {
        draft_id: stableHash(canonicalJson(derived.next)),
        base_strategy_version: strategyRef.current.version,
        fields: derived.next,
        changed_fields: derived.changedFields,
        cause_event_id: parseEvent.event_id,
        message_id: messageId,
      }, "09");
      replyParts.push(`我理解你明确提出的修改是：${strategySummary(derived.next)}未提及字段保持当前状态。是否确认？`);
      purpose = "strategy_confirmation";
    }
    removeFacts.forEach((id) => changeEvidence(id, "remove", "chat", cause));
    if (removeFacts.length > 0) {
      replyParts.push(`已从当前依据中移除：${removeFacts.map((id) => `${FACTS[id].stock}「${FACTS[id].label}」`).join("、")}。`);
      purpose = "evidence_update";
    }
    addFacts.forEach((id) => changeEvidence(id, "add", "chat", cause));
    if (addFacts.length > 0) {
      replyParts.push(`已记录为当前判断依据：${addFacts.map((id) => `${FACTS[id].stock}「${FACTS[id].label}」`).join("、")}。记录依据不会自动修改Strategy。`);
      purpose = "evidence_update";
    }
    factOps.focus.forEach((id) => focusFact(id, "chat", cause));
    if (factOps.focus.length > 0) {
      replyParts.push(`已关注：${factOps.focus.map((id) => `${FACTS[id].stock}「${FACTS[id].label}」`).join("、")}。关注不会自动成为Evidence或修改Strategy。`);
      purpose = "focus_update";
    }
    if (wantsState) {
      replyParts.push(`当前 Strategy V${strategyRef.current.version}：${strategySummary(strategyRef.current.fields)}`);
      purpose = "state_lookup";
    }
    if (factOps.query.length > 0) {
      replyFacts = factOps.query;
      replyParts.push(factOps.query.map((id) => FACTS[id].detail).join(" "));
      purpose = "fact_lookup";
    }
    if (actions.some((action) => action.type === "clarification")) {
      replyParts.push("有一部分指令存在歧义或缺少可识别的股票与事实。请把每个操作写成独立分句，例如“把BETA经营现金流加入依据；将下行风险优先级设为高”。");
    }
    if (wantsConsume && !actions.some((action) => action.type === "clarification")) {
      consumeAgentContext("chat", cause);
      return;
    }
    const interactionId = crypto.randomUUID();
    appendEvent("agent_request_started", "participant", "chat", { interaction_id: interactionId, purpose, fixed_wait_ms: AGENT_WAIT_MS, cause_event_id: parseEvent.event_id, message_id: messageId }, "09");
    deliverAgentReply(interactionId, replyParts.join(" "), purpose, replyFacts);
  };

  const submitFinal = () => {
    const requestAtMonotonicMs = Math.round(performance.now());
    roundRef.current = "11";
    const submissionId = crypto.randomUUID();
    const validation = validateFinalSubmission({ stock: finalStock, rationale: finalReason, postT0StrategyConfirmCount: postConfirmRef.current });
    const payload = { submission_id: submissionId, final_stock: finalStock, rationale: finalReason.trim() };
    const payloadHash = stableHash(canonicalJson(payload));
    appendEvent("final_submit_requested", "participant", "task", {
      ...payload,
      rationale_length: validation.length,
      payload_hash: payloadHash,
      validation_version: "final-v2.1",
      validation_passed: validation.valid,
      validation_errors: validation.reasons,
    }, "11", requestAtMonotonicMs);

    if (terminalRef.current.status === "locked") {
      appendEvent("final_submit_rejected", "system", "task", {
        submission_id: submissionId,
        reason: terminalRef.current.winner === "deadline" ? "deadline" : "terminal_already_locked",
        terminal_lock_event_id: terminalRef.current.terminalLockEventId,
      }, "11", requestAtMonotonicMs);
      return;
    }

    const t0 = constraintAtRef.current;
    if (t0 === null) {
      appendEvent("final_submit_rejected", "system", "task", { submission_id: submissionId, reason: "constraint_clock_missing" }, "11", requestAtMonotonicMs);
      return;
    }
    const rejectForDeadline = (at: number) => {
      const deadlineEvent = winDeadline("late_submit", at);
      appendEvent("final_submit_rejected", "system", "task", {
        submission_id: submissionId,
        reason: "deadline",
        terminal_lock_event_id: deadlineEvent?.event_id ?? (terminalRef.current.status === "locked" ? terminalRef.current.terminalLockEventId : null),
      }, "11", at);
    };
    if (deadlineReached(requestAtMonotonicMs, deadlineAtRef.current)) {
      rejectForDeadline(requestAtMonotonicMs);
      return;
    }
    if (!validation.valid) {
      appendEvent("final_submit_rejected", "system", "task", { submission_id: submissionId, reason: "validation", validation_errors: validation.reasons }, "11", requestAtMonotonicMs);
      setFinalError(validation.reasons.includes("strategy_not_confirmed_after_t0")
        ? "提交前需要明确确认一次当前Strategy；可以确认未修改或不完整的Strategy。"
        : validation.reasons.includes("stock_missing")
          ? "请选择一只股票。"
          : validation.reasons.includes("rationale_too_short")
            ? `理由还需输入 ${100 - validation.length} 个字符。`
            : `理由超出 ${validation.length - 150} 个字符。`);
      return;
    }

    endPopupForTerminal(Math.round(performance.now()));
    const lockAtMonotonicMs = Math.round(performance.now());
    if (deadlineReached(lockAtMonotonicMs, deadlineAtRef.current)) {
      rejectForDeadline(lockAtMonotonicMs);
      return;
    }
    const contextId = crypto.randomUUID();
    const lockEvent = appendEvent("final_submit_lock_acquired", "system", "task", {
      submission_id: submissionId,
      payload_hash: payloadHash,
      context_id: contextId,
    }, "11", lockAtMonotonicMs);
    terminalRef.current = { status: "locked", winner: "submit", contextId, terminalLockEventId: lockEvent.event_id };
    if (deadlineTimerRef.current !== null) window.clearTimeout(deadlineTimerRef.current);
    freezeContext("final_submit_lock_acquired", lockEvent, contextId, lockAtMonotonicMs);
    appendEvent("final_submission_received", "system", "task", {
      submission_id: submissionId,
      payload_hash: payloadHash,
      context_id: contextId,
    }, "11", lockAtMonotonicMs);
    setFinalError("");
    setPhase("questionnaire");
  };

  const submitQuestionnaire = () => {
    const allTlx = tlxQuestions.every(([id]) => typeof tlxAnswers[id] === "number");
    const allMechanism = mechanismQuestions.every(([id]) => typeof mechanismAnswers[id] === "number");
    if (!allTlx || !allMechanism) return;
    appendEvent("questionnaire_submitted", "participant", "questionnaire", {
      reference_period: "t0_to_terminal",
      rtlx: tlxAnswers,
      rtlx_total: Object.values(tlxAnswers).reduce((sum, value) => sum + value, 0) / tlxQuestions.length,
      mechanism_items: mechanismAnswers,
    }, "Q1");
    setPhase("unaided_probe");
  };

  const submitUnaidedProbe = () => {
    if (!STRATEGY_FIELDS.every((field) => unaidedStrategy[field.key])) return;
    appendEvent("unaided_probe_submitted", "participant", "probe", {
      sb: unaidedStrategy,
      state_confidence: stateConfidence,
    }, "P1");
    setPhase("aided_probe");
  };

  const performStateLookup = (requestedMode: "chat" | "widget") => {
    const actionAt = Math.round(performance.now());
    const mode = conditionRef.current === "chat_only" ? "chat" : requestedMode;
    if (!frozenContext || lookupQualified || lookupWaiting || lookupVisible || !ensureAidedProbeOpen(actionAt)) return;
    setLookupMode(mode);
    appendEvent("state_lookup_started", "participant", mode, {
      context_id: frozenContext.contextId,
    }, "P2", actionAt);
    if (mode === "chat") {
      const interactionId = crypto.randomUUID();
      setLookupWaiting(true);
      appendEvent("agent_request_started", "participant", "chat", {
        interaction_id: interactionId,
        purpose: "aided_state_lookup",
        fixed_wait_ms: AGENT_WAIT_MS,
      }, "P2", actionAt);
      window.setTimeout(() => {
        if (!ensureAidedProbeOpen()) {
          setLookupWaiting(false);
          return;
        }
        appendEvent("agent_first_content_rendered", "agent", "chat", { interaction_id: interactionId, purpose: "aided_state_lookup" }, "P2");
        setLookupVisible(true);
        setLookupWaiting(false);
        appendEvent("agent_response_fully_rendered", "agent", "chat", { interaction_id: interactionId, purpose: "aided_state_lookup" }, "P2");
        window.setTimeout(() => lookupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
      }, AGENT_WAIT_MS);
      return;
    }
    setLookupVisible(true);
    window.setTimeout(() => lookupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
  };

  useEffect(() => {
    if (phase !== "aided_probe" || !lookupVisible || lookupQualified || !frozenContext || !lookupRef.current) return;
    let timer: number | null = null;
    let visibleRatio = 0;
    let completed = false;
    const isEligible = () => exposureEligible(visibleRatio, document.visibilityState === "visible", document.hasFocus(), 0.5);
    const cancelPending = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };
    const evaluate = () => {
      if (!isEligible()) {
        cancelPending();
        return;
      }
      if (timer !== null || completed) return;
      timer = window.setTimeout(() => {
        timer = null;
        if (!isEligible() || completed || !ensureAidedProbeOpen()) return;
        completed = true;
        appendEvent("state_lookup_content_visible", "system", lookupMode ?? "widget", {
          context_id: frozenContext.contextId,
          visible_ratio: visibleRatio,
          continuous_visible_ms: 500,
        }, "P2");
        setLookupQualified(true);
      }, 500);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visibleRatio = entry.intersectionRatio;
      evaluate();
    }, { threshold: [0, 0.5, 1] });
    observer.observe(lookupRef.current);
    document.addEventListener("visibilitychange", evaluate);
    window.addEventListener("focus", evaluate);
    window.addEventListener("blur", evaluate);
    return () => {
      observer.disconnect();
      cancelPending();
      document.removeEventListener("visibilitychange", evaluate);
      window.removeEventListener("focus", evaluate);
      window.removeEventListener("blur", evaluate);
    };
  }, [appendEvent, ensureAidedProbeOpen, frozenContext, lookupMode, lookupQualified, lookupVisible, phase]);

  const submitAidedProbe = () => {
    const actionAt = Math.round(performance.now());
    if (!aidedStrategy || !probeMeta || !lookupQualified || !ensureAidedProbeOpen(actionAt)) return;
    probeTerminalRef.current = { status: "locked", winner: "submit", variantId: probeMeta.variantId };
    if (probeTimerRef.current !== null) window.clearTimeout(probeTimerRef.current);
    appendEvent("aided_probe_submitted", "participant", "probe", {
      probe_variant_id: probeMeta.variantId,
      sv: aidedStrategy,
      lookup_qualified: true,
    }, "P2", actionAt);
    appendEvent("session_completed", "system", "task", { context_id: frozenContext?.contextId ?? null }, "END", actionAt);
    setPhase("complete");
  };

  const exportLog = () => {
    const body = eventsRef.current.map((event) => JSON.stringify(event)).join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "application/x-ndjson;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stock-${sessionRef.current}.events.jsonl`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const widgetActive = conditionActive && constraintQualified && condition === "chat_widget" && phase === "main_task";
  const taskInteractive = conditionActive && constraintQualified && phase === "main_task";
  const changedFields = STRATEGY_FIELDS.filter(({ key }) => strategyDraft[key] !== strategy[key]);
  const provisionalLength = countCharacters(provisionalReason);
  const rationaleLength = countCharacters(finalReason);
  const finalLengthMessage = rationaleLength === 0
    ? "请输入100—150个字符"
    : rationaleLength < 100
      ? `还需 ${100 - rationaleLength} 个字符`
      : rationaleLength > 150
        ? `超出 ${rationaleLength - 150} 个字符`
        : "字数符合要求";
  const questionnaireReady = tlxQuestions.every(([id]) => typeof tlxAnswers[id] === "number")
    && mechanismQuestions.every(([id]) => typeof mechanismAnswers[id] === "number");
  const unaidedReady = STRATEGY_FIELDS.every((field) => unaidedStrategy[field.key]);

  const currentProgress = useMemo(() => {
    if (phase === "briefing" || phase === "history") return 1;
    if (!conditionActive) return 2;
    if (phase === "main_task") return postT0StrategyConfirmCount > 0 ? 4 : 3;
    return 5;
  }, [conditionActive, phase, postT0StrategyConfirmCount]);

  if (!condition || !config) return <main className="app-shell loading-shell" aria-live="polite">正在准备实验任务…</main>;

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-mark">S</div>
      <div className="brand-copy"><p className="eyebrow">STOCK INTENT LAB · V2.1</p><h1>信息复用与意图调整实验</h1></div>
      {config.preview && <div className="condition-switch" aria-label="研究者条件预览">
        <span>研究者预览</span>
        <button className={condition === "chat_only" ? "active" : ""} disabled={phase !== "briefing"} onClick={() => resetRuntime("chat_only")}>Chat-only</button>
        <button className={condition === "chat_widget" ? "active" : ""} disabled={phase !== "briefing"} onClick={() => resetRuntime("chat_widget")}>Chat + Widget</button>
      </div>}
    </header>

    <section className="scenario-strip"><span>虚构数据</span><p>请按顺序完成任务；系统不会执行真实交易，也不会替你给出唯一答案。</p>{config.preview && <button type="button" onClick={() => resetRuntime(condition)}>重新开始预览</button>}</section>

    {phase === "briefing" ? <section className="briefing">
      <p className="eyebrow">EXPERIMENT BRIEF</p>
      <h2>选择一只值得进一步研究的虚构股票</h2>
      <p>请在ALFA、BETA、GAMMA三只虚构股票中选择一只值得进一步研究的股票。你当前的计划是持有约一年，风险偏好适中，希望兼顾增长与稳定。</p>
      <button className="primary-button" type="button" onClick={startTask}>开始任务 <span>→</span></button>
    </section> : phase === "questionnaire" ? <section className="posttask-shell">
      <p className="object-type">POST-TASK · QUESTIONNAIRE</p><h2>评价刚才的调整阶段</h2>
      <p>只评价从“新的资金需求”出现，到最终提交或时间结束之间的阶段；不要评价前面的共同阅读。</p>
      <div className="scale-list">
        {tlxQuestions.map(([id, label, question]) => <label className="scale-row" key={id}><span><strong>{label}</strong>{question}</span><input type="range" min="0" max="100" step="5" value={tlxAnswers[id] ?? 50} onChange={(event) => setTlxAnswers((current) => ({ ...current, [id]: Number(event.target.value) }))}/><b>{tlxAnswers[id] ?? "请滑动"}</b></label>)}
      </div>
      <h3>对交互过程的感受</h3>
      <div className="likert-list">
        {mechanismQuestions.map(([id, question]) => <label key={id}><span>{question}</span><select value={mechanismAnswers[id] ?? ""} onChange={(event) => setMechanismAnswers((current) => ({ ...current, [id]: Number(event.target.value) }))}><option value="">请选择</option>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}
      </div>
      <button className="primary-button" type="button" disabled={!questionnaireReady} onClick={submitQuestionnaire}>提交问卷并继续 <span>→</span></button>
    </section> : phase === "unaided_probe" ? <section className="posttask-shell">
      <p className="object-type">STATE CHECK · WITHOUT ASSISTANCE</p><h2>回忆任务结束时保存的Strategy</h2>
      <p>请不要返回前面的任务界面。根据你的理解，任务结束时系统保存的已确认Strategy是什么？</p>
      <StrategyEditor value={unaidedStrategy} empty onChange={(field, value) => setUnaidedStrategy((current) => ({ ...current, [field]: value }))}/>
      <label className="confidence-row">你对以上回答有多大信心？<select value={stateConfidence} onChange={(event) => setStateConfidence(Number(event.target.value))}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <button className="primary-button" type="button" disabled={!unaidedReady} onClick={submitUnaidedProbe}>提交并进入核查 <span>→</span></button>
    </section> : phase === "aided_probe" && aidedStrategy && probeMeta ? <section className="posttask-shell probe-shell">
      <p className="object-type">STATE CHECK · WITH ORIGINAL INTERACTION</p><h2>核查待确认的Strategy摘要</h2>
      <p>下面的摘要可能存在一处不一致。请使用当前界面核查，并把摘要修正为任务结束时系统实际保存的状态。</p>
      <StrategyEditor value={aidedStrategy} onChange={(field, value) => setAidedStrategy((current) => current ? ({ ...current, [field]: value }) : current)}/>
      <div className="lookup-actions"><button className="lookup-button" type="button" disabled={lookupQualified || lookupWaiting || lookupVisible} onClick={() => performStateLookup("chat")}>{lookupWaiting && lookupMode === "chat" ? "Agent正在读取已保存状态…" : "询问Agent当前保存的Strategy"}</button>{condition === "chat_widget" && <button className="lookup-button" type="button" disabled={lookupQualified || lookupWaiting || lookupVisible} onClick={() => performStateLookup("widget")}>查看冻结的Strategy Object</button>}</div>
      {lookupVisible && frozenContext && lookupMode && <div ref={lookupRef} className={lookupMode === "chat" ? "probe-chat-reply" : "probe-strategy-object"}>
        {lookupMode === "chat" ? <><AgentMark/><p>任务结束时系统保存的已确认Strategy为：{strategySummary(frozenContext.strategy)}</p></> : <><p className="object-type">FROZEN STRATEGY OBJECT</p><h3>Strategy V{frozenContext.strategyVersion}</h3>{STRATEGY_FIELDS.map((field) => <div className="frozen-field" key={field.key}><span>{field.label}</span><strong>{frozenContext.strategy[field.key]}</strong></div>)}</>}
      </div>}
      <p className={lookupQualified ? "validation-message valid" : "validation-message"}>{lookupQualified ? "已完成一次有效状态查看，可以提交核查结果。" : "提交前需要使用上方入口查看一次实际保存状态。"}</p>
      <button className="primary-button" type="button" disabled={!lookupQualified} onClick={submitAidedProbe}>提交核查结果 <span>→</span></button>
    </section> : phase === "complete" ? <section className="posttask-shell completion-screen">
      <span className="completion-mark">✓</span><p className="object-type">SESSION COMPLETE</p><h2>实验任务已完成</h2><p>感谢参与。去标识化事件日志已经保存在当前浏览器中。</p><button className="primary-button" type="button" onClick={exportLog}>导出去标识化事件日志 <span>↓</span></button>
      {config.preview && <details><summary>研究者查看事件流（{events.length}条）</summary><pre>{events.map((event) => JSON.stringify(event)).join("\n")}</pre></details>}
    </section> : <section className="workspace-shell">
      <div className="progress-strip"><span className={currentProgress >= 1 ? "current" : ""}>01 共同历史</span><i/><span className={currentProgress >= 2 ? "current" : ""}>02 初步判断</span><i/><span className={currentProgress >= 3 ? "current" : ""}>03 信息复用</span><i/><span className={currentProgress >= 4 ? "current" : ""}>04 意图调整</span><i/><span className={currentProgress >= 5 ? "current" : ""}>05 最终提交</span></div>
      <div className={widgetActive ? "experiment-grid widget-condition" : "experiment-grid"}>
        <section className="chat-lane" aria-label="任务对话">
          <div className="turn-label" data-round="00">ROUND 00 · 任务和初始Intent</div>
          <div className="user-message">请在ALFA、BETA、GAMMA三只虚构股票中选择一只值得进一步研究的股票。你当前的计划是持有约一年，风险偏好适中，希望兼顾增长与稳定。</div>
          <div className="agent-row"><AgentMark/><div className="agent-bubble"><p>我会使用固定模拟数据协助你比较三只候选股票。你当前的总体研究视角约为12个月，风险偏好适中，希望兼顾增长与稳定。我会依次提供走势、增长、估值、经营情况、风险和交易活跃度信息。</p></div></div>
          <div className="turn-separator"><span>共同只读历史</span></div>

          <div className="turn-label" data-round="01">ROUND 01 · 走势与增长</div>
          <div className="user-message">先比较三只股票的走势和增长情况。</div>
          <div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">从模拟走势图看，ALFA的整体涨幅最高，但中途波动和回撤也最大；BETA的涨幅较低，路径<FactText id="B-VOLATILITY" active={widgetActive} onOpen={openFact}/>；GAMMA的涨幅与波动居中。文字数据方面，ALFA最近一年模拟<FactText id="A-GROWTH" active={widgetActive} onOpen={openFact}/>, BETA为<FactText id="B-GROWTH" active={widgetActive} onOpen={openFact}/>, GAMMA为<FactText id="G-GROWTH" active={widgetActive} onOpen={openFact}/>。这些信息只能说明增长与价格路径的差异，还不足以形成最终判断。</p><PriceChart/></div></div>
          {historyRound < 1 && <button className="continue-button" type="button" onClick={() => exposeRound(1)}>继续：估值与财务弹性</button>}

          {historyRound >= 1 && <><div className="turn-separator"><span>上下文继续</span></div><div className="turn-label" data-round="02">ROUND 02 · 估值与财务弹性</div><div className="user-message">再比较估值和财务承受能力。</div><div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">ALFA的模拟<FactText id="A-VALUATION" active={widgetActive} onOpen={openFact}/>, 三者最高，估值对增长预期更敏感；BETA的模拟<FactText id="B-VALUATION" active={widgetActive} onOpen={openFact}/>, 三者最低；GAMMA的模拟<FactText id="G-VALUATION" active={widgetActive} onOpen={openFact}/>, 处于中间，但<FactText id="G-DEBT" active={widgetActive} onOpen={openFact}/>，财务弹性相对较弱。估值较低不等于风险一定较低，仍需结合经营和行业信息判断。</p></div></div>{historyRound < 2 && <button className="continue-button" type="button" onClick={() => exposeRound(2)}>继续：经营稳定性</button>}</>}

          {historyRound >= 2 && <><div className="turn-separator"><span>上下文继续</span></div><div className="turn-label" data-round="03">ROUND 03 · 经营稳定性和业务风险</div><div className="user-message">接着比较经营稳定性和主要业务风险。</div><div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">ALFA<FactText id="A-CONCENTRATION" active={widgetActive} onOpen={openFact}/>, 主要客户变化可能影响收入稳定性。BETA的<FactText id="B-CASHFLOW" active={widgetActive} onOpen={openFact}/>, 但<FactText id="B-CYCLE" active={widgetActive} onOpen={openFact}/>。GAMMA当前没有额外的经营稳定性信息需要补充。</p></div></div>{historyRound < 3 && <button className="continue-button" type="button" onClick={() => exposeRound(3)}>继续：交易活跃程度</button>}</>}

          {historyRound >= 3 && <><div className="turn-separator"><span>上下文继续</span></div><div className="turn-label" data-round="04">ROUND 04 · 交易可行性</div><div className="user-message">再比较三只股票的交易活跃程度。</div><div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">在固定模拟数据中，ALFA的日均<FactText id="A-LIQUIDITY" active={widgetActive} onOpen={openFact}/>, BETA<FactText id="B-LIQUIDITY" active={widgetActive} onOpen={openFact}/>, GAMMA<FactText id="G-LIQUIDITY" active={widgetActive} onOpen={openFact}/>。成交更活跃通常意味着在该模拟环境中更容易找到交易对手，但这不代表价格一定不会下跌，也不等于真实市场中的成交保证。</p></div></div>{historyRound < 4 && <button className="continue-button" type="button" onClick={() => exposeRound(4)}>继续：其他公司动态</button>}</>}

          {historyRound >= 4 && <><div className="turn-separator"><span>上下文继续</span></div><div className="turn-label" data-round="05">ROUND 05 · 弱诊断性公司进展</div><div className="user-message">最近还有其他公司动态吗？</div><div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">系统还记录了三条公司进展：ALFA宣布<FactText id="A-WEAKSIGNAL" active={widgetActive} onOpen={openFact}/>，但未披露正式订单、合作金额或预计收入；BETA宣布<FactText id="B-WEAKSIGNAL" active={widgetActive} onOpen={openFact}/>，但未说明是否形成付费合同、客户规模或收入贡献；GAMMA管理层称<FactText id="G-WEAKSIGNAL" active={widgetActive} onOpen={openFact}/>，但未披露试用数量、正式订单或实际销售数据。这些信息将与其他内容一起保留在当前记录中。</p></div></div>{historyRound < 5 && <button className="continue-button" type="button" onClick={() => exposeRound(5)}>继续：判断边界</button>}</>}

          {historyRound >= 5 && <><div className="turn-separator"><span>上下文继续</span></div><div className="turn-label" data-round="06">ROUND 06 · 判断边界</div><div className="user-message">这些信息已经足够让你直接替我选一只了吗？</div><div className="agent-row"><AgentMark/><div className="agent-bubble"><p>不能。三只股票分别体现了增长、稳定性、交易活跃度和风险之间的不同权衡。我可以帮助你保存和比较信息，但不会代替你形成唯一投资结论。请根据当前“一年左右、风险适中、兼顾增长和稳定”的目标形成一个初步判断。</p></div></div>{historyRound < 6 && <button className="continue-button" type="button" onClick={() => exposeRound(6)}>形成初步判断</button>}</>}

          {historyRound >= 6 && !conditionActive && <section className="provisional-card" data-round="07"><p className="object-type">ROUND 07 · PROVISIONAL DECISION</p><h2>形成一个初步判断锚点</h2><p>在新的任务信息出现前，请根据当前“一年左右、风险适中、兼顾增长与稳定”的目标，暂时选择一只最值得进一步研究的股票，并用至少8个字说明理由。这个选择不是最终答案。</p><div className="stock-choice" role="radiogroup" aria-label="初步候选">{(["ALFA","BETA","GAMMA"] as StockId[]).map((stock) => <button type="button" role="radio" aria-checked={provisionalStock === stock} className={provisionalStock === stock ? "selected" : ""} key={stock} onClick={() => chooseProvisionalStock(stock)}>{stock}</button>)}</div><label htmlFor="provisional-reason">一句理由 <span>{provisionalLength}字</span></label><textarea id="provisional-reason" value={provisionalReason} onChange={(event) => setProvisionalReason(event.target.value)} placeholder="至少8个字"/><p className={provisionalLength >= 8 ? "validation-message valid" : "validation-message"}>{provisionalLength >= 8 ? "字数符合要求" : `还需输入 ${8 - provisionalLength} 个字`}</p><button className="primary-button" type="button" disabled={!provisionalStock || provisionalLength < 8} onClick={submitProvisional}>提交初步判断并继续 <span>→</span></button></section>}

          {conditionActive && <><section className="recorded-anchor"><span>ROUND 07 · 已记录</span><strong>{provisionalStock}</strong><p>{provisionalReason}</p></section><div className="agent-row"><AgentMark/><div className="agent-bubble"><p>已记录你的初步候选和理由。这只是当前判断锚点；如果后续需求发生变化，你可以保留候选，也可以根据新的证据和策略修改判断。</p></div></div><section className="task-update" ref={updateRef} data-round="08"><p className="object-type">ROUND 08 · TASK UPDATE</p><h2>新的资金需求</h2><p>情况发生变化：你半年内可能需要使用这笔资金中的<strong>30%</strong>，希望到时能够较顺利地取出这部分资金。其余资金仍计划从约一年的角度考虑。相比之前，你更看重公司经营能否持续保持稳定，也更难接受明显的本金回撤，但仍不希望完全放弃增长机会。请据此重新确认你当前采用的判断策略，并完成最终判断。</p></section>

            {!constraintQualified && <section className="activation-placeholder"><span>正在进入调整阶段</span><p>请先阅读上方新的资金需求。交互入口将在内容稳定显示后开放。</p></section>}
            {constraintQualified && <><div className="turn-separator"><span>ROUND 09 · 自由交互阶段</span></div>{condition === "chat_only" && <div className="agent-row"><AgentMark/><div className="agent-bubble"><p>你现在可以通过Chat查看、关注或加入早期信息，也可以描述希望修改或确认的Strategy。系统不会主动补全没有提出的字段。</p></div></div>}{messages.map((message) => message.role === "marker" ? <div className="turn-separator" key={message.id}><span>{message.text}</span></div> : message.role === "user" ? <div className="user-message dynamic" key={message.id}>{message.text}</div> : <div className="agent-row dynamic" key={message.id}><AgentMark/><div className="agent-bubble">{message.factIds && message.factIds.length > 0 ? message.factIds.map((id) => <p key={id} data-fact-id={id} data-fact-surface="requested_agent_reply" data-content-hash={stableHash(FACTS[id].detail)}>{FACTS[id].detail}</p>) : <p>{message.text}</p>}</div></div>)}{agentWaiting && <div className="agent-row dynamic"><AgentMark/><div className="typing" aria-label="Agent正在回复"><i/><i/><i/></div></div>}

              {taskInteractive && <section className="chat-composer" aria-label="Chat输入"><div><span>与AGENT对话</span><small>{condition === "chat_only" ? "查看、关注、加入Evidence和Strategy修改均在此说明" : "可用文字补充操作；Widget状态与Chat共享"}</small></div><textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendChat(); } }} placeholder={condition === "chat_only" ? "例如：把BETA连续8个季度经营现金流为正作为依据……" : "继续向Agent提问或补充说明……"}/><button type="button" disabled={!chatInput.trim() || agentWaiting} onClick={sendChat}>发送</button></section>}</>}
              {constraintQualified && <section className="final-card" data-round="11"><p className="object-type">ROUND 11 · FINAL DECISION</p><h2>提交最终判断</h2><p>{FINAL_PROMPT}</p><div className="stock-choice" role="radiogroup" aria-label="最终候选">{(["ALFA","BETA","GAMMA"] as StockId[]).map((stock) => <button type="button" role="radio" aria-checked={finalStock === stock} className={finalStock === stock ? "selected" : ""} key={stock} onClick={() => chooseFinalStock(stock)}>{stock}</button>)}</div><label htmlFor="final-reason">最终理由 <span className={rationaleLength > 150 ? "invalid" : ""}>{rationaleLength} / 100—150字符</span></label><textarea id="final-reason" value={finalReason} onChange={(event) => { setFinalReason(event.target.value); setFinalError(""); }} placeholder="请引用至少两条早期事实，覆盖至少两个方面，并说明其对选择或权衡的作用；同时指出待核查风险。"/><p className={rationaleLength >= 100 && rationaleLength <= 150 ? "validation-message valid" : "validation-message"}>{finalLengthMessage}</p><p className={postT0StrategyConfirmCount > 0 ? "validation-message valid" : "validation-message"}>{postT0StrategyConfirmCount > 0 ? `已确认当前Strategy（V${strategyVersion}）` : "提交前需要明确确认一次当前Strategy；允许确认未修改或不完整的状态。"}</p>{finalError && <p className="form-error" role="alert">{finalError}</p>}<button className="primary-button" type="button" onClick={submitFinal}>提交最终判断 <span>→</span></button></section>}</>}
        </section>

        {widgetActive && <aside className="widget-rail" aria-label="可操作对象侧栏"><section className="strategy-object" id="strategy-object"><div className="object-head"><div><p className="object-type">PERSISTENT OBJECT</p><h2>Strategy V{strategyVersion}</h2></div><span className="live-pill">已确认</span></div><p className="object-caption">编辑只进入Draft；查看摘要并确认后，才会更新系统保存的Strategy。系统不会推荐正确值。</p>{statusNotice && <p className="object-status">{statusNotice}</p>}{strategyHints.length > 0 && <p className="strategy-hint">该事实可能与这些字段相关：{strategyHints.map((key) => STRATEGY_FIELDS.find((item) => item.key === key)?.label).join("、")}。请自行判断是否及如何调整。</p>}<StrategyEditor value={strategyDraft} onChange={(field, value) => updateDraft(field, value as never)}/>{diffOpen && <div className="strategy-diff"><p>待确认摘要</p>{changedFields.length === 0 ? <span>没有字段发生变化；仍可确认继续使用当前Strategy。</span> : changedFields.map(({ key, label }) => <div key={key}><span>{label}</span><del>{strategy[key]}</del><b>→</b><ins>{strategyDraft[key]}</ins></div>)}</div>}<div className="object-actions">{!diffOpen ? <button type="button" onClick={() => { setDiffOpen(true); appendEvent("widget_action", "participant", "widget", { action: "open_strategy_diff", strategy_version: strategyVersion }); }}>查看确认摘要</button> : <button className="confirm" type="button" onClick={() => confirmStrategy(strategyDraft, "widget", changedFields.length === 0 ? "unchanged" : "changed")}>确认 Strategy V{strategyVersion + 1}</button>}<button type="button" disabled={strategyHistory.length === 0} onClick={() => undoStrategy("widget")}>Undo</button></div><div className="evidence-set"><div><span>FOCUS SET</span><b>{focused.length}</b></div>{focused.length === 0 ? <p>尚未关注任何事实</p> : <ul>{focused.map((id) => <li key={id}><button type="button" onClick={() => openFact(id)}>{FACTS[id].stock} · {FACTS[id].label}</button></li>)}</ul>}</div><div className="evidence-set confirmed"><div><span>CONFIRMED EVIDENCE · V{evidenceVersion}</span><b>{evidence.length}</b></div>{evidence.length === 0 ? <p>只有“加入依据”后的事实会被Agent消费</p> : <ul>{evidence.map((id) => <li key={id}><button type="button" onClick={() => openFact(id)}>{FACTS[id].stock} · {FACTS[id].label}</button></li>)}</ul>}<button className="consume-button" type="button" disabled={agentWaiting} onClick={() => consumeAgentContext("widget")}>让Agent消费已确认状态</button></div></section>

          {activeFact && <section ref={factPopupElementRef} className="fact-inspector" data-fact-id={activeFact} data-fact-surface="widget_popup"><div className="object-head"><div><p className="object-type">INFORMATION OBJECT</p><h2>{FACTS[activeFact].stock}</h2></div><button className="close-button" type="button" aria-label="关闭信息对象" onClick={() => closeActiveFact()}>×</button></div><span className="dimension-pill">{FACTS[activeFact].dimension}</span><h3>{FACTS[activeFact].label}</h3><p>{FACTS[activeFact].detail}</p><div className="fact-actions"><button type="button" className={focused.includes(activeFact) ? "done" : ""} onClick={() => focusFact(activeFact, "widget")}>{focused.includes(activeFact) ? "✓ 已关注" : "关注"}</button><button type="button" className={evidence.includes(activeFact) ? "done" : ""} onClick={() => changeEvidence(activeFact, evidence.includes(activeFact) ? "remove" : "add", "widget")}>{evidence.includes(activeFact) ? "移出依据" : "加入依据"}</button>{FACTS[activeFact].targetDimension && <button type="button" onClick={() => { const dimension = FACTS[activeFact].targetDimension; const keys: StrategyField[] = dimension === "可变现性" ? ["shortNeed"] : dimension === "增长" ? ["growth"] : ["downside", "stability"]; setStrategyHints(keys); appendEvent("widget_action", "participant", "widget", { action: "locate_strategy_fields", trigger_fact: activeFact, fields: keys }); document.getElementById("strategy-object")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>查看相关字段</button>}</div><small>关注、加入Evidence与修改Strategy是三个独立动作。</small></section>}
        </aside>}
      </div>
    </section>}
  </main>;
}
