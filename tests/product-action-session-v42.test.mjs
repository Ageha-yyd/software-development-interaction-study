import assert from "node:assert/strict";
import test from "node:test";
import {
  createProductActionSession, executeProductAction, getPublicProductFacts, prepareProductAction,
} from "../lib/experiment/product-action-session.mjs";
import { exportSnapshot, queryItems } from "../lib/experiment/product-workbench.mjs";

const start = (sessionId = "participant-session-a1") => createProductActionSession({ sessionId });
const inspect = (view = "all", extra = {}) => ({ kind: "inspect", target: "current", revisionId: "R0", view, ...extra });
const prepare = (state, operation, participantRequest = "参与者明确提出本次操作。") => prepareProductAction(state, {
  expectedSessionVersion: state.sessionVersion, operation, participantRequest,
});
function execute(preparation, extra = {}) {
  assert.equal(preparation.status, "prepared", JSON.stringify(preparation.event));
  return executeProductAction(preparation.state, { ...preparation.preparedAction.requiredConfirmation, participantConfirmed: true, ...extra });
}
function act(state, operation, request) {
  const result = execute(prepare(state, operation, request));
  assert.equal(result.status, "executed", JSON.stringify(result.event));
  return result;
}
function checkedScoped() {
  return act(start(), { kind: "propose", candidateKind: "scoped", verifyAfterProposal: true });
}
function adoptOperation(result) {
  return { kind: "adopt", candidateRevisionId: result.state.product.candidate.revisionId, receiptId: result.result.receipt.receiptId };
}
function assertPublicProjection(value) {
  assert.doesNotMatch(JSON.stringify(value), /defectFixture|linked_rows_defect|batch_related_rows_exceed_preview|baseContentSignature|contentSignature|productBinding|Gold|goldOutcome|selectedObjectRefs|objectRefs|condition/);
}

test("session creation is explicit, immutable and limited to the independent six-item kernel", () => {
  const state = start();
  assert.equal(state.sessionVersion, 0);
  assert.equal(state.product.currentRevisionId, "R0");
  assert.equal(state.product.items.length, 6);
  assert.equal(state.product.coverage.observationalLedgerIsSeparate, true);
  assert.equal(state.product.receipts.length, 0);
  assert.ok(Object.isFrozen(state.product.items[0].memberships));
  assert.throws(() => createProductActionSession(), /explicit_session_id_required/);
  assert.throws(() => createProductActionSession({ sessionId: "x", condition: "B" }), /explicit_session_id_required/);
});

test("unknown or underspecified intent preserves exact participant text and never infers an action from language", () => {
  const candidate = act(start(), { kind: "propose", candidateKind: "scoped" }).state;
  const raw = "  采用它？不，我还没决定。linked scoped verify adopt\n请先听完我的要求。  ";
  for (const operation of [null, "adopt", { kind: "unknown" }, { kind: "verify" }, { kind: "adopt", receiptId: "latest" }, { kind: "propose" }]) {
    const result = prepare(candidate, operation, raw);
    assert.equal(result.status, "needs_clarification");
    assert.equal(result.preparedAction, null);
    assert.deepEqual(result.state.product, candidate.product);
    assert.equal(result.event.participantRequest, raw);
    assert.ok(result.clarification);
  }
});

test("unsupported interface and authoring metadata is rejected rather than entering semantic tool data", () => {
  const state = start();
  for (const metadata of [{ condition: "B" }, { objectRefs: ["R0-042"] }, { selectedObjectRefs: ["R0-042"] }, { revealedNodeIds: ["hidden"] }]) {
    const result = prepareProductAction(state, { expectedSessionVersion: 0, participantRequest: "读取当前条目", operation: inspect(), ...metadata });
    assert.equal(result.status, "rejected");
    assert.equal(result.code, "unsupported_request_fields");
    assert.deepEqual(result.state.product, state.product);
    assertPublicProjection(result.event);
  }
  for (const metadata of [{ condition: "A" }, { objectRefs: [] }, { defectFixture: "shortcut" }, { candidate: { kind: "scoped" } }]) {
    const result = prepare(state, { ...inspect(), ...metadata });
    assert.equal(result.code, "unsupported_operation_fields");
    assert.equal(result.event.operation, null);
    assertPublicProjection(result.event);
  }
});

