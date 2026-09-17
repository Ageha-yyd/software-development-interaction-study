"use client";

import { useState } from "react";
import {
  createWorkbench, guardFor, proposeRevision, verifyCandidate, adoptCandidate,
  discardCandidate, rollbackRevision, recordDisposition, queryItems,
} from "../../lib/experiment/product-workbench.mjs";
import styles from "./research-session.module.css";

type Workbench = ReturnType<typeof createWorkbench>;
type Operation = (state: Workbench) => { state: Workbench; event: unknown };

export default function ProductWorkbenchPanel() {
  const [state, setState] = useState<Workbench>(() => createWorkbench({ workbenchId: "researcher-workbench" }));
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [reopen, setReopen] = useState("");
  const [perItem, setPerItem] = useState(false);
  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  const candidate = state.candidate;
  const rows = queryItems(state, { target: "current", view, query: search, collection: "Project Atlas" });
  const receipt = state.receipts.at(-1);

  function run(operation: Operation) {
    try { setState(operation(state).state); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "操作失败"); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "reading-list-workbench-engineering-record.json"; link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.workbench}>
      <a href="/study/software-development-v42?preview=1&amp;agent=local">返回流程预览</a>
      <h1>阅读清单实现检查</h1>
      <p>研究者工程区。这里执行六条目产品内核；它与 E0 的 144 条模拟使用记录分开。当前检查覆盖数据与操作语义，不代表浏览器可访问性、真人试用或改版收益。</p>
      <p>当前版本 <strong data-testid="current-revision">{state.currentRevisionId}</strong> · 候选 {candidate?.revisionId ?? "无"} · 状态序号 {state.stateVersion}</p>
      <section className={styles.disposition}>
        <h2>当前产品</h2>
        <label>查看范围 <select aria-label="产品视图" value={view} onChange={(event) => setView(event.target.value)}>
          {["all", "Inbox", "Unsorted", "Collections", "Search"].map((entry) => <option key={entry}>{entry}</option>)}
        </select></label>
        {view === "Search" && <input aria-label="搜索资料" value={search} onChange={(event) => setSearch(event.target.value)} />}
        <div className={styles.tableScroll}><table><thead><tr><th>条目</th><th>待处理</th><th>归属</th><th>资料</th></tr></thead>
          <tbody>{rows.map((item: { id: string; pending: boolean; memberships: string[]; title: string }) => <tr key={item.id}>
            <td>{item.id}</td><td>{item.pending ? "是" : "否"}</td><td>{item.memberships.join("、") || "未归类"}</td><td>{item.title}</td>
          </tr>)}</tbody></table></div>
      </section>
      <section className={styles.disposition}>
        <h2>候选与检查</h2>
        <p>此工程夹具包含一个联动批量范围缺陷和一个逐项范围修订，用于验证系统能拒绝失败候选与过期回执。它不是参与者可见路线，也不是对偏好或使用效果的模拟。</p>
        <label><input type="checkbox" checked={perItem} onChange={(event) => setPerItem(event.target.checked)} />使用逐项范围修订</label>
        <div className={styles.actions}>
          <button type="button" onClick={() => run((s) => proposeRevision(s, { ...guardFor(s), kind: perItem ? "scoped" : "linked", supersedesCandidateId: s.candidate?.revisionId }))}>创建候选</button>
          <button type="button" disabled={!candidate} onClick={() => run((s) => verifyCandidate(s, guardFor(s)))}>执行候选检查</button>
          <button type="button" disabled={!candidate || !receipt} onClick={() => run((s) => adoptCandidate(s, { ...guardFor(s), receiptId: receipt.receiptId }))}>采用当前回执对应候选</button>
          <button type="button" disabled={!candidate} onClick={() => run((s) => discardCandidate(s, guardFor(s)))}>丢弃未采用候选</button>
          <button type="button" onClick={() => run((s) => rollbackRevision(s, guardFor(s)))}>回滚已采用版本并验证</button>
        </div>
        {receipt && <div role="status"><strong>{receipt.receiptId} · {receipt.revisionId} · {receipt.passed ? "本内核检查通过" : "检查失败"}</strong>
          <pre>{JSON.stringify(receipt.checks, null, 2)}</pre></div>}
        {error && <p role="alert">{error}</p>}
      </section>
      <section className={styles.disposition}>
        <h2>保留或暂缓记录</h2>
        <label>理由<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <label>重新打开条件<input value={reopen} onChange={(event) => setReopen(event.target.value)} /></label>
        <div className={styles.actions}>
          <button type="button" onClick={() => run((s) => recordDisposition(s, { ...guardFor(s), kind: "retain", reason, reopenCondition: reopen }))}>记录保留</button>
          <button type="button" onClick={() => run((s) => recordDisposition(s, { ...guardFor(s), kind: "defer", reason, reopenCondition: reopen }))}>记录暂缓</button>
          <button type="button" onClick={download}>下载状态、事件与检查</button>
        </div>
        <p>保存理由只证明发生了这次表达；其证据是否充分、暂缓是否合理仍待独立评审。</p>
      </section>
    </main>
  );
}
