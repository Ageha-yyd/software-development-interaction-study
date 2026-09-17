import assert from "node:assert/strict";
import test from "node:test";
import {
  adoptCandidate, applyBatch, createWorkbench, discardCandidate, exportSnapshot,
  guardFor, importSnapshot, previewBatch, proposeRevision, queryItems,
  recordDisposition, resolveItem, rollbackRevision, undoBatch, verifyCandidate,
} from "../lib/experiment/product-workbench.mjs";

const start = () => createWorkbench({ workbenchId: "test-sandbox" });
const propose = (state, kind, extra = {}) => proposeRevision(state, { ...guardFor(state), kind, ...extra }).state;
const verify = (state) => verifyCandidate(state, guardFor(state));
function adoptedScoped() {
  const candidate = propose(start(), "scoped");
  const checked = verify(candidate);
  return adoptCandidate(checked.state, { ...guardFor(checked.state), receiptId: checked.event.receiptId }).state;
}
function batch(state, { target = "current", ...operation }) {
  const preview = previewBatch(state, { ...guardFor(state), target, ...operation });
  return applyBatch(state, { ...guardFor(state), target, preview });
}

test("the implementation sandbox distinguishes its six real items from observational stimuli and untested browser behavior", () => {
  const state = start();
  assert.equal(state.items.length, 6);
  assert.equal(state.evidenceClass, "authored_implementation_sandbox");
  assert.equal(state.coverage.observationalLedgerIsSeparate, true);
  assert.ok(state.coverage.unverified.includes("human_efficiency"));
  assert.ok(state.coverage.unverified.includes("browser_keyboard"));
  assert.ok(Object.isFrozen(state.items[0].memberships));
  assert.equal(state.receipts.length, 0);
});

test("Search, Inbox, Unsorted and Collection queries resolve the same stable items in all four state combinations", () => {
  const state = start();
  const item = resolveItem(state, "R0-042");
  assert.equal(queryItems(state, { view: "Search", query: "offline" })[0], item);
  assert.equal(queryItems(state, { view: "Collections", collection: "Project Atlas" })[0], item);
  assert.ok(queryItems(state, { view: "Inbox" }).includes(item));
  assert.ok(!queryItems(state, { view: "Unsorted" }).includes(item));
  assert.ok(queryItems(state, { view: "Unsorted" }).some((entry) => entry.pending));
  assert.ok(queryItems(state, { view: "Unsorted" }).some((entry) => !entry.pending));
  assert.ok(state.items.some((entry) => entry.memberships.length > 0 && !entry.pending));
  for (const query of [item.url, item.note, ...item.tags]) {
    assert.ok(queryItems(state, { view: "Search", query }).includes(item));
  }
});

test("proposal is isolated from the accepted product and supersession must name the current candidate", () => {
  const original = start();
  const before = exportSnapshot(original);
  const linked = propose(original, "linked");
  assert.equal(linked.currentRevisionId, "R0");
  assert.equal(linked.candidate.revisionId, "C1");
  assert.equal(exportSnapshot(linked), before);
  assert.throws(() => propose(linked, "scoped"), /explicit_candidate_supersession_required/);
  const scoped = propose(linked, "scoped", { supersedesCandidateId: "C1" });
  assert.equal(scoped.candidate.revisionId, "C2");
  assert.equal(scoped.candidateHistory[0].outcome, "superseded");
  assert.equal(exportSnapshot(scoped), before);
});

test("C1 preserves identity and orthogonal states but its executed batch includes an unselected linked row", () => {
  const state = propose(start(), "linked");
  const beforeCurrent = exportSnapshot(state);
  const selectedBefore = resolveItem(state, "R0-042", { target: "candidate" });
  const unrelatedBefore = resolveItem(state, "R0-044", { target: "candidate" });
  const preview = previewBatch(state, { ...guardFor(state), target: "candidate", itemIds: ["R0-042"], clearPending: true });
  assert.deepEqual(preview.selectedItemIds, ["R0-042"]);
  assert.deepEqual(preview.changes.map((entry) => entry.itemId), ["R0-042"]);
  const applied = applyBatch(state, { ...guardFor(state), target: "candidate", preview });
  assert.deepEqual(applied.event.effectiveItemIds, ["R0-042", "R0-043"]);
  assert.equal(applied.event.previewMatchesExecution, false);
  assert.equal(resolveItem(applied.state, "R0-043", { target: "candidate" }).pending, false);
  assert.deepEqual(resolveItem(applied.state, "R0-044", { target: "candidate" }), unrelatedBefore);
  const selectedAfter = resolveItem(applied.state, "R0-042", { target: "candidate" });
  for (const field of ["id", "url", "title", "note", "tags", "memberships"]) assert.deepEqual(selectedAfter[field], selectedBefore[field]);
  assert.equal(exportSnapshot(applied.state), beforeCurrent);
});

