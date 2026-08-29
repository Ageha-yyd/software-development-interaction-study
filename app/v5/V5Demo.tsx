"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STOCK_V5_PUBLIC_OBJECTS,
  type StockV5ObjectKind,
  type StockV5Phase,
  type StockV5PublicObject,
  type StockV5Stock,
} from "../../lib/stock-v5-registry";
import styles from "./v5.module.css";

type Condition = "chat_only" | "chat_widget";
type Phase = StockV5Phase;
type Role = "user" | "assistant" | "system";
type MessageKind = "text" | "overview" | "disclosures" | "complete";
type CanonicalAction = "OPEN_DETAIL";
type StockId = StockV5Stock;

type ChatMessage = {
  id: string;
  role: Role;
  kind: MessageKind;
  text?: string;
  annotations?: SavedAnnotation[];
  objectIds?: string[];
};

type PublicObject = StockV5PublicObject;

type CanonicalObject = PublicObject & {
  kind: StockV5ObjectKind;
  payload: string;
};

type SavedAnnotation = {
  object: CanonicalObject;
  text: string;
};

type InitialSubmissionDraft = {
  candidate: StockId | "";
  candidateEvidence: string;
  comparisonEvidence: string;
};

type FinalSubmissionDraft = {
  candidate: StockId | "";
  disclosureImpact: string;
  remainingUncertainty: string;
};

type SubmissionErrors = Record<string, string>;

type ActionResponse = {
  matched: boolean;
  needsClarification?: boolean;
  action?: CanonicalAction;
  objects?: CanonicalObject[];
  evidenceEnvelope?: {
    objectIds: string[];
    revealedObjectIds: string[];
    canonicalDetails: string[];
  };
  payloadHash?: string;
  targetObjectIds?: string[];
  targetObjectKinds?: StockV5ObjectKind[];
  message?: string;
  error?: string;
};

type LogEntry = {
  sequence: number;
  sessionId: string;
  condition: Condition;
  phase: Phase;
  event: string;
  timestampUtc: string;
  monotonicMs: number;
  payload: Record<string, unknown>;
};

const FACTS = STOCK_V5_PUBLIC_OBJECTS.filter((object) => object.kind === "fact");
const DISCLOSURES = STOCK_V5_PUBLIC_OBJECTS.filter((object) => object.kind === "event");

// Pointability follows the shared registry, not a hand-picked importance list.
const POINTABLE_OBJECTS = STOCK_V5_PUBLIC_OBJECTS;
const POINTABLE_OBJECT_BY_ID = new Map(POINTABLE_OBJECTS.map((object) => [object.id, object]));
const POINTABLE_OBJECT_IDS = new Set(POINTABLE_OBJECTS.map((object) => object.id));
const OBJECT_MARKUP = /\[\[([A-Z0-9-]+)\|([^\]]+)\]\]/g;
const EMPTY_INITIAL_DRAFT: InitialSubmissionDraft = { candidate: "", candidateEvidence: "", comparisonEvidence: "" };
const EMPTY_FINAL_DRAFT: FinalSubmissionDraft = { candidate: "", disclosureImpact: "", remainingUncertainty: "" };

const OVERVIEW_PARAGRAPHS = [
  "如果把增长和稳定看得同样重要，我会暂时把 [[B-COMPANY|BETA]] 放在第一顺位，但这只是基于现有材料的初步判断。",
  "[[B-COMPANY|BETA]] 的 [[B-GROWTH|营收增长 9%]] 不如 [[A-COMPANY|ALFA]] 激进，不过 [[B-VALUATION|24× 的市盈率]] 和 [[B-VOLATILITY|较低的历史价格波动]] 更温和，[[B-CASHFLOW|经营现金流连续 8 个季度为正]] 也提供了一些支撑；主要疑点是 [[B-CYCLE|行业周期敏感性较高]]。",
  "[[A-COMPANY|ALFA]] 的 [[A-GROWTH|营收增长 24%]] 最亮眼，但 [[A-VALUATION|38× 的市盈率]]、[[A-VOLATILITY|较高的历史价格波动]]，以及 [[A-CONCENTRATION|最大客户贡献约 42% 营收]]，意味着它用更高风险换取增长。",
  "[[G-COMPANY|GAMMA]] 的 [[G-GROWTH|营收增长 15%]] 和 [[G-VALUATION|29× 的市盈率]] 处在两者之间；不过 [[G-DEBT|资产负债率 68%]] 与 [[G-LIQUIDITY|偏低的成交活跃度]] 让我暂时不把它排在最前。",
  "这个排序只是基于当前材料。你可以继续追问其中任何公司或信息，也可以在准备好后形成初步判断。",
];

const DISCLOSURE_PARAGRAPHS = [
  "你形成初步判断后，我又拿到三条更新，它们都可能改变刚才的权衡：",
  "[[A-DISCLOSURE|ALFA 最大客户暂停新增订单，并启动供应商审查]]；[[B-DISCLOSURE|BETA 核心客户出现逾期回款，应收账款账龄发生变化]]；[[G-DISCLOSURE|GAMMA 未来九个月内有 35% 的有息债务集中到期，再融资尚未落实]]。",
  "系统收到以上最新披露。请根据你的判断需要继续研究，并在准备好后更新最终选择。",
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "task",
    role: "user",
    kind: "text",
    text: "请从三只虚构股票中选择一只，作为我使用这笔模拟资金进一步研究并可能配置的优先候选。我希望兼顾增长和稳定。系统不会执行真实交易。",
  },
  { id: "overview", role: "assistant", kind: "overview" },
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/[\s，。；：、,.!?！？:;()（）]/g, "");
}

function extractEvidenceIds(text: string) {
  const value = normalize(text);
  return FACTS.filter((fact) => fact.aliases.some((alias) => value.includes(normalize(alias)))).map((fact) => fact.id);
}

function stripObjectMarkup(text: string) {
  return text.replace(/\[\[[A-Z0-9-]+\|([^\]]+)\]\]/g, "$1");
}

function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function messageContentForModel(message: Pick<ChatMessage, "kind" | "text" | "annotations">) {
  if (message.kind === "overview") return stripObjectMarkup(OVERVIEW_PARAGRAPHS.join("\n\n"));
  if (message.kind === "disclosures") return stripObjectMarkup(DISCLOSURE_PARAGRAPHS.join("\n\n"));
  const annotations = message.annotations ?? [];
  if (annotations.length === 0) return message.text ?? "";
  const quoted = annotations
    .map(({ object, text }) => `[引用自 Agent 输出：${object.title}]\n${object.payload}\n[该引用的用户评论]\n${text}`)
    .join("\n\n");
  return `${quoted}\n\n[当前提问]\n${message.text ?? "请结合这些引用和评论继续分析。"}`;
}

