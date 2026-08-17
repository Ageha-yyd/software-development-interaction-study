"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Condition = "chat" | "objects";
type StockId = "ALFA" | "BETA";
type Rule = {
  id: string;
  label: string;
  metric: "growth" | "pe" | "volatility";
  operator: ">" | "<" | "≤";
  value: string;
  confirmed: boolean;
};
type LogEvent = { at: number; type: string; target?: string; agent?: boolean };
type Message = { id: number; role: "user" | "agent"; text: string };

const stocks = {
  ALFA: { name: "ALFA", descriptor: "高增长 · 高估值", growth: 42, pe: 48, volatility: "高" },
  BETA: { name: "BETA", descriptor: "稳健增长 · 估值适中", growth: 18, pe: 25, volatility: "中" },
};

const evidence = {
  "ALFA-growth": { title: "营收增长 42%", detail: "ALFA 最近四个季度的模拟营收增长保持在 38%–45%，高于策略阈值。", source: "ALFA 2025 模拟年度报告", kind: "支持" },
  "ALFA-pe": { title: "市盈率 48×", detail: "ALFA 当前模拟估值高于策略上限 35×，价格对增长预期更敏感。", source: "Object Lane 模拟市场快照 · 2025-12-31", kind: "风险" },
  "ALFA-volatility": { title: "波动水平：高", detail: "过去 90 日模拟年化波动率为 46%，不符合稳健策略的中低波动约束。", source: "Object Lane 模拟行情 · 90 日窗口", kind: "风险" },
  "BETA-growth": { title: "营收增长 18%", detail: "BETA 的增长稳定但略低于 Agent 暂定的 20% 策略阈值。", source: "BETA 2025 模拟年度报告", kind: "注意" },
  "BETA-pe": { title: "市盈率 25×", detail: "BETA 当前模拟估值低于策略上限，并接近模拟行业中位数。", source: "Object Lane 模拟市场快照 · 2025-12-31", kind: "支持" },
  "BETA-volatility": { title: "波动水平：中", detail: "过去 90 日模拟年化波动率为 24%，满足当前策略约束。", source: "Object Lane 模拟行情 · 90 日窗口", kind: "支持" },
} as const;

const initialRules: Rule[] = [
  { id: "growth", label: "营收增长", metric: "growth", operator: ">", value: "20", confirmed: false },
  { id: "pe", label: "市盈率", metric: "pe", operator: "<", value: "35", confirmed: false },
  { id: "volatility", label: "波动水平", metric: "volatility", operator: "≤", value: "中", confirmed: false },
];

function scriptedReply(input: string) {
  if (/估值|市盈率/.test(input)) return "ALFA 的模拟市盈率为 48×，高于策略上限 35×；BETA 为 25×。在当前稳健策略下，BETA 的估值匹配度更高。";
  if (/风险|波动/.test(input)) return "ALFA 的主要风险是高估值与高波动；BETA 的主要风险是增长率 18%，略低于策略设定的 20%。";
  if (/比较|差异/.test(input)) return "ALFA 满足增长规则，但不满足估值与波动规则；BETA 满足估值与波动规则，但增长略低于阈值。";
  if (/策略|规则|条件/.test(input)) return "当前策略是：周期 6–12 个月、风险偏好稳健；营收增长 >20%、市盈率 <35×、波动水平中或低。后三项由 Agent 推断，需要你确认。";
  if (/来源|证据/.test(input)) return "所有数字来自固定的模拟公司报告与 2025-12-31 市场快照。本原型不使用真实行情，也不构成投资建议。";
  return "我可以继续解释策略、估值、风险、证据来源，或比较 ALFA 与 BETA。";
}

