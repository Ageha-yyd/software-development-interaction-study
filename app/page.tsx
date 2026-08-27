"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Condition = "chat_only" | "chat_widget";
type Phase = "landing" | "tutorial" | "task" | "survey" | "unaided" | "aided" | "done";
type StockId = "ALFA" | "BETA" | "GAMMA";
type Source = "chat" | "widget" | "system";
type Freshness = "none" | "fresh" | "stale";
type FactId =
  | "A-GROWTH" | "B-GROWTH" | "G-GROWTH"
  | "A-VALUATION" | "B-VALUATION" | "G-VALUATION"
  | "A-VOLATILITY" | "B-VOLATILITY" | "G-VOLATILITY"
  | "A-LIQUIDITY" | "B-LIQUIDITY" | "G-LIQUIDITY"
  | "A-CONCENTRATION" | "B-CASHFLOW" | "B-CYCLE" | "G-DEBT"
  | "A-WEAKSIGNAL" | "B-WEAKSIGNAL" | "G-WEAKSIGNAL";

type StrategyState = {
  horizon: "约12个月" | "6个月";
  shortNeed: "无额外要求" | "30%资金可能在6个月内使用";
  downside: "低" | "中" | "高";
  stability: "低" | "中" | "高";
  growth: "高" | "中，但保留" | "不考虑";
};

type Fact = {
  id: FactId;
  stock: StockId;
  title: string;
  value: string;
  detail: string;
  dimension: string;
  relation: keyof StrategyState;
  meaning: string;
  weak?: boolean;
};

type LogEntry = {
  schema_version: "stock-v3.3-prototype";
  session_id: string;
  sequence_no: number;
  condition: Condition;
  round_id: string;
  event_type: string;
  actor: "participant" | "agent" | "system";
  surface: Source | "task" | "probe" | "questionnaire" | "browser";
  timestamp_utc: string;
  timestamp_monotonic_ms: number;
  payload: Record<string, unknown>;
};

type ChatMessage = { id: number; role: "user" | "agent" | "system"; text: string };
type PendingAction = { kind: "evidence_add" | "evidence_remove"; factId: FactId } | null;

const STRATEGY_V1: StrategyState = {
  horizon: "约12个月",
  shortNeed: "无额外要求",
  downside: "中",
  stability: "中",
  growth: "高",
};

const STRATEGY_FIELDS: { key: keyof StrategyState; label: string; values: string[] }[] = [
  { key: "horizon", label: "总体研究视角", values: ["约12个月", "6个月"] },
  { key: "shortNeed", label: "短期资金需求", values: ["无额外要求", "30%资金可能在6个月内使用"] },
  { key: "downside", label: "下行风险优先级", values: ["低", "中", "高"] },
  { key: "stability", label: "经营稳定性优先级", values: ["低", "中", "高"] },
  { key: "growth", label: "增长优先级", values: ["高", "中，但保留", "不考虑"] },
];

const FACTS: Record<FactId, Fact> = {
  "A-GROWTH": { id: "A-GROWTH", stock: "ALFA", title: "最近一年模拟营收增长", value: "24%", detail: "三者最高，代表较强增长，但不能单独说明稳定性。", dimension: "增长", relation: "growth", meaning: "支持增长目标，同时需要与估值和波动共同权衡。" },
  "B-GROWTH": { id: "B-GROWTH", stock: "BETA", title: "最近一年模拟营收增长", value: "9%", detail: "三者最低，说明增长相对较慢。", dimension: "增长", relation: "growth", meaning: "限制增长目标，但不直接否定稳定性。" },
  "G-GROWTH": { id: "G-GROWTH", stock: "GAMMA", title: "最近一年模拟营收增长", value: "15%", detail: "增长处于三者中间。", dimension: "增长", relation: "growth", meaning: "为增长目标提供中等强度的支持。" },
  "A-VALUATION": { id: "A-VALUATION", stock: "ALFA", title: "模拟市盈率", value: "38×", detail: "三者最高，对增长预期变化更敏感；高估值不等同于一定下跌。", dimension: "估值 / 下行风险", relation: "downside", meaning: "提高对预期落空和下行情境的关注。" },
  "B-VALUATION": { id: "B-VALUATION", stock: "BETA", title: "模拟市盈率", value: "24×", detail: "三者最低，但估值较低不等于公司风险一定较低。", dimension: "估值 / 下行风险", relation: "downside", meaning: "提供相对估值缓冲，但不能替代公司风险检查。" },
  "G-VALUATION": { id: "G-VALUATION", stock: "GAMMA", title: "模拟市盈率", value: "29×", detail: "估值处于三者中间。", dimension: "估值 / 下行风险", relation: "downside", meaning: "在估值维度上位于两者之间。" },
  "A-VOLATILITY": { id: "A-VOLATILITY", stock: "ALFA", title: "价格路径波动", value: "高", detail: "整体涨幅较高，但中途波动和回撤也最大。", dimension: "下行风险", relation: "downside", meaning: "限制下行风险目标。" },
  "B-VOLATILITY": { id: "B-VOLATILITY", stock: "BETA", title: "价格路径波动", value: "低", detail: "固定模拟走势中，价格路径最平稳；低波动不代表没有公司风险。", dimension: "下行风险", relation: "downside", meaning: "支持控制价格波动的目标。" },
  "G-VOLATILITY": { id: "G-VOLATILITY", stock: "GAMMA", title: "价格路径波动", value: "中", detail: "涨幅和波动均处于三者中间。", dimension: "下行风险", relation: "downside", meaning: "下行风险线索处于中间。" },
  "A-LIQUIDITY": { id: "A-LIQUIDITY", stock: "ALFA", title: "日均成交活跃度", value: "高", detail: "在模拟环境中较容易找到交易对手，但不保证成交价格。", dimension: "短期可变现性", relation: "shortNeed", meaning: "支持较短时间内的交易可行性。" },
  "B-LIQUIDITY": { id: "B-LIQUIDITY", stock: "BETA", title: "日均成交活跃度", value: "中", detail: "模拟交易可行性处于三者中间。", dimension: "短期可变现性", relation: "shortNeed", meaning: "为短期资金需求提供中等支持。" },
  "G-LIQUIDITY": { id: "G-LIQUIDITY", stock: "GAMMA", title: "日均成交活跃度", value: "低", detail: "在模拟环境中需要更关注变现难度。", dimension: "短期可变现性", relation: "shortNeed", meaning: "限制短期资金可变现目标。" },
  "A-CONCENTRATION": { id: "A-CONCENTRATION", stock: "ALFA", title: "最大客户收入占比", value: "42%", detail: "主要客户变化可能影响收入稳定性。", dimension: "经营稳定性 / 下行风险", relation: "stability", meaning: "提示客户集中带来的经营风险。" },
  "B-CASHFLOW": { id: "B-CASHFLOW", stock: "BETA", title: "经营现金流", value: "连续8季度为正", detail: "提供经营稳定性的正向证据，但不保证未来持续。", dimension: "经营稳定性", relation: "stability", meaning: "支持经营稳定性目标。" },
  "B-CYCLE": { id: "B-CYCLE", stock: "BETA", title: "行业周期敏感性", value: "较高", detail: "行业周期变化可能削弱现金流稳定性。", dimension: "经营稳定性 / 下行风险", relation: "stability", meaning: "限制经营稳定性并提示周期风险。" },
  "G-DEBT": { id: "G-DEBT", stock: "GAMMA", title: "资产负债率", value: "68%", detail: "财务弹性相对较弱，可能放大下行情境下的压力。", dimension: "经营稳定性 / 下行风险", relation: "stability", meaning: "限制经营稳定性并增加下行情境压力。" },
  "A-WEAKSIGNAL": { id: "A-WEAKSIGNAL", stock: "ALFA", title: "战略合作意向", value: "已签署意向书", detail: "与一家大型平台签署战略合作意向书，但未披露正式订单、金额或预计收入。", dimension: "弱诊断信息", relation: "growth", meaning: "可作为待核查线索，不能当作已经实现的收入。", weak: true },
  "B-WEAKSIGNAL": { id: "B-WEAKSIGNAL", stock: "BETA", title: "新客户试点", value: "已启动试点", detail: "与一家新客户启动试点合作，但未说明是否付费、客户规模或收入贡献。", dimension: "弱诊断信息", relation: "growth", meaning: "可作为待核查线索，不能直接证明增长。", weak: true },
  "G-WEAKSIGNAL": { id: "G-WEAKSIGNAL", stock: "GAMMA", title: "新产品试用反馈", value: "好于预期", detail: "管理层称试用反馈好于预期，但未披露试用数量、正式订单或实际销售。", dimension: "弱诊断信息", relation: "growth", meaning: "可作为待核查线索，不能直接证明销售。", weak: true },
};