test("C1 membership changes never silently clear pending, and the scope receipt identifies the narrower real failure", () => {
  const linked = propose(start(), "linked");
  const changed = batch(linked, { target: "candidate", itemIds: ["R0-042"], addCollection: "New project" }).state;
  assert.ok(changed.candidate.items.every((item, index) => item.pending === linked.candidate.items[index].pending));
  const checked = verify(changed);
  assert.equal(checked.event.passed, false);
  assert.deepEqual(checked.event.checks.filter((entry) => !entry.passed).map((entry) => entry.name), ["scope_changes_only_selected_items", "preview_matches_execution"]);
  assert.ok(checked.event.checks.find((entry) => entry.name === "membership_pending_orthogonality").passed);
  assert.ok(checked.event.checks.find((entry) => entry.name === "identity_and_payload").passed);
  assert.ok(checked.event.checks.find((entry) => entry.name === "batch_inverse_restores_exact_items").passed);
  assert.throws(() => adoptCandidate(checked.state, { ...guardFor(checked.state), receiptId: checked.event.receiptId }), /passing_candidate_receipt_required/);
});

test("C2 scope affects exactly selected items and undo restores the entire exact snapshot", () => {
  const state = propose(start(), "scoped");
  const before = exportSnapshot(state, { target: "candidate" });
  const applied = batch(state, { target: "candidate", itemIds: ["R0-042", "R0-044"], clearPending: true, addCollection: "Reviewed" });
  assert.deepEqual(applied.event.effectiveItemIds, ["R0-042", "R0-044"]);
  assert.equal(applied.event.previewMatchesExecution, true);
  for (const item of state.candidate.items.filter((entry) => !["R0-042", "R0-044"].includes(entry.id))) {
    assert.deepEqual(resolveItem(applied.state, item.id, { target: "candidate" }), item);
  }
  const undone = undoBatch(applied.state, { ...guardFor(applied.state), target: "candidate", operationId: applied.event.operationId });
  assert.equal(exportSnapshot(undone.state, { target: "candidate" }), before);
  assert.throws(() => undoBatch(undone.state, { ...guardFor(undone.state), target: "candidate", operationId: applied.event.operationId }), /undo_operation_unavailable/);
});

test("the scope contract holds across every single-item selection in a C2 sandbox", () => {
  const state = propose(start(), "scoped");
  for (const selected of state.candidate.items) {
    const applied = batch(state, { target: "candidate", itemIds: [selected.id], clearPending: true, addCollection: "Explicit selection" });
    assert.deepEqual(applied.event.effectiveItemIds, [selected.id]);
    assert.equal(applied.event.previewMatchesExecution, true);
    for (const unselected of state.candidate.items.filter((item) => item.id !== selected.id)) {
      assert.deepEqual(resolveItem(applied.state, unselected.id, { target: "candidate" }), unselected);
    }
  }
});

test("empty, duplicated or nonexistent batch scopes and altered previews fail before changing product data", () => {
  const state = start();
  const before = exportSnapshot(state);
  for (const itemIds of [[], ["R0-042", "R0-042"], ["missing"]]) {
    assert.throws(() => previewBatch(state, { ...guardFor(state), target: "current", itemIds, clearPending: true }), /scope/);
  }
  const preview = previewBatch(state, { ...guardFor(state), target: "current", itemIds: ["R0-042"], clearPending: true });
  assert.throws(() => applyBatch(state, { ...guardFor(state), target: "current", preview: { ...preview, selectedItemIds: ["R0-043"] } }), /scope_preview_changed/);
  assert.equal(exportSnapshot(state), before);
});

test("all state-changing actions reject stale guards, previews, receipts and candidate baselines", () => {
  const original = start();
  const state = propose(original, "scoped");
  assert.throws(() => verifyCandidate(state, guardFor(original)), /stale_state_version/);
  const checked = verify(state);
  const preview = previewBatch(checked.state, { ...guardFor(checked.state), target: "candidate", itemIds: ["R0-042"], clearPending: true });
  const changed = batch(checked.state, { target: "candidate", itemIds: ["R0-044"], clearPending: true }).state;
  assert.throws(() => applyBatch(changed, { ...guardFor(changed), target: "candidate", preview }), /stale_or_missing_scope_preview/);
  assert.throws(() => adoptCandidate(changed, { ...guardFor(changed), receiptId: checked.event.receiptId }), /candidate_receipt_is_stale/);
  const baseChanged = batch(checked.state, { target: "current", itemIds: ["R0-042"], clearPending: true }).state;
  assert.throws(() => verify(baseChanged), /candidate_base_is_stale/);
  assert.throws(() => adoptCandidate(baseChanged, { ...guardFor(baseChanged), receiptId: checked.event.receiptId }), /candidate_receipt_is_stale/);
});

test("C1 to C2 uses a new exact receipt, adoption is explicit, and historical C1 checks cannot authorize C2", () => {
  const linked = verify(propose(start(), "linked"));
  const scoped = propose(linked.state, "scoped", { supersedesCandidateId: "C1" });
  assert.throws(() => adoptCandidate(scoped, { ...guardFor(scoped), receiptId: linked.event.receiptId }), /passing_candidate_receipt_required/);
  const checked = verify(scoped);
  assert.equal(checked.event.passed, true);
  assert.equal(checked.state.currentRevisionId, "R0");
  const adopted = adoptCandidate(checked.state, { ...guardFor(checked.state), receiptId: checked.event.receiptId });
  assert.equal(adopted.state.currentRevisionId, "C2");
  assert.equal(adopted.state.candidate, null);
  assert.equal(adopted.state.config.kind, "scoped");
  const receipt = adopted.state.receipts.find((item) => item.receiptId === adopted.event.receiptId);
  assert.equal(receipt.revisionId, "C2");
  assert.equal(receipt.scope, "six_item_product_kernel");
  assert.ok(receipt.limitations.includes("screen_reader"));
});