test("preparation exposes the actual proposed scope but neither proposes nor verifies the product", () => {
  const original = start();
  const before = JSON.stringify(original);
  const request = "  请准备一个逐项范围候选，并在确认后检查。\n";
  const result = prepare(original, { kind: "propose", candidateKind: "scoped", verifyAfterProposal: true }, request);
  assert.equal(result.status, "prepared");
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(result.state.product, original.product);
  assert.deepEqual(getPublicProductFacts(result.state), getPublicProductFacts(original));
  assert.equal(result.state.sessionVersion, 1);
  assert.equal(result.preparedAction.participantRequest, request);
  const { review, requiredConfirmation } = result.preparedAction;
  assert.equal(review.currentProductWillChange, false);
  assert.equal(review.currentRevisionAfter, "R0");
  assert.equal(review.candidateRevisionAfter, "C1");
  assert.deepEqual(review.candidateItemIds, original.product.items.map((item) => item.id));
  assert.deepEqual(review.currentItemChanges, []);
  assert.equal(review.willVerifyCandidate, true);
  assert.equal(review.requiredReceiptId, null);
  assert.equal(requiredConfirmation.expectedProductStateVersion, 0);
  assert.equal(requiredConfirmation.expectedCurrentRevisionId, "R0");
  assert.equal(requiredConfirmation.expectedCandidateId, null);
  assert.equal(requiredConfirmation.expectedSessionVersion, 1);
  assertPublicProjection(result.preparedAction);
});

