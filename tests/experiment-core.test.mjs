import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalJson,
  countCharacters,
  deadlineReached,
  deriveExplicitStrategy,
  exposureEligible,
  FACTS,
  isExplicitDraftConfirmation,
  makeSeededProbe,
  parseFactOperations,
  STRATEGY_FIELDS,
  STRATEGY_V1,
  STRATEGY_V2,
  validateFinalSubmission,
  validateFrozenContextTrace,
} from "../app/experiment-core.ts";

test("frozen fact inventory contains BETA valuation and weak signals", () => {
  assert.equal(FACTS["B-VALUATION"].label, "市盈率 24×");
  assert.ok(FACTS["A-WEAKSIGNAL"]);
  assert.ok(FACTS["B-WEAKSIGNAL"]);
  assert.ok(FACTS["G-WEAKSIGNAL"]);
  assert.equal(Object.keys(FACTS).some((id) => id.endsWith("-NOISE")), false);
});

test("character validation has exact 100 and 150 boundaries", () => {
  const input = (length) => ({ stock: "ALFA", rationale: "甲".repeat(length), postT0StrategyConfirmCount: 1 });
  assert.equal(validateFinalSubmission(input(99)).valid, false);
  assert.equal(validateFinalSubmission(input(100)).valid, true);
  assert.equal(validateFinalSubmission(input(150)).valid, true);
  assert.equal(validateFinalSubmission(input(151)).valid, false);
  assert.equal(countCharacters(`  ${"甲".repeat(100)}  `), 100);
});

test("final validation only gates stock, rationale length, and explicit Strategy confirmation", () => {
  const noConfirmation = validateFinalSubmission({ stock: "BETA", rationale: "甲".repeat(110), postT0StrategyConfirmCount: 0 });
  assert.deepEqual(noConfirmation.reasons, ["strategy_not_confirmed_after_t0"]);
  assert.equal(validateFinalSubmission({ stock: "BETA", rationale: "甲".repeat(110), postT0StrategyConfirmCount: 1 }).valid, true);
});

test("implicit short-term need does not overwrite the overall horizon", () => {
  const result = deriveExplicitStrategy("短期资金需求改为30%资金在6个月内使用", STRATEGY_V1);
  assert.equal(result.next.shortNeed, "30% 资金 / 6 个月");
  assert.equal(result.next.horizon, "约 12 个月");

  const mistaken = deriveExplicitStrategy("把总体研究视角改成6个月", STRATEGY_V1);
  assert.equal(mistaken.next.horizon, "6 个月");
  assert.equal(mistaken.next.shortNeed, "无额外要求");
});

test("Strategy parser scopes values to their own clauses", () => {
  const result = deriveExplicitStrategy("下行风险优先级设为低，经营稳定性优先级设为高；增长优先级设为中并保留", STRATEGY_V1);
  assert.equal(result.next.downside, "低");
  assert.equal(result.next.stability, "高");
  assert.equal(result.next.growth, "中（保留）");
});

test("medium-implicit Round 08 wording maps to the frozen target without reversing growth intent", () => {
  const wording = "情况发生变化：你半年内可能需要使用这笔资金中的30%，希望到时能够较顺利地取出这部分资金。其余资金仍计划从约一年的角度考虑。相比之前，你更看重公司经营能否持续保持稳定，也更难接受明显的本金回撤，但仍不希望完全放弃增长机会。请据此重新确认你当前采用的判断策略，并完成最终判断。";
  assert.deepEqual(deriveExplicitStrategy(wording, STRATEGY_V1).next, STRATEGY_V2);
});

test("Strategy parser handles natural conjunctions without leaking values across fields", () => {
  const scoped = deriveExplicitStrategy("下行风险设为低并把稳定性设为高", STRATEGY_V1).next;
  assert.equal(scoped.downside, "低");
  assert.equal(scoped.stability, "高");

  const natural = deriveExplicitStrategy("把期限改成6个月，并且更加重视风险", STRATEGY_V1).next;
  assert.equal(natural.horizon, "6 个月");
  assert.equal(natural.downside, "高");
});

test("only standalone confirmation language can confirm a pending Strategy draft", () => {
  assert.equal(isExplicitDraftConfirmation("确认这个策略"), true);
  assert.equal(isExplicitDraftConfirmation("可以"), true);
  assert.equal(isExplicitDraftConfirmation("可以查看BETA现金流吗？"), false);
});

test("fact parser supports independent multi-actions without cross-stock leakage", () => {
  const operations = parseFactOperations("把BETA现金流加入依据；关注ALFA营收增长；查看GAMMA资产负债率");
  assert.deepEqual(operations.add, ["B-CASHFLOW"]);
  assert.deepEqual(operations.focus, ["A-GROWTH"]);
  assert.deepEqual(operations.query, ["G-DEBT"]);
  assert.deepEqual(operations.remove, []);
});

