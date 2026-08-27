"use client";

import { useEffect, useRef, useState } from "react";

type Condition = "chat" | "widget";
type StockId = "ALFA" | "BETA" | "GAMMA";
type Source = "chat" | "widget" | "system";
type FactId =
  | "A-GROWTH" | "A-VALUATION" | "A-CONCENTRATION" | "A-LIQUIDITY" | "A-NOISE"
  | "B-GROWTH" | "B-CASHFLOW" | "B-VOLATILITY" | "B-LIQUIDITY" | "B-CYCLE" | "B-NOISE"
  | "G-GROWTH" | "G-VALUATION" | "G-DEBT" | "G-LIQUIDITY" | "G-NOISE";

type Fact = {
  id: FactId;
  stock: StockId;
  label: string;
  detail: string;
  dimension: "增长" | "可变现性" | "稳定性/下行风险" | "补充信息";
};

type StrategyState = {
  horizon: "约 12 个月" | "6 个月";
  shortNeed: "无额外要求" | "30% 资金 / 6 个月";
  downside: "低" | "中" | "高";
  stability: "低" | "中" | "高";
  growth: "高" | "中（保留）" | "不考虑";
};

type LogEntry = {
  session_id: string;
  condition: Condition;
  timestamp: string;
  elapsed_ms: number;
  round_id: string;
  event_name: string;
  fact_id?: FactId;
  strategy_version?: number;
  source: Source;
  payload?: Record<string, unknown>;
};

type Message = { id: number; role: "user" | "agent"; text: string };

const FACTS: Record<FactId, Fact> = {
  "A-GROWTH": { id:"A-GROWTH", stock:"ALFA", label:"营收增长 24%", detail:"ALFA 最近一年模拟营收增长为 24%，三者最高。", dimension:"增长" },
  "A-VALUATION": { id:"A-VALUATION", stock:"ALFA", label:"市盈率 38×", detail:"ALFA 的模拟市盈率为 38×，三者最高，估值对增长预期更敏感。", dimension:"稳定性/下行风险" },
  "A-CONCENTRATION": { id:"A-CONCENTRATION", stock:"ALFA", label:"最大客户收入占比 42%", detail:"ALFA 最大客户贡献 42% 的收入，主要客户变化可能影响收入稳定性。", dimension:"稳定性/下行风险" },
  "A-LIQUIDITY": { id:"A-LIQUIDITY", stock:"ALFA", label:"成交活跃度高", detail:"在固定模拟数据中，ALFA 的日均成交活跃度为高。", dimension:"可变现性" },
  "A-NOISE": { id:"A-NOISE", stock:"ALFA", label:"官网更换视觉主题", detail:"ALFA 公司官网首页近期更换了视觉主题，与当前选股条件没有直接关系。", dimension:"补充信息" },
  "B-GROWTH": { id:"B-GROWTH", stock:"BETA", label:"营收增长 9%", detail:"BETA 最近一年模拟营收增长为 9%，三者最低。", dimension:"增长" },
  "B-CASHFLOW": { id:"B-CASHFLOW", stock:"BETA", label:"现金流连续 8 季度为正", detail:"BETA 经营现金流连续 8 个季度为正，可作为经营稳定性信息。", dimension:"稳定性/下行风险" },
  "B-VOLATILITY": { id:"B-VOLATILITY", stock:"BETA", label:"三者中波动最低", detail:"固定模拟走势中，BETA 的价格路径最平稳、波动最低。", dimension:"稳定性/下行风险" },
  "B-LIQUIDITY": { id:"B-LIQUIDITY", stock:"BETA", label:"成交活跃度中等", detail:"在固定模拟数据中，BETA 的日均成交活跃度为中等。", dimension:"可变现性" },
  "B-CYCLE": { id:"B-CYCLE", stock:"BETA", label:"行业周期敏感", detail:"BETA 的收入对行业周期变化较敏感，现金流稳定性仍需继续核查。", dimension:"稳定性/下行风险" },
  "B-NOISE": { id:"B-NOISE", stock:"BETA", label:"赞助公益路跑", detail:"BETA 近期赞助了一场公益路跑活动，与当前选股条件没有直接关系。", dimension:"补充信息" },
  "G-GROWTH": { id:"G-GROWTH", stock:"GAMMA", label:"营收增长 15%", detail:"GAMMA 最近一年模拟营收增长为 15%，处于三者中间。", dimension:"增长" },
  "G-VALUATION": { id:"G-VALUATION", stock:"GAMMA", label:"市盈率 29×", detail:"GAMMA 的模拟市盈率为 29×，估值处于三者中间。", dimension:"稳定性/下行风险" },
  "G-DEBT": { id:"G-DEBT", stock:"GAMMA", label:"资产负债率 68%", detail:"GAMMA 的资产负债率为 68%，财务弹性相对较弱。", dimension:"稳定性/下行风险" },
  "G-LIQUIDITY": { id:"G-LIQUIDITY", stock:"GAMMA", label:"成交活跃度低", detail:"在固定模拟数据中，GAMMA 的日均成交活跃度为低。", dimension:"可变现性" },
  "G-NOISE": { id:"G-NOISE", stock:"GAMMA", label:"总部大厅完成翻新", detail:"GAMMA 总部大厅近期完成翻新，与当前选股条件没有直接关系。", dimension:"补充信息" },
};

