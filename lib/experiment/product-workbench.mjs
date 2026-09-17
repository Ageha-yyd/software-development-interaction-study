/**
 * Executable, authored six-item product sandbox. These items are not the 144
 * items in the observational stimulus. Checks below exercise this module only;
 * they do not certify browser accessibility or establish human performance.
 *
 * Read APIs return values. State-changing APIs return { state, event }. Every
 * action requires guardFor(state), and candidate actions also check its ID.
 */

const SCHEMA = "software-product-workbench-v42.1";
const RECEIPT_SCOPE = "six_item_product_kernel";
const CONFIGS = Object.freeze({
  baseline: { kind: "baseline", batchScope: "selected_items", scopePreview: "selected_items" },
  linked: { kind: "linked", batchScope: "linked_rows_defect", scopePreview: "selected_items" },
  scoped: { kind: "scoped", batchScope: "selected_items", scopePreview: "explicit_per_item" },
});

const FIXTURE_ITEMS = [
  { id: "R0-042", url: "https://example.test/offline", title: "Offline-first sync notes", note: "Shared local state", tags: ["sync", "offline"], memberships: ["Project Atlas"], pending: true },
  { id: "R0-043", url: "https://example.test/cache", title: "Cache invalidation patterns", note: "Read before the next design review", tags: ["cache"], memberships: ["Project Atlas", "Weekend Reading"], pending: true },
  { id: "R0-044", url: "https://example.test/focus", title: "Keyboard focus checklist", note: "Keep focus after actions", tags: ["accessibility"], memberships: [], pending: true },
  { id: "R0-045", url: "https://example.test/import", title: "Import provenance notes", note: "Keep source metadata", tags: ["migration"], memberships: ["Archive"], pending: false },
  { id: "R0-046", url: "https://example.test/garden", title: "Garden reading", note: "A finished ungrouped item", tags: ["leisure"], memberships: [], pending: false },
  { id: "R0-047", url: "https://example.test/query", title: "Query semantics", note: "Search across all saved items", tags: ["retrieval"], memberships: ["Weekend Reading"], pending: true },
];

function fail(code) { throw new Error(`workbench:${code}`); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function same(left, right) { return canonical(left) === canonical(right); }
function signature(snapshot) {
  // Exact canonical content, not a cryptographic digest or a receipt signature.
  return canonical({ revisionId: snapshot.revisionId, config: snapshot.config, items: snapshot.items });
}
function currentSnapshot(state) {
  return { revisionId: state.currentRevisionId, config: state.config, items: state.items };
}
function snapshotFor(state, target) {
  if (target === "current") return currentSnapshot(state);
  if (target === "candidate" && state.candidate) return state.candidate;
  fail(target === "candidate" ? "candidate_missing" : "target_required");
}
function guarded(state, options, candidateRequired = false) {
  if (state?.schemaVersion !== SCHEMA) fail("schema_mismatch");
  if (options?.expectedRevisionId !== state.currentRevisionId) fail("stale_current_revision");
  if (options?.expectedStateVersion !== state.stateVersion) fail("stale_state_version");
  if (candidateRequired && (!state.candidate || options.expectedCandidateId !== state.candidate.revisionId)) {
    fail("stale_candidate_revision");
  }
}
function finish(state, next, type, detail = {}) {
  next.stateVersion = state.stateVersion + 1;
  const event = {
    schemaVersion: SCHEMA, eventId: `${state.workbenchId}:E${next.stateVersion}`,
    evidenceClass: "authored_implementation_sandbox", type,
    previousRevisionId: state.currentRevisionId, currentRevisionId: next.currentRevisionId,
    stateVersion: next.stateVersion, ...detail,
  };
  next.events.push(event);
  return freeze({ state: next, event });
}
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) fail("items_invalid");
  const ids = new Set();
  for (const item of items) {
    if (!item || typeof item !== "object" || typeof item.pending !== "boolean") fail("item_invalid");
    for (const field of ["id", "url", "title", "note"]) {
      if (typeof item[field] !== "string" || (field !== "note" && !item[field].trim())) fail(`item_${field}_invalid`);
    }
    if (ids.has(item.id)) fail("duplicate_item_identity");
    ids.add(item.id);
    for (const field of ["tags", "memberships"]) {
      if (!Array.isArray(item[field]) || item[field].some((value) => typeof value !== "string" || !value.trim())
        || new Set(item[field]).size !== item[field].length) fail(`item_${field}_invalid`);
    }
  }
}