test("every execution requires literal participant confirmation and consumes its preparation only once", () => {
  const prepared = prepare(start(), { kind: "propose", candidateKind: "scoped" });
  for (const participantConfirmed of [undefined, false, "true", 1]) {
    const result = execute(prepared, { participantConfirmed });
    assert.equal(result.code, "explicit_participant_confirmation_required");
    assert.equal(result.state.product.candidate, null);
    assert.equal(result.event.participantRequest, prepared.preparedAction.participantRequest);
    assert.equal(result.state.preparedActions[0].status, "rejected");
    assert.equal(executeProductAction(result.state, { ...prepared.preparedAction.requiredConfirmation, participantConfirmed: true }).code, "prepared_action_unavailable");
  }
  const executed = execute(prepared);
  assert.equal(executed.state.product.candidate.revisionId, "C1");
  assert.equal(executed.state.preparedActions[0].status, "consumed");
  const replay = executeProductAction(executed.state, { ...prepared.preparedAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(replay.code, "prepared_action_unavailable");
  assert.deepEqual(replay.state.product, executed.state.product);
  assert.equal(replay.state.events.length, 3);
});

test("a second request invalidates a prior preparation and wrong session or product versions fail closed", () => {
  const first = prepare(start(), inspect());
  const second = prepare(first.state, { kind: "propose", candidateKind: "scoped" });
  assert.equal(second.state.preparedActions[0].status, "invalidated");
  const stale = executeProductAction(second.state, { ...first.preparedAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(stale.code, "prepared_action_unavailable");
  assert.equal(stale.state.product.candidate, null);
  for (const extra of [{ expectedSessionVersion: 0 }, { expectedProductStateVersion: 12 }, { expectedCurrentRevisionId: "C9" }, { expectedCandidateId: "C9" }]) {
    const refused = execute(first, extra);
    assert.equal(refused.status, "rejected");
    assert.match(refused.code, /confirmation_mismatch/);
  }
  const stalePrepare = prepareProductAction(second.state, { expectedSessionVersion: 0, participantRequest: "读取", operation: inspect() });
  assert.equal(stalePrepare.code, "stale_session_version");
  const changed = structuredClone(first.state);
  changed.product.items[0].note = "A concurrent change with an incorrectly unchanged counter";
  const refused = executeProductAction(changed, { ...first.preparedAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(refused.code, "prepared_product_state_changed");
  assert.equal(refused.state.product.items[0].note, changed.product.items[0].note);
});

test("confirmation cannot migrate to another session or a different plan on a same-version branch", () => {
  const first = prepare(start("session-one"), { kind: "propose", candidateKind: "linked" });
  const foreign = prepare(start("session-two"), { kind: "propose", candidateKind: "linked" });
  const rejected = executeProductAction(foreign.state, { ...first.preparedAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(rejected.code, "prepared_action_unavailable");
  const branch = prepare(start("session-one"), { kind: "propose", candidateKind: "scoped" });
  assert.equal(branch.preparedAction.preparedActionId, first.preparedAction.preparedActionId);
  const alteredPlan = executeProductAction(branch.state, { ...first.preparedAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(alteredPlan.code, "confirmation_mismatch:expectedReviewToken");
  const changedRequest = prepare(start("session-one"), first.preparedAction.operation, "A different original request");
  assert.notEqual(changedRequest.preparedAction.requiredConfirmation.expectedReviewToken, first.preparedAction.requiredConfirmation.expectedReviewToken);
});

test("inspect executes real global and view queries without changing product state or inventing nearby matches", () => {
  let state = start();
  const original = exportSnapshot(state.product);
  for (const operation of [inspect(), inspect("Inbox"), inspect("Unsorted"), inspect("Collections", { collection: "Project Atlas" }),
    inspect("Search", { query: "offline" }), inspect("Search", { query: "Shared local state" }), inspect("Search", { query: "no-match-9ab87" })]) {
    const prepared = prepare(state, operation, `读取 ${operation.view} 的完整结果`);
    const expected = queryItems(state.product, operation);
    assert.deepEqual(prepared.preparedAction.review.inspectedItemIds, expected.map((item) => item.id));
    const executed = execute(prepared);
    assert.deepEqual(executed.result.items, expected);
    assert.equal(executed.state.product.stateVersion, 0);
    assert.equal(exportSnapshot(executed.state.product), original);
    assert.deepEqual(executed.event.kernelEventIds, []);
    state = executed.state;
  }
  assert.equal(state.events.at(-1).result.items.length, 0);
  assert.equal(state.events.length, 14);
  assert.equal(prepare(state, inspect("Search")).status, "needs_clarification");
  assert.equal(prepare(state, inspect("Collections")).status, "needs_clarification");
  assert.equal(prepare(state, { ...inspect(), target: "candidate", revisionId: "C1" }).code, "candidate_missing");
});

test("a linked proposal remains unadopted and exposes a failing scope receipt only after actual verification", () => {
  const proposed = act(start(), { kind: "propose", candidateKind: "linked" });
  assert.equal(proposed.state.product.currentRevisionId, "R0");
  assert.equal(proposed.state.product.receipts.length, 0);
  const beforeFacts = getPublicProductFacts(proposed.state);
  assert.equal(beforeFacts.filter((fact) => fact.kind === "verification_receipt").length, 0);
  assert.match(beforeFacts.find((fact) => fact.kind === "candidate_revision").body, /尚无绑定当前内容的检查回执/);
  assertPublicProjection(beforeFacts);
  const verified = act(proposed.state, { kind: "verify", candidateRevisionId: "C1" });
  assert.equal(verified.result.receipt.passed, false);
  assert.deepEqual(verified.result.receipt.checks.filter((check) => !check.passed).map((check) => check.name), ["scope_changes_only_selected_items", "preview_matches_execution"]);
  assert.equal(verified.state.product.currentRevisionId, "R0");
  assert.equal(verified.state.product.candidate.revisionId, "C1");
  assert.equal(prepare(verified.state, adoptOperation(verified)).code, "passing_candidate_receipt_required");
  assertPublicProjection(verified.result);
  const facts = getPublicProductFacts(verified.state);
  assert.match(facts.find((fact) => fact.kind === "verification_receipt").body, /批量修改只影响所选条目：未通过/);
  assertPublicProjection(facts);
});

test("a single explicit propose-and-verify plan works directly from R0, with real checks and no automatic adoption", () => {
  for (const candidateKind of ["linked", "scoped"]) {
    const request = `  实现 ${candidateKind} 候选并检查，但等我决定是否采用。\n`;
    const original = start();
    const prepared = prepare(original, { kind: "propose", candidateKind, verifyAfterProposal: true }, request);
    assert.equal(prepared.state.product.receipts.length, 0);
    const executed = execute(prepared);
    assert.equal(executed.result.receipt.passed, candidateKind === "scoped");
    assert.equal(executed.state.product.currentRevisionId, "R0");
    assert.equal(executed.state.product.candidate.revisionId, "C1");
    assert.equal(executed.state.product.stateVersion, 2);
    assert.deepEqual(executed.state.product.events.map((event) => event.type), ["candidate_proposed", "candidate_verified"]);
    assert.deepEqual(executed.event.kernelEventIds, executed.state.product.events.map((event) => event.eventId));
    assert.equal(executed.event.participantRequest, request);
    assert.equal(executed.state.events.length, 2);
    assert.equal(exportSnapshot(executed.state.product), exportSnapshot(original.product));
  }
  assert.equal(prepare(start(), { kind: "propose", candidateKind: "scoped", verifyAfterProposal: "yes" }).status, "rejected");
});

test("supersession and discard name the exact unadopted candidate; a baseline cannot be rolled back", () => {
  const original = start();
  const linked = act(original, { kind: "propose", candidateKind: "linked", verifyAfterProposal: true }).state;
  assert.equal(prepare(linked, { kind: "propose", candidateKind: "scoped" }).status, "needs_clarification");
  const scoped = act(linked, { kind: "propose", candidateKind: "scoped", supersedesCandidateId: "C1" }).state;
  assert.equal(scoped.product.candidate.revisionId, "C2");
  assert.equal(scoped.product.candidateHistory[0].outcome, "superseded");
  assert.equal(prepare(scoped, { kind: "discard", candidateRevisionId: "C1" }).code, "stale_candidate_revision");
  const discarded = act(scoped, { kind: "discard", candidateRevisionId: "C2" });
  assert.equal(discarded.state.product.candidate, null);
  assert.equal(discarded.state.product.candidateHistory[1].outcome, "discarded");
  assert.equal(exportSnapshot(discarded.state.product), exportSnapshot(original.product));
  assert.equal(prepare(discarded.state, { kind: "rollback", revisionId: "R0", restoreRevisionId: "R0" }).code, "adopted_revision_required_for_rollback");
});

test("adoption is bound to the exact candidate and receipt, not a latest-receipt guess or a confirmation override", () => {
  const checked = checkedScoped();
  const operation = adoptOperation(checked);
  assert.equal(prepare(checked.state, { kind: "adopt", candidateRevisionId: "C1" }).status, "needs_clarification");
  assert.equal(prepare(checked.state, { ...operation, candidateRevisionId: "C2" }).code, "stale_candidate_revision");
  assert.equal(prepare(checked.state, { ...operation, receiptId: "arbitrary:V1" }).code, "passing_candidate_receipt_required");
  const prepared = prepare(checked.state, operation);
  assert.equal(prepared.preparedAction.review.requiredReceiptId, operation.receiptId);
  assert.equal(prepared.preparedAction.review.currentProductWillChange, true);
  assert.deepEqual(prepared.preparedAction.review.currentItemChanges, []);
  assert.equal(execute(prepared, { expectedReceiptId: "substituted:V2" }).code, "confirmation_mismatch:expectedReceiptId");
  assert.equal(execute(prepared, { operation: { kind: "rollback" } }).code, "unsupported_confirmation_fields");
  const mutatedReceipt = structuredClone(prepared.state);
  mutatedReceipt.product.receipts[0].checks[0].passed = false;
  const refused = executeProductAction(mutatedReceipt, { ...prepared.preparedAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(refused.code, "prepared_receipt_changed");
  assert.equal(refused.state.product.currentRevisionId, "R0");
  const adopted = execute(prepared);
  assert.equal(adopted.status, "executed");
  assert.equal(adopted.state.product.currentRevisionId, "C1");
  assert.equal(adopted.state.product.candidate, null);
  assert.equal(adopted.result.receipt.receiptId, operation.receiptId);
  assertPublicProjection(adopted.result);
});

test("a passing historical candidate receipt cannot authorize a newer candidate", () => {
  const checked = checkedScoped();
  const newer = act(checked.state, { kind: "propose", candidateKind: "scoped", supersedesCandidateId: "C1" }).state;
  const refused = prepare(newer, { kind: "adopt", candidateRevisionId: "C2", receiptId: checked.result.receipt.receiptId });
  assert.equal(refused.code, "candidate_receipt_is_stale");
  assert.equal(refused.state.product.currentRevisionId, "R0");
  const historicalFact = getPublicProductFacts(newer).find((fact) => fact.kind === "verification_receipt");
  assert.match(historicalFact.body, /历史版本回执，不授权当前内容/);
});

test("adoption followed by explicit rollback restores the exact R0 snapshot and produces real restoration checks", () => {
  const baseline = exportSnapshot(start().product);
  const checked = checkedScoped();
  const adopted = act(checked.state, adoptOperation(checked)).state;
  assert.equal(prepare(adopted, { kind: "discard", candidateRevisionId: "C1" }).code, "candidate_missing");
  assert.equal(prepare(adopted, { kind: "rollback", revisionId: "C1", restoreRevisionId: "C9" }).code, "rollback_target_mismatch");
  const pending = prepare(adopted, { kind: "rollback", revisionId: "C1", restoreRevisionId: "R0" });
  assert.equal(pending.state.product.currentRevisionId, "C1");
  assert.equal(pending.preparedAction.review.currentRevisionAfter, "R0");
  const restored = execute(pending);
  assert.equal(restored.state.product.currentRevisionId, "R0");
  assert.equal(exportSnapshot(restored.state.product), baseline);
  assert.equal(restored.result.receipt.purpose, "rollback_restoration");
  assert.ok(restored.result.receipt.checks.every((check) => check.passed));
  assert.equal(restored.result.receipt.scope, "six_item_product_kernel");
  assert.ok(restored.result.receipt.limitations.includes("screen_reader"));
  assert.equal(restored.state.product.adoptionHistory[0].rolledBack, true);
});

test("retain and defer record participant reasons, require explicit targets and never grade or adopt a decision", () => {
  const request = "  暂缓，保留当前内容；需要对应版本的键盘测试。\n";
  const proposed = act(start(), { kind: "propose", candidateKind: "scoped" }).state;
  const keptWithCandidate = act(proposed, { kind: "retain", revisionId: "R0", reason: "继续保留当前版本，候选尚不采用" });
  assert.equal(keptWithCandidate.state.product.currentRevisionId, "R0");
  assert.equal(keptWithCandidate.state.product.candidate.revisionId, "C1");
  assert.equal(keptWithCandidate.result.disposition.pendingCandidateId, "C1");
  assert.ok(keptWithCandidate.result.receipt.checks.every((check) => check.passed));
  assert.match(getPublicProductFacts(keptWithCandidate.state).find((fact) => fact.kind === "participant_disposition").body, /候选仍未采用，也未被丢弃/);
  assert.equal(prepare(proposed, { kind: "defer", revisionId: "R0", reason: "等待", reopenCondition: "实测完成" }).status, "needs_clarification");
  assert.equal(prepare(proposed, { kind: "defer", revisionId: "R0", pendingCandidateId: "C1", reason: "等待" }).status, "needs_clarification");
  const deferred = act(proposed, { kind: "defer", revisionId: "R0", pendingCandidateId: "C1", reason: "  缺少键盘实测  ", reopenCondition: "取得对应版本的键盘记录" }, request);
  assert.equal(deferred.state.product.currentRevisionId, "R0");
  assert.equal(deferred.state.product.candidate.revisionId, "C1");
  assert.equal(deferred.result.disposition.reason, "缺少键盘实测");
  assert.equal(deferred.event.operation.reason, "  缺少键盘实测  ");
  assert.equal(deferred.event.participantRequest, request);
  assert.equal(deferred.result.disposition.status, "recorded_in_sandbox");
  assert.equal(deferred.result.receipt.purpose, "disposition_current_state");
  const retained = act(start(), { kind: "retain", revisionId: "R0", reason: "当前需求已满足" });
  assert.equal(retained.result.disposition.kind, "retain");
  assert.equal(retained.state.product.currentRevisionId, "R0");
  assertPublicProjection(deferred.result);
  assertPublicProjection(getPublicProductFacts(deferred.state));
  assert.doesNotMatch(JSON.stringify(deferred.result), /quality|gold|correctChoice|human_performance/);
});

test("public facts have snapshot-bound marker-safe IDs, actual item bodies and separate current/candidate/check evidence", () => {
  const original = start("a94f-lowercase-session/中文");
  const prepared = prepare(original, { kind: "propose", candidateKind: "scoped" });
  const factsBefore = getPublicProductFacts(original);
  assert.deepEqual(getPublicProductFacts(prepared.state), factsBefore);
  const proposed = execute(prepared).state;
  const facts = getPublicProductFacts(proposed);
  assert.ok(facts.every((fact) => /^[A-Z0-9:@._+-]+$/.test(fact.id)));
  assert.equal(new Set(facts.map((fact) => fact.id)).size, facts.length);
  assert.equal(facts.filter((fact) => fact.kind === "current_revision").length, 1);
  assert.equal(facts.filter((fact) => fact.kind === "candidate_revision").length, 1);
  assert.ok(facts.every((fact) => fact.asOfProductStateVersion === proposed.product.stateVersion));
  for (const fact of factsBefore.filter((fact) => fact.kind === "product_item")) {
    assert.equal(facts.find((entry) => entry.id === fact.id), undefined);
    assert.equal(facts.find((entry) => entry.kind === fact.kind && entry.title === fact.title && entry.revisionId === fact.revisionId).body, fact.body);
  }
  for (const item of proposed.product.items) {
    const fact = facts.find((entry) => entry.kind === "product_item" && entry.revisionId === "R0" && entry.title.endsWith(item.id));
    for (const value of [item.id, item.url, item.title, item.note, ...item.tags, ...item.memberships]) assert.ok(fact.body.includes(value));
  }
  const boundary = facts.find((fact) => fact.kind === "evidence_boundary");
  assert.match(boundary.body, /6 条固定作者构造数据/);
  assert.match(boundary.body, /独立于 144 条观察材料及其候选评价/);
  assert.match(boundary.body, /尚未验证浏览器键盘路径、屏幕阅读器/);
  assert.ok(Object.isFrozen(facts[0]));
  assertPublicProjection(facts);
  assert.notDeepEqual(getPublicProductFacts(start("case-session"))[0].id, getPublicProductFacts(start("CASE-session"))[0].id);
});

test("a deferred candidate that was discarded is described as historical, not still pending", () => {
  const proposed = act(start(), { kind: "propose", candidateKind: "scoped" }).state;
  const deferred = act(proposed, { kind: "defer", revisionId: "R0", pendingCandidateId: "C1", reason: "需要更多实测", reopenCondition: "对应版本测试完成" }).state;
  const earlier = getPublicProductFacts(deferred);
  assert.ok(earlier.some((fact) => fact.kind === "participant_disposition"));
  const discarded = act(deferred, { kind: "discard", candidateRevisionId: "C1" }).state;
  const facts = getPublicProductFacts(discarded);
  assert.equal(discarded.product.candidate, null);
  assert.ok(!facts.some((fact) => fact.kind === "participant_disposition" || fact.kind === "candidate_revision"));
  const disposition = facts.find((fact) => fact.kind === "historical_participant_disposition");
  assert.match(disposition.body, /记录当时的待定候选：C1/);
  assert.match(disposition.body, /不表示候选目前仍待定/);
  assert.ok(earlier.every((oldFact) => !facts.some((fact) => fact.id === oldFact.id)));
  assert.ok(discarded.events.some((event) => event.type === "product_action_executed" && event.operation.kind === "defer"));
});

test("the same explicit semantic transcript has the same product effect without interface state", () => {
  const requests = [
    { request: "读取 Inbox 现有条目", operation: inspect("Inbox") },
    { request: "生成逐项范围候选并检查", operation: { kind: "propose", candidateKind: "scoped", verifyAfterProposal: true } },
    { request: "暂时不要采用，等真实键盘路径记录", operation: { kind: "defer", revisionId: "R0", pendingCandidateId: "C1", reason: "缺少键盘记录", reopenCondition: "对应版本键盘检查完成" } },
  ];
  const run = () => requests.reduce((state, { request, operation }) => act(state, operation, request).state, start("semantic-parity"));
  const first = run();
  const second = run();
  assert.deepEqual(first, second);
  assert.equal(first.events.length, 6);
  assert.deepEqual(first.events.filter((event) => event.type === "product_action_executed").map((event) => event.participantRequest), requests.map(({ request }) => request));
  assert.equal(first.product.currentRevisionId, "R0");
  assert.equal(first.product.candidate.revisionId, "C1");
  assertPublicProjection(getPublicProductFacts(first));
});