const ROUND_FACTS: Record<number, FactId[]> = {
  1: ["A-GROWTH", "A-VALUATION", "B-GROWTH", "B-VALUATION", "G-GROWTH", "G-VALUATION"],
  2: ["A-VOLATILITY", "A-LIQUIDITY", "B-VOLATILITY", "B-LIQUIDITY", "G-VOLATILITY", "G-LIQUIDITY"],
  3: ["A-CONCENTRATION", "B-CASHFLOW", "B-CYCLE", "G-DEBT"],
  4: ["A-WEAKSIGNAL", "B-WEAKSIGNAL", "G-WEAKSIGNAL"],
};

const FACT_ORDER = Object.values(ROUND_FACTS).flat();
const ROUND_COPY: Record<number, { eyebrow: string; user: string; agent: string }> = {
  1: { eyebrow: "ROUND 01 · GROWTH & VALUATION", user: "先比较三只股票的增长和估值。", agent: "ALFA增长最高、估值也最高；BETA增长较慢、估值最低；GAMMA的增长和估值均处于中间。单凭这一组信息还不足以形成最终判断。" },
  2: { eyebrow: "ROUND 02 · VOLATILITY & LIQUIDITY", user: "再比较三只股票的价格波动和交易活跃度。", agent: "ALFA价格波动较高、成交活跃度高；BETA价格波动低、成交活跃度中等；GAMMA两项均处于中间偏弱位置。成交更活跃不代表价格不会下跌。" },
  3: { eyebrow: "ROUND 03 · STABILITY & RISK", user: "继续了解三只股票的经营稳定性和公司特定风险。", agent: "ALFA存在客户集中风险；BETA现金流连续为正，但对行业周期较敏感；GAMMA资产负债率较高。单项优势或风险都不能独立决定最终选择。" },
  4: { eyebrow: "ROUND 04 · WEAK SIGNALS", user: "最近还有哪些公司进展？看完后，请先形成一个初步判断。", agent: "系统记录了三条近期进展，并同时给出尚未披露的内容。请结合当前目标自行判断其证据价值；系统不会标记其相关性或可靠性。" },
};

const STOCKS: StockId[] = ["ALFA", "BETA", "GAMMA"];

function countCharacters(value: string) {
  return Array.from(value.normalize("NFC").trim().replace(/[\r\n]/g, "")).length;
}

function strategyText(strategy: StrategyState) {
  return STRATEGY_FIELDS.map(({ key, label }) => `${label}：${strategy[key]}`).join("；");
}

function equalStrategy(a: StrategyState, b: StrategyState) {
  return STRATEGY_FIELDS.every(({ key }) => a[key] === b[key]);
}

function saveJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function AgentMark() { return <div className="agent-mark" aria-hidden="true">AI</div>; }

function PriceChart() {
  return <section className="chart-card" aria-label="三只股票的模拟归一化价格走势">
    <div className="card-heading"><div><p className="object-type">STATIC GRAPH · SAME IN BOTH CONDITIONS</p><h3>模拟归一化价格走势</h3></div><span>起点 = 100</span></div>
    <svg viewBox="0 0 720 220" role="img" aria-label="ALFA波动较高，BETA较平稳，GAMMA居中">
      {[40, 85, 130, 175].map(y => <line key={y} x1="45" y1={y} x2="690" y2={y} className="grid-line" />)}
      <polyline points="45,176 105,150 165,169 225,116 285,141 345,79 405,110 465,47 525,92 585,33 645,57 690,25" className="line alfa" />
      <polyline points="45,176 105,169 165,162 225,154 285,163 345,149 405,141 465,134 525,142 585,127 645,119 690,111" className="line beta" />
      <polyline points="45,176 105,161 165,146 225,154 285,124 345,109 405,117 465,87 525,95 585,73 645,80 690,57" className="line gamma" />
    </svg>
    <div className="chart-legend"><span><i className="alfa" />ALFA</span><span><i className="beta" />BETA</span><span><i className="gamma" />GAMMA</span></div>
  </section>;
}

function VisibleFact({ fact, selected, onSelect, onQualified }: { fact: Fact; selected: boolean; onSelect: () => void; onQualified: (id: FactId) => void }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const callback = useRef(onQualified);
  useEffect(() => { callback.current = onQualified; }, [onQualified]);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    let timer: number | null = null;
    const clear = () => { if (timer !== null) window.clearTimeout(timer); timer = null; };
    const observer = new IntersectionObserver(entries => {
      clear();
      if (entries[0]?.intersectionRatio >= 0.5 && document.visibilityState === "visible" && document.hasFocus()) timer = window.setTimeout(() => callback.current(fact.id), 1000);
    }, { threshold: [0.5] });
    observer.observe(node);
    return () => { clear(); observer.disconnect(); };
  }, [fact.id]);
  return <button ref={ref} type="button" className={`fact-row ${selected ? "selected" : ""}`} onClick={onSelect} aria-pressed={selected}>
    <span><b>{fact.title}</b><small>{fact.dimension}</small></span><strong>{fact.value}</strong>
  </button>;
}

function FactCards({ ids, selected, onSelect, onQualified }: { ids: FactId[]; selected: FactId | null; onSelect: (id: FactId) => void; onQualified: (id: FactId) => void }) {
  return <div className="stock-grid">{STOCKS.map(stock => {
    const facts = ids.map(id => FACTS[id]).filter(fact => fact.stock === stock);
    if (!facts.length) return null;
    return <section className="stock-card" key={stock}><div className="stock-head"><div><p className="object-type">COMPANY OBJECT</p><h3>{stock}</h3></div><span>固定模拟数据</span></div><div className="fact-list">{facts.map(fact => <VisibleFact key={fact.id} fact={fact} selected={selected === fact.id} onSelect={() => onSelect(fact.id)} onQualified={onQualified} />)}</div></section>;
  })}</div>;
}

function StatusBadge({ label, state }: { label: string; state: Freshness }) {
  const text = state === "fresh" ? "已消费最新版本" : state === "stale" ? "已过期，需刷新" : "尚未消费";
  return <span className={`status-badge ${state}`}><b>{label}</b>{text}</span>;
}

function StrategyTable({ strategy, compact = false }: { strategy: StrategyState; compact?: boolean }) {
  return <dl className={compact ? "strategy-table compact" : "strategy-table"}>{STRATEGY_FIELDS.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{strategy[key]}</dd></div>)}</dl>;
}