export function createWorkbench({ workbenchId = "local-product-sandbox" } = {}) {
  if (typeof workbenchId !== "string" || !workbenchId.trim()) fail("workbench_id_invalid");
  return freeze({
    schemaVersion: SCHEMA, workbenchId, evidenceClass: "authored_implementation_sandbox",
    coverage: {
      itemCount: FIXTURE_ITEMS.length, observationalLedgerIsSeparate: true,
      implemented: ["stable_items", "four_views", "global_search", "proposal_and_adoption", "scope_preview", "batch_and_undo", "revision_receipts", "rollback"],
      unverified: ["browser_keyboard", "screen_reader", "mobile_usability", "human_efficiency", "144_item_observational_execution"],
    },
    stateVersion: 0, nextCandidateNumber: 1, currentRevisionId: "R0",
    config: clone(CONFIGS.baseline), items: clone(FIXTURE_ITEMS), candidate: null,
    candidateHistory: [], adoptionHistory: [], operations: [], receipts: [], disposition: null, events: [],
  });
}

export function guardFor(state) {
  return freeze({ expectedRevisionId: state.currentRevisionId, expectedStateVersion: state.stateVersion, expectedCandidateId: state.candidate?.revisionId ?? null });
}

/** @param {{ target?: string, view?: string, query?: string, collection?: string }} options */
export function queryItems(state, options = {}) {
  const { target = "current", view = "all", query = "", collection } = options;
  const { items } = snapshotFor(state, target);
  if (view === "Inbox") return items.filter((item) => item.pending);
  if (view === "Unsorted") return items.filter((item) => item.memberships.length === 0);
  if (view === "Collections") {
    if (typeof collection !== "string" || !collection.trim()) fail("collection_required");
    return items.filter((item) => item.memberships.includes(collection));
  }
  if (view === "Search") {
    const needle = String(query).toLocaleLowerCase().trim();
    return items.filter((item) => [item.title, item.url, item.note, ...item.tags].some((value) => value.toLocaleLowerCase().includes(needle)));
  }
  if (view !== "all") fail("view_invalid");
  return [...items];
}

export function resolveItem(state, itemId, { target = "current" } = {}) {
  const item = snapshotFor(state, target).items.find((entry) => entry.id === itemId);
  if (!item) fail("item_not_found");
  return item;
}

export function exportSnapshot(state, { target = "current" } = {}) {
  const snapshot = snapshotFor(state, target);
  return JSON.stringify({ schemaVersion: SCHEMA, revisionId: snapshot.revisionId, config: snapshot.config, items: snapshot.items });
}

export function importSnapshot(serialized) {
  let snapshot;
  try { snapshot = JSON.parse(serialized); } catch { fail("import_invalid_json"); }
  if (snapshot?.schemaVersion !== SCHEMA || typeof snapshot.revisionId !== "string"
    || !["baseline", "linked", "scoped"].includes(snapshot.config?.kind)
    || !same(snapshot.config, CONFIGS[snapshot.config?.kind])) fail("import_schema_invalid");
  validateItems(snapshot.items);
  return freeze(snapshot);
}

export function proposeRevision(state, options) {
  guarded(state, options);
  if (!["linked", "scoped"].includes(options.kind)) fail("proposal_kind_invalid");
  if (state.candidate && options.supersedesCandidateId !== state.candidate.revisionId) fail("explicit_candidate_supersession_required");
  const next = clone(state);
  if (next.candidate) next.candidateHistory.push({ ...next.candidate, outcome: "superseded" });
  const revisionId = `C${state.nextCandidateNumber}`;
  next.nextCandidateNumber += 1;
  next.candidate = {
    revisionId, kind: options.kind, config: clone(CONFIGS[options.kind]), items: clone(state.items),
    baseRevisionId: state.currentRevisionId, baseContentSignature: signature(currentSnapshot(state)),
    defectFixture: options.kind === "linked" ? "batch_related_rows_exceed_preview" : null,
  };
  next.disposition = null;
  return finish(state, next, "candidate_proposed", {
    candidateRevisionId: revisionId, kind: options.kind,
    supersedesCandidateId: state.candidate?.revisionId ?? null,
    proposalChangesCurrentProduct: false,
  });
}