const FACT_IDS = Object.keys(FACTS) as FactId[];
const STRATEGY_V1: StrategyState = { horizon:"约 12 个月", shortNeed:"无额外要求", downside:"中", stability:"中", growth:"高" };
const STRATEGY_V2: StrategyState = { horizon:"约 12 个月", shortNeed:"30% 资金 / 6 个月", downside:"高", stability:"高", growth:"中（保留）" };

const chartSeries = [
  { id:"ALFA", color:"#2d6d52", values:[100,104,101,110,107,118,113,126,119,132,128,136] },
  { id:"BETA", color:"#9a6b2f", values:[100,101,102,103,102,104,105,106,105,107,108,109] },
  { id:"GAMMA", color:"#6d5aa6", values:[100,102,104,103,107,109,108,112,111,114,113,117] },
] as const;

const strategyLabels: { key:keyof StrategyState; label:string }[] = [
  { key:"horizon", label:"总体研究视角" },
  { key:"shortNeed", label:"短期资金需求" },
  { key:"downside", label:"下行风险优先级" },
  { key:"stability", label:"经营稳定性优先级" },
  { key:"growth", label:"增长优先级" },
];

function AgentMark() { return <div className="agent-avatar" aria-hidden="true">AI</div>; }

function FactText({ id, active=false, onOpen }: { id:FactId; active?:boolean; onOpen?:(id:FactId)=>void }) {
  const fact = FACTS[id];
  if (!active) return <strong className="fact-static">{fact.label}</strong>;
  return <button type="button" className="fact-link" onClick={() => onOpen?.(id)}>{fact.label}</button>;
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
      for (let i=0;i<4;i+=1) {
        const y = 18 + i * ((height - 36) / 3);
        context.beginPath(); context.moveTo(42,y); context.lineTo(width-18,y); context.stroke();
      }
      const values = chartSeries.flatMap(series => [...series.values]);
      const min = Math.min(...values) - 3;
      const max = Math.max(...values) + 3;
      chartSeries.forEach(series => {
        context.strokeStyle = series.color;
        context.lineWidth = 2.5;
        context.beginPath();
        series.values.forEach((value,index) => {
          const x = 42 + index * ((width - 66) / (series.values.length - 1));
          const y = height - 20 - ((value - min) / (max - min)) * (height - 40);
          if (index === 0) context.moveTo(x,y); else context.lineTo(x,y);
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
    <div className="chart-head"><div><span className="object-type">STATIC GRAPH</span><h3>模拟归一化价格走势</h3></div><span>起点 = 100 · 仅供实验</span></div>
    <canvas ref={canvasRef} />
    <div className="chart-legend">{chartSeries.map(series => <span key={series.id}><i style={{background:series.color}} />{series.id}</span>)}</div>
  </section>;
}

function strategySummary(strategy: StrategyState) {
  return `总体研究视角为${strategy.horizon}；短期资金需求为“${strategy.shortNeed}”；下行风险和经营稳定性的优先级分别为${strategy.downside}和${strategy.stability}；增长优先级为${strategy.growth}。`;
}

function strategyAccuracy(strategy: StrategyState) {
  return strategyLabels.filter(({key}) => strategy[key] === STRATEGY_V2[key]).length;
}

export default function Home() {
  const [condition,setCondition] = useState<Condition>("widget");
  const [started,setStarted] = useState(false);
  const [historyRound,setHistoryRound] = useState(0);
  const [provisionalStock,setProvisionalStock] = useState<StockId | "">("");
  const [provisionalReason,setProvisionalReason] = useState("");
  const [conditionActive,setConditionActive] = useState(false);
  const [activeFact,setActiveFact] = useState<FactId | null>(null);
  const [focused,setFocused] = useState<FactId[]>([]);
  const [evidence,setEvidence] = useState<FactId[]>([]);
  const [strategy,setStrategy] = useState<StrategyState>({...STRATEGY_V1});
  const [strategyDraft,setStrategyDraft] = useState<StrategyState>({...STRATEGY_V1});
  const [previousStrategy,setPreviousStrategy] = useState<StrategyState | null>(null);
  const [pendingChatStrategy,setPendingChatStrategy] = useState<StrategyState | null>(null);
  const [strategyVersion,setStrategyVersion] = useState(1);
  const [diffOpen,setDiffOpen] = useState(false);
  const [strategyHint,setStrategyHint] = useState<keyof StrategyState | null>(null);
  const [messages,setMessages] = useState<Message[]>([]);
  const [chatInput,setChatInput] = useState("");
  const [agentWaiting,setAgentWaiting] = useState(false);
  const [finalStock,setFinalStock] = useState<StockId | "">("");
  const [finalReason,setFinalReason] = useState("");
  const [completed,setCompleted] = useState(false);
  const [logs,setLogs] = useState<LogEntry[]>([]);
  const sessionRef = useRef("pending");
  const startedAtRef = useRef(0);
  const roundRef = useRef("00");
  const l2LoggedRef = useRef(false);
  const firstReferenceRef = useRef(false);
  const messageIdRef = useRef(0);

  useEffect(() => {
    sessionRef.current = crypto.randomUUID();
    startedAtRef.current = performance.now();
    setCondition(Math.random() < .5 ? "chat" : "widget");
  }, []);

  useEffect(() => {
    if (sessionRef.current === "pending" || logs.length === 0) return;
    localStorage.setItem(`stock-intent-lab:${sessionRef.current}`, JSON.stringify({condition,logs}));
  }, [condition,logs]);

  const logEvent = (event_name:string,source:Source,payload?:Record<string,unknown>,fact_id?:FactId,strategy_version?:number) => {
    const entry: LogEntry = {
      session_id:sessionRef.current, condition, timestamp:new Date().toISOString(),
      elapsed_ms:Math.round(performance.now()-startedAtRef.current), round_id:roundRef.current,
      event_name, source,
      ...(fact_id ? {fact_id} : {}), ...(strategy_version ? {strategy_version} : {}), ...(payload ? {payload} : {}),
    };
    setLogs(current => [...current,entry]);
  };

  const addAgentMessage = (text:string) => { messageIdRef.current+=1; setMessages(current => [...current,{id:messageIdRef.current,role:"agent",text}]); };
  const addUserMessage = (text:string) => { messageIdRef.current+=1; setMessages(current => [...current,{id:messageIdRef.current,role:"user",text}]); };

  const reset = (next:Condition=condition) => {
    setCondition(next); setStarted(false); setHistoryRound(0); setProvisionalStock(""); setProvisionalReason("");
    setConditionActive(false); setActiveFact(null); setFocused([]); setEvidence([]); setStrategy({...STRATEGY_V1});
    setStrategyDraft({...STRATEGY_V1}); setPreviousStrategy(null); setPendingChatStrategy(null); setStrategyVersion(1);
    setDiffOpen(false); setStrategyHint(null); setMessages([]); setChatInput(""); setAgentWaiting(false); setFinalStock(""); setFinalReason("");
    setCompleted(false); setLogs([]); l2LoggedRef.current=false; firstReferenceRef.current=false; messageIdRef.current=0;
    sessionRef.current=crypto.randomUUID(); startedAtRef.current=performance.now(); roundRef.current="00";
  };

  const startTask = () => {
    setStarted(true); roundRef.current="00";
    logEvent("session_started","system",{prototype_version:"1.1"});
    logEvent("condition_assigned","system",{condition});
    logEvent("round_exposed","system",{round_id:"00"});
  };

  const exposeRound = (round:number) => {
    setHistoryRound(round); roundRef.current=String(round).padStart(2,"0");
    logEvent("round_exposed","system",{round_id:roundRef.current});
  };

  const submitProvisional = () => {
    if (!provisionalStock || provisionalReason.trim().length < 8) return;
    roundRef.current="04";
    logEvent("provisional_decision_submitted","system",{stock:provisionalStock,rationale:provisionalReason.trim()});
    logEvent("interaction_condition_activated","system",{condition});
    setConditionActive(true); roundRef.current="05";
    logEvent("constraint_exposed","system",{short_need:"30% / 6 months"});
    logEvent("round_exposed","system",{round_id:"05"});
  };

  const markFirstReference = (id:FactId, source:Source) => {
    if (firstReferenceRef.current || FACTS[id].dimension === "补充信息") return;
    firstReferenceRef.current=true; logEvent("first_target_fact_referenced",source,undefined,id);
  };

  const openFact = (id:FactId) => {
    setActiveFact(id); roundRef.current="06";
    logEvent("fact_viewed","widget",{dimension:FACTS[id].dimension},id);
  };

  const focusFact = (id:FactId, source:Source) => {
    setFocused(current => current.includes(id) ? current : [...current,id]);
    markFirstReference(id,source); logEvent("fact_focused",source,{dimension:FACTS[id].dimension},id);
  };

  const promoteFact = (id:FactId, source:Source) => {
    setFocused(current => current.includes(id) ? current : [...current,id]);
    setEvidence(current => {
      const next = current.includes(id) ? current : [...current,id];
      const dimensions = new Set(next.map(factId => FACTS[factId].dimension).filter(dimension => dimension !== "补充信息"));
      if (!l2LoggedRef.current && next.length >= 2 && dimensions.size >= 2) {
        l2LoggedRef.current=true;
        window.setTimeout(() => logEvent("l2_completed",source,{evidence_count:next.length,dimensions:[...dimensions]}),0);
      }
      return next;
    });
    markFirstReference(id,source); logEvent("fact_promoted_to_evidence",source,{dimension:FACTS[id].dimension},id);
  };

  const updateDraft = <K extends keyof StrategyState>(key:K,value:StrategyState[K]) => {
    setStrategyDraft(current => ({...current,[key]:value})); setDiffOpen(false); setStrategyHint(null); roundRef.current="07";
    logEvent("intent_edit_started","widget",{field:key,value});
  };

  const showStrategyDiff = () => { setDiffOpen(true); logEvent("strategy_viewed","widget",{view:"diff"},undefined,strategyVersion); };

  const commitStrategy = (next:StrategyState,source:Source) => {
    setPreviousStrategy({...strategy}); setStrategy({...next}); setStrategyDraft({...next}); setPendingChatStrategy(null); setDiffOpen(false);
    const nextVersion=strategyVersion+1; setStrategyVersion(nextVersion); roundRef.current="07";
    logEvent("intent_committed",source,{strategy:next,accuracy_fields:strategyAccuracy(next)},undefined,nextVersion);
    if (source === "widget") addAgentMessage(`Strategy V${nextVersion} 已确认：${strategySummary(next)}后续比较将使用这一策略。`);
  };

  const undoStrategy = (source:Source) => {
    if (!previousStrategy) return;
    const restored={...previousStrategy}; setStrategy(restored); setStrategyDraft(restored); setPreviousStrategy(null); setDiffOpen(false);
    const nextVersion=strategyVersion+1; setStrategyVersion(nextVersion);
    logEvent("intent_undone",source,{restored_strategy:restored},undefined,nextVersion);
    addAgentMessage(`已撤销上一次策略修改。当前策略：${strategySummary(restored)}`);
  };

  const matchFacts = (text:string) => FACT_IDS.filter(id => {
    const fact=FACTS[id];
    const hasStock=text.toUpperCase().includes(fact.stock);
    const needles:Record<FactId,string[]> = {
      "A-GROWTH":["24%","增长"], "A-VALUATION":["38","市盈率","估值"], "A-CONCENTRATION":["42%","客户","集中"], "A-LIQUIDITY":["活跃","流动","变现"], "A-NOISE":["官网","主题"],
      "B-GROWTH":["9%","增长"], "B-CASHFLOW":["8季度","8 个季度","现金流"], "B-VOLATILITY":["波动","平稳"], "B-LIQUIDITY":["活跃","流动","变现"], "B-CYCLE":["周期"], "B-NOISE":["公益","路跑"],
      "G-GROWTH":["15%","增长"], "G-VALUATION":["29","市盈率","估值"], "G-DEBT":["68%","负债","债务"], "G-LIQUIDITY":["活跃","流动","变现"], "G-NOISE":["大厅","翻新"],
    };
    return hasStock && needles[id].some(needle => text.includes(needle));
  });

  const deriveStrategy = (text:string) => {
    const next={...strategy}; let changed=false;
    if (/30%|百分之三十|半年|6\s*个月/.test(text)) { next.shortNeed="30% 资金 / 6 个月"; changed=true; }
    if (/全部.{0,4}(半年|6\s*个月)|(期限|视角).{0,4}(半年|6\s*个月)/.test(text)) { next.horizon="6 个月"; changed=true; }
    if (/一年|12\s*个月|总体/.test(text)) { next.horizon="约 12 个月"; changed=true; }
    if (/下行|风险/.test(text) && /提高|重视|优先|高/.test(text)) { next.downside="高"; changed=true; }
    if (/稳定|现金流/.test(text) && /提高|重视|优先|高/.test(text)) { next.stability="高"; changed=true; }
    if (/增长/.test(text) && /不考虑|删除|放弃/.test(text)) { next.growth="不考虑"; changed=true; }
    else if (/增长/.test(text) && /保留|兼顾|中等|降低|次要/.test(text)) { next.growth="中（保留）"; changed=true; }
    return changed ? next : null;
  };

  const evidenceReply = () => {
    if (evidence.length === 0) return "当前策略已应用，但你还没有确认任何决策依据。我不会自动把前文信息加入判断。你可以直接完成最终判断，也可以返回前文补充依据。";
    const dimensions=[...new Set(evidence.map(id => FACTS[id].dimension))];
    return `当前策略已应用。以下说明只使用你已经确认的决策依据：${evidence.map(id => `${FACTS[id].stock}「${FACTS[id].label}」`).join("；")}。这些依据目前覆盖：${dimensions.join("、")}。未加入依据的早期信息不会被自动补充。`;
  };

  const processChat = (text:string) => {
    const matched=matchFacts(text);
    if (matched.length>0) markFirstReference(matched[0],"chat");
    if (/撤销|undo/i.test(text)) {
      if (previousStrategy) { undoStrategy("chat"); return "上一次策略修改已撤销。"; }
      return "当前没有可撤销的策略版本。";
    }
    if (/确认|同意|可以/.test(text) && pendingChatStrategy) {
      const next=pendingChatStrategy; commitStrategy(next,"chat");
      return `已确认新的策略：${strategySummary(next)}后续比较将使用这一策略。`;
    }
    if (/当前策略|策略是什么|总结策略|查看策略/.test(text)) {
      logEvent("strategy_viewed","chat",undefined,undefined,strategyVersion); return `当前 Strategy V${strategyVersion}：${strategySummary(strategy)}`;
    }
    if (/使用.{0,5}依据|消费.{0,5}依据|根据.{0,5}依据|汇总.{0,5}依据/.test(text)) { roundRef.current="08"; return evidenceReply(); }
    const intent=deriveStrategy(text);
    if (intent && /策略|调整|改|优先|需求|期限|视角|风险|稳定|增长|资金/.test(text)) {
      setPendingChatStrategy(intent); roundRef.current="07"; logEvent("intent_edit_started","chat",{proposed_strategy:intent});
      return `我理解的新策略是：${strategySummary(intent)}是否确认？`;
    }
    if (matched.length>0 && /作为依据|加入依据|纳入判断|重点考虑|决策依据/.test(text)) {
      matched.forEach(id => promoteFact(id,"chat"));
      return `已将${matched.map(id => `${FACTS[id].stock}「${FACTS[id].label}」`).join("和")}记录为当前判断依据。记录依据不等于自动修改策略。`;
    }
    if (matched.length>0 && /关注|记住|留意|highlight/i.test(text)) {
      matched.forEach(id => focusFact(id,"chat"));
      return `已关注：${matched.map(id => `${FACTS[id].stock}「${FACTS[id].label}」`).join("、")}。关注不会自动变成决策依据或修改策略。`;
    }
    if (matched.length>0 && /解释|详情|查看|为什么|是什么/.test(text)) return matched.map(id => FACTS[id].detail).join(" ");
    if (matched.length>0) return `${matched.map(id => FACTS[id].detail).join(" ")} 请说明你要“关注”、把它“作为依据”，还是只查看解释。`;
    logEvent("clarification_requested","chat",{input_length:text.length});
    return "我还不能确定你是在查看信息、把它加入决策依据，还是希望修改策略。请明确说明对应股票、事实，以及你希望执行的操作。";
  };

  const sendChat = () => {
    const text=chatInput.trim(); if (!text || agentWaiting) return;
    setChatInput(""); addUserMessage(text); roundRef.current=roundRef.current<"06"?"06":roundRef.current;
    logEvent("chat_sent","chat",{text,input_length:text.length}); const reply=processChat(text);
    setAgentWaiting(true); logEvent("agent_reply_started","system",{fixed_wait_ms:900});
    window.setTimeout(() => { addAgentMessage(reply); setAgentWaiting(false); logEvent("agent_reply_received","system",{fixed_wait_ms:900}); },900);
  };

  const consumeEvidence = () => {
    roundRef.current="08"; addUserMessage("使用我已经确认的依据继续分析。");
    logEvent("agent_reply_started","widget",{action:"consume_confirmed_evidence",fixed_wait_ms:900}); setAgentWaiting(true);
    window.setTimeout(() => { addAgentMessage(evidenceReply()); setAgentWaiting(false); logEvent("agent_reply_received","widget",{action:"consume_confirmed_evidence",fixed_wait_ms:900}); },900);
  };

  const submitFinal = () => {
    if (!finalStock || finalReason.trim().length<100 || finalReason.trim().length>150) return;
    roundRef.current="09";
    logEvent("final_decision_submitted","system",{stock:finalStock,rationale:finalReason.trim(),rationale_length:finalReason.trim().length,evidence});
    logEvent("session_completed","system",{final_stock:finalStock}); setCompleted(true);
  };

  const exportLog = () => {
    const data={ schema_version:"stock-intent-lab/1.1", session_id:sessionRef.current, condition,
      provisional:{stock:provisionalStock,rationale:provisionalReason.trim()}, state:{focused,evidence,strategy,strategy_version:strategyVersion},
      final:{stock:finalStock,rationale:finalReason.trim()}, logs };
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
    const anchor=document.createElement("a"); anchor.href=url; anchor.download=`stock-intent-${sessionRef.current}.json`; anchor.click(); URL.revokeObjectURL(url);
  };

  const widgetActive=conditionActive && condition==="widget";
  const changedFields=strategyLabels.filter(({key}) => strategyDraft[key] !== strategy[key]);
  const rationaleLength=finalReason.trim().length;

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand-mark">S</div>
      <div className="brand-copy"><p className="eyebrow">STOCK INTENT LAB · V1.1</p><h1>信息复用与意图调整实验</h1></div>
      <div className="condition-switch" aria-label="研究者条件预览"><span>研究者预览</span><button className={condition==="chat"?"active":""} disabled={started} onClick={() => reset("chat")}>Chat-only</button><button className={condition==="widget"?"active":""} disabled={started} onClick={() => reset("widget")}>Chat + Widget</button></div>
    </header>

    <section className="scenario-strip"><span>虚构数据</span><p>两组先阅读完全相同的历史并提交初步候选；Round 04 后才激活条件化交互。</p><button type="button" onClick={() => reset()}>重新开始</button></section>

    {!started ? <section className="briefing">
      <p className="eyebrow">EXPERIMENT BRIEF</p><h2>选择一只值得进一步研究的虚构股票</h2>
      <p>你当前计划持有约一年，风险偏好适中，希望兼顾增长与稳定。完成探索后，需要提交 100—150 字理由并指出至少一项待核查风险。系统不会执行真实交易。</p>
      <div className="intent-summary"><span>约 12 个月</span><span>风险适中</span><span>增长优先级高</span><span>稳定性优先级中</span></div>
      <button className="primary-button" type="button" onClick={startTask}>开始共同只读阶段 <span>→</span></button>
    </section> : <section className="workspace-shell">
      <div className="progress-strip"><span className="current">01 共同历史</span><i /><span className={historyRound>=3?"current":""}>02 初步判断</span><i /><span className={conditionActive?"current":""}>03 信息复用</span><i /><span className={strategyVersion>1?"current":""}>04 意图调整</span><i /><span className={completed?"current":""}>05 最终提交</span></div>

      <div className={widgetActive?"experiment-grid widget-condition":"experiment-grid"}>
        <section className="chat-lane" aria-label="任务对话">
          <div className="turn-label">ROUND 00 · 初始任务</div>
          <div className="agent-row"><AgentMark/><div className="agent-bubble"><p>我会使用固定模拟数据协助你比较三只候选股票。你当前的计划是约 12 个月、风险偏好适中，并希望兼顾增长与稳定。</p></div></div>
          <div className="turn-separator"><span>共同只读历史</span></div>
          <div className="turn-label">ROUND 01 · 走势与增长</div>
          <div className="user-message">先比较三只股票的走势和增长情况。</div>
          <div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">ALFA 整体涨幅最高，但中途波动和回撤也最大；BETA 涨幅较低，且<FactText id="B-VOLATILITY" active={widgetActive} onOpen={openFact}/>；GAMMA 的涨幅与波动居中。文字数据方面，ALFA <FactText id="A-GROWTH" active={widgetActive} onOpen={openFact}/>, BETA <FactText id="B-GROWTH" active={widgetActive} onOpen={openFact}/>, GAMMA <FactText id="G-GROWTH" active={widgetActive} onOpen={openFact}/>。这些信息还不足以形成最终判断。</p><PriceChart /></div></div>
          {historyRound < 1 && <button className="continue-button" type="button" onClick={() => exposeRound(1)}>继续阅读基本面信息</button>}

          {historyRound>=1 && <><div className="turn-separator"><span>上下文继续</span></div><div className="turn-label">ROUND 02 · 基本面与风险</div><div className="user-message">再比较估值、经营稳定性和主要业务风险。</div>
            <div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">ALFA <FactText id="A-VALUATION" active={widgetActive} onOpen={openFact}/>, 且<FactText id="A-CONCENTRATION" active={widgetActive} onOpen={openFact}/>。BETA <FactText id="B-CASHFLOW" active={widgetActive} onOpen={openFact}/>, 模拟市盈率为 24×，但<FactText id="B-CYCLE" active={widgetActive} onOpen={openFact}/>。GAMMA <FactText id="G-VALUATION" active={widgetActive} onOpen={openFact}/>, 但<FactText id="G-DEBT" active={widgetActive} onOpen={openFact}/>.</p></div></div>
            {historyRound < 2 && <button className="continue-button" type="button" onClick={() => exposeRound(2)}>继续阅读活跃度信息</button>}</>}

          {historyRound>=2 && <><div className="turn-separator"><span>上下文继续</span></div><div className="turn-label">ROUND 03 · 活跃度与补充事件</div><div className="user-message">补充比较交易活跃度和近期事件。</div>
            <div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">模拟数据中，ALFA <FactText id="A-LIQUIDITY" active={widgetActive} onOpen={openFact}/>, BETA <FactText id="B-LIQUIDITY" active={widgetActive} onOpen={openFact}/>, GAMMA <FactText id="G-LIQUIDITY" active={widgetActive} onOpen={openFact}/>。补充事件包括 ALFA <FactText id="A-NOISE" active={widgetActive} onOpen={openFact}/>, BETA <FactText id="B-NOISE" active={widgetActive} onOpen={openFact}/>, GAMMA <FactText id="G-NOISE" active={widgetActive} onOpen={openFact}/>；这些事件与当前条件没有直接关系。</p></div></div>
            {historyRound < 3 && <button className="continue-button" type="button" onClick={() => exposeRound(3)}>形成初步判断</button>}</>}

          {historyRound>=3 && !conditionActive && <section className="provisional-card"><p className="object-type">ROUND 04 · PROVISIONAL DECISION</p><h2>先形成一个初步判断锚点</h2><p>暂时选择一只最值得进一步研究的股票，并用一句话说明理由。这个选择不是最终答案。</p>
            <div className="stock-choice" role="radiogroup" aria-label="初步候选">{(["ALFA","BETA","GAMMA"] as StockId[]).map(stock => <button type="button" role="radio" aria-checked={provisionalStock===stock} className={provisionalStock===stock?"selected":""} key={stock} onClick={() => setProvisionalStock(stock)}>{stock}</button>)}</div>
            <label htmlFor="provisional-reason">一句理由</label><textarea id="provisional-reason" value={provisionalReason} onChange={event => setProvisionalReason(event.target.value)} placeholder="例如：目前更看重……，但还需要核查……" />
            <button className="primary-button" type="button" disabled={!provisionalStock || provisionalReason.trim().length<8} onClick={submitProvisional}>提交初步判断并继续 <span>→</span></button></section>}

          {conditionActive && <>
            <section className="recorded-anchor"><span>ROUND 04 · 已记录</span><strong>{provisionalStock}</strong><p>{provisionalReason}</p></section>
            <section className="task-update"><p className="object-type">ROUND 05 · TASK UPDATE</p><h2>新的资金需求</h2><p>情况发生变化：你半年内可能需要使用这笔资金中的 <strong>30%</strong>，因此现在需要更重视这部分资金的<strong>可变现性、公司的经营稳定性和下行风险</strong>；但剩余资金仍希望<strong>保留一定增长潜力</strong>。请据此确认你现在采用的策略，并完成最终判断。</p></section>
            {condition==="chat" && <div className="agent-row"><AgentMark/><div className="agent-bubble"><p>当前仍是 Strategy V1：总体研究视角约 12 个月、无额外短期资金需求、增长优先级高、下行风险与经营稳定性优先级中。请通过 Chat 说明你要查看、关注或作为依据的信息，以及如何调整策略。</p></div></div>}
            {messages.map(message => message.role==="user" ? <div className="user-message dynamic" key={message.id}>{message.text}</div> : <div className="agent-row dynamic" key={message.id}><AgentMark/><div className="agent-bubble"><p>{message.text}</p></div></div>)}
            {agentWaiting && <div className="agent-row dynamic"><AgentMark/><div className="typing" aria-label="Agent 正在回复"><i/><i/><i/></div></div>}

            <section className="final-card"><p className="object-type">ROUND 09 · FINAL DECISION</p><h2>提交最终判断</h2><p>选择一只最值得进一步研究的股票，并用 100—150 字说明：它如何符合更新后的策略、你权衡了哪些已有信息，以及至少一项仍需核查的关键风险。</p>
              <div className="stock-choice" role="radiogroup" aria-label="最终候选">{(["ALFA","BETA","GAMMA"] as StockId[]).map(stock => <button type="button" role="radio" aria-checked={finalStock===stock} className={finalStock===stock?"selected":""} key={stock} onClick={() => setFinalStock(stock)}>{stock}</button>)}</div>
              <label htmlFor="final-reason">最终理由 <span className={rationaleLength>150?"invalid":""}>{rationaleLength} / 100—150 字</span></label><textarea id="final-reason" value={finalReason} onChange={event => setFinalReason(event.target.value)} placeholder="请结合更新后的策略、已确认依据与待核查风险……" />
              <button className="primary-button" type="button" disabled={!finalStock || rationaleLength<100 || rationaleLength>150 || completed} onClick={submitFinal}>{completed?"已提交":"提交最终判断"}<span>→</span></button></section>

            {completed && <section className="completion-card"><span className="completion-mark">✓</span><div><p className="object-type">SESSION COMPLETE</p><h2>实验任务已完成</h2><p>匿名事件日志已保存在当前浏览器，可导出为单个 JSON 文件。</p><button type="button" onClick={exportLog}>导出匿名 Session Log</button><details><summary>查看事件日志（{logs.length} 条）</summary><pre>{JSON.stringify(logs,null,2)}</pre></details></div></section>}

            {!completed && <section className="chat-composer" aria-label="Chat 输入"><div><span>{condition==="chat"?"CHAT-ONLY 操作通道":"CHAT 仍可用"}</span><small>{condition==="chat"?"查看、关注、加入依据和策略修改均需在此说明":"可用文字补充操作；Widget 状态与 Chat 共享"}</small></div><textarea value={chatInput} onChange={event => setChatInput(event.target.value)} onKeyDown={event => { if (event.key==="Enter" && !event.shiftKey) { event.preventDefault(); sendChat(); } }} placeholder={condition==="chat"?"例如：把 BETA 现金流连续 8 季度为正作为依据……":"继续向 Agent 提问或补充说明……"}/><button type="button" disabled={!chatInput.trim() || agentWaiting} onClick={sendChat}>发送</button></section>}
          </>}
        </section>

        {widgetActive && <aside className="widget-rail" aria-label="可操作对象侧栏">
          <section className="strategy-object" id="strategy-object"><div className="object-head"><div><p className="object-type">PERSISTENT OBJECT</p><h2>Strategy V{strategyVersion}</h2></div><span className="live-pill">Agent 共享</span></div><p className="object-caption">直接调整字段；只有确认 Diff 后才会更新 Agent 使用的策略。</p>
            {strategyHint && <p className="strategy-hint">已定位相关字段：{strategyLabels.find(item => item.key===strategyHint)?.label}。请自行判断是否及如何调整。</p>}
            <div className="strategy-fields">
              <label className={strategyHint==="horizon"?"hinted":""}>总体研究视角<select value={strategyDraft.horizon} onChange={event => updateDraft("horizon",event.target.value as StrategyState["horizon"])}><option>约 12 个月</option><option>6 个月</option></select></label>
              <label className={strategyHint==="shortNeed"?"hinted":""}>短期资金需求<select value={strategyDraft.shortNeed} onChange={event => updateDraft("shortNeed",event.target.value as StrategyState["shortNeed"])}><option>无额外要求</option><option>30% 资金 / 6 个月</option></select></label>
              <label className={strategyHint==="downside"?"hinted":""}>下行风险优先级<select value={strategyDraft.downside} onChange={event => updateDraft("downside",event.target.value as StrategyState["downside"])}><option>低</option><option>中</option><option>高</option></select></label>
              <label className={strategyHint==="stability"?"hinted":""}>经营稳定性优先级<select value={strategyDraft.stability} onChange={event => updateDraft("stability",event.target.value as StrategyState["stability"])}><option>低</option><option>中</option><option>高</option></select></label>
              <label className={strategyHint==="growth"?"hinted":""}>增长优先级<select value={strategyDraft.growth} onChange={event => updateDraft("growth",event.target.value as StrategyState["growth"])}><option>高</option><option>中（保留）</option><option>不考虑</option></select></label>
            </div>
            {diffOpen && <div className="strategy-diff"><p>待确认变更</p>{changedFields.length===0?<span>没有字段发生变化</span>:changedFields.map(({key,label}) => <div key={key}><span>{label}</span><del>{strategy[key]}</del><b>→</b><ins>{strategyDraft[key]}</ins></div>)}</div>}
            <div className="object-actions">{!diffOpen?<button type="button" disabled={changedFields.length===0} onClick={showStrategyDiff}>查看并确认变更</button>:<button className="confirm" type="button" disabled={changedFields.length===0} onClick={() => commitStrategy(strategyDraft,"widget")}>确认 Strategy V{strategyVersion+1}</button>}<button type="button" disabled={!previousStrategy} onClick={() => undoStrategy("widget")}>Undo</button></div>
            <div className="evidence-set"><div><span>FOCUS SET</span><b>{focused.length}</b></div>{focused.length===0?<p>尚未关注任何事实</p>:<ul>{focused.map(id => <li key={id}><button type="button" onClick={() => openFact(id)}>{FACTS[id].stock} · {FACTS[id].label}</button></li>)}</ul>}</div>
            <div className="evidence-set confirmed"><div><span>CONFIRMED EVIDENCE</span><b>{evidence.length}</b></div>{evidence.length===0?<p>只有“加入依据”后的事实会被 Agent 消费</p>:<ul>{evidence.map(id => <li key={id}><button type="button" onClick={() => openFact(id)}>{FACTS[id].stock} · {FACTS[id].label}</button></li>)}</ul>}<button className="consume-button" type="button" disabled={agentWaiting} onClick={consumeEvidence}>让 Agent 消费已确认依据</button></div>
          </section>

          {activeFact && <section className="fact-inspector"><div className="object-head"><div><p className="object-type">INFORMATION OBJECT</p><h2>{FACTS[activeFact].stock}</h2></div><button className="close-button" type="button" onClick={() => setActiveFact(null)}>×</button></div><span className="dimension-pill">{FACTS[activeFact].dimension}</span><h3>{FACTS[activeFact].label}</h3><p>{FACTS[activeFact].detail}</p>
            <div className="fact-actions"><button type="button" className={focused.includes(activeFact)?"done":""} onClick={() => focusFact(activeFact,"widget")}>{focused.includes(activeFact)?"✓ 已关注":"关注"}</button><button type="button" className={evidence.includes(activeFact)?"done":""} onClick={() => promoteFact(activeFact,"widget")}>{evidence.includes(activeFact)?"✓ 已加入依据":"加入依据"}</button><button type="button" onClick={() => { const key:keyof StrategyState=FACTS[activeFact].dimension==="可变现性"?"shortNeed":FACTS[activeFact].dimension==="增长"?"growth":"stability"; setStrategyHint(key); logEvent("strategy_viewed","widget",{trigger_fact:activeFact,focused_field:key},activeFact,strategyVersion); document.getElementById("strategy-object")?.scrollIntoView({behavior:"smooth",block:"start"}); }}>调整相关条件</button></div><small>关注、加入依据与修改策略是三个独立动作。</small>
          </section>}
        </aside>}
      </div>
    </section>}
  </main>;
}