test("fact parser carries an explicitly named stock into a pronoun clause", () => {
  const operations = parseFactOperations("把BETA现金流加入依据；同时把它营收增长9%加入依据");
  assert.deepEqual(operations.add, ["B-CASHFLOW", "B-GROWTH"]);
});

test("fact parser scopes keywords and contrasted actions within a natural sentence", () => {
  const multiStock = parseFactOperations("把BETA现金流和ALFA增长作为依据");
  assert.deepEqual(multiStock.add, ["B-CASHFLOW", "A-GROWTH"]);

  const contrasted = parseFactOperations("加入BETA现金流但不要BETA周期作为依据");
  assert.deepEqual(contrasted.add, ["B-CASHFLOW"]);
  assert.deepEqual(contrasted.remove, ["B-CYCLE"]);
});

test("absolute deadline treats the boundary as expired", () => {
  assert.equal(deadlineReached(999, 1000), false);
  assert.equal(deadlineReached(1000, 1000), true);
  assert.equal(deadlineReached(1001, 1000), true);
  assert.equal(deadlineReached(10_000, null), false);
});

test("qualified exposure requires ratio, visibility, and focus simultaneously", () => {
  assert.equal(exposureEligible(0.8, true, true, 0.8), true);
  assert.equal(exposureEligible(0.79, true, true, 0.8), false);
  assert.equal(exposureEligible(1, false, true, 0.8), false);
  assert.equal(exposureEligible(1, true, false, 0.8), false);
});

test("seeded Probe changes exactly one Strategy field", () => {
  const probe = makeSeededProbe(STRATEGY_V1, "participant-a");
  const changed = STRATEGY_FIELDS.filter((field) => probe.summary[field.key] !== STRATEGY_V1[field.key]);
  assert.equal(changed.length, 1);
  assert.equal(changed[0].key, probe.seededField);
  assert.equal(makeSeededProbe(STRATEGY_V1, "any", 3).seededField, STRATEGY_FIELDS[3].key);
});