function normalizeOperation(items, options) {
  if (!Array.isArray(options.itemIds) || options.itemIds.length === 0
    || options.itemIds.some((id) => typeof id !== "string")
    || new Set(options.itemIds).size !== options.itemIds.length) fail("explicit_item_scope_required");
  const known = new Set(items.map((item) => item.id));
  if (options.itemIds.some((id) => !known.has(id))) fail("scope_contains_unknown_item");
  const addCollection = options.addCollection ?? null;
  const removeCollection = options.removeCollection ?? null;
  for (const value of [addCollection, removeCollection]) {
    if (value !== null && (typeof value !== "string" || !value.trim())) fail("collection_invalid");
  }
  if (addCollection && removeCollection) fail("one_membership_operation_per_batch");
  if (options.clearPending !== undefined && typeof options.clearPending !== "boolean") fail("clear_pending_invalid");
  const clearPending = options.clearPending === true;
  if (!addCollection && !removeCollection && !clearPending) fail("batch_operation_missing");
  return { itemIds: [...options.itemIds], addCollection, removeCollection, clearPending };
}

function mutate(items, operation, effectiveIds) {
  const affected = new Set(effectiveIds);
  return items.map((item) => {
    if (!affected.has(item.id)) return clone(item);
    let memberships = [...item.memberships];
    if (operation.addCollection && !memberships.includes(operation.addCollection)) memberships.push(operation.addCollection);
    if (operation.removeCollection) memberships = memberships.filter((value) => value !== operation.removeCollection);
    return { ...clone(item), memberships, pending: operation.clearPending ? false : item.pending };
  });
}

function effectiveScope(snapshot, operation) {
  if (snapshot.config.batchScope !== "linked_rows_defect") return [...operation.itemIds];
  // The authored C1 defect is in scope resolution, not item identity or the
  // orthogonality of membership and pending. Both interfaces use this code.
  const selected = snapshot.items.filter((item) => operation.itemIds.includes(item.id));
  const linkedCollections = new Set(selected.flatMap((item) => item.memberships));
  return snapshot.items.filter((item) => operation.itemIds.includes(item.id)
    || item.memberships.some((value) => linkedCollections.has(value))).map((item) => item.id);
}

function makePreview(snapshot, operation, target) {
  const intended = mutate(snapshot.items, operation, operation.itemIds);
  return {
    schemaVersion: SCHEMA, target, revisionId: snapshot.revisionId,
    contentSignature: signature(snapshot), operation,
    selectedItemIds: [...operation.itemIds],
    changes: snapshot.items.filter((item, index) => !same(item, intended[index])).map((item) => ({
      itemId: item.id, before: clone(item), after: clone(intended.find((entry) => entry.id === item.id)),
    })),
  };
}

export function previewBatch(state, options) {
  guarded(state, options, options.target === "candidate");
  const snapshot = snapshotFor(state, options.target);
  return freeze(makePreview(snapshot, normalizeOperation(snapshot.items, options), options.target));
}

export function applyBatch(state, options) {
  guarded(state, options, options.target === "candidate");
  const snapshot = snapshotFor(state, options.target);
  const preview = options.preview;
  if (!preview || preview.target !== options.target || preview.revisionId !== snapshot.revisionId
    || preview.contentSignature !== signature(snapshot)) fail("stale_or_missing_scope_preview");
  const operation = normalizeOperation(snapshot.items, preview.operation);
  if (!same(preview, makePreview(snapshot, operation, options.target))) fail("scope_preview_changed");
  const effectiveItemIds = effectiveScope(snapshot, operation);
  const updated = mutate(snapshot.items, operation, effectiveItemIds);
  const next = clone(state);
  if (options.target === "candidate") next.candidate.items = updated;
  else next.items = updated;
  const operationId = `${state.workbenchId}:B${state.operations.length + 1}`;
  const record = {
    operationId, target: options.target, revisionId: snapshot.revisionId,
    beforeItems: clone(snapshot.items), afterContentSignature: signature({ ...snapshot, items: updated }),
    selectedItemIds: [...operation.itemIds], effectiveItemIds,
    actualChangedItemIds: snapshot.items.filter((item, index) => !same(item, updated[index])).map((item) => item.id),
    previewMatchesExecution: same(updated, mutate(snapshot.items, operation, operation.itemIds)), undone: false,
  };
  next.operations.push(record);
  next.disposition = null;
  return finish(state, next, "batch_applied", { ...record, beforeItems: undefined, afterContentSignature: undefined });
}

export function undoBatch(state, options) {
  guarded(state, options, options.target === "candidate");
  const snapshot = snapshotFor(state, options.target);
  const record = state.operations.find((item) => item.operationId === options.operationId);
  if (!record || record.undone || record.target !== options.target || record.revisionId !== snapshot.revisionId) fail("undo_operation_unavailable");
  if (record.afterContentSignature !== signature(snapshot)) fail("undo_requires_exact_post_operation_state");
  const next = clone(state);
  if (options.target === "candidate") next.candidate.items = clone(record.beforeItems);
  else next.items = clone(record.beforeItems);
  next.operations.find((item) => item.operationId === record.operationId).undone = true;
  next.disposition = null;
  return finish(state, next, "batch_undone", { operationId: record.operationId, restoredItemIds: record.actualChangedItemIds });
}

