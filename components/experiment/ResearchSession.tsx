"use client";

import { useCallback, useRef, useState } from "react";
import ExperimentShell from "./ExperimentShell";
import type { InteractionState } from "./ExperimentShell";
import type { ExperimentEvent } from "../../lib/experiment/telemetry";
import type { ExperimentCondition } from "../../lib/experiment/types";
import { SOFTWARE_PRODUCT_DEVELOPMENT_V1 } from "../../scenarios/software-product-development-v1";
import { COMMON_OPPORTUNITY_SCENARIOS } from "../../scenarios/common-opportunities-v4.2";
import styles from "./research-session.module.css";

// Positions are balanced. This is not a complete first-order carryover design.
const SEQUENCES = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]] as const;

export default function ResearchSession() {
  const [period, setPeriod] = useState(-1);
  const [condition, setCondition] = useState<ExperimentCondition>("A");
  const [sequence, setSequence] = useState(0);
  const [decision, setDecision] = useState("");
  const [hasAttempt, setHasAttempt] = useState(false);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [storageWarning, setStorageWarning] = useState("");
  const [baselineAccount, setBaselineAccount] = useState("");
  const baselineCheck = useRef<Record<string, unknown> | null>(null);
  const sessions = useRef<Record<string, readonly ExperimentEvent[]>>({});
  const decisions = useRef<Record<string, unknown>[]>([]);
  const allocation = useRef<Record<string, unknown> | null>(null);
  const reviewPacketId = useRef<string | null>(null);
  const lastActiveStage = useRef("onboarding");
  const assemblePacket = useCallback(() => ({
    schemaVersion: "software-development-v4.2-review-packet",
    reviewPacketId: reviewPacketId.current,
    evidenceClass: "engineering_preview_interaction_record",
    formalStudyData: false, allocation: allocation.current,
    baselineCheck: baselineCheck.current,
    currentStage: lastActiveStage.current,
    clock: "single_document_performance_now",
    clockTimeOrigin: performance.timeOrigin,
    exportedAtMonotonicMs: performance.now(),
    sessions: sessions.current, dispositions: decisions.current,
    missing: ["independent baseline semantic review", "independent disposition coding", "blinded quality scores", "formal consent and immutable collection"],
  }), []);
  const saveBackup = useCallback(() => {
    if (!reviewPacketId.current) return;
    try {
      localStorage.setItem(`software-study-review:v4.2:${reviewPacketId.current}`, JSON.stringify(assemblePacket()));
      setStorageWarning("");
    } catch {
      setStorageWarning("本地审阅包保存失败；请在离开前下载当前记录。");
    }
  }, [assemblePacket]);
  const capture = useCallback((entries: readonly ExperimentEvent[]) => {
    const first = entries[0];
    if (first) {
      reviewPacketId.current ??= first.sessionId;
      sessions.current[first.sessionId] = entries;
      saveBackup();
    }
  }, [saveBackup]);

  function startAssignedModule() {
    if (!baselineAccount.trim()) return;
    baselineCheck.current = {
      participantOriginalText: baselineAccount,
      submittedAtMonotonicMs: performance.now(),
      sourceSessionId: reviewPacketId.current,
      reviewStatus: "manual_review_pending",
      automaticallyQualified: false,
      promptVersion: "shared-baseline-account-v4.2",
    };
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("condition");
    const override = params.get("preview") === "1" && (requested === "A" || requested === "B");
    const draws = crypto.getRandomValues(new Uint32Array(2));
    const nextCondition = override ? requested : draws[0] % 2 === 0 ? "A" : "B";
    const nextSequence = draws[1] % SEQUENCES.length;
    allocation.current = {
      condition: nextCondition, sequence: nextSequence,
      source: override ? "researcher_preview_override" : "browser_preview_randomization",
      allocatedAtMonotonicMs: performance.now(),
      baselineSemanticStatus: "manual_review_pending",
      formalAssignment: false,
    };
    setCondition(nextCondition);
    setSequence(nextSequence);
    setPeriod(0);
    lastActiveStage.current = "common-1";
    saveBackup();
  }

  function submitDisposition(finalize = false) {
    const opportunity = period < 4 ? COMMON_OPPORTUNITY_SCENARIOS[SEQUENCES[sequence][period]] : SOFTWARE_PRODUCT_DEVELOPMENT_V1;
    if (!decision.trim() || !interaction?.ready || interaction.waiting || !interaction.exposure
      || interaction.scenarioId !== opportunity.scenarioId || interaction.phase !== "trigger") return;
    decisions.current.push({
      submissionId: `${reviewPacketId.current}:SUB${decisions.current.length + 1}`,
      scenarioId: opportunity.scenarioId, period, condition,
      subjectRevision: opportunity.subjectRevisionRef ?? null,
      productSessionId: interaction.productSessionId ?? null,
      productSessionVersion: interaction.productSessionVersion ?? null,
      currentProductRevisionId: interaction.currentProductRevisionId ?? null,
      candidateProductRevisionId: interaction.candidateProductRevisionId ?? null,
      informationSpaceVersion: opportunity.informationSpaceVersion,
      participantOriginalText: decision,
      explicitSubmissionAtMonotonicMs: performance.now(),
      exposure: interaction.exposure,
      dispositionValidity: "manual_review_pending",
      timeToVerifiedGold: null, humanQuality: null,
      submissionIsNotVerifiedCompletion: true,
      participantFinalizedOpportunity: finalize,
    });
    setHasAttempt(true);
    if (finalize) {
      setDecision("");
      setHasAttempt(false);
      setPeriod(period + 1);
      lastActiveStage.current = period === 3 ? "open-development" : period === 4 ? "review-complete" : `common-${period + 2}`;
    }
    saveBackup();
  }

  function downloadReviewPacket() {
    const packet = assemblePacket();
    const url = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "software-development-v4.2-review-packet.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const common = period >= 0 && period < 4;
  const scenario = common ? COMMON_OPPORTUNITY_SCENARIOS[SEQUENCES[sequence][period]] : SOFTWARE_PRODUCT_DEVELOPMENT_V1;
  const canSubmit = interaction?.scenarioId === scenario.scenarioId && interaction.ready
    && !interaction.waiting && interaction.phase === "trigger" && interaction.exposure !== null;
  const footer = period === -1 ? (
    <section className={styles.disposition} aria-label="共同接管理解记录">
      <label htmlFor="baseline-account">进入后续任务前，请用自己的话说明当前产品目标，以及条目身份、集合归属、待处理状态和检查回执之间的关系。仍不确定的地方可以继续询问。</label>
      <textarea id="baseline-account" value={baselineAccount} onChange={(event) => setBaselineAccount(event.target.value)} />
      <p>这里保留你的原始说明供独立核对。</p>
    </section>
  ) : period >= 0 && period < 5 ? (
    <section className={styles.disposition} aria-label="本次处置">
      <label htmlFor="research-disposition">这次你决定怎样处理？请说明依据、接受范围及仍需核对的内容。</label>
      <textarea id="research-disposition" value={decision} onChange={(event) => setDecision(event.target.value)} />
      <div className={styles.actions}>
        <button type="button" disabled={!decision.trim() || !canSubmit} onClick={() => submitDisposition()}>记录当前判断</button>
        <button type="button" disabled={!decision.trim() || !canSubmit} onClick={() => submitDisposition(true)}>提交并结束本任务</button>
      </div>
      {hasAttempt && <p>当前判断已记录，你可以继续查询、修改或结束本任务。</p>}
    </section>
  ) : undefined;

  return (
    <div className={styles.root}>
      <div className={styles.reviewBar}>
        <span>v4.2 研究者完整流程预览 · {period < 0 ? "共同接管" : common ? `共同任务 ${period + 1}/4` : period === 4 ? "开放开发" : "走查已结束"}</span>
        <span>提交记录待独立核对，不自动判有效或生成研究结果。</span>
        <button type="button" onClick={downloadReviewPacket}>下载审阅包</button>
        {storageWarning && <span role="alert">{storageWarning}</span>}
      </div>
      {period < 5 ? (
        <ExperimentShell
          key={period}
          scenario={scenario}
          assignedCondition={period < 0 ? "A" : condition}
          baselineRequiresExchange={!common}
          baselineContinueEnabled={period !== -1 || baselineAccount.trim().length > 0}
          enableProductActions={period === 4}
          onBaselineContinue={period < 0 ? startAssignedModule : undefined}
          onTelemetry={capture}
          onInteractionState={setInteraction}
          footer={footer}
        />
      ) : (
        <article className={styles.finish}>
          <h1>本次走查已记录</h1>
          <p>四项共同任务和开放阶段的处置原文已保留。有效性、质量和理解核对仍需独立审阅；这里没有给出完成率或界面效果。</p>
          <button type="button" onClick={downloadReviewPacket}>下载完整审阅包</button>
        </article>
      )}
    </div>
  );
}
