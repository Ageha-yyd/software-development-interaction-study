"use client";

import { useRef, useState } from "react";

type Condition = "chat" | "objects";
type StockId = "ALFA" | "BETA";
type Rule = { id:string; label:string; metric:"growth"|"pe"|"volatility"; operator:">"|"<"|"≤"; value:string; confirmed:boolean };
type Message = { id:number; role:"user"|"agent"; text:string };

const stocks = {
  ALFA: { descriptor:"高增长 · 高估值", growth:42, pe:48, volatility:"高" },
  BETA: { descriptor:"稳健增长 · 估值适中", growth:18, pe:25, volatility:"中" },
};

const evidence = {
  "ALFA-growth": { title:"营收增长 42%", detail:"ALFA 最近四个季度的模拟营收增长保持在 38%–45%，高于策略阈值。", source:"ALFA 2025 模拟年度报告", kind:"支持" },
  "ALFA-pe": { title:"市盈率 48×", detail:"ALFA 当前模拟估值高于策略上限 35×，价格对增长预期更敏感。", source:"模拟市场快照 · 2025-12-31", kind:"风险" },
  "ALFA-volatility": { title:"波动水平：高", detail:"过去 90 日模拟年化波动率为 46%，不符合稳健策略的中低波动约束。", source:"模拟行情 · 90 日窗口", kind:"风险" },
  "BETA-growth": { title:"营收增长 18%", detail:"BETA 的增长稳定但略低于 Agent 暂定的 20% 策略阈值。", source:"BETA 2025 模拟年度报告", kind:"注意" },
  "BETA-pe": { title:"市盈率 25×", detail:"BETA 当前模拟估值低于策略上限，并接近模拟行业中位数。", source:"模拟市场快照 · 2025-12-31", kind:"支持" },
  "BETA-volatility": { title:"波动水平：中", detail:"过去 90 日模拟年化波动率为 24%，满足当前策略约束。", source:"模拟行情 · 90 日窗口", kind:"支持" },
} as const;

const initialRules:Rule[] = [
  { id:"growth", label:"营收增长", metric:"growth", operator:">", value:"20", confirmed:false },
  { id:"pe", label:"市盈率", metric:"pe", operator:"<", value:"35", confirmed:false },
  { id:"volatility", label:"波动水平", metric:"volatility", operator:"≤", value:"中", confirmed:false },
];

function scriptedReply(input:string) {
  if (/估值|市盈率/.test(input)) return "ALFA 的模拟市盈率为 48×，高于策略上限 35×；BETA 为 25×。在当前稳健策略下，BETA 的估值匹配度更高。";
  if (/风险|波动/.test(input)) return "ALFA 的主要风险是高估值与高波动；BETA 的主要风险是增长率 18%，略低于策略设定的 20%。";
  if (/比较|差异/.test(input)) return "ALFA 满足增长规则，但不满足估值与波动规则；BETA 满足估值与波动规则，但增长略低于阈值。";
  if (/策略|规则|条件/.test(input)) return "当前策略是：周期 6–12 个月、风险偏好稳健；营收增长 >20%、市盈率 <35×、波动水平中或低。后三项由 Agent 推断，需要你确认。";
  if (/来源|证据/.test(input)) return "这些内容来自固定的模拟公司报告与市场快照，不使用真实行情。";
  return "我可以继续解释当前策略、具体证据、估值与风险，也可以基于你选中的对象做进一步比较。";
}

function AgentMark() { return <div className="agent-avatar">AI</div>; }