function runChecks(snapshot) {
  const checks = [];
  const check = (name, execute) => {
    try {
      if (!execute()) throw new Error("predicate_failed");
      checks.push({ name, passed: true });
    } catch (error) {
      checks.push({ name, passed: false, detail: error instanceof Error ? error.message : "check_failed" });
    }
  };
  const asState = { currentRevisionId: snapshot.revisionId, config: snapshot.config, items: snapshot.items };
  check("identity_and_payload", () => {
    validateItems(snapshot.items);
    const first = snapshot.items[0];
    const operation = normalizeOperation(snapshot.items, { itemIds: [first.id], addCollection: "Kernel probe" });
    const after = mutate(snapshot.items, operation, effectiveScope(snapshot, operation));
    const payload = (item) => {
      const fields = clone(item);
      delete fields.memberships;
      delete fields.pending;
      return fields;
    };
    return snapshot.items.every((item) => same(payload(item), payload(after.find((entry) => entry.id === item.id))));
  });
  check("membership_pending_orthogonality", () => {
    const operation = normalizeOperation(snapshot.items, { itemIds: [snapshot.items[0].id], addCollection: "Kernel orthogonality probe" });
    const after = mutate(snapshot.items, operation, effectiveScope(snapshot, operation));
    return snapshot.items.every((item, index) => item.pending === after[index].pending);
  });
  check("global_search_and_view_identity", () => {
    const first = snapshot.items[0];
    const byId = new Map(snapshot.items.map((item) => [item.id, item]));
    const queries = [first.title, first.url, first.note, ...first.tags].filter(Boolean);
    const found = queries.every((query) => queryItems(asState, { view: "Search", query }).some((item) => item === first));
    const views = [queryItems(asState, { view: "Inbox" }), queryItems(asState, { view: "Unsorted" }),
      ...[...new Set(snapshot.items.flatMap((item) => item.memberships))].map((collection) => queryItems(asState, { view: "Collections", collection }))];
    return found && views.flat().every((item) => byId.get(item.id) === item);
  });
  check("export_import_round_trip", () => {
    const imported = importSnapshot(exportSnapshot(asState));
    return same(imported.items, snapshot.items) && same(imported.config, snapshot.config);
  });
  // A fixed property probe makes scope coverage independent of whether a prior
  // participant action already cleared pending on the actual candidate items.
  const probe = clone(snapshot);
  probe.items = probe.items.map((item, index) => ({ ...item, pending: true,
    memberships: index < 2 ? [...new Set([...item.memberships, "Shared scope probe"])] : item.memberships }));
  const operation = normalizeOperation(probe.items, { itemIds: [probe.items[0].id], clearPending: true });
  const actual = mutate(probe.items, operation, effectiveScope(probe, operation));
  const preview = makePreview(probe, operation, "candidate");
  check("scope_changes_only_selected_items", () => probe.items.slice(1).every((item) => same(item, actual.find((entry) => entry.id === item.id))));
  check("preview_matches_execution", () => same(actual, mutate(probe.items, operation, preview.selectedItemIds)));
  check("batch_inverse_restores_exact_items", () => {
    const sandbox = freeze({ ...createWorkbench({ workbenchId: "verification-probe" }),
      currentRevisionId: probe.revisionId, config: clone(probe.config), items: clone(probe.items) });
    const before = exportSnapshot(sandbox);
    const preview = previewBatch(sandbox, { ...guardFor(sandbox), target: "current", ...operation });
    const applied = applyBatch(sandbox, { ...guardFor(sandbox), target: "current", preview });
    const undone = undoBatch(applied.state, { ...guardFor(applied.state), target: "current", operationId: applied.event.operationId });
    return before === exportSnapshot(undone.state);
  });
  return { passed: checks.every((entry) => entry.passed), checks };
}

function receiptFor(state, snapshot, purpose, result, additional = {}) {
  return {
    receiptId: `${state.workbenchId}:V${state.receipts.length + 1}`, purpose,
    evidenceClass: "executed_engineering_checks", scope: RECEIPT_SCOPE,
    revisionId: snapshot.revisionId, contentSignature: signature(snapshot),
    limitations: [...state.coverage.unverified], ...result, ...additional,
  };
}