export default function Home() {
  const startedAt = useRef(Date.now());
  const messageId = useRef(2);
  const [condition, setCondition] = useState<Condition>("objects");
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [strategyOpen, setStrategyOpen] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [selected, setSelected] = useState<StockId[]>([]);
  const [applied, setApplied] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<keyof typeof evidence | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [choice, setChoice] = useState<StockId | null>(null);
  const [reasons, setReasons] = useState("");
  const [risk, setRisk] = useState("");
  const [completedAt, setCompletedAt] = useState<number | null>(null);

  const log = (type: string, target?: string, agent = false) => {
    setLogs((current) => [...current, { at: Date.now(), type, target, agent }]);
  };

  useEffect(() => {
    localStorage.setItem("object-lane-events", JSON.stringify(logs));
  }, [logs]);

  const resetSession = (next: Condition = condition) => {
    setCondition(next);
    setRules(initialRules);
    setStrategyOpen(next === "objects");
    setPinned(false);
    setSelected([]);
    setApplied(false);
    setActiveEvidence(null);
    setMessages([]);
    setInput("");
    setLoading(false);
    setLogs([{ at: Date.now(), type: "session_started", target: next }]);
    setChoice(null);
    setReasons("");
    setRisk("");
    setCompletedAt(null);
    startedAt.current = Date.now();
  };

  const updateRule = (id: string, value: string) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, value, confirmed: true } : rule));
    setApplied(false);
    log("rule_edited", id);
  };

  const confirmRule = (id: string) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, confirmed: true } : rule));
    log("rule_confirmed", id);
  };

  const selectStock = (stock: StockId) => {
    setSelected((current) => current.includes(stock) ? current.filter((item) => item !== stock) : [...current, stock]);
    log("object_selected", `stock:${stock}`);
  };

  const runAgent = (prompt: string, target?: string) => {
    if (loading) return;
    const id = messageId.current++;
    setMessages((current) => [...current, { id, role: "user", text: prompt }]);
    setLoading(true);
    log("agent_call_started", target ?? prompt, true);
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: messageId.current++, role: "agent", text: scriptedReply(prompt) }]);
      setLoading(false);
      log("agent_call_completed", target ?? prompt, true);
    }, 2000);
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    log("message_sent", `${trimmed.length} chars`);
    setInput("");
    runAgent(trimmed);
  };

  const explainSelection = () => {
    if (!activeEvidence) return;
    const [stock, rule] = activeEvidence.split("-");
    runAgent(`解释 ${stock} 在当前稳健策略中的${rule === "pe" ? "估值" : rule === "growth" ? "增长" : "波动"}匹配结果。`, activeEvidence);
  };

  const submitTask = () => {
    if (!choice || !reasons.trim() || !risk.trim()) return;
    const done = Date.now();
    setCompletedAt(done);
    log("task_completed", choice);
  };

  const metrics = useMemo(() => ({
    seconds: Math.max(0, Math.round(((completedAt ?? Date.now()) - startedAt.current) / 1000)),
    calls: logs.filter((item) => item.type === "agent_call_started").length,
    localActions: logs.filter((item) => !item.agent && !["session_started", "message_sent", "task_completed"].includes(item.type)).length,
    inputChars: messages.filter((item) => item.role === "user").reduce((sum, item) => sum + item.text.length, 0),
  }), [completedAt, logs, messages]);

  const matches = (stock: StockId, rule: Rule) => {
    const data = stocks[stock];
    if (rule.metric === "growth") return data.growth > Number(rule.value);
    if (rule.metric === "pe") return data.pe < Number(rule.value);
    return data.volatility !== "高";
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">O</div>
        <div className="brand-copy">
          <p className="eyebrow">OBJECT LANE · V0</p>
          <h1>Agent output, made tangible.</h1>
        </div>
        <div className="condition-switch" aria-label="实验条件">
          <button className={condition === "chat" ? "active" : ""} onClick={() => resetSession("chat")}>Pure chat</button>
          <button className={condition === "objects" ? "active" : ""} onClick={() => resetSession("objects")}>Interactive objects</button>
        </div>
        <button className="log-button" onClick={() => setShowLog(!showLog)}>{showLog ? "关闭记录" : "实验记录"}</button>
      </header>

      {showLog && (
        <aside className="log-drawer" aria-label="实验记录">
          <div className="drawer-head"><div><p className="object-type">LIVE SESSION</p><h2>交互记录</h2></div><button onClick={() => setShowLog(false)}>×</button></div>
          <div className="metric-grid">
            <div><strong>{metrics.seconds}s</strong><span>任务时间</span></div>
            <div><strong>{metrics.calls}</strong><span>Agent 调用</span></div>
            <div><strong>{metrics.localActions}</strong><span>本地操作</span></div>
            <div><strong>{metrics.inputChars}</strong><span>输入字数</span></div>
          </div>
          <div className="event-stream">
            {logs.slice().reverse().map((event, index) => <div key={`${event.at}-${index}`}><time>{new Date(event.at).toLocaleTimeString("zh-CN", { hour12: false })}</time><span>{event.type}</span><small>{event.target}</small></div>)}
          </div>
        </aside>
      )}

      <section className="scenario-strip">
        <span>研究任务</span>
        <p>比较两只模拟股票，选择一只加入观察名单，并提交两条依据与一项风险。</p>
        <button onClick={() => resetSession()}>重置会话</button>
      </section>

      <section className="chat-lane" aria-label="Agent conversation">
        <div className="user-message">我偏稳健，周期大概 6–12 个月。比较 ALFA 和 BETA，帮我选一个加入观察名单。</div>

        <div className="agent-row">
          <div className="agent-avatar">AI</div>
          <div className="agent-content">
            {condition === "chat" ? (
              <div className="plain-answer">
                <p>我将你的目标理解为一项“稳健增长策略”：周期 6–12 个月、风险偏好稳健。为了便于比较，我暂定三条规则：营收增长高于 20%、市盈率低于 35×、波动水平为中或低。这三条规则由我推断，需要你确认。</p>
                <p><strong>ALFA：</strong>营收增长 42%、市盈率 48×、波动水平高。它满足增长规则，但不满足估值和波动规则。</p>
                <p><strong>BETA：</strong>营收增长 18%、市盈率 25×、波动水平中。它满足估值和波动规则，但增长略低于阈值。</p>
                <div className="plain-hint">通过下方输入框追问策略、证据、估值、风险或比较结果。</div>
              </div>
            ) : (
              <>
                <p className="agent-copy">我把你的偏好整理成一份可检查的策略草案。ALFA 增长更快，但估值和波动更高；BETA 更接近稳健目标。</p>

                <article className={`strategy-card ${pinned ? "pinned" : ""}`}>
                  <div className="card-head">
                    <div><p className="object-type">STRATEGY · DRAFT</p><h2>稳健增长策略</h2></div>
                    <button className="icon-button" onClick={() => { setPinned(!pinned); log(pinned ? "object_unpinned" : "object_pinned", "strategy:v1"); }} aria-label={pinned ? "取消固定策略" : "固定策略"}>{pinned ? "●" : "◎"}</button>
                  </div>
                  <div className="strategy-meta">
                    <div><span>目标周期</span><strong>6–12 个月</strong><small>你指定</small></div>
                    <div><span>风险偏好</span><strong>稳健</strong><small>你指定</small></div>
                  </div>
                  <button className="expand-button" onClick={() => { setStrategyOpen(!strategyOpen); log(strategyOpen ? "object_collapsed" : "object_expanded", "strategy:v1"); }}>
                    <span>{strategyOpen ? "收起策略规则" : "查看并确认 3 条策略规则"}</span><b>{strategyOpen ? "−" : "+"}</b>
                  </button>
                  {strategyOpen && (
                    <div className="rule-editor">
                      {rules.map((rule) => (
                        <div className="rule-row" key={rule.id}>
                          <div><span>{rule.label}</span><small>{rule.confirmed ? "已确认" : "AI 推断 · 待确认"}</small></div>
                          <b>{rule.operator}</b>
                          <input aria-label={`${rule.label}规则值`} value={rule.value} onChange={(event) => updateRule(rule.id, event.target.value)} />
                          <button className={rule.confirmed ? "confirmed" : ""} onClick={() => confirmRule(rule.id)}>{rule.confirmed ? "✓" : "确认"}</button>
                        </div>
                      ))}
                      <button className="primary-action" onClick={() => { setApplied(true); log("strategy_applied", "ALFA,BETA"); }}>应用策略到两只股票 <span>→</span></button>
                    </div>
                  )}
                </article>

                <div className="stock-grid">
                  {(Object.keys(stocks) as StockId[]).map((id) => {
                    const stock = stocks[id];
                    const isSelected = selected.includes(id);
                    return (
                      <article className={`stock-card ${isSelected ? "selected" : ""}`} key={id}>
                        <div className="stock-title"><div><p className="object-type">STOCK</p><h3>{id}</h3></div><span>{stock.descriptor}</span></div>
                        <div className="metric"><span>营收增长</span><b className="positive">{stock.growth}%</b></div>
                        <div className="metric"><span>市盈率</span><b>{stock.pe}×</b></div>
                        <div className="metric"><span>波动水平</span><b>{stock.volatility}</b></div>
                        <button onClick={() => selectStock(id)}>{isSelected ? "✓ 已加入比较" : "＋ 加入比较"}</button>
                      </article>
                    );
                  })}
                </div>

                {selected.length === 2 && (
                  <section className="comparison-panel">
                    <div className="section-head"><div><p className="object-type">COMPARISON</p><h3>ALFA × BETA</h3></div><span>本地生成 · 未调用 Agent</span></div>
                    <div className="comparison-table">
                      <div className="table-head"><span>比较维度</span><b>ALFA</b><b>BETA</b></div>
                      <div><span>增长</span><b>42%</b><b>18%</b></div>
                      <div><span>估值</span><b>48×</b><b>25×</b></div>
                      <div><span>波动</span><b>高</b><b>中</b></div>
                    </div>
                  </section>
                )}

                {applied && (
                  <section className="evaluation-panel">
                    <div className="section-head"><div><p className="object-type">STRATEGY EVALUATION</p><h3>规则匹配结果</h3></div><span>点击任一结果查看证据</span></div>
                    <div className="evaluation-grid">
                      {(Object.keys(stocks) as StockId[]).map((stock) => {
                        const count = rules.filter((rule) => matches(stock, rule)).length;
                        return (
                          <article key={stock}>
                            <div className="score-head"><strong>{stock}</strong><span>{count} / {rules.length} 条匹配</span></div>
                            {rules.map((rule) => {
                              const matched = matches(stock, rule);
                              const key = `${stock}-${rule.id}` as keyof typeof evidence;
                              return <button className={activeEvidence === key ? "active" : ""} key={rule.id} onClick={() => { setActiveEvidence(key); log("evidence_opened", key); }}><i className={matched ? "pass" : "fail"}>{matched ? "✓" : "!"}</i><span>{rule.label}</span><b>{matched ? "符合" : "不符合"}</b></button>;
                            })}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}

                {activeEvidence && (
                  <article className="evidence-detail">
                    <div className="evidence-top"><div><p className="object-type">EVIDENCE · {evidence[activeEvidence].kind}</p><h3>{evidence[activeEvidence].title}</h3></div><button onClick={() => setActiveEvidence(null)}>×</button></div>
                    <p>{evidence[activeEvidence].detail}</p>
                    <div className="source-row"><span>来源</span><strong>{evidence[activeEvidence].source}</strong><em>固定模拟数据</em></div>
                    <button className="agent-action" onClick={explainSelection} disabled={loading}>✦ 让 Agent 解释当前对象</button>
                  </article>
                )}
              </>
            )}

            {messages.map((message) => (
              <div className={`followup ${message.role}`} key={message.id}>{message.role === "agent" && <span>AI</span>}<p>{message.text}</p></div>
            ))}
            {loading && <div className="thinking"><span /><span /><span /> Agent 正在分析选中的对象</div>}
          </div>
        </div>

        <section className="completion-card">
          <div className="section-head"><div><p className="object-type">TASK COMPLETION</p><h3>提交你的观察结论</h3></div>{completedAt && <span className="complete-badge">✓ 已完成</span>}</div>
          <div className="choice-row">
            <span>加入观察名单</span>
            <button className={choice === "ALFA" ? "active" : ""} onClick={() => setChoice("ALFA")}>ALFA</button>
            <button className={choice === "BETA" ? "active" : ""} onClick={() => setChoice("BETA")}>BETA</button>
          </div>
          <label>两条支持依据<textarea value={reasons} onChange={(event) => setReasons(event.target.value)} placeholder="用你找到的证据说明…" /></label>
          <label>一项主要风险<input value={risk} onChange={(event) => setRisk(event.target.value)} placeholder="指出最需要注意的风险…" /></label>
          <button className="submit-button" disabled={!choice || !reasons.trim() || !risk.trim() || !!completedAt} onClick={submitTask}>{completedAt ? `已提交 · 用时 ${metrics.seconds} 秒` : "完成研究任务"}</button>
        </section>
      </section>

      <footer className="composer">
        <span className="composer-dot">✦</span>
        <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder={condition === "chat" ? "通过文字追问策略、证据或风险…" : "继续提问，或直接操作上方对象…"} aria-label="向 Agent 提问" />
        <button className="send" onClick={sendMessage} disabled={!input.trim() || loading} aria-label="发送">↑</button>
      </footer>
    </main>
  );
}