export default function V5Demo() {
  const [condition, setCondition] = useState<Condition>("chat_widget");
  const [preview, setPreview] = useState(false);
  const [phase, setPhase] = useState<Phase>("initial_exploration");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiState, setApiState] = useState<"checking" | "ready" | "missing" | "error">("checking");
  const [apiModel, setApiModel] = useState("DeepSeek");
  const [openObject, setOpenObject] = useState<CanonicalObject | null>(null);
  const [visibleDetailIds, setVisibleDetailIds] = useState<string[]>([]);
  const [revealedObjectIds, setRevealedObjectIds] = useState<string[]>([]);
  const [recentObjectIds, setRecentObjectIds] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<Record<string, SavedAnnotation>>({});
  const [annotationDraft, setAnnotationDraft] = useState("");
  const [annotationEditing, setAnnotationEditing] = useState(false);
  const [referencedObjectIds, setReferencedObjectIds] = useState<string[]>([]);
  const [initialCandidate, setInitialCandidate] = useState<StockId | null>(null);
  const [initialEvidenceIds, setInitialEvidenceIds] = useState<string[]>([]);
  const [initialEvidenceTexts, setInitialEvidenceTexts] = useState<string[]>([]);
  const [initialSubmissionDraft, setInitialSubmissionDraft] = useState<InitialSubmissionDraft>(EMPTY_INITIAL_DRAFT);
  const [finalSubmissionDraft, setFinalSubmissionDraft] = useState<FinalSubmissionDraft>(EMPTY_FINAL_DRAFT);
  const [submissionErrors, setSubmissionErrors] = useState<SubmissionErrors>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const sessionId = useRef("");
  const sessionEpoch = useRef(0);
  const startedAt = useRef(0);
  const sequence = useRef(0);
  const t0Recorded = useRef(false);
  const t0At = useRef<number | null>(null);
  const t0ActiveMs = useRef<number | null>(null);
  const firstObjectActionRecorded = useRef(false);
  const firstFinalSubmitted = useRef(false);
  const activeStartedAt = useRef<number | null>(null);
  const activeAccumulatedMs = useRef(0);
  const modelWaitMs = useRef(0);
  const phaseRef = useRef<Phase>("initial_exploration");
  const conditionRef = useRef<Condition>("chat_widget");
  const streamEnd = useRef<HTMLDivElement | null>(null);
  const annotationInput = useRef<HTMLTextAreaElement | null>(null);
  const submissionCardOpenedAt = useRef<number | null>(null);
  const submissionCardOpenedActiveMs = useRef<number | null>(null);

  const logEvent = useCallback((event: string, payload: Record<string, unknown> = {}, overrides?: { phase?: Phase; condition?: Condition }) => {
    if (!sessionId.current) return;
    const entry: LogEntry = {
      sequence: ++sequence.current,
      sessionId: sessionId.current,
      condition: overrides?.condition ?? conditionRef.current,
      phase: overrides?.phase ?? phaseRef.current,
      event,
      timestampUtc: new Date().toISOString(),
      monotonicMs: Math.round(performance.now() - startedAt.current),
      payload,
    };
    setLogs((current) => {
      const next = [...current, entry];
      window.localStorage.setItem(`stock-v5-log-${sessionId.current}`, JSON.stringify(next));
      return next;
    });
  }, []);

  const currentActiveMs = useCallback(() => {
    const live = activeStartedAt.current === null ? 0 : performance.now() - activeStartedAt.current;
    return Math.round(activeAccumulatedMs.current + live);
  }, []);

  const logObjectDirectedAction = useCallback((objectIds: string[], objectKinds: StockV5ObjectKind[], surface: "object" | "chat", payloadHash?: string) => {
    logEvent("object_directed_action", { objectIds, objectKinds, surface, payloadHash: payloadHash ?? null });
    if (t0At.current === null || firstObjectActionRecorded.current) return;
    firstObjectActionRecorded.current = true;
    logEvent("first_object_directed_action", {
      objectIds,
      objectKinds,
      surface,
      elapsedFromT0Ms: Math.round(performance.now() - t0At.current),
      activeElapsedFromT0Ms: t0ActiveMs.current === null ? null : currentActiveMs() - t0ActiveMs.current,
    });
  }, [currentActiveMs, logEvent]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { conditionRef.current = condition; }, [condition]);

  useEffect(() => {
    sessionId.current = crypto.randomUUID();
    startedAt.current = performance.now();
    activeStartedAt.current = performance.now();
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get("preview") === "1";
    const requested = params.get("condition");
    let assigned: Condition;
    if (requested === "chat_only" || requested === "chat_widget") assigned = requested;
    else {
      const saved = window.sessionStorage.getItem("stock-v5-condition");
      assigned = saved === "chat_only" || saved === "chat_widget" ? saved : Math.random() < 0.5 ? "chat_only" : "chat_widget";
      window.sessionStorage.setItem("stock-v5-condition", assigned);
    }
    conditionRef.current = assigned;
    queueMicrotask(() => {
      setPreview(isPreview);
      setCondition(assigned);
      logEvent("session_started", { viewport: { width: window.innerWidth, height: window.innerHeight }, dossier: "risk-disclosure-v5.1" }, { condition: assigned, phase: "initial_exploration" });
    });

    fetch("/api/deepseek")
      .then((response) => response.json())
      .then((data: { configured?: boolean; model?: string }) => {
        setApiState(data.configured ? "ready" : "missing");
        if (data.model) setApiModel(data.model);
      })
      .catch(() => setApiState("error"));

    const onBlur = () => {
      if (activeStartedAt.current !== null) activeAccumulatedMs.current += performance.now() - activeStartedAt.current;
      activeStartedAt.current = null;
      logEvent("window_blur", { activeElapsedMs: currentActiveMs() }, { condition: assigned });
    };
    const onFocus = () => {
      if (activeStartedAt.current === null) activeStartedAt.current = performance.now();
      logEvent("window_focus", { activeElapsedMs: currentActiveMs() }, { condition: assigned });
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
    // Session initialization must run once.
  }, [currentActiveMs, logEvent]);

  useEffect(() => {
    streamEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  useEffect(() => {
    if (phase !== "disclosure_exploration" || t0Recorded.current) return;
    let second: number | null = null;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        t0Recorded.current = true;
        t0At.current = performance.now();
        t0ActiveMs.current = currentActiveMs();
        logEvent("t0_disclosures_rendered", {
          disclosureIds: DISCLOSURES.map((item) => item.id),
          preTriggerWallMs: Math.round(performance.now() - startedAt.current),
          preTriggerActiveMs: t0ActiveMs.current,
        });
      });
    });
    return () => {
      cancelAnimationFrame(first);
      if (second !== null) cancelAnimationFrame(second);
    };
  }, [phase, currentActiveMs, logEvent]);

  const conditionLabel = condition === "chat_widget" ? "Chat + Object" : "Chat-only";
  const apiLabel = apiState === "ready" ? apiModel : apiState === "missing" ? "DeepSeek 未配置" : apiState === "error" ? "DeepSeek 不可用" : "检查模型连接";
  const placeholder = useMemo(() => {
    if (phase === "initial_exploration") return "继续追问任一公司或信息……";
    if (phase === "initial_submission") return "正在填写初步判断答题卡……";
    if (phase === "disclosure_exploration") return "继续询问披露、详情或其他相关信息……";
    if (phase === "final_submission") return "正在填写最终判断答题卡……";
    return "主要任务已结束。";
  }, [phase]);

  function resetSession(nextCondition = condition) {
    sessionEpoch.current += 1;
    sessionId.current = crypto.randomUUID();
    sequence.current = 0;
    startedAt.current = performance.now();
    activeStartedAt.current = performance.now();
    activeAccumulatedMs.current = 0;
    modelWaitMs.current = 0;
    t0Recorded.current = false;
    t0At.current = null;
    t0ActiveMs.current = null;
    firstObjectActionRecorded.current = false;
    firstFinalSubmitted.current = false;
    setCondition(nextCondition);
    setPhase("initial_exploration");
    conditionRef.current = nextCondition;
    phaseRef.current = "initial_exploration";
    setMessages(INITIAL_MESSAGES);
    setInput("");
    setBusy(false);
    setOpenObject(null);
    setVisibleDetailIds([]);
    setRevealedObjectIds([]);
    setRecentObjectIds([]);
    setAnnotations({});
    setAnnotationDraft("");
    setAnnotationEditing(false);
    setReferencedObjectIds([]);
    setInitialCandidate(null);
    setInitialEvidenceIds([]);
    setInitialEvidenceTexts([]);
    setInitialSubmissionDraft(EMPTY_INITIAL_DRAFT);
    setFinalSubmissionDraft(EMPTY_FINAL_DRAFT);
    setSubmissionErrors({});
    submissionCardOpenedAt.current = null;
    submissionCardOpenedActiveMs.current = null;
    setLogs([]);
    queueMicrotask(() => logEvent("session_reset", { dossier: "risk-disclosure-v5.1" }, { condition: nextCondition, phase: "initial_exploration" }));
  }

  function switchCondition(next: Condition) {
    const url = new URL(window.location.href);
    url.searchParams.set("preview", "1");
    url.searchParams.set("condition", next);
    window.history.replaceState({}, "", url);
    resetSession(next);
  }

  function appendMessage(message: Omit<ChatMessage, "id">) {
    const full = { ...message, id: makeId(message.role) };
    setMessages((current) => [...current, full]);
    return full;
  }

  async function requestAction(payload: { action?: CanonicalAction; objectIds?: string[]; utterance?: string }): Promise<ActionResponse> {
    const response = await fetch("/api/v5/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, phase, contextObjectIds: recentObjectIds }),
    });
    const data = await response.json() as ActionResponse;
    if (!response.ok) throw new Error(data.error ?? "对象操作失败。");
    return data;
  }

  async function openCanonicalObject(objectId: string, surface: "object" | "chat") {
    const epoch = sessionEpoch.current;
    setBusy(true);
    try {
      const data = await requestAction({ action: "OPEN_DETAIL", objectIds: [objectId] });
      if (epoch !== sessionEpoch.current) return;
      const object = data.objects?.[0];
      if (!object) throw new Error("没有找到对应详情。");
      const newlyRevealedIds = data.evidenceEnvelope?.revealedObjectIds ?? [object.id];
      setVisibleDetailIds((current) => [...new Set([...current, object.id])]);
      setRevealedObjectIds((current) => [...new Set([...current, ...newlyRevealedIds])]);
      setRecentObjectIds([object.id]);
      logEvent("detail_visible", { objectId: object.id, revealedObjectIds: newlyRevealedIds, surface, action: "OPEN_DETAIL", payloadHash: data.payloadHash ?? null });
      logObjectDirectedAction([object.id], [object.kind], surface, data.payloadHash);
      if (surface === "object") {
        setOpenObject(object);
        setAnnotationEditing(false);
        setAnnotationDraft(annotations[object.id]?.text ?? "");
        logEvent("popup_open", { objectId: object.id });
      } else {
        appendMessage({ role: "assistant", kind: "text", text: object.payload });
      }
    } catch (error) {
      if (epoch !== sessionEpoch.current) return;
      appendMessage({ role: "assistant", kind: "text", text: error instanceof Error ? error.message : "暂时无法获取详情。" });
      logEvent("action_error", { action: "OPEN_DETAIL", objectId, surface });
    } finally {
      if (epoch === sessionEpoch.current) setBusy(false);
    }
  }

  function closeObjectCard() {
    setOpenObject(null);
    setAnnotationEditing(false);
    setAnnotationDraft("");
  }

  function startAnnotation(object: CanonicalObject) {
    setAnnotationDraft(annotations[object.id]?.text ?? "");
    setAnnotationEditing(true);
    logEvent("annotation_editor_opened", { objectId: object.id, hasSavedAnnotation: Boolean(annotations[object.id]) });
    requestAnimationFrame(() => annotationInput.current?.focus());
  }

  function dismissAnnotationEditor(objectId: string) {
    setAnnotationDraft(annotations[objectId]?.text ?? "");
    setAnnotationEditing(false);
    logEvent("annotation_editor_dismissed", { objectId, hasSavedAnnotation: Boolean(annotations[objectId]) });
  }

  function saveAnnotation(object: CanonicalObject) {
    const text = annotationDraft.trim();
    if (!text) return;
    setAnnotations((current) => ({ ...current, [object.id]: { object, text } }));
    setAnnotationDraft(text);
    setAnnotationEditing(false);
    logEvent("object_annotation_saved", { objectId: object.id, commentText: text, commentLength: Array.from(text).length });
  }

  function cancelReference(objectId: string) {
    const hadSavedAnnotation = Boolean(annotations[objectId]);
    setAnnotations((current) => {
      const next = { ...current };
      delete next[objectId];
      return next;
    });
    setAnnotationDraft("");
    setAnnotationEditing(false);
    logEvent("object_annotation_removed", { objectId, hadSavedAnnotation });
  }

  function reopenAnnotatedObject(annotation: SavedAnnotation) {
    setOpenObject(annotation.object);
    setAnnotationDraft(annotation.text);
    setAnnotationEditing(false);
    logEvent("annotation_reopened_from_composer", { objectId: annotation.object.id });
  }

  async function handleResolvedChatAction(text: string) {
    const epoch = sessionEpoch.current;
    const data = await requestAction({ utterance: text });
    if (epoch !== sessionEpoch.current) return { stopped: true, visibleIds: visibleDetailIds, revealedIds: revealedObjectIds, objects: [] as CanonicalObject[] };
    if (!data.matched) {
      if ((data.targetObjectIds?.length ?? 0) > 0) {
        logObjectDirectedAction(data.targetObjectIds ?? [], data.targetObjectKinds ?? [], "chat");
        setRecentObjectIds(data.targetObjectIds ?? []);
      }
      return { stopped: false, visibleIds: visibleDetailIds, revealedIds: revealedObjectIds, objects: [] as CanonicalObject[] };
    }
    if (data.needsClarification) {
      appendMessage({ role: "assistant", kind: "text", text: data.message ?? "请说明具体对象。" });
      logEvent("object_resolution_clarification", { utteranceLength: Array.from(text).length });
      return { stopped: true, visibleIds: visibleDetailIds, revealedIds: revealedObjectIds, objects: [] as CanonicalObject[] };
    }
    const objects = data.objects ?? [];
    if (data.action === "OPEN_DETAIL") {
      const newlyRevealedIds = data.evidenceEnvelope?.revealedObjectIds ?? objects.map((object) => object.id);
      const nextVisibleIds = [...new Set([...visibleDetailIds, ...objects.map((object) => object.id)])];
      const nextRevealedIds = [...new Set([...revealedObjectIds, ...newlyRevealedIds])];
      setVisibleDetailIds(nextVisibleIds);
      setRevealedObjectIds(nextRevealedIds);
      setRecentObjectIds(objects.map((object) => object.id));
      logEvent("chat_object_resolution", { action: data.action, objectIds: objects.map((object) => object.id), revealedObjectIds: newlyRevealedIds, payloadHash: data.payloadHash ?? null });
      logObjectDirectedAction(objects.map((object) => object.id), objects.map((object) => object.kind), "chat", data.payloadHash);
      return { stopped: false, visibleIds: nextVisibleIds, revealedIds: nextRevealedIds, objects };
    }
    return { stopped: false, visibleIds: visibleDetailIds, revealedIds: revealedObjectIds, objects: [] as CanonicalObject[] };
  }

  async function askDeepSeek(
    userText: string,
    submittedAnnotations: SavedAnnotation[],
    submittedObjectIds: string[],
    requestVisibleDetailIds: string[],
    requestRevealedObjectIds: string[],
  ) {
    const epoch = sessionEpoch.current;
    const modelMessages = [...messages, { id: "pending", role: "user" as const, kind: "text" as const, text: userText, annotations: submittedAnnotations }]
      .filter((message) => (message.role === "user" || message.role === "assistant") && message.kind !== "complete")
      .slice(-12)
      .map((message) => ({ role: message.role as "user" | "assistant", content: messageContentForModel(message) }));
    const started = performance.now();
    try {
      const response = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: modelMessages,
          phase,
          visibleDetailIds: requestVisibleDetailIds,
          revealedObjectIds: requestRevealedObjectIds,
          referencedObjectIds: submittedObjectIds,
          referencedObjectComments: submittedAnnotations.map(({ object, text: comment }) => ({ objectId: object.id, comment })),
        }),
      });
      const data = await response.json() as {
        content?: string;
        error?: string;
        requestId?: string;
        model?: string;
        latencyMs?: number;
        usage?: unknown;
        outputObjectIds?: string[];
        autoMarkedObjectIds?: string[];
        invalidMarkerCount?: number;
        evidenceEnvelopeHash?: string;
        evidenceEnvelope?: { allowedObjectIds?: string[]; details?: string[] };
      };
      if (epoch !== sessionEpoch.current) return;
      if (!response.ok || !data.content) throw new Error(data.error ?? "模型没有返回内容。");
      appendMessage({ role: "assistant", kind: "text", text: data.content, objectIds: data.outputObjectIds ?? [] });
      if ((data.outputObjectIds?.length ?? 0) > 0) setRecentObjectIds(data.outputObjectIds ?? []);
      logEvent("model_response", {
        requestId: data.requestId,
        model: data.model,
        latencyMs: data.latencyMs ?? Math.round(performance.now() - started),
        outputLength: Array.from(data.content).length,
        outputText: data.content,
        outputObjectIds: data.outputObjectIds ?? [],
        autoMarkedObjectIds: data.autoMarkedObjectIds ?? [],
        invalidMarkerCount: data.invalidMarkerCount ?? 0,
        evidenceEnvelopeHash: data.evidenceEnvelopeHash ?? null,
        usage: data.usage ?? null,
        inputMessages: modelMessages,
        inputObjectIds: [...new Set([...requestVisibleDetailIds, ...requestRevealedObjectIds, ...submittedObjectIds])],
      });
    } finally {
      modelWaitMs.current += performance.now() - started;
    }
  }

  function beginInitialSubmission() {
    if (busy || phase !== "initial_exploration") return;
    setOpenObject(null);
    setAnnotationEditing(false);
    setAnnotationDraft("");
    setSubmissionErrors({});
    submissionCardOpenedAt.current = performance.now();
    submissionCardOpenedActiveMs.current = currentActiveMs();
    phaseRef.current = "initial_submission";
    setPhase("initial_submission");
    logEvent("submission_card_opened", { card: "initial" }, { phase: "initial_submission" });
  }

  function beginFinalSubmission() {
    if (busy || phase !== "disclosure_exploration") return;
    setOpenObject(null);
    setAnnotationEditing(false);
    setAnnotationDraft("");
    setSubmissionErrors({});
    submissionCardOpenedAt.current = performance.now();
    submissionCardOpenedActiveMs.current = currentActiveMs();
    phaseRef.current = "final_submission";
    setPhase("final_submission");
    logEvent("submission_card_opened", { card: "final" }, { phase: "final_submission" });
  }

  function cancelSubmissionMode() {
    if (busy) return;
    const nextPhase = phase === "initial_submission" ? "initial_exploration" : phase === "final_submission" ? "disclosure_exploration" : null;
    if (!nextPhase) return;
    const card = phase === "initial_submission" ? "initial" : "final";
    logEvent("submission_card_cancelled", {
      card,
      openWallMs: submissionCardOpenedAt.current === null ? null : Math.round(performance.now() - submissionCardOpenedAt.current),
      openActiveMs: submissionCardOpenedActiveMs.current === null ? null : currentActiveMs() - submissionCardOpenedActiveMs.current,
    }, { phase });
    submissionCardOpenedAt.current = null;
    submissionCardOpenedActiveMs.current = null;
    setSubmissionErrors({});
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }

  function consumeCardAnnotations(surface: "initial_card" | "final_card") {
    const submittedAnnotations = Object.values(annotations);
    const submittedObjectIds = submittedAnnotations.map(({ object }) => object.id);
    const submittedAnnotationComments = submittedAnnotations.map(({ object, text: commentText }) => ({ objectId: object.id, commentText }));
    const allReferencedObjectIds = [...new Set([...referencedObjectIds, ...submittedObjectIds])];
    setAnnotations({});
    setAnnotationDraft("");
    setAnnotationEditing(false);
    setOpenObject(null);
    setReferencedObjectIds(allReferencedObjectIds);
    if (submittedObjectIds.length > 0) {
      const submittedKinds = submittedAnnotations.map(({ object }) => object.kind);
      logEvent("reference_bundle_submitted", {
        surface,
        objectIds: submittedObjectIds,
        objectKinds: submittedKinds,
        annotationComments: submittedAnnotationComments,
        containsPriorFactAndDisclosure: submittedKinds.includes("fact") && submittedKinds.includes("event"),
        elapsedFromT0Ms: t0At.current === null ? null : Math.round(performance.now() - t0At.current),
      });
    }
    return { submittedAnnotations, submittedObjectIds, submittedAnnotationComments, allReferencedObjectIds };
  }

  function submitInitialCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || phase !== "initial_submission") return;
    const candidateEvidence = initialSubmissionDraft.candidateEvidence.trim();
    const comparisonEvidence = initialSubmissionDraft.comparisonEvidence.trim();
    const errors: SubmissionErrors = {};
    if (!initialSubmissionDraft.candidate) errors.candidate = "请选择一只初步优先候选。";
    if (!candidateEvidence) errors.candidateEvidence = "请填写一项与候选直接相关的当前依据。";
    if (!comparisonEvidence) errors.comparisonEvidence = "请填写另一项当前依据。";
    if (candidateEvidence && comparisonEvidence && normalize(candidateEvidence) === normalize(comparisonEvidence)) errors.comparisonEvidence = "两项依据不能完全相同。";
    if (Object.keys(errors).length > 0) {
      setSubmissionErrors(errors);
      logEvent("submission_card_validation_failed", { card: "initial", fields: Object.keys(errors) });
      return;
    }

    const candidate = initialSubmissionDraft.candidate as StockId;
    const text = `初步优先候选：${candidate}\n与候选直接相关的当前依据：${candidateEvidence}\n另一项当前依据：${comparisonEvidence}`;
    const annotationData = consumeCardAnnotations("initial_card");
    const resolvedEvidenceIds = [...new Set(extractEvidenceIds(`${candidateEvidence}\n${comparisonEvidence}`))];
    appendMessage({ role: "user", kind: "text", text, annotations: annotationData.submittedAnnotations });
    logEvent("message_submitted", {
      text,
      length: Array.from(text).length,
      role: "user",
      surface: "initial_card",
      annotationObjectIds: annotationData.submittedObjectIds,
      annotationComments: annotationData.submittedAnnotationComments,
      annotationCount: annotationData.submittedAnnotations.length,
    });
    logEvent("initial_card_submitted", {
      candidate,
      candidateEvidence,
      comparisonEvidence,
      autoResolvedEvidenceIds: resolvedEvidenceIds,
      openWallMs: submissionCardOpenedAt.current === null ? null : Math.round(performance.now() - submissionCardOpenedAt.current),
      openActiveMs: submissionCardOpenedActiveMs.current === null ? null : currentActiveMs() - submissionCardOpenedActiveMs.current,
    }, { phase: "initial_submission" });
    setInitialCandidate(candidate);
    setInitialEvidenceIds(resolvedEvidenceIds);
    setInitialEvidenceTexts([candidateEvidence, comparisonEvidence]);
    setInitialSubmissionDraft(EMPTY_INITIAL_DRAFT);
    setSubmissionErrors({});
    submissionCardOpenedAt.current = null;
    submissionCardOpenedActiveMs.current = null;
    appendMessage({ role: "system", kind: "text", text: `已记录初步判断：${candidate}。这不是最终答案。` });
    appendMessage({ role: "assistant", kind: "disclosures" });
    phaseRef.current = "disclosure_exploration";
    setPhase("disclosure_exploration");
    logEvent("initial_submission_recorded", {
      candidate,
      evidenceTexts: [candidateEvidence, comparisonEvidence],
      autoResolvedEvidenceIds: resolvedEvidenceIds,
      preTriggerWallMs: Math.round(performance.now() - startedAt.current),
      preTriggerActiveMs: currentActiveMs(),
    }, { phase: "initial_submission" });
  }

  function submitFinalCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || phase !== "final_submission" || firstFinalSubmitted.current) return;
    const disclosureImpact = finalSubmissionDraft.disclosureImpact.trim();
    const remainingUncertainty = finalSubmissionDraft.remainingUncertainty.trim();
    const errors: SubmissionErrors = {};
    if (!finalSubmissionDraft.candidate) errors.candidate = "请选择一只最终优先候选。";
    if (!disclosureImpact) errors.disclosureImpact = "请说明最新披露如何影响了你的判断。";
    if (!remainingUncertainty) errors.remainingUncertainty = "请填写目前仍有什么不确定性；如果没有，可以填写“暂无”。";
    if (Object.keys(errors).length > 0) {
      setSubmissionErrors(errors);
      logEvent("submission_card_validation_failed", { card: "final", fields: Object.keys(errors) });
      return;
    }

    const finalSubmittedAt = performance.now();
    const finalSubmittedActiveMs = currentActiveMs();
    firstFinalSubmitted.current = true;
    const candidate = finalSubmissionDraft.candidate as StockId;
    const text = `最终优先候选：${candidate}\n最新披露对判断的影响：${disclosureImpact}\n目前仍存在的不确定性：${remainingUncertainty}`;
    const annotationData = consumeCardAnnotations("final_card");
    const wallElapsedMs = Math.round(finalSubmittedAt - startedAt.current);
    const activeElapsedMs = finalSubmittedActiveMs;
    appendMessage({ role: "user", kind: "text", text, annotations: annotationData.submittedAnnotations });
    appendMessage({ role: "system", kind: "complete", text: "已记录你的最终判断。" });
    logEvent("message_submitted", {
      text,
      length: Array.from(text).length,
      role: "user",
      surface: "final_card",
      annotationObjectIds: annotationData.submittedObjectIds,
      annotationComments: annotationData.submittedAnnotationComments,
      annotationCount: annotationData.submittedAnnotations.length,
    });
    logEvent("final_card_submitted", {
      candidate,
      disclosureImpact,
      remainingUncertainty,
      openWallMs: submissionCardOpenedAt.current === null ? null : Math.round(finalSubmittedAt - submissionCardOpenedAt.current),
      openActiveMs: submissionCardOpenedActiveMs.current === null ? null : finalSubmittedActiveMs - submissionCardOpenedActiveMs.current,
    }, { phase: "final_submission" });
    submissionCardOpenedAt.current = null;
    submissionCardOpenedActiveMs.current = null;
    setFinalSubmissionDraft(EMPTY_FINAL_DRAFT);
    setSubmissionErrors({});
    phaseRef.current = "complete";
    setPhase("complete");
    logEvent("first_final_submission_recorded", {
      finalCandidate: candidate,
      initialCandidate,
      decisionRevision: initialCandidate ? candidate === initialCandidate ? "maintain" : "switch" : "unparsed",
      rawText: text,
      rawLength: Array.from(text).length,
      disclosureImpact,
      remainingUncertainty,
      visibleDetailIds,
      revealedObjectIds,
      referencedObjectIds: annotationData.allReferencedObjectIds,
      submittedAnnotationComments: annotationData.submittedAnnotationComments,
      initialEvidenceIds,
      initialEvidenceTexts,
      wallElapsedMs,
      activeElapsedMs,
      modelWaitMs: Math.round(modelWaitMs.current),
      ocftWallMs: t0At.current === null ? null : Math.round(performance.now() - t0At.current),
      ocftActiveMs: t0ActiveMs.current === null ? null : activeElapsedMs - t0ActiveMs.current,
    }, { phase: "complete" });
  }

  async function submitMessage() {
    if (phase !== "initial_exploration" && phase !== "disclosure_exploration") return;
    const epoch = sessionEpoch.current;
    const submittedAnnotations = Object.values(annotations);
    const submittedObjectIds = submittedAnnotations.map(({ object }) => object.id);
    const typedText = input.trim();
    const text = typedText || (submittedAnnotations.length > 0 ? "请结合这些引用和评论继续分析。" : "");
    if (!text || busy) return;
    const allReferencedObjectIds = [...new Set([...referencedObjectIds, ...submittedObjectIds])];
    setInput("");
    setAnnotations({});
    setAnnotationDraft("");
    setAnnotationEditing(false);
    setOpenObject(null);
    setReferencedObjectIds(allReferencedObjectIds);
    appendMessage({ role: "user", kind: "text", text, annotations: submittedAnnotations });
    const submittedAnnotationComments = submittedAnnotations.map(({ object, text: commentText }) => ({ objectId: object.id, commentText }));
    logEvent("message_submitted", {
      text,
      length: Array.from(text).length,
      role: "user",
      annotationObjectIds: submittedObjectIds,
      annotationComments: submittedAnnotationComments,
      annotationCount: submittedAnnotations.length,
    });
    if (submittedObjectIds.length > 0) {
      const submittedKinds = submittedAnnotations.map(({ object }) => object.kind);
      logEvent("reference_bundle_submitted", {
        objectIds: submittedObjectIds,
        objectKinds: submittedKinds,
        annotationComments: submittedAnnotationComments,
        containsPriorFactAndDisclosure: submittedKinds.includes("fact") && submittedKinds.includes("event"),
        elapsedFromT0Ms: t0At.current === null ? null : Math.round(performance.now() - t0At.current),
      });
    }
    setBusy(true);

    try {
      const resolved = await handleResolvedChatAction(text);
      if (resolved.stopped) return;
      try {
        await askDeepSeek(text, submittedAnnotations, submittedObjectIds, resolved.visibleIds, resolved.revealedIds);
      } catch (error) {
        if (resolved.objects.length === 0) throw error;
        appendMessage({ role: "assistant", kind: "text", text: resolved.objects.map((object) => object.payload).join("\n\n") });
        logEvent("deterministic_detail_fallback", { objectIds: resolved.objects.map((object) => object.id), reason: error instanceof Error ? error.message : "model_error" });
      }
    } catch (error) {
      if (epoch !== sessionEpoch.current) return;
      const message = error instanceof Error ? error.message : "请求暂时没有完成。";
      appendMessage({ role: "assistant", kind: "text", text: `${message} 你仍可继续使用固定信息对象和详情。` });
      logEvent("request_error", { message });
    } finally {
      if (epoch === sessionEpoch.current) setBusy(false);
    }
  }

  function ObjectToken({ object, children, pointable = true }: { object: PublicObject; children?: React.ReactNode; pointable?: boolean }) {
    const content = children ?? object.title;
    if (condition === "chat_only" || !pointable || !POINTABLE_OBJECT_IDS.has(object.id)) return <span className={styles.objectText}>{content}</span>;
    return <button type="button" className={styles.objectLink} onClick={() => openCanonicalObject(object.id, "object")}>{content}</button>;
  }

  function renderObjectMarkup(text: string, allowedObjectIds = POINTABLE_OBJECT_IDS) {
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    for (const [index, match] of [...text.matchAll(new RegExp(OBJECT_MARKUP.source, "g"))].entries()) {
      const start = match.index ?? 0;
      if (start > cursor) nodes.push(text.slice(cursor, start));
      const object = POINTABLE_OBJECT_BY_ID.get(match[1]);
      const label = match[2];
      nodes.push(object ? <ObjectToken key={`${match[1]}-${index}`} object={object} pointable={allowedObjectIds.has(object.id)}>{label}</ObjectToken> : <span key={`plain-${index}`}>{label}</span>);
      cursor = start + match[0].length;
    }
    if (cursor < text.length) nodes.push(text.slice(cursor));
    return nodes;
  }

  function renderOverview() {
    const initialObjectIds = new Set(STOCK_V5_PUBLIC_OBJECTS.filter((object) => object.kind === "company" || object.kind === "fact").map((object) => object.id));
    return (
      <div className={styles.richMessage}>
        <span className={styles.eyebrow}>AGENT ANALYSIS · 2025-06-30</span>
        {OVERVIEW_PARAGRAPHS.map((paragraph, index) => <p key={index}>{renderObjectMarkup(paragraph, initialObjectIds)}</p>)}
      </div>
    );
  }

  function renderDisclosures() {
    const disclosureObjectIds = new Set(DISCLOSURES.map((object) => object.id));
    return (
      <div className={styles.richMessage}>
        <span className={styles.eyebrow}>LATEST DISCLOSURES · 2025-06-30</span>
        {DISCLOSURE_PARAGRAPHS.map((paragraph, index) => <p key={index}>{renderObjectMarkup(paragraph, disclosureObjectIds)}</p>)}
        <p className={styles.conditionHint}>{condition === "chat_only" ? "可在对话中指明公司、指标或披露并询问详情。" : "带下划线的信息可点击查看；你也可以继续在对话中提问。"}</p>
      </div>
    );
  }

  function renderMessage(message: ChatMessage) {
    if (message.kind === "overview") return renderOverview();
    if (message.kind === "disclosures") return renderDisclosures();
    if (message.kind === "complete") return <div className={styles.completion}><strong>{message.text}</strong><span>主要任务到此结束；语义质量将在实验结束后统一评分。</span></div>;
    return (
      <div className={styles.textMessage}>
        {(message.annotations?.length ?? 0) > 0 && <span className={styles.messageReferenceCount}>{message.annotations?.length} 引用</span>}
        <p>{message.role === "assistant" ? renderObjectMarkup(message.text ?? "", new Set(message.objectIds ?? [])) : message.text}</p>
      </div>
    );
  }

  const activeAnnotation = openObject ? annotations[openObject.id] : undefined;
  const draftAnnotations = Object.values(annotations);
  const submissionCardOpen = phase === "initial_submission" || phase === "final_submission";
  const composerLocked = busy || phase === "complete" || submissionCardOpen;

  return (
    <main className={styles.appShell}>
      <aside className={styles.sidebar} aria-label="会话导航">
        <div className={styles.sidebarBrand}>
          <span className={styles.brandMark}>S</span>
          <strong>Stock Agent</strong>
          <span className={styles.chevron}>⌄</span>
        </div>
        {preview && (
          <button className={styles.newChatButton} type="button" onClick={() => resetSession()}>
            <span aria-hidden="true">＋</span> 新对话
          </button>
        )}
        <nav className={styles.sessionNav} aria-label="实验会话">
          <span className={styles.navLabel}>会话</span>
          <button className={styles.activeSession} type="button" aria-current="page">
            <span className={styles.sessionDot} aria-hidden="true" />
            <span><strong>比较三只候选股票</strong><small>风险披露研究</small></span>
          </button>
        </nav>
        <div className={styles.sidebarFoot}>
          <span className={styles.sidebarAvatar}>S</span>
          <span><strong>V5.1 交互原型</strong><small>虚构数据 · 非投资建议</small></span>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.appHeader}>
          <div className={styles.headerTitle}>
            <span className={styles.folderIcon} aria-hidden="true" />
            <strong>比较三只候选股票</strong>
            <span className={styles.moreIcon} aria-hidden="true">•••</span>
          </div>
          <div className={`${styles.headerStatus} ${apiState === "ready" ? styles.ready : ""}`}><i /> {apiLabel}</div>
          {preview && (
            <div className={styles.researcherControls}>
              <div className={styles.conditionSwitch} aria-label="研究者条件预览">
                <button type="button" className={condition === "chat_only" ? styles.active : ""} onClick={() => switchCondition("chat_only")}>Chat-only</button>
                <button type="button" className={condition === "chat_widget" ? styles.active : ""} onClick={() => switchCondition("chat_widget")}>Chat + Object</button>
              </div>
              <button type="button" className={styles.utilityButton} onClick={() => resetSession()}>重置</button>
              <button type="button" className={styles.utilityButton} onClick={() => downloadJson(`stock-v5.1-${sessionId.current}.json`, logs)}>日志</button>
            </div>
          )}
        </header>

        <section className={styles.conversation} aria-label={`${conditionLabel} 对话`}>
          <div className={styles.conversationInner}>
            <div className={styles.conversationHeading}>
              <div><span className={styles.eyebrow}>RESEARCH SESSION</span><h1>比较三只候选股票</h1></div>
              {preview && <span className={styles.previewBadge}>研究者预览 · {conditionLabel}</span>}
            </div>

            <div className={styles.messageStream}>
              {messages.map((message) => (
                <article key={message.id} className={`${styles.message} ${message.role === "user" ? styles.userMessage : message.role === "system" ? styles.systemMessage : styles.agentMessage}`}>
                  <div className={`${styles.avatar} ${message.role === "user" ? styles.userAvatar : message.role === "system" ? styles.systemAvatar : styles.agentAvatar}`}>{message.role === "user" ? "你" : message.role === "system" ? "✓" : "AI"}</div>
                  <div className={styles.messageBody}>{renderMessage(message)}</div>
                </article>
              ))}
              {busy && <article className={`${styles.message} ${styles.agentMessage}`}><div className={`${styles.avatar} ${styles.agentAvatar}`}>AI</div><div className={`${styles.messageBody} ${styles.thinking}`}><i /><i /><i /></div></article>}
              <div ref={streamEnd} />
            </div>

            <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void submitMessage(); }}>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.nativeEvent.isComposing || event.keyCode === 229) return; if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submitMessage(); } }} disabled={composerLocked} aria-label="向 Agent 提问" placeholder={placeholder} />
              <button className={styles.sendButton} type="submit" disabled={composerLocked || (!input.trim() && draftAnnotations.length === 0)} aria-label="发送消息">↑</button>
              {phase !== "complete" && (
                <div className={styles.phaseControls}>
                  {phase === "initial_exploration" && <button type="button" onClick={beginInitialSubmission}>形成初步判断</button>}
                  {phase === "disclosure_exploration" && <button type="button" onClick={beginFinalSubmission}>提交最终判断</button>}
                  {phase === "initial_submission" && <><span>初步判断答题卡已打开。</span><button type="button" onClick={cancelSubmissionMode}>返回探索</button></>}
                  {phase === "final_submission" && <><span>最终判断答题卡已打开。</span><button type="button" onClick={cancelSubmissionMode}>返回探索</button></>}
                </div>
              )}
              {draftAnnotations.length > 0 && (
                <details className={styles.composerReferences}>
                  <summary><span aria-hidden="true">↳</span><strong>{draftAnnotations.length} 引用</strong><small>每条均含评论</small></summary>
                  <div className={styles.composerReferenceList}>
                    {draftAnnotations.map((annotation) => (
                      <div className={styles.composerReferenceItem} key={annotation.object.id}>
                        <div><strong>{annotation.object.title}</strong><p>{annotation.text}</p></div>
                        <span>
                          <button type="button" onClick={() => reopenAnnotatedObject(annotation)}>查看</button>
                          <button type="button" aria-label={`取消引用：${annotation.object.title}`} onClick={() => cancelReference(annotation.object.id)}>取消</button>
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </form>
            <p className={styles.footerNote}>回答仅使用本实验提供的虚构材料；逐对象评论会随下一次提问提交。</p>
          </div>
        </section>
      </section>

      {submissionCardOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <form
            className={`${styles.objectModal} ${styles.submissionCard}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-card-title"
            onSubmit={phase === "initial_submission" ? submitInitialCard : submitFinalCard}
          >
            <div className={styles.cardHeader}>
              <div className={styles.submissionHeading}>
                <span>EXPERIMENT RESPONSE CARD</span>
                <h2 id="submission-card-title">{phase === "initial_submission" ? "初步判断答题卡" : "最终判断答题卡"}</h2>
              </div>
              <button className={styles.modalClose} type="button" onClick={cancelSubmissionMode}>返回探索</button>
            </div>

            <div className={styles.submissionFormBody}>
              <p className={styles.submissionIntro}>
                {phase === "initial_submission"
                  ? "请按固定字段提交。系统只检查是否填写完整，不评价你的选择。"
                  : "请按固定字段提交。第一次确认提交后，本次主要任务即结束。"}
              </p>

              <fieldset className={styles.candidateFieldset}>
                <legend>{phase === "initial_submission" ? "初步优先候选" : "最终优先候选"}<span>必填</span></legend>
                <div className={styles.candidateChoices}>
                  {(["ALFA", "BETA", "GAMMA"] as StockId[]).map((stock) => {
                    const checked = phase === "initial_submission" ? initialSubmissionDraft.candidate === stock : finalSubmissionDraft.candidate === stock;
                    return (
                      <label className={`${styles.candidateOption} ${checked ? styles.selectedCandidate : ""}`} key={stock}>
                        <input
                          type="radio"
                          name={`${phase}-candidate`}
                          value={stock}
                          checked={checked}
                          onChange={() => {
                            setSubmissionErrors((current) => ({ ...current, candidate: "" }));
                            if (phase === "initial_submission") setInitialSubmissionDraft((current) => ({ ...current, candidate: stock }));
                            else setFinalSubmissionDraft((current) => ({ ...current, candidate: stock }));
                          }}
                        />
                        <span>{stock}</span>
                      </label>
                    );
                  })}
                </div>
                {submissionErrors.candidate && <p className={styles.fieldError}>{submissionErrors.candidate}</p>}
              </fieldset>

              {phase === "initial_submission" ? (
                <>
                  <label className={styles.submissionField} htmlFor="candidate-evidence">
                    <span>与候选直接相关的一项当前依据<em>必填</em></span>
                    <textarea
                      id="candidate-evidence"
                      value={initialSubmissionDraft.candidateEvidence}
                      onChange={(event) => {
                        setInitialSubmissionDraft((current) => ({ ...current, candidateEvidence: event.target.value }));
                        setSubmissionErrors((current) => ({ ...current, candidateEvidence: "" }));
                      }}
                      maxLength={500}
                      aria-invalid={Boolean(submissionErrors.candidateEvidence)}
                      placeholder="请用自己的话填写"
                    />
                    {submissionErrors.candidateEvidence && <small className={styles.fieldError}>{submissionErrors.candidateEvidence}</small>}
                  </label>
                  <label className={styles.submissionField} htmlFor="comparison-evidence">
                    <span>另一项当前依据<em>必填 · 可来自同一公司或跨公司比较</em></span>
                    <textarea
                      id="comparison-evidence"
                      value={initialSubmissionDraft.comparisonEvidence}
                      onChange={(event) => {
                        setInitialSubmissionDraft((current) => ({ ...current, comparisonEvidence: event.target.value }));
                        setSubmissionErrors((current) => ({ ...current, comparisonEvidence: "" }));
                      }}
                      maxLength={500}
                      aria-invalid={Boolean(submissionErrors.comparisonEvidence)}
                      placeholder="请用自己的话填写"
                    />
                    {submissionErrors.comparisonEvidence && <small className={styles.fieldError}>{submissionErrors.comparisonEvidence}</small>}
                  </label>
                </>
              ) : (
                <>
                  <label className={styles.submissionField} htmlFor="disclosure-impact">
                    <span>最新披露如何影响了你的判断<em>必填</em></span>
                    <textarea
                      id="disclosure-impact"
                      value={finalSubmissionDraft.disclosureImpact}
                      onChange={(event) => {
                        setFinalSubmissionDraft((current) => ({ ...current, disclosureImpact: event.target.value }));
                        setSubmissionErrors((current) => ({ ...current, disclosureImpact: "" }));
                      }}
                      maxLength={700}
                      aria-invalid={Boolean(submissionErrors.disclosureImpact)}
                      placeholder="请用自己的话填写"
                    />
                    {submissionErrors.disclosureImpact && <small className={styles.fieldError}>{submissionErrors.disclosureImpact}</small>}
                  </label>
                  <label className={styles.submissionField} htmlFor="remaining-uncertainty">
                    <span>目前仍有什么不确定性<em>必填 · 如果没有可填写“暂无”</em></span>
                    <textarea
                      id="remaining-uncertainty"
                      value={finalSubmissionDraft.remainingUncertainty}
                      onChange={(event) => {
                        setFinalSubmissionDraft((current) => ({ ...current, remainingUncertainty: event.target.value }));
                        setSubmissionErrors((current) => ({ ...current, remainingUncertainty: "" }));
                      }}
                      maxLength={700}
                      aria-invalid={Boolean(submissionErrors.remainingUncertainty)}
                      placeholder="请用自己的话填写"
                    />
                    {submissionErrors.remainingUncertainty && <small className={styles.fieldError}>{submissionErrors.remainingUncertainty}</small>}
                  </label>
                </>
              )}

              {draftAnnotations.length > 0 && <p className={styles.submissionReferenceNote}>{draftAnnotations.length} 条已保存的引用评论将随本次提交一并记录。</p>}
            </div>

            <div className={styles.submissionActions}>
              <button type="button" onClick={cancelSubmissionMode}>返回探索</button>
              <button type="submit">确认并提交</button>
            </div>
          </form>
        </div>
      )}

      {openObject && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeObjectCard(); }}>
          <div className={styles.objectCluster} role="dialog" aria-modal="true" aria-labelledby="object-title">
            {(annotationEditing || activeAnnotation) && (
              <aside className={styles.annotationPanel} aria-label={`关于“${openObject.title}”的注释`}>
                <div className={styles.annotationHeader}>
                  <div><span>OBJECT NOTE</span><strong>资料旁注</strong></div>
                  {annotationEditing && <button type="button" aria-label="关闭注释编辑" onClick={() => dismissAnnotationEditor(openObject.id)}>×</button>}
                </div>
                {annotationEditing ? (
                  <div className={styles.annotationEditor}>
                    <p>写下这条资料与你当前判断的关系。保存后，Agent 会在后续对话读取它。</p>
                    <textarea ref={annotationInput} value={annotationDraft} onChange={(event) => setAnnotationDraft(event.target.value)} maxLength={300} aria-label="对象评论" placeholder="例如：这会放大我对客户集中度的担忧……" />
                    <div className={styles.annotationEditorFoot}>
                      <span>{Array.from(annotationDraft).length}/300</span>
                      <button type="button" disabled={!annotationDraft.trim()} onClick={() => saveAnnotation(openObject)}>保存评论</button>
                    </div>
                  </div>
                ) : activeAnnotation ? (
                  <div className={styles.savedAnnotation}>
                    <p>{activeAnnotation.text}</p>
                    <button type="button" onClick={() => startAnnotation(openObject)}>编辑评论</button>
                  </div>
                ) : null}
              </aside>
            )}

            <section className={styles.objectModal}>
              <div className={styles.cardHeader}>
                <h2 id="object-title">{openObject.title}</h2>
                <button className={styles.modalClose} type="button" aria-label="关闭资料卡" onClick={closeObjectCard}>关闭</button>
              </div>
              <div className={styles.cardBody}>
                <p>{openObject.payload}</p>
              </div>
              <div className={styles.cardActions}>
                <strong>提交操作</strong>
                <p>每条引用都需单独添加评论；保存后，提问框会汇总显示待提交的引用数量。</p>
                <div className={styles.actionButtons}>
                  <button className={styles.quoteAction} type="button" disabled={busy} onClick={() => startAnnotation(openObject)}>引用并评论</button>
                  <button className={styles.cancelQuoteAction} type="button" disabled={busy || (!annotationEditing && !activeAnnotation)} onClick={() => cancelReference(openObject.id)}>取消引用</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