export function verifyCandidate(state, options) {
  guarded(state, options, true);
  if (state.candidate.baseContentSignature !== signature(currentSnapshot(state))) fail("candidate_base_is_stale");
  const receipt = receiptFor(state, state.candidate, "candidate", runChecks(state.candidate), {
    baseRevisionId: state.currentRevisionId, baseContentSignature: signature(currentSnapshot(state)),
  });
  const next = clone(state);
  next.receipts.push(receipt);
  return finish(state, next, "candidate_verified", { receiptId: receipt.receiptId, candidateRevisionId: state.candidate.revisionId, passed: receipt.passed, checks: receipt.checks });
}

export function adoptCandidate(state, options) {
  guarded(state, options, true);
  const receipt = state.receipts.find((item) => item.receiptId === options.receiptId && item.purpose === "candidate");
  if (!receipt || !receipt.passed) fail("passing_candidate_receipt_required");
  if (receipt.revisionId !== state.candidate.revisionId || receipt.contentSignature !== signature(state.candidate)
    || receipt.baseContentSignature !== signature(currentSnapshot(state))) fail("candidate_receipt_is_stale");
  const next = clone(state);
  const before = clone(currentSnapshot(state));
  next.currentRevisionId = state.candidate.revisionId;
  next.config = clone(state.candidate.config);
  next.items = clone(state.candidate.items);
  next.candidateHistory.push({ ...next.candidate, outcome: "adopted", receiptId: receipt.receiptId });
  next.candidate = null;
  next.adoptionHistory.push({ revisionId: next.currentRevisionId, before, afterContentSignature: signature(currentSnapshot(next)), receiptId: receipt.receiptId, rolledBack: false });
  next.disposition = null;
  return finish(state, next, "candidate_adopted", { revisionId: next.currentRevisionId, receiptId: receipt.receiptId });
}

export function discardCandidate(state, options) {
  guarded(state, options, true);
  const next = clone(state);
  next.candidateHistory.push({ ...next.candidate, outcome: "discarded" });
  next.candidate = null;
  return finish(state, next, "candidate_discarded", { candidateRevisionId: state.candidate.revisionId, currentProductChanged: false });
}

export function rollbackRevision(state, options) {
  guarded(state, options);
  if (state.candidate) fail("resolve_unadopted_candidate_before_rollback");
  const adoption = [...state.adoptionHistory].reverse().find((item) => item.revisionId === state.currentRevisionId && !item.rolledBack);
  if (!adoption) fail("adopted_revision_required_for_rollback");
  if (adoption.afterContentSignature !== signature(currentSnapshot(state))) fail("rollback_requires_exact_adopted_state");
  const result = runChecks(adoption.before);
  if (!result.passed) fail("restored_revision_failed_checks");
  const receipt = receiptFor(state, adoption.before, "rollback_restoration", result, { fromRevisionId: state.currentRevisionId });
  const next = clone(state);
  next.currentRevisionId = adoption.before.revisionId;
  next.config = clone(adoption.before.config);
  next.items = clone(adoption.before.items);
  next.adoptionHistory.find((item) => item.revisionId === adoption.revisionId && !item.rolledBack).rolledBack = true;
  next.receipts.push(receipt);
  next.disposition = null;
  return finish(state, next, "revision_rolled_back", { restoredRevisionId: next.currentRevisionId, receiptId: receipt.receiptId, restorationVerified: true });
}

export function recordDisposition(state, options) {
  guarded(state, options);
  if (!["retain", "defer"].includes(options.kind)) fail("disposition_kind_invalid");
  if (typeof options.reason !== "string" || !options.reason.trim()) fail("participant_reason_required");
  if (options.kind === "defer" && (typeof options.reopenCondition !== "string" || !options.reopenCondition.trim())) fail("reopen_condition_required");
  const snapshot = currentSnapshot(state);
  const result = runChecks(snapshot);
  if (!result.passed) fail("current_revision_failed_checks");
  const receipt = receiptFor(state, snapshot, "disposition_current_state", result);
  const next = clone(state);
  next.receipts.push(receipt);
  next.disposition = { kind: options.kind, reason: options.reason.trim(), reopenCondition: options.kind === "defer" ? options.reopenCondition.trim() : null,
    currentRevisionId: state.currentRevisionId, pendingCandidateId: state.candidate?.revisionId ?? null,
    receiptId: receipt.receiptId, status: "recorded_in_sandbox" };
  return finish(state, next, "disposition_recorded", { ...next.disposition });
}