test("discard affects only an unadopted candidate; rollback verifies and restores an adopted revision", () => {
  const original = start();
  const initialSnapshot = exportSnapshot(original);
  const candidate = propose(original, "linked");
  const discarded = discardCandidate(candidate, guardFor(candidate));
  assert.equal(discarded.state.currentRevisionId, "R0");
  assert.equal(exportSnapshot(discarded.state), initialSnapshot);
  assert.throws(() => rollbackRevision(discarded.state, guardFor(discarded.state)), /adopted_revision_required/);
  const adopted = adoptedScoped();
  assert.throws(() => discardCandidate(adopted, guardFor(adopted)), /stale_candidate_revision/);
  const rolledBack = rollbackRevision(adopted, guardFor(adopted));
  assert.equal(exportSnapshot(rolledBack.state), initialSnapshot);
  assert.equal(rolledBack.event.restorationVerified, true);
  const receipt = rolledBack.state.receipts.find((item) => item.receiptId === rolledBack.event.receiptId);
  assert.equal(receipt.purpose, "rollback_restoration");
  assert.ok(receipt.checks.every((item) => item.passed));
});

test("rollback cannot overwrite post-adoption work and undo cannot overwrite a later batch", () => {
  const adopted = adoptedScoped();
  const first = batch(adopted, { itemIds: ["R0-042"], clearPending: true });
  assert.throws(() => rollbackRevision(first.state, guardFor(first.state)), /rollback_requires_exact_adopted_state/);
  const second = batch(first.state, { itemIds: ["R0-044"], clearPending: true });
  assert.throws(() => undoBatch(second.state, { ...guardFor(second.state), target: "current", operationId: first.event.operationId }), /undo_requires_exact_post_operation_state/);
  const secondUndone = undoBatch(second.state, { ...guardFor(second.state), target: "current", operationId: second.event.operationId });
  const firstUndone = undoBatch(secondUndone.state, { ...guardFor(secondUndone.state), target: "current", operationId: first.event.operationId });
  assert.equal(rollbackRevision(firstUndone.state, guardFor(firstUndone.state)).state.currentRevisionId, "R0");
});

test("export and import preserve stable IDs, payload and memberships and reject duplicate identities or missing configuration", () => {
  const state = batch(start(), { itemIds: ["R0-044"], addCollection: "New group" }).state;
  const exported = exportSnapshot(state);
  const imported = importSnapshot(exported);
  assert.deepEqual(imported.items, state.items);
  const duplicate = JSON.parse(exported);
  duplicate.items[1].id = duplicate.items[0].id;
  assert.throws(() => importSnapshot(JSON.stringify(duplicate)), /duplicate_item_identity/);
  const noConfig = JSON.parse(exported);
  delete noConfig.config;
  assert.throws(() => importSnapshot(JSON.stringify(noConfig)), /import_schema_invalid/);
});

test("retaining R0 and deferring a candidate require actual participant text and never auto-adopt", () => {
  const state = start();
  assert.throws(() => recordDisposition(state, { ...guardFor(state), kind: "retain", reason: " " }), /participant_reason_required/);
  const retained = recordDisposition(state, { ...guardFor(state), kind: "retain", reason: "当前证据不足以支持改变入口。" });
  assert.equal(retained.state.currentRevisionId, "R0");
  assert.equal(retained.state.disposition.kind, "retain");
  const candidate = propose(state, "scoped");
  const retainedWithCandidate = recordDisposition(candidate, { ...guardFor(candidate), kind: "retain", reason: "保留当前版本，候选暂不采用" });
  assert.equal(retainedWithCandidate.state.currentRevisionId, "R0");
  assert.equal(retainedWithCandidate.state.candidate.revisionId, "C1");
  assert.equal(retainedWithCandidate.state.disposition.pendingCandidateId, "C1");
  assert.equal(retainedWithCandidate.state.receipts.at(-1).purpose, "disposition_current_state");
  assert.ok(retainedWithCandidate.state.receipts.at(-1).checks.every((check) => check.passed));
  assert.throws(() => recordDisposition(candidate, { ...guardFor(candidate), kind: "defer", reason: "需要更多证据" }), /reopen_condition_required/);
  const deferred = recordDisposition(candidate, { ...guardFor(candidate), kind: "defer", reason: "需要键盘实测", reopenCondition: "取得对应版本的键盘路径记录" });
  assert.equal(deferred.state.currentRevisionId, "R0");
  assert.equal(deferred.state.candidate.revisionId, "C1");
  assert.equal(deferred.state.disposition.pendingCandidateId, "C1");
  assert.equal(deferred.state.disposition.reason, "需要键盘实测");
});