export default function Home() {
  const messageId = useRef(10);
  const [condition,setCondition] = useState<Condition>("objects");
  const [rules,setRules] = useState<Rule[]>(initialRules);
  const [strategyOpen,setStrategyOpen] = useState(true);
  const [pinned,setPinned] = useState(false);
  const [selected,setSelected] = useState<StockId[]>([]);
  const [applied,setApplied] = useState(false);
  const [activeEvidence,setActiveEvidence] = useState<keyof typeof evidence|null>(null);
  const [messages,setMessages] = useState<Message[]>([]);
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);

  const reset = (next:Condition=condition) => {
    setCondition(next); setRules(initialRules); setStrategyOpen(true); setPinned(false);
    setSelected([]); setApplied(false); setActiveEvidence(null); setMessages([]); setInput(""); setLoading(false);
  };
  const matches = (stock:StockId,rule:Rule) => rule.metric === "growth" ? stocks[stock].growth > Number(rule.value) : rule.metric === "pe" ? stocks[stock].pe < Number(rule.value) : stocks[stock].volatility !== "高";
  const selectStock = (stock:StockId) => setSelected(current => current.includes(stock) ? current.filter(item => item !== stock) : [...current,stock]);
  const updateRule = (id:string,value:string) => { setRules(current => current.map(rule => rule.id === id ? {...rule,value,confirmed:true}:rule)); setApplied(false); };
  const confirmRule = (id:string) => setRules(current => current.map(rule => rule.id === id ? {...rule,confirmed:true}:rule));
  const runAgent = (prompt:string) => {
    if (loading) return;
    setMessages(current => [...current,{id:messageId.current++,role:"user",text:prompt}]); setLoading(true);
    window.setTimeout(() => { setMessages(current => [...current,{id:messageId.current++,role:"agent",text:scriptedReply(prompt)}]); setLoading(false); },1200);
  };
  const send = () => { const text=input.trim(); if (!text) return; setInput(""); runAgent(text); };
  const explainSelection = () => {
    if (!activeEvidence) return;
    const [stock,rule] = activeEvidence.split("-");
    runAgent(`解释 ${stock} 在当前稳健策略中的${rule === "pe" ? "估值":rule === "growth" ? "增长":"波动"}匹配结果。`);
  };

  const stockObjects = (
    <>
      <div className="stock-grid">
        {(Object.keys(stocks) as StockId[]).map(id => {
          const stock=stocks[id],isSelected=selected.includes(id);
          return <article className={`stock-card ${isSelected?"selected":""}`} key={id}>
            <div className="stock-title"><div><p className="object-type">STOCK</p><h3>{id}</h3></div><span>{stock.descriptor}</span></div>
            <div className="metric"><span>营收增长</span><b className="positive">{stock.growth}%</b></div>
            <div className="metric"><span>市盈率</span><b>{stock.pe}×</b></div>
            <div className="metric"><span>波动水平</span><b>{stock.volatility}</b></div>
            <button onClick={() => selectStock(id)}>{isSelected?"✓ 已加入比较":"＋ 加入比较"}</button>
          </article>;
        })}
      </div>
      {selected.length===2 && <section className="comparison-panel">
        <div className="section-head"><div><p className="object-type">COMPARISON</p><h3>ALFA × BETA</h3></div><span>即时比较 · 未调用 Agent</span></div>
        <div className="comparison-table"><div className="table-head"><span>维度</span><b>ALFA</b><b>BETA</b></div><div><span>增长</span><b>42%</b><b>18%</b></div><div><span>估值</span><b>48×</b><b>25×</b></div><div><span>波动</span><b>高</b><b>中</b></div></div>
      </section>}
    </>
  );

  const strategyObject = <article className={`strategy-card ${pinned?"pinned":""}`}>
    <div className="card-head"><div><p className="object-type">STRATEGY · DRAFT</p><h2>稳健增长策略</h2></div><button className="icon-button" onClick={() => setPinned(!pinned)} aria-label={pinned?"取消固定策略":"固定策略"}>{pinned?"●":"◎"}</button></div>
    <div className="strategy-meta"><div><span>目标周期</span><strong>6–12 个月</strong><small>你指定</small></div><div><span>风险偏好</span><strong>稳健</strong><small>你指定</small></div></div>
    <button className="expand-button" onClick={() => setStrategyOpen(!strategyOpen)}><span>{strategyOpen?"收起策略规则":"查看并确认 3 条策略规则"}</span><b>{strategyOpen?"−":"+"}</b></button>
    {strategyOpen && <div className="rule-editor">
      {rules.map(rule => <div className="rule-row" key={rule.id}><div><span>{rule.label}</span><small>{rule.confirmed?"已确认":"AI 推断 · 待确认"}</small></div><b>{rule.operator}</b><input aria-label={`${rule.label}规则值`} value={rule.value} onChange={event => updateRule(rule.id,event.target.value)}/><button className={rule.confirmed?"confirmed":""} onClick={() => confirmRule(rule.id)}>{rule.confirmed?"✓":"确认"}</button></div>)}
      <button className="primary-action" onClick={() => setApplied(true)}>确认并应用到 ALFA、BETA <span>→</span></button>
    </div>}
  </article>;

  const evaluationObject = <>
    <section className="evaluation-panel">
      <div className="section-head"><div><p className="object-type">STRATEGY EVALUATION</p><h3>规则匹配结果</h3></div><span>点击结果查看证据</span></div>
      <div className="evaluation-grid">{(Object.keys(stocks) as StockId[]).map(stock => <article key={stock}>
        <div className="score-head"><strong>{stock}</strong><span>{rules.filter(rule => matches(stock,rule)).length} / {rules.length} 条匹配</span></div>
        {rules.map(rule => { const matched=matches(stock,rule),key=`${stock}-${rule.id}` as keyof typeof evidence; return <button className={activeEvidence===key?"active":""} key={rule.id} onClick={() => setActiveEvidence(key)}><i className={matched?"pass":"fail"}>{matched?"✓":"!"}</i><span>{rule.label}</span><b>{matched?"符合":"不符合"}</b></button>; })}
      </article>)}</div>
    </section>
    {activeEvidence && <article className="evidence-detail">
      <div className="evidence-top"><div><p className="object-type">EVIDENCE · {evidence[activeEvidence].kind}</p><h3>{evidence[activeEvidence].title}</h3></div><button onClick={() => setActiveEvidence(null)}>×</button></div>
      <p>{evidence[activeEvidence].detail}</p><div className="source-row"><span>来源</span><strong>{evidence[activeEvidence].source}</strong><em>固定模拟数据</em></div>
      <button className="agent-action" onClick={explainSelection} disabled={loading}>✦ 让 Agent 解释当前对象</button>
    </article>}
  </>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">O</div><div className="brand-copy"><p className="eyebrow">OBJECT LANE · V0.2</p><h1>Agent output, made tangible.</h1></div><div className="condition-switch" aria-label="演示模式"><button className={condition==="chat"?"active":""} onClick={() => reset("chat")}>Pure chat</button><button className={condition==="objects"?"active":""} onClick={() => reset("objects")}>Interactive objects</button></div></header>
    <section className="scenario-strip"><span>模拟情景</span><p>同一段多轮研究对话，在纯文本与交互对象两种输出形态间切换。</p><button onClick={() => reset()}>重新开始</button></section>

    <section className="chat-lane" aria-label="Agent 多轮对话">
      <div className="turn-label">ROUND 01 · 发现候选对象</div>
      <div className="user-message">我想看两家模拟科技公司，先帮我快速梳理 ALFA 和 BETA 的增长、估值和波动。</div>
      <div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">ALFA 增长更快，但估值与波动明显更高；BETA 增长较缓，估值和波动更温和。</p>{condition==="objects"?stockObjects:<div className="plain-answer"><p><strong>ALFA：</strong>营收增长 42%，市盈率 48×，波动水平高。</p><p><strong>BETA：</strong>营收增长 18%，市盈率 25×，波动水平中。</p><p>如果要进一步判断，需要补充你的周期和风险偏好。</p></div>}</div></div>

      <div className="turn-separator"><span>上下文继续</span></div>
      <div className="turn-label">ROUND 02 · 外化抽象偏好</div>
      <div className="user-message">我更偏稳健，周期大概 6–12 个月。不要只看增长，也要控制估值和波动。</div>
      <div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">明白。我把你的偏好整理为“稳健增长策略”。其中周期和风险偏好来自你的表述，三条具体规则是我的暂定推断。</p>{condition==="objects"?strategyObject:<div className="plain-answer"><p><strong>稳健增长策略：</strong>周期 6–12 个月，风险偏好稳健。</p><p>暂定规则：营收增长 &gt;20%、市盈率 &lt;35×、波动水平为中或低。请告诉我需要修改哪项。</p></div>}</div></div>

      {condition==="chat" && <><div className="turn-separator"><span>上下文继续</span></div><div className="turn-label">ROUND 03 · 应用策略</div><div className="user-message">就按这个策略。分别告诉我两家公司满足哪些条件，再说明最大的矛盾。</div><div className="agent-row"><AgentMark/><div className="plain-answer"><p>ALFA 满足增长规则，但不满足估值和波动规则；BETA 满足估值和波动规则，但增长率 18% 略低于阈值。</p><p>最大的矛盾是：ALFA 的增长优势伴随更高估值与波动，而 BETA 更稳健但增长不足。你可以继续追问任一项证据或来源。</p></div></div></>}

      {condition==="objects" && applied && <><div className="turn-separator"><span>策略对象跨轮保留</span></div><div className="turn-label">ROUND 03 · 应用策略</div><div className="user-message action-message"><span>来自 Widget 操作</span>应用“稳健增长策略”到 ALFA 和 BETA，并展示每条规则的匹配结果。</div><div className="agent-row"><AgentMark/><div className="agent-content"><p className="agent-copy">策略已应用。点击任一匹配结果可以直接查看对应证据；需要新推理时，再把选中的对象交给 Agent。</p>{evaluationObject}</div></div></>}

      {messages.map(message => message.role==="user"?<div className="dynamic-turn" key={message.id}><div className="turn-separator"><span>继续追问</span></div><div className="user-message">{message.text}</div></div>:<div className="agent-row" key={message.id}><AgentMark/><div className="plain-answer"><p>{message.text}</p></div></div>)}
      {loading && <div className="thinking"><span/><span/><span/> Agent 正在结合选中的对象分析</div>}
      {condition==="objects" && !applied && <div className="next-step-hint">确认策略规则并点击“应用”，进入第三轮对话。</div>}
    </section>

    <footer className="composer"><span className="composer-dot">✦</span><input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => {if(event.key==="Enter") send();}} placeholder={condition==="chat"?"通过文字继续追问…":"继续提问，或直接操作对话中的对象…"} aria-label="向 Agent 提问"/><button className="send" onClick={send} disabled={!input.trim()||loading} aria-label="发送">↑</button></footer>
  </main>;
}