function Tutorial({ condition, onComplete }: { condition: Condition; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [stale, setStale] = useState(false);
  const steps = ["查看“博物馆方案”的详情。", "把“博物馆方案”加入Focus。Focus只是方便稍后定位。", "让练习中的天气约束出现。", "把“博物馆室内开放”加入Evidence。Evidence才会成为Agent可消费的依据。", "把练习Strategy改为“雨天优先室内”，查看并确认修改。", "让Agent使用当前Strategy和Evidence生成说明。", "再次修改Strategy，观察Agent状态变为过期，然后刷新说明。"];
  const advance = (message: string) => { setMessages(current => [...current, message]); setStep(current => Math.min(7, current + 1)); };
  const submitChat = () => {
    const text = input.trim(); if (!text) return;
    setMessages(current => [...current, `你：${text}`]);
    const ok = (step === 0 && /详情|了解/.test(text)) || (step === 1 && /关注|focus/i.test(text)) || (step === 3 && /依据|evidence/i.test(text)) || (step === 4 && /策略|strategy|室内/.test(text)) || (step === 5 && /使用|说明|消费|分析/.test(text)) || (step === 6 && /修改|策略|刷新|更新/.test(text));
    if (ok) {
      if (step === 6 && !stale) { setStale(true); setMessages(current => [...current, "系统：Strategy已改变，Agent说明已过期。请再输入“刷新说明”。"]); }
      else if (step === 6 && stale && /刷新|更新/.test(text)) advance("Agent：已使用最新状态刷新说明。教程完成。");
      else advance("Agent：已完成该语义动作。");
    } else setMessages(current => [...current, "Agent：我还不能唯一确定该操作，请按本步目标重新表述。"]);
    setInput("");
  };
  const widgetAction = () => {
    if (step === 6 && !stale) { setStale(true); setMessages(current => [...current, "系统：Strategy已改变，Agent说明已过期。请点击刷新说明。"]); return; }
    advance(step === 6 ? "Agent：已使用最新状态刷新说明。教程完成。" : "系统：已完成该语义动作。");
  };
  return <main className="tutorial-page"><section className="tutorial-intro"><p className="eyebrow">STANDARDIZED PRACTICE · NOT ANALYZED</p><h2>先用一个出行例子熟悉操作</h2><p>教程不涉及股票，也不会告诉你正式任务的正确值。两种界面练习相同语义动作；完成后会清空状态再开始正式任务。</p></section><div className="tutorial-layout"><section className="tutorial-stage"><div className="step-counter">步骤 {Math.min(step + 1, 7)} / 7</div>{step < 7 ? <><h3>{steps[step]}</h3><div className="travel-grid"><article><p className="object-type">TRAVEL OBJECT</p><h4>公园野餐</h4><p>户外 · 费用低 · 需要晴天</p></article><article className="selected"><p className="object-type">TRAVEL OBJECT</p><h4>博物馆方案</h4><p>室内 · 10:00—18:00 · 雨天可用</p></article></div>{step === 2 ? <button className="primary" onClick={() => advance("系统：天气更新——下午有雨。")}>显示天气更新</button> : condition === "chat_widget" ? <button className="primary" onClick={widgetAction}>{step === 0 ? "了解详情" : step === 1 ? "加入Focus" : step === 3 ? "加入Evidence" : step === 4 ? "查看Diff并确认Strategy" : step === 5 ? "让Agent使用当前状态" : stale ? "刷新Agent说明" : "修改Strategy"}</button> : <div className="tutorial-chat"><label htmlFor="tutorial-chat-input">用Chat完成本步</label><div><input id="tutorial-chat-input" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter") submitChat(); }} placeholder={step === 0 ? "例如：查看博物馆方案详情" : "描述你要执行的动作"} /><button onClick={submitChat}>发送</button></div></div>}</> : <div className="tutorial-complete"><span>✓</span><h3>操作教程完成</h3><p>记住四个状态不自动互换：查看 ≠ Focus ≠ Evidence ≠ Strategy。Agent说明也可能因状态更新而过期。</p><button className="primary" onClick={onComplete}>清空练习并开始正式任务</button></div>}</section><aside className="tutorial-log"><p className="object-type">PRACTICE FEEDBACK</p>{messages.length ? messages.map((message, index) => <p key={`${message}-${index}`}>{message}</p>) : <p>完成动作后，这里会显示中性反馈。</p>}</aside></div></main>;
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(false);
  const [condition, setCondition] = useState<Condition>("chat_widget");
  const [phase, setPhase] = useState<Phase>("landing");
  const [round, setRound] = useState(0);
  const [selectedFact, setSelectedFact] = useState<FactId | null>(null);
  const [detailFact, setDetailFact] = useState<FactId | null>(null);
  const [focus, setFocus] = useState<FactId[]>([]);
  const [evidence, setEvidence] = useState<FactId[]>([]);
  const [initialExposure, setInitialExposure] = useState<FactId[]>([]);
  const [reaccessed, setReaccessed] = useState<FactId[]>([]);
  const [provisionalStock, setProvisionalStock] = useState<StockId | "">("");
  const [provisionalReason, setProvisionalReason] = useState("");
  const [strategy, setStrategy] = useState<StrategyState>({ ...STRATEGY_V1 });
  const [strategyDraft, setStrategyDraft] = useState<StrategyState>({ ...STRATEGY_V1 });
  const [strategyHistory, setStrategyHistory] = useState<StrategyState[]>([]);
  const [strategyVersion, setStrategyVersion] = useState(1);
  const [evidenceVersion, setEvidenceVersion] = useState(0);
  const [confirmedAfterT0, setConfirmedAfterT0] = useState(false);
  const [strategyAgentState, setStrategyAgentState] = useState<Freshness>("none");
  const [evidenceAgentState, setEvidenceAgentState] = useState<Freshness>("none");
  const [activeStrategyField, setActiveStrategyField] = useState<keyof StrategyState | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [pendingStrategy, setPendingStrategy] = useState<StrategyState | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [finalStock, setFinalStock] = useState<StockId | "">("");
  const [finalReason, setFinalReason] = useState("");
  const [survey, setSurvey] = useState<Record<string, number>>({ mental: 50, physical: 50, temporal: 50, performance: 50, effort: 50, frustration: 50, retrieval: 4, translation: 4, certainty: 4, control: 4 });
  const [unaided, setUnaided] = useState<Partial<StrategyState>>({});
  const [unaidedConfidence, setUnaidedConfidence] = useState(50);
  const [aidedDraft, setAidedDraft] = useState<StrategyState | null>(null);
  const [stateLookedUp, setStateLookedUp] = useState(false);
  const [probeChat, setProbeChat] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [completedSnapshot, setCompletedSnapshot] = useState<Record<string, unknown> | null>(null);
  const sessionId = useRef("pending");
  const startedAt = useRef(0);
  const sequence = useRef(0);
  const messageId = useRef(0);
  const roundRef = useRef(0);
  const strategyVersionRef = useRef(1);
  const evidenceVersionRef = useRef(0);
  const t0 = useRef<number | null>(null);
  const constraintTimer = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("condition");
      setPreview(params.get("preview") === "1");
      let assigned: Condition;
      if (requested === "chat_only" || requested === "chat_widget") assigned = requested;
      else { const stored = window.sessionStorage.getItem("stock-v3.3-condition"); assigned = stored === "chat_only" || stored === "chat_widget" ? stored : Math.random() < 0.5 ? "chat_only" : "chat_widget"; }
      window.sessionStorage.setItem("stock-v3.3-condition", assigned); setCondition(assigned); setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || sessionId.current === "pending" || !logs.length) return;
    window.localStorage.setItem(`stock-v3.3:${sessionId.current}`, JSON.stringify({ condition, logs }));
  }, [condition, logs, ready]);

  const log = (eventType: string, actor: LogEntry["actor"], surface: LogEntry["surface"], payload: Record<string, unknown> = {}) => {
    if (sessionId.current === "pending") return;
    sequence.current += 1;
    setLogs(current => [...current, { schema_version: "stock-v3.3-prototype", session_id: sessionId.current, sequence_no: sequence.current, condition, round_id: `R${String(roundRef.current).padStart(2, "0")}`, event_type: eventType, actor, surface, timestamp_utc: new Date().toISOString(), timestamp_monotonic_ms: Math.round(performance.now() - startedAt.current), payload }]);
  };

  useEffect(() => {
    if (!ready) return;
    const visibility = () => log("page_visibility_changed", "system", "browser", { visibility: document.visibilityState });
    const focusHandler = () => log("window_focus_changed", "system", "browser", { focused: document.hasFocus() });
    document.addEventListener("visibilitychange", visibility); window.addEventListener("focus", focusHandler); window.addEventListener("blur", focusHandler);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("focus", focusHandler); window.removeEventListener("blur", focusHandler); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if (phase !== "task" || round !== 5 || t0.current !== null) return;
    constraintTimer.current = window.setTimeout(() => { t0.current = performance.now(); log("constraint_exposure_qualified", "system", "task", { t0: Math.round(t0.current - startedAt.current) }); }, 500);
    return () => { if (constraintTimer.current !== null) window.clearTimeout(constraintTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  const addMessage = (role: ChatMessage["role"], text: string) => { messageId.current += 1; setMessages(current => [...current, { id: messageId.current, role, text }]); };

  const beginFormalTask = () => {
    sessionId.current = crypto.randomUUID(); startedAt.current = performance.now(); sequence.current = 0; t0.current = null; roundRef.current = 0; strategyVersionRef.current = 1; evidenceVersionRef.current = 0;
    setLogs([]); setFocus([]); setEvidence([]); setInitialExposure([]); setReaccessed([]); setSelectedFact(null); setDetailFact(null);
    setStrategy({ ...STRATEGY_V1 }); setStrategyDraft({ ...STRATEGY_V1 }); setStrategyHistory([]); setStrategyVersion(1); setEvidenceVersion(0); setConfirmedAfterT0(false); setStrategyAgentState("none"); setEvidenceAgentState("none"); setMessages([]); setPendingStrategy(null); setPendingAction(null); setProvisionalStock(""); setProvisionalReason(""); setFinalStock(""); setFinalReason(""); setRound(0); setPhase("task");
    window.setTimeout(() => { log("session_started", "system", "system", { scenario_version: "stock-v3.3", metric_config_version: "v3.2-prototype", H_ms: null, L_ms: null, formal_data_collection: false }); log("task_started", "system", "task", { participant_population: "nonprofessional_financially_literate" }); log("round_exposed", "system", "task", { round: 0 }); }, 0);
  };

  const switchPreviewCondition = (next: Condition) => {
    if (!preview || phase !== "landing") return;
    setCondition(next); window.sessionStorage.setItem("stock-v3.3-condition", next);
    const url = new URL(window.location.href); url.searchParams.set("preview", "1"); url.searchParams.set("condition", next); window.history.replaceState({}, "", url);
  };

  const exposeRound = (next: number) => { roundRef.current = next; setRound(next); setSelectedFact(null); setDetailFact(null); log("round_exposed", "system", "task", { round: next }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const markQualified = (id: FactId) => {
    if (round >= 1 && round <= 4) setInitialExposure(current => { if (current.includes(id)) return current; log("qualified_initial_exposure", "system", "task", { fact_id: id, visibility_ratio: 0.5, dwell_ms: 1000 }); return [...current, id]; });
    else if (round >= 6 && initialExposure.includes(id)) setReaccessed(current => { if (current.includes(id)) return current; log("qualified_reaccess", "system", "task", { fact_id: id, initiation: "user_scroll", visibility_ratio: 0.5, dwell_ms: 1000 }); return [...current, id]; });
  };

  const currentRoundReady = round < 1 || round > 4 || ROUND_FACTS[round].every(id => initialExposure.includes(id));
  const toggleFocus = (id: FactId, source: Source) => setFocus(current => { const removing = current.includes(id); const next = removing ? current.filter(item => item !== id) : [...current, id]; log(removing ? "focus_remove" : "focus_add", "participant", source, { fact_id: id, focus_snapshot: next }); return next; });
  const mutateEvidence = (id: FactId, source: Source, remove = false) => setEvidence(current => { const next = remove ? current.filter(item => item !== id) : current.includes(id) ? current : [...current, id]; const nextVersion = evidenceVersionRef.current + 1; evidenceVersionRef.current = nextVersion; setEvidenceVersion(nextVersion); setEvidenceAgentState("stale"); log(remove ? "evidence_remove" : "evidence_add", "participant", source, { fact_id: id, evidence_version: nextVersion, evidence_snapshot: next }); log("evidence_confirmed_snapshot", "system", source, { evidence_version: nextVersion, evidence_snapshot: next }); return next; });
  const openDetails = (id: FactId, source: Source) => { setDetailFact(id); setSelectedFact(id); log("fact_view_started", "participant", source, { fact_id: id, content: `${FACTS[id].title} ${FACTS[id].value}`, initiation: source === "chat" ? "explicit_chat_request" : "popup" }); if (round >= 6 && initialExposure.includes(id) && !reaccessed.includes(id)) window.setTimeout(() => markQualified(id), 1000); };

  const commitStrategy = (next: StrategyState, source: Source) => { const nextVersion = strategyVersionRef.current + 1; strategyVersionRef.current = nextVersion; setStrategyHistory(current => [...current, { ...strategy }]); setStrategy({ ...next }); setStrategyDraft({ ...next }); setStrategyVersion(nextVersion); setConfirmedAfterT0(true); setPendingStrategy(null); setDiffOpen(false); setStrategyAgentState("stale"); log("strategy_confirmed_snapshot", "participant", source, { strategy_version: nextVersion, strategy_snapshot: next }); addMessage("system", `Strategy V${nextVersion} 已确认。Agent尚未使用这一版本。`); };
  const undoStrategy = (source: Source) => { const previous = strategyHistory.at(-1); if (!previous) return; const nextVersion = strategyVersionRef.current + 1; strategyVersionRef.current = nextVersion; setStrategyHistory(current => current.slice(0, -1)); setStrategy({ ...previous }); setStrategyDraft({ ...previous }); setStrategyVersion(nextVersion); setConfirmedAfterT0(true); setStrategyAgentState("stale"); log("strategy_undo", "participant", source, { strategy_version: nextVersion, strategy_snapshot: previous }); addMessage("system", `已撤销最近一次Strategy确认。当前为V${nextVersion}，Agent说明已过期。`); };

  const consumeAgentState = (source: Source) => {
    const orderedEvidence = FACT_ORDER.filter(id => evidence.includes(id)); setStrategyAgentState("fresh"); setEvidenceAgentState("fresh");
    const plan = { strategy: { ...strategy }, evidence: orderedEvidence, registry: "stock-object-registry-v1.1" };
    log("agent_context_consumed", "agent", source, { consumed_strategy_version: strategyVersion, consumed_strategy: strategy, consumed_evidence_version: evidenceVersion, consumed_evidence: orderedEvidence, output_plan: plan });
    const evidenceCopy = orderedEvidence.length ? orderedEvidence.map(id => `${FACTS[id].stock}—${FACTS[id].title}${FACTS[id].value}：${FACTS[id].meaning}`).join("；") : "你还没有确认任何Evidence，因此不能基于已确认依据形成股票比较";
    addMessage("agent", `当前已确认Strategy：${strategyText(strategy)}。基于已确认Evidence：${evidenceCopy}。未加入Evidence的信息不会被自动补充；这不是股票推荐。`);
  };

  const findFact = (text: string) => { const upper = text.toUpperCase(); const direct = FACT_ORDER.find(id => upper.includes(id)); if (direct) return direct; if (selectedFact) return selectedFact; return FACT_ORDER.find(id => { const fact = FACTS[id]; return upper.includes(fact.stock) && (text.includes(fact.title.slice(0, 4)) || text.includes(fact.value)); }) ?? null; };
  const parseStrategy = (text: string) => {
    const next = { ...strategy }; let changed = false;
    if (/总体|研究视角|总期限/.test(text) && /6个月/.test(text) && !/12个月/.test(text)) { next.horizon = "6个月"; changed = true; }
    if (/总体|研究视角|总期限/.test(text) && /12个月|一年/.test(text)) { next.horizon = "约12个月"; changed = true; }
    if (/30%/.test(text) && /6个月|半年/.test(text)) { next.shortNeed = "30%资金可能在6个月内使用"; changed = true; }
    if (/短期资金/.test(text) && /无|没有/.test(text)) { next.shortNeed = "无额外要求"; changed = true; }
    if (/风险|下行/.test(text) && /高|优先|重视|提高/.test(text)) { next.downside = "高"; changed = true; }
    if (/风险|下行/.test(text) && /中|适中/.test(text)) { next.downside = "中"; changed = true; }
    if (/经营|稳定/.test(text) && /高|优先|重视|提高/.test(text)) { next.stability = "高"; changed = true; }
    if (/经营|稳定/.test(text) && /中|适中/.test(text)) { next.stability = "中"; changed = true; }
    if (/增长/.test(text) && /保留|中等|适中|降低|中/.test(text)) { next.growth = "中，但保留"; changed = true; }
    if (/增长/.test(text) && /不考虑|删除|放弃/.test(text)) { next.growth = "不考虑"; changed = true; }
    if (/增长/.test(text) && /高|优先/.test(text) && !/不/.test(text)) { next.growth = "高"; changed = true; }
    return changed ? next : null;
  };

  const submitChat = () => {
    const text = chatInput.trim(); if (!text) return; addMessage("user", text); setChatInput(""); log("chat_message_submitted", "participant", "chat", { text, typed_characters: countCharacters(text) });
    if (/^(确认|是的|同意)[。！!\s]*$/.test(text)) {
      if (pendingAction) { mutateEvidence(pendingAction.factId, "chat", pendingAction.kind === "evidence_remove"); addMessage("agent", `已${pendingAction.kind === "evidence_remove" ? "移出" : "加入"}Evidence：${FACTS[pendingAction.factId].stock}—${FACTS[pendingAction.factId].title}${FACTS[pendingAction.factId].value}。`); setPendingAction(null); return; }
      if (pendingStrategy) { commitStrategy(pendingStrategy, "chat"); return; }
    }
    if (/确认当前策略/.test(text)) { commitStrategy(strategy, "chat"); return; }
    if (/撤销|undo/i.test(text)) { undoStrategy("chat"); return; }
    if (/当前策略|查看策略|保存的策略/.test(text)) { addMessage("agent", strategyText(strategy)); log("state_lookup_content_visible", "agent", "chat", { strategy_version: strategyVersion }); return; }
    if (/当前依据|查看依据|evidence.*状态/i.test(text)) { addMessage("agent", evidence.length ? evidence.map(id => `${id} ${FACTS[id].title}${FACTS[id].value}`).join("；") : "当前Confirmed Evidence为空。"); return; }
    if (/当前关注|查看关注|focus.*状态/i.test(text)) { addMessage("agent", focus.length ? focus.map(id => `${id} ${FACTS[id].title}`).join("；") : "当前Focus为空。"); return; }
    if (/使用当前|生成说明|刷新说明|更新说明|消费当前/.test(text)) { consumeAgentState("chat"); return; }
    const factId = findFact(text);
    if (factId && /详情|解释|了解/.test(text)) { openDetails(factId, "chat"); addMessage("agent", `${FACTS[factId].stock}—${FACTS[factId].title}${FACTS[factId].value}。${FACTS[factId].detail}`); return; }
    if (factId && /取消关注|移出关注/.test(text)) { if (focus.includes(factId)) toggleFocus(factId, "chat"); addMessage("agent", `已取消关注${factId}。`); return; }
    if (factId && /关注|记住|focus/i.test(text)) { if (!focus.includes(factId)) toggleFocus(factId, "chat"); addMessage("agent", `已加入Focus：${factId}。Focus不会自动成为Evidence。`); return; }
    if (round >= 5 && factId && /移出依据|删除依据|取消依据/.test(text)) { setPendingAction({ kind: "evidence_remove", factId }); addMessage("agent", `你提出从Evidence移出${factId}—${FACTS[factId].title}${FACTS[factId].value}。输入“确认”后生效。`); return; }
    if (round >= 5 && factId && /加入依据|作为依据|evidence/i.test(text)) { setPendingAction({ kind: "evidence_add", factId }); addMessage("agent", `你提出将${factId}—${FACTS[factId].title}${FACTS[factId].value}加入Evidence。输入“确认”后生效。`); return; }
    if (round >= 5) { const parsed = parseStrategy(text); if (parsed) { setPendingStrategy(parsed); const changes = STRATEGY_FIELDS.filter(({ key }) => parsed[key] !== strategy[key]).map(({ key, label }) => `${label}：${strategy[key]} → ${parsed[key]}`); addMessage("agent", `我只识别到这些明确修改：${changes.join("；") || "没有字段变化"}。未提及字段保持不变。输入“确认”后生效。`); log("chat_parse_result", "agent", "chat", { parse: "strategy_candidate", changes }); return; } }
    addMessage("agent", "我不能唯一确定你要操作的对象或状态。请先选中一个指标，或明确写出对象ID与“详情 / 关注 / 加入依据 / 修改策略 / 使用当前状态”。"); log("chat_parse_result", "agent", "chat", { parse: "clarification_required" });
  };

  const openStrategyFromFact = (id: FactId) => { setActiveStrategyField(FACTS[id].relation); setDiffOpen(false); log("strategy_draft_snapshot", "participant", "widget", { trigger_fact_id: id, focused_field: FACTS[id].relation, draft: strategyDraft }); document.getElementById("strategy-object")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const submitProvisional = () => { if (!provisionalStock || countCharacters(provisionalReason) < 8 || !currentRoundReady) return; log("provisional_decision_submitted", "participant", "task", { stock: provisionalStock, rationale: provisionalReason.trim() }); addMessage("agent", "已记录你的初步候选和理由。这是当前判断锚点；请继续完成后续任务。"); exposeRound(5); };
  const submitFinal = () => { const length = countCharacters(finalReason); if (!finalStock || length < 100 || length > 150 || !confirmedAfterT0 || strategyAgentState !== "fresh") return; const submissionId = crypto.randomUUID(); log("final_submit_requested", "participant", "task", { submission_id: submissionId, stock: finalStock, rationale: finalReason, character_count: length }); const snapshot = { context_id: crypto.randomUUID(), final_stock: finalStock, rationale: finalReason, confirmed_strategy_version: strategyVersion, confirmed_strategy: strategy, confirmed_evidence_version: evidenceVersion, confirmed_evidence: evidence, agent_strategy_state: strategyAgentState, agent_evidence_state: evidenceAgentState }; setCompletedSnapshot(snapshot); log("final_submit_lock_acquired", "system", "task", { submission_id: submissionId, context_id: snapshot.context_id }); log("task_context_frozen", "system", "task", snapshot); setPhase("survey"); window.scrollTo({ top: 0 }); };
  const submitUnaided = () => { if (!STRATEGY_FIELDS.every(({ key }) => unaided[key])) return; log("unaided_probe_submitted", "participant", "probe", { answer: unaided, confidence: unaidedConfidence }); const seeded = { ...strategy }; const field = STRATEGY_FIELDS[sessionId.current.charCodeAt(0) % STRATEGY_FIELDS.length].key; const options = STRATEGY_FIELDS.find(item => item.key === field)!.values; seeded[field] = options.find(value => value !== strategy[field]) as never; setAidedDraft(seeded); setPhase("aided"); setStateLookedUp(false); window.scrollTo({ top: 0 }); log("aided_probe_exposed", "system", "probe", { seeded_field: field, SV0: seeded, L_ms: null }); };
  const submitProbeChat = () => { const text = probeChat.trim(); if (!text) return; log("chat_message_submitted", "participant", "chat", { phase: "aided_probe", text }); if (/策略|状态|保存/.test(text)) { setStateLookedUp(true); addMessage("agent", strategyText(strategy)); log("state_lookup_content_visible", "agent", "chat", { phase: "aided_probe", strategy_version: strategyVersion }); } setProbeChat(""); };
  const completeAided = () => { if (!aidedDraft || !stateLookedUp) return; log("aided_probe_submitted", "participant", "probe", { answer: aidedDraft, exact: equalStrategy(aidedDraft, strategy) }); log("session_completed", "system", "system", { prototype_only: true }); setPhase("done"); window.scrollTo({ top: 0 }); };

  const finalLength = countCharacters(finalReason);
  const finalGate = finalStock && finalLength >= 100 && finalLength <= 150 && confirmedAfterT0 && strategyAgentState === "fresh";
  const diff = STRATEGY_FIELDS.filter(({ key }) => strategyDraft[key] !== strategy[key]);
  const targetEvidence = evidence.filter(id => !FACTS[id].weak);
  const dimensions = new Set(targetEvidence.map(id => FACTS[id].dimension));
  const previewLinks = useMemo(() => { if (typeof window === "undefined") return { chat: "", widget: "" }; const base = `${window.location.origin}${window.location.pathname}`; return { chat: `${base}?condition=chat_only`, widget: `${base}?condition=chat_widget` }; }, []);
  const completedSessionId = logs[0]?.session_id ?? "prototype-session";

  if (!ready) return <main className="loading-screen" role="status">正在准备研究原型…</main>;
  return <div className="app-shell"><header className="topbar"><div className="brand-mark">S</div><div className="brand-copy"><p className="eyebrow">STOCK INTENT LAB · V3.3 PROTOTYPE</p><h1>信息复用与意图调整实验</h1></div><span className="prototype-pill">研究原型 · 虚构数据</span>{preview && phase === "landing" && <div className="researcher-switch" aria-label="研究者预览条件"><span>研究者预览</span><button className={condition === "chat_only" ? "active" : ""} onClick={() => switchPreviewCondition("chat_only")}>Chat-only</button><button className={condition === "chat_widget" ? "active" : ""} onClick={() => switchPreviewCondition("chat_widget")}>Chat + Widget</button></div>}</header><div className="notice-bar"><span>非投资建议</span><p>三家公司、数值和事件均为固定模拟材料。公开页面用于原型演示与工程验收，不代表实验效果已经得到验证。</p></div>

    {phase === "landing" && <main className="landing-page"><section className="hero"><p className="eyebrow">CHAT AS ENTRY · OBJECTS AS INTERACTION NODES</p><h2>在多轮信息中，重新找到依据并调整判断策略</h2><p>你将比较三只虚构股票。任务包含标准化教程和八个正式节点；系统会记录匿名交互日志到当前浏览器，并允许你在结束时下载。</p><div className="eligibility"><strong>适用参与者</strong><span>非金融从业者</span><span>能读懂常见股票/基金信息</span><span>不要求专业交易经验</span></div><button className="primary large" onClick={() => setPhase("tutorial")}>开始操作教程 <span>→</span></button></section><section className="study-boundary"><div><p className="object-type">WHAT THIS PROTOTYPE TESTS</p><h3>同样的信息，不同的状态操作通道</h3></div><ul><li>两组看到相同卡片、图表、顺序、详情和Agent结论</li><li>差异只在详情、Focus、Evidence、Strategy和状态核查如何完成</li><li>不测量“选对股票”，不向参与者推荐正确指标</li></ul></section>{preview && <section className="researcher-panel"><p className="object-type">RESEARCHER LAUNCH LINKS</p><h3>参与者不会看到上方条件切换器</h3><p>正式分配时使用固定链接；不带condition参数时，浏览器只随机分配一次并在该标签页锁定。</p><label>Chat-only<input readOnly value={previewLinks.chat} /></label><label>Chat + Widget<input readOnly value={previewLinks.widget} /></label></section>}</main>}
    {phase === "tutorial" && <Tutorial condition={condition} onComplete={beginFormalTask} />}

    {phase === "task" && <main className="task-page"><div className="progress"><span>正式任务</span>{Array.from({ length: 8 }, (_, index) => <i key={index} className={index <= round ? "active" : ""}>{index}</i>)}<b>Round {String(round).padStart(2, "0")} / 07</b></div>{round >= 5 && <div className="agent-state-bar"><StatusBadge label="Agent Strategy" state={strategyAgentState} /><StatusBadge label="Agent Evidence" state={evidenceAgentState} /></div>}<div className={`experiment-layout ${condition === "chat_widget" ? "with-widget" : ""}`}><section className="chat-lane">
      {round === 0 && <section className="task-brief"><p className="eyebrow">ROUND 00 · TASK & INITIAL INTENT</p><h2>选择一只值得进一步研究的股票</h2><p>请在ALFA、BETA、GAMMA三只虚构股票中选择一只。你当前计划持有约一年，风险偏好适中，希望兼顾增长与稳定。</p><div className="agent-turn"><AgentMark /><div><p>我会使用固定模拟数据协助你比较三只候选。接下来将分阶段比较增长、估值、价格波动、交易活跃度、经营情况和公司风险。</p><StrategyTable strategy={STRATEGY_V1} compact /></div></div><button className="primary" onClick={() => exposeRound(1)}>开始查看信息 <span>→</span></button></section>}
      {round >= 1 && round <= 4 && <section className="round-panel"><p className="eyebrow">{ROUND_COPY[round].eyebrow}</p><div className="user-turn">{ROUND_COPY[round].user}</div><div className="agent-turn"><AgentMark /><p>{ROUND_COPY[round].agent}</p></div>{round === 2 && <PriceChart />}<FactCards ids={ROUND_FACTS[round]} selected={selectedFact} onSelect={setSelectedFact} onQualified={markQualified} />{selectedFact && <div className="selection-actions"><span>已选中 <b>{selectedFact}</b></span>{condition === "chat_widget" ? <><button onClick={() => openDetails(selectedFact, "widget")}>了解详情</button><button onClick={() => toggleFocus(selectedFact, "widget")}>{focus.includes(selectedFact) ? "取消关注" : "加入Focus"}</button></> : <small>请在Chat中指明该对象并请求“详情”或“关注”。</small>}</div>}{!currentRoundReady && <p className="exposure-note">请滚动查看本轮全部指标；每项完整进入视野后才可继续。</p>}{round < 4 ? <button className="primary" disabled={!currentRoundReady} onClick={() => exposeRound(round + 1)}>继续下一组信息 <span>→</span></button> : <section className="provisional"><p className="object-type">PROVISIONAL DECISION</p><h3>形成一个初步判断锚点</h3><p>根据当前“一年左右、风险适中、兼顾增长与稳定”的目标，暂时选择一只股票并用至少8个字符说明理由。这个选择不是最终答案。</p><div className="stock-choice">{STOCKS.map(stock => <button key={stock} className={provisionalStock === stock ? "selected" : ""} onClick={() => setProvisionalStock(stock)}>{stock}</button>)}</div><label>一句理由 <span>{countCharacters(provisionalReason)} / 至少8</span></label><textarea value={provisionalReason} onChange={event => setProvisionalReason(event.target.value)} placeholder="说明你当前的主要权衡…" /><button className="primary" disabled={!currentRoundReady || !provisionalStock || countCharacters(provisionalReason) < 8} onClick={submitProvisional}>提交初步判断并继续 <span>→</span></button></section>}</section>}
      {round === 5 && <section className="constraint-card"><p className="eyebrow">ROUND 05 · CONTROLLED INTERMEDIATE TRIGGER</p><h2>情况发生变化</h2><p>你半年内可能需要使用这笔资金中的<strong>30%</strong>。你希望需要时不至于因为难以成交而无法顺利取出这部分钱，也更担心公司经营突然恶化后造成较大损失。其余资金仍计划从约一年的角度考虑，并不希望完全放弃增长机会。</p><p>请据此重新确认你当前采用的判断策略，并完成最终判断。</p><div className="neutral-warning">系统不会自动修改Strategy，也不会提示应该改哪些字段。你需要自行完成需求转译。</div><button className="primary" onClick={() => exposeRound(6)}>进入自由调整工作区 <span>→</span></button></section>}
      {round === 6 && <section className="workspace"><p className="eyebrow">ROUND 06 · REUSE, ADJUST & CONSUME</p><h2>重新访问依据并调整当前Strategy</h2><p>信息复用、Focus、Evidence、Strategy和Agent说明可以自由交错。查看、关注、加入依据和修改策略不会自动互相转换。</p><details className="history-drawer" open><summary>展开早期信息对象 · 19项</summary>{[1, 2, 3, 4].map(item => <section key={item}><h3>{ROUND_COPY[item].eyebrow}</h3><FactCards ids={ROUND_FACTS[item]} selected={selectedFact} onSelect={setSelectedFact} onQualified={markQualified} /></section>)}</details>{selectedFact && <div className="selection-actions"><span>已选中 <b>{selectedFact}</b></span>{condition === "chat_widget" ? <><button onClick={() => openDetails(selectedFact, "widget")}>了解详情</button><button onClick={() => toggleFocus(selectedFact, "widget")}>{focus.includes(selectedFact) ? "取消Focus" : "加入Focus"}</button><button onClick={() => mutateEvidence(selectedFact, "widget", evidence.includes(selectedFact))}>{evidence.includes(selectedFact) ? "移出Evidence" : "加入Evidence"}</button><button onClick={() => openStrategyFromFact(selectedFact)}>关联到Strategy</button></> : <small>使用下方Chat执行详情、Focus、Evidence和Strategy操作。</small>}</div>}<div className="workspace-summary"><span>合格重访 <b>{reaccessed.length}</b></span><span>Confirmed Evidence <b>{evidence.length}</b></span><span>覆盖维度 <b>{dimensions.size}</b></span></div>{condition === "chat_widget" && <button className="primary" onClick={() => consumeAgentState("widget")}>让Agent使用当前状态 <span>↻</span></button>}<button className="secondary next" onClick={() => exposeRound(7)}>进入最终判断 →</button></section>}
      {round === 7 && <section className="final-panel"><p className="eyebrow">ROUND 07 · FINAL DECISION</p><h2>提交最终判断</h2><p>选择一只最值得进一步研究的股票，并提交100—150个字符的理由。理由中请引用至少两条此前出现的具体事实，覆盖至少两个方面，说明它们如何符合当前Strategy并指出至少一项仍需核查的风险。</p><div className="stock-choice">{STOCKS.map(stock => <button key={stock} className={finalStock === stock ? "selected" : ""} onClick={() => setFinalStock(stock)}>{stock}</button>)}</div><label>最终理由 <span className={finalLength >= 100 && finalLength <= 150 ? "valid" : ""}>{finalLength} / 100—150</span></label><textarea value={finalReason} onChange={event => setFinalReason(event.target.value)} placeholder="请把具体事实与更新后的Strategy联系起来…" /><div className="gate-list"><span className={finalStock ? "ok" : ""}>选择股票</span><span className={finalLength >= 100 && finalLength <= 150 ? "ok" : ""}>理由字数合格</span><span className={confirmedAfterT0 ? "ok" : ""}>R05后确认Strategy</span><span className={strategyAgentState === "fresh" ? "ok" : ""}>Agent已消费最新Strategy</span></div><button className="primary" disabled={!finalGate} onClick={submitFinal}>锁定并提交最终判断 <span>→</span></button></section>}
      {messages.length > 0 && <section className="message-stream" aria-label="动态Chat消息">{messages.map(message => <div key={message.id} className={`message ${message.role}`}><b>{message.role === "user" ? "你" : message.role === "agent" ? "Agent" : "系统"}</b><p>{message.text}</p></div>)}</section>}
      {round >= 1 && <div className="chat-composer"><div><label htmlFor="main-chat-input">Chat仍是开放入口</label><small>{condition === "chat_only" ? "对象与状态操作必须通过Chat提出、复述和确认。" : "你也可以继续使用Chat完成相同语义动作。"}</small></div><textarea id="main-chat-input" value={chatInput} onChange={event => setChatInput(event.target.value)} placeholder={round < 5 ? "例如：查看已选中指标的详情 / 关注这个指标" : "例如：把已选中指标加入依据 / 修改风险优先级 / 使用当前状态生成说明"} /><button onClick={submitChat}>发送</button></div>}
    </section>
    {condition === "chat_widget" && <aside className="widget-rail">{selectedFact && <section className="state-object selected-object"><div className="object-head"><div><p className="object-type">SELECTED INFORMATION OBJECT</p><h3>{selectedFact}</h3></div><span>{FACTS[selectedFact].stock}</span></div><div className="selected-copy"><b>{FACTS[selectedFact].title} · {FACTS[selectedFact].value}</b><p>{FACTS[selectedFact].dimension}</p></div><div className="selected-buttons"><button onClick={() => openDetails(selectedFact, "widget")}>了解详情</button><button onClick={() => toggleFocus(selectedFact, "widget")}>{focus.includes(selectedFact) ? "取消Focus" : "加入Focus"}</button>{round >= 5 && <><button onClick={() => mutateEvidence(selectedFact, "widget", evidence.includes(selectedFact))}>{evidence.includes(selectedFact) ? "移出Evidence" : "加入Evidence"}</button><button onClick={() => openStrategyFromFact(selectedFact)}>关联Strategy</button></>}</div></section>}<section className="state-object" id="strategy-object"><div className="object-head"><div><p className="object-type">SHARED STATE OBJECT</p><h3>Strategy V{strategyVersion}</h3></div><span>{round < 5 ? "只读" : "可编辑"}</span></div>{round < 5 ? <StrategyTable strategy={strategy} /> : <div className="strategy-editor">{STRATEGY_FIELDS.map(({ key, label, values }) => <label key={key} className={activeStrategyField === key ? "hinted" : ""}><span>{label}</span><select value={strategyDraft[key]} onChange={event => { setStrategyDraft(current => ({ ...current, [key]: event.target.value } as StrategyState)); setDiffOpen(false); log("strategy_draft_snapshot", "participant", "widget", { field: key, value: event.target.value }); }}>{values.map(value => <option key={value}>{value}</option>)}</select></label>)}</div>}{round >= 5 && <><div className="object-actions"><button onClick={() => setDiffOpen(true)}>查看Diff</button><button className="confirm" onClick={() => commitStrategy(strategyDraft, "widget")}>确认Strategy</button><button disabled={!strategyHistory.length} onClick={() => undoStrategy("widget")}>Undo</button></div>{diffOpen && <div className="diff-panel"><p>{diff.length ? `${diff.length}项待确认修改` : "没有字段变化；仍可确认当前状态"}</p>{diff.map(({ key, label }) => <div key={key}><b>{label}</b><del>{strategy[key]}</del><span>→</span><ins>{strategyDraft[key]}</ins></div>)}</div>}</>}</section><section className="state-object"><div className="object-head"><div><p className="object-type">FOCUS SET</p><h3>关注对象</h3></div><span>{focus.length}</span></div><ul className="object-list">{focus.length ? focus.map(id => <li key={id}><button onClick={() => { setSelectedFact(id); openDetails(id, "widget"); }}>{id}<small>{FACTS[id].title}</small></button></li>) : <li className="empty">Focus只保存对象指针与标题。</li>}</ul></section>{round >= 5 && <section className="state-object"><div className="object-head"><div><p className="object-type">CONFIRMED EVIDENCE</p><h3>判断依据</h3></div><span>V{evidenceVersion}</span></div><ul className="object-list">{evidence.length ? evidence.map(id => <li key={id}><button onClick={() => openDetails(id, "widget")}>{id}<small>{FACTS[id].title} · {FACTS[id].value}</small></button></li>) : <li className="empty">尚未确认任何Evidence。</li>}</ul><button className="consume" onClick={() => consumeAgentState("widget")}>让Agent使用当前状态</button></section>}</aside>}
  </div></main>}

  {detailFact && <div className="modal-backdrop"><div className="fact-modal" role="dialog" aria-modal="true" aria-label={`${detailFact}详情`}><button className="modal-close" onClick={() => setDetailFact(null)} aria-label="关闭">×</button><p className="object-type">INFORMATION OBJECT · {detailFact}</p><h2>{FACTS[detailFact].stock} · {FACTS[detailFact].title}</h2><strong>{FACTS[detailFact].value}</strong><p>{FACTS[detailFact].detail}</p><div className="meaning"><b>与当前任务的可能关系</b><span>{FACTS[detailFact].meaning}</span></div><small>详情、Focus、Evidence和Strategy是四个独立状态。</small></div></div>}

  {phase === "survey" && <main className="measurement-page"><p className="eyebrow">POST-TASK MEASURES · BEFORE STATE PROBES</p><h2>请评价刚才的调整阶段</h2><p>只考虑Round 05任务更新出现后，到你提交最终判断之间的过程。</p><section className="measure-card"><h3>Raw NASA-TLX · 0—100</h3>{[{ key: "mental", label: "心理需求" }, { key: "physical", label: "身体需求" }, { key: "temporal", label: "时间需求" }, { key: "performance", label: "自评表现（高分=任务更成功）" }, { key: "effort", label: "努力程度" }, { key: "frustration", label: "挫败感" }].map(item => <label className="slider" key={item.key}><span>{item.label}<b>{survey[item.key]}</b></span><input type="range" min="0" max="100" value={survey[item.key]} onChange={event => setSurvey(current => ({ ...current, [item.key]: Number(event.target.value) }))} /></label>)}</section><section className="measure-card"><h3>场景化体验 · 1—7</h3>{[{ key: "retrieval", label: "为了重新找到前面出现的有用信息，我投入了很多精力。" }, { key: "translation", label: "将新的资金需求转化为具体判断策略让我感到费力。" }, { key: "certainty", label: "我确信系统保存的是我确认过的Strategy。" }, { key: "control", label: "我感到自己能够控制依据和Strategy的调整。" }].map(item => <label className="slider" key={item.key}><span>{item.label}<b>{survey[item.key]}</b></span><input type="range" min="1" max="7" value={survey[item.key]} onChange={event => setSurvey(current => ({ ...current, [item.key]: Number(event.target.value) }))} /></label>)}</section><button className="primary" onClick={() => { log("questionnaire_submitted", "participant", "questionnaire", survey); setPhase("unaided"); window.scrollTo({ top: 0 }); log("unaided_probe_exposed", "system", "probe"); }}>提交并进入状态理解题 <span>→</span></button></main>}
  {phase === "unaided" && <main className="measurement-page"><p className="eyebrow">UNAIDED STATE RECONSTRUCTION</p><h2>你认为系统最终保存的Strategy是什么？</h2><p>这一页隐藏了Chat和Widget。请只根据你的理解作答；系统不会反馈正确性。</p><section className="measure-card strategy-form">{STRATEGY_FIELDS.map(({ key, label, values }) => <label key={key}><span>{label}</span><select value={unaided[key] ?? ""} onChange={event => setUnaided(current => ({ ...current, [key]: event.target.value } as Partial<StrategyState>))}><option value="" disabled>请选择</option>{values.map(value => <option key={value}>{value}</option>)}</select></label>)}</section><section className="measure-card"><label className="slider"><span>你对以上回答的信心<b>{unaidedConfidence}</b></span><input type="range" min="0" max="100" value={unaidedConfidence} onChange={event => setUnaidedConfidence(Number(event.target.value))} /></label></section><button className="primary" disabled={!STRATEGY_FIELDS.every(({ key }) => unaided[key])} onClick={submitUnaided}>提交无辅助回答 <span>→</span></button></main>}
  {phase === "aided" && aidedDraft && <main className="measurement-page"><p className="eyebrow">AIDED STATE VERIFICATION</p><h2>核查一份可能存在一处不一致的摘要</h2><p>请使用你原来的界面核查系统实际保存的Strategy，再修正下表。至少完成一次状态查看后才能提交。</p><section className="probe-layout"><div className="measure-card strategy-form">{STRATEGY_FIELDS.map(({ key, label, values }) => <label key={key}><span>{label}</span><select value={aidedDraft[key]} onChange={event => setAidedDraft(current => ({ ...current!, [key]: event.target.value } as StrategyState))}>{values.map(value => <option key={value}>{value}</option>)}</select></label>)}</div><aside className="lookup-surface">{condition === "chat_widget" ? <><p className="object-type">READ-ONLY STRATEGY OBJECT</p><h3>任务终止快照</h3><StrategyTable strategy={strategy} /><button className="secondary" onClick={() => { setStateLookedUp(true); log("state_lookup_content_visible", "participant", "widget", { phase: "aided_probe" }); }}>我已查看该状态</button></> : <><p className="object-type">READ-ONLY CHAT HISTORY</p><h3>通过Chat查询当前状态</h3><div className="probe-chat"><input value={probeChat} onChange={event => setProbeChat(event.target.value)} placeholder="例如：请告诉我系统保存的当前策略" /><button onClick={submitProbeChat}>发送</button></div>{stateLookedUp && <p className="agent-readonly">Agent：{strategyText(strategy)}</p>}</>}</aside></section><button className="primary" disabled={!stateLookedUp} onClick={completeAided}>提交核查结果并结束 <span>→</span></button></main>}
  {phase === "done" && <main className="done-page"><div className="done-mark">✓</div><p className="eyebrow">SESSION COMPLETE</p><h2>原型流程已完成</h2><p>本页面不会把数据上传到研究服务器。日志保存在当前浏览器中；请下载JSON交给研究者进行工程验收。正式数据采集需在H/L、样本量、评分和统计协议冻结后另行启用。</p><div className="done-actions"><button className="primary" onClick={() => saveJson(`stock-v3.3-${completedSessionId}.json`, { prototype: true, condition, session_id: completedSessionId, final_snapshot: completedSnapshot, logs })}>下载匿名日志 JSON <span>↓</span></button><button className="secondary" onClick={() => window.location.reload()}>重新开始</button></div><details><summary>查看会话摘要</summary><pre>{JSON.stringify({ condition, event_count: logs.length, final_snapshot: completedSnapshot }, null, 2)}</pre></details></main>}
  <footer><p>Stock Intent Lab V3.3 · Public research prototype · Synthetic data only</p><p>无账户、无真实交易、无投资建议</p></footer></div>;
}