test("Frozen Context references only complete pre-lock snapshots", () => {
  const events = [
    { event_id: "s2", sequence_no: 1, event_type: "strategy_confirmed_snapshot", payload: { strategy_version: 2, fields: STRATEGY_V2 } },
    { event_id: "e1", sequence_no: 2, event_type: "evidence_confirmed_snapshot", payload: { evidence_version: 1, fact_ids: ["B-CASHFLOW"] } },
    { event_id: "a1", sequence_no: 3, event_type: "agent_context_consumed", payload: { strategy_version: 2, strategy_fields: STRATEGY_V2, evidence_version: 1, evidence_fact_ids: ["B-CASHFLOW"] } },
    { event_id: "lock", sequence_no: 4, event_type: "final_submit_lock_acquired", payload: { context_id: "ctx" } },
  ];
  const valid = validateFrozenContextTrace({
    events,
    contextId: "ctx",
    terminalTrigger: "final_submit_lock_acquired",
    terminalLockEventId: "lock",
    terminalLockSequenceNo: 4,
    strategyVersion: 2,
    strategy: STRATEGY_V2,
    evidenceVersion: 1,
    evidence: ["B-CASHFLOW"],
    lastAgentContext: { eventId: "a1", strategyVersion: 2, strategy: STRATEGY_V2, evidenceVersion: 1, evidence: ["B-CASHFLOW"] },
  });
  assert.deepEqual(valid, { valid: true, errors: [] });

  const invalid = validateFrozenContextTrace({
    events,
    contextId: "wrong",
    terminalTrigger: "deadline_triggered",
    terminalLockEventId: "lock",
    terminalLockSequenceNo: 4,
    strategyVersion: 3,
    strategy: STRATEGY_V2,
    evidenceVersion: 1,
    evidence: ["B-CASHFLOW"],
    lastAgentContext: { eventId: "a1", strategyVersion: 1, strategy: STRATEGY_V1, evidenceVersion: 0, evidence: [] },
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.includes("context_id_mismatch"));
  assert.ok(invalid.errors.includes("terminal_trigger_mismatch"));
  assert.ok(invalid.errors.includes("strategy_not_latest_before_lock"));
  assert.ok(invalid.errors.includes("last_agent_context_payload_mismatch"));
});

test("Frozen Context rejects stale snapshots and a missing latest Agent reference", () => {
  const events = [
    { event_id: "s2", sequence_no: 1, event_type: "strategy_confirmed_snapshot", payload: { strategy_version: 2, fields: STRATEGY_V2 } },
    { event_id: "e1", sequence_no: 2, event_type: "evidence_confirmed_snapshot", payload: { evidence_version: 1, fact_ids: ["B-CASHFLOW"] } },
    { event_id: "a1", sequence_no: 3, event_type: "agent_context_consumed", payload: { strategy_version: 2, strategy_fields: STRATEGY_V2, evidence_version: 1, evidence_fact_ids: ["B-CASHFLOW"] } },
    { event_id: "s3", sequence_no: 4, event_type: "strategy_confirmed_snapshot", payload: { strategy_version: 3, fields: STRATEGY_V1 } },
    { event_id: "e2", sequence_no: 5, event_type: "evidence_confirmed_snapshot", payload: { evidence_version: 2, fact_ids: ["B-CASHFLOW", "B-GROWTH"] } },
    { event_id: "a2", sequence_no: 6, event_type: "agent_context_consumed", payload: { strategy_version: 3, strategy_fields: STRATEGY_V1, evidence_version: 2, evidence_fact_ids: ["B-CASHFLOW", "B-GROWTH"] } },
    { event_id: "lock", sequence_no: 7, event_type: "deadline_triggered", payload: { context_id: "ctx" } },
  ];
  const result = validateFrozenContextTrace({
    events,
    contextId: "ctx",
    terminalTrigger: "deadline_triggered",
    terminalLockEventId: "lock",
    terminalLockSequenceNo: 7,
    strategyVersion: 2,
    strategy: STRATEGY_V2,
    evidenceVersion: 1,
    evidence: ["B-CASHFLOW"],
    lastAgentContext: null,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("strategy_not_latest_before_lock"));
  assert.ok(result.errors.includes("evidence_not_latest_before_lock"));
  assert.ok(result.errors.includes("last_agent_context_missing"));
});

test("Golden JSONL terminal transaction round-trips with one linked lock", () => {
  const trace = [
    { event_id: "s2", sequence_no: 1, event_type: "strategy_confirmed_snapshot", payload: { strategy_version: 2, fields: STRATEGY_V2 } },
    { event_id: "e1", sequence_no: 2, event_type: "evidence_confirmed_snapshot", payload: { evidence_version: 1, fact_ids: ["B-CASHFLOW"] } },
    { event_id: "a1", sequence_no: 3, event_type: "agent_context_consumed", payload: { strategy_version: 2, strategy_fields: STRATEGY_V2, evidence_version: 1, evidence_fact_ids: ["B-CASHFLOW"] } },
    { event_id: "lock", sequence_no: 4, event_type: "final_submit_lock_acquired", payload: { submission_id: "submit-1", payload_hash: "hash-1", context_id: "ctx-1" } },
    { event_id: "freeze", sequence_no: 5, event_type: "task_context_frozen", payload: { context_id: "ctx-1", terminal_lock_event_id: "lock", confirmed_strategy_version: 2, confirmed_strategy_fields: STRATEGY_V2, confirmed_evidence_version: 1, confirmed_evidence_fact_ids: ["B-CASHFLOW"] } },
    { event_id: "received", sequence_no: 6, event_type: "final_submission_received", payload: { submission_id: "submit-1", payload_hash: "hash-1", context_id: "ctx-1" } },
  ];
  const replay = trace.map((event) => JSON.stringify(event)).join("\n").split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(replay.map((event) => event.sequence_no), [1, 2, 3, 4, 5, 6]);
  const locks = replay.filter((event) => ["final_submit_lock_acquired", "deadline_triggered"].includes(event.event_type));
  assert.equal(locks.length, 1);
  const freeze = replay.find((event) => event.event_type === "task_context_frozen");
  const received = replay.find((event) => event.event_type === "final_submission_received");
  assert.equal(freeze.payload.terminal_lock_event_id, locks[0].event_id);
  assert.equal(received.payload.context_id, locks[0].payload.context_id);
  assert.equal(received.payload.submission_id, locks[0].payload.submission_id);
  assert.equal(received.payload.payload_hash, locks[0].payload.payload_hash);
  assert.equal(validateFrozenContextTrace({
    events: replay,
    contextId: "ctx-1",
    terminalTrigger: "final_submit_lock_acquired",
    terminalLockEventId: "lock",
    terminalLockSequenceNo: 4,
    strategyVersion: 2,
    strategy: STRATEGY_V2,
    evidenceVersion: 1,
    evidence: ["B-CASHFLOW"],
    lastAgentContext: { eventId: "a1", strategyVersion: 2, strategy: STRATEGY_V2, evidenceVersion: 1, evidence: ["B-CASHFLOW"] },
  }).valid, true);
});

test("canonical JSON is stable across object key order", () => {
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
});
