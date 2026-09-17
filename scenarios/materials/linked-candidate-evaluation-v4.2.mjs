/**
 * Organizer-side authoring corpus. All usage records are newly constructed
 * fictional stimuli, not recovered trial logs, human data, or executed checks.
 * Import the publication function at a trusted organizer boundary; never send
 * this complete two-window corpus to the participant client before a request.
 */

const CLASS = "author_constructed_simulated_scenario";
const VERSION = "linked-candidate-evaluation-v4.2";
const SOURCE = "AUTHORING:linked-evaluation-v4.2-constructed-allocation-v1";
const clone = (value) => JSON.parse(JSON.stringify(value));
const pad = (value) => String(value).padStart(3, "0");
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const same = (left, right) => canonical(left) === canonical(right);
const sorted = (values) => [...values].sort();
const sameSet = (left, right) => same(sorted(left), sorted(right));
const CONFIGS = {
  R0: { kind: "baseline", batchScope: "selected_items", scopePreview: "selected_items" },
  C1: { kind: "linked", batchScope: "linked_rows_defect", scopePreview: "selected_items" },
  C2: { kind: "scoped", batchScope: "selected_items", scopePreview: "explicit_per_item" },
};
const FIXTURE = [
  { id: "R0-042", url: "https://example.test/offline", title: "Offline-first sync notes", note: "Shared local state", tags: ["sync", "offline"], memberships: ["Project Atlas"], pending: true },
  { id: "R0-043", url: "https://example.test/cache", title: "Cache invalidation patterns", note: "Read before the next design review", tags: ["cache"], memberships: ["Project Atlas", "Weekend Reading"], pending: true },
  { id: "R0-044", url: "https://example.test/focus", title: "Keyboard focus checklist", note: "Keep focus after actions", tags: ["accessibility"], memberships: [], pending: true },
  { id: "R0-045", url: "https://example.test/import", title: "Import provenance notes", note: "Keep source metadata", tags: ["migration"], memberships: ["Archive"], pending: false },
  { id: "R0-046", url: "https://example.test/garden", title: "Garden reading", note: "A finished ungrouped item", tags: ["leisure"], memberships: [], pending: false },
  { id: "R0-047", url: "https://example.test/query", title: "Query semantics", note: "Search across all saved items", tags: ["retrieval"], memberships: ["Weekend Reading"], pending: true },
];
const WINDOWS = [
  { windowId: "SIM-MATCHED-W1", protocolId: "PROTOCOL:LINKED-EVAL-W1-v4.2", candidate: "C1" },
  { windowId: "SIM-MATCHED-W2", protocolId: "PROTOCOL:LINKED-EVAL-W2-v4.2", candidate: "C2" },
];
const EVALUATION_SCOPE = ["url_only_save", "matched_retrieval", "batch_scope_and_inverse"];
const protocolFor = (window) => ({ protocolId: window.protocolId, windowId: window.windowId, scope: [...EVALUATION_SCOPE], fixtureManifestId: "SIX-ITEM-READING-LIST-v4.2", profileCount: 12, itemsPerReplica: 6, retrievalTasksPerArm: 48, batchTasksPerArm: 40, resetPolicy: "independent_task_replica_from_exact_initial_fixture", routePolicy: "authored_presentation_events_not_executed_ui", missingRecords: 0, pairedReference: "fresh_R0_records_in_this_window" });
const profileRef = (index) => `SCENARIO-PROFILE:${pad(index)}`;
const subjectFor = (revisionId) => ({ revisionId, config: clone(CONFIGS[revisionId]), items: clone(FIXTURE) });
const payload = (item) => ({ id: item.id, url: item.url, title: item.title, note: item.note, tags: item.tags });
const failed = (code) => { throw new Error(`linked_evaluation:${code}`); };

function scopeFor(items, config, selectedIds) {
  if (config.batchScope !== "linked_rows_defect") return [...selectedIds];
  // Exactly one hop from the originally selected rows, matching the kernel.
  const linked = new Set(items.filter((item) => selectedIds.includes(item.id)).flatMap((item) => item.memberships));
  return items.filter((item) => selectedIds.includes(item.id) || item.memberships.some((value) => linked.has(value))).map((item) => item.id);
}
function apply(items, operation, effectiveIds) {
  return items.map((original) => {
    const item = clone(original);
    if (!effectiveIds.includes(item.id)) return item;
    if (operation.addCollection && !item.memberships.includes(operation.addCollection)) item.memberships.push(operation.addCollection);
    if (operation.removeCollection) item.memberships = item.memberships.filter((value) => value !== operation.removeCollection);
    if (operation.clearPending) item.pending = false;
    return item;
  });
}
function changedIds(before, after) {
  return before.filter((item) => !same(item, after.find((entry) => entry.id === item.id))).map((item) => item.id);
}
function recordBase(window, armId, profileId, recordId, pairId, replicaId) {
  return { recordId, pairId, profileId, replicaId, windowId: window.windowId, protocolId: window.protocolId, revisionId: armId, evidenceClass: CLASS, sourceRef: SOURCE };
}

function makeReplica(window, armId, index) {
  const profileId = profileRef(index);
  const replicaId = `${window.windowId}:${armId}:REPLICA-${pad(index)}`;
  const events = [];
  const base = { profileId, replicaId, revisionId: armId, windowId: window.windowId, protocolId: window.protocolId, evidenceClass: CLASS, sourceRef: SOURCE };
  let ordinal = 0;
  for (const item of FIXTURE) {
    const saved = { ...clone(item), note: "", tags: [], memberships: [], pending: true };
    events.push({ ...base, eventId: `${replicaId}:SETUP-${++ordinal}`, type: "save_url_only", atScenarioMs: ordinal * 1000, itemId: item.id, input: { url: item.url }, beforeItem: null, afterItem: clone(saved) });
    const annotated = { ...clone(saved), note: item.note, tags: clone(item.tags) };
    events.push({ ...base, eventId: `${replicaId}:SETUP-${++ordinal}`, type: "annotate_saved_item", atScenarioMs: ordinal * 1000, itemId: item.id, beforeItem: clone(saved), afterItem: clone(annotated) });
    let current = annotated;
    for (const collection of item.memberships) {
      const after = { ...clone(current), memberships: [...current.memberships, collection] };
      events.push({ ...base, eventId: `${replicaId}:SETUP-${++ordinal}`, type: "add_membership", atScenarioMs: ordinal * 1000, itemId: item.id, collection, beforeItem: clone(current), afterItem: clone(after) });
      current = after;
    }
    if (!item.pending) events.push({ ...base, eventId: `${replicaId}:SETUP-${++ordinal}`, type: "clear_pending", atScenarioMs: ordinal * 1000, itemId: item.id, beforeItem: clone(current), afterItem: { ...clone(current), pending: false } });
  }
  return { ...base, initializedItems: clone(FIXTURE), setupEvents: events };
}

function makeRoute(window, armId, ordinal) {
  const profileIndex = Math.floor((ordinal - 1) / 4) + 1;
  const target = FIXTURE[[0, 2, 3, 5][(ordinal - 1) % 4]];
  const replicaId = `${window.windowId}:${armId}:REPLICA-${pad(profileIndex)}`;
  const recordId = `${window.windowId}:${armId}:ROUTE-${pad(ordinal)}`;
  const base = recordBase(window, armId, profileRef(profileIndex), recordId, `ROUTE-PAIR-${pad(ordinal)}`, replicaId);
  const route = [];
  const add = (type, fields) => route.push({ ...base, eventId: `${recordId}:E${route.length + 1}`, type, elapsedScenarioMs: route.length * 4000, ...fields });
  const search = () => add("search", { surface: "Search", query: target.title });
  const directSurface = target.pending ? "Inbox" : target.memberships.length ? "Collections" : "Unsorted";
  if (ordinal <= (armId === "R0" ? 20 : 7)) {
    add("open_surface", { surface: "Inbox" });
    add("open_surface", { surface: "Unsorted" });
    search();
  } else if (ordinal >= 37) {
    // Direct Search tasks include a concrete boundary: three authored candidate
    // traces visit the linked presentation first; R0 does not impose that step.
    if (armId !== "R0" && ordinal >= 46) add("open_surface", { surface: "Linked" });
    search();
  } else if (armId !== "R0") add("open_surface", { surface: "Linked" });
  else add("open_surface", { surface: directSurface, ...(directSurface === "Collections" ? { collection: target.memberships[0] } : {}) });
  const terminalSurface = route.at(-1).surface;
  add("open_item", { itemId: target.id, surface: terminalSurface });
  return { ...base, taskKind: ordinal >= 37 ? "known_title_search" : "state_context_retrieval", resetFromReplicaId: replicaId, targetItemId: target.id, beforeItems: clone(FIXTURE), afterItems: clone(FIXTURE), events: route, terminal: { kind: "target_opened", itemId: target.id }, motivationRecord: null };
}

function operationFor(ordinal) {
  if (ordinal === 4) return { itemIds: ["R0-042"], addCollection: "Evaluation topic", removeCollection: null, clearPending: false };
  if (ordinal === 19) return { itemIds: ["R0-047"], addCollection: null, removeCollection: "Weekend Reading", clearPending: false };
  if (ordinal === 33) return { itemIds: ["R0-043"], addCollection: null, removeCollection: null, clearPending: true };
  const scopes = [["R0-044"], ["R0-045"], ["R0-044", "R0-046"], ["R0-042", "R0-043", "R0-047"], ["R0-042", "R0-043", "R0-044", "R0-047"]];
  return { itemIds: scopes[(ordinal - 1) % scopes.length], addCollection: `Review group ${pad(ordinal)}`, removeCollection: null, clearPending: false };
}

function makeBatch(window, armId, ordinal) {
  const profileIndex = ((ordinal - 1) % 12) + 1;
  const replicaId = `${window.windowId}:${armId}:REPLICA-${pad(profileIndex)}`;
  const recordId = `${window.windowId}:${armId}:BATCH-${pad(ordinal)}`;
  const base = recordBase(window, armId, profileRef(profileIndex), recordId, `BATCH-PAIR-${pad(ordinal)}`, `${replicaId}:CASE-${pad(ordinal)}`);
  const operation = operationFor(ordinal);
  const previewAfterItems = apply(FIXTURE, operation, operation.itemIds);
  const effectiveItemIds = scopeFor(FIXTURE, CONFIGS[armId], operation.itemIds);
  const afterCommitItems = apply(FIXTURE, operation, effectiveItemIds);
  const mismatch = !same(previewAfterItems, afterCommitItems);
  const operationId = `${recordId}:OP1`;
  const events = [];
  const add = (type, fields = {}) => events.push({ ...base, eventId: `${recordId}:E${events.length + 1}`, type, elapsedScenarioMs: events.length * 3000, ...fields });
  operation.itemIds.forEach((itemId) => add("select_item", { itemId }));
  add("preview_batch", { operation: clone(operation), selectedItemIds: [...operation.itemIds], previewedItemIds: changedIds(FIXTURE, previewAfterItems), beforeItems: clone(FIXTURE), afterItems: clone(previewAfterItems) });
  // Optional recorded inspection is fictional usage, not a mandatory extra UI
  // operation and not a prediction of participants' time in the study.
  if (armId === "C2" && ordinal % 3 !== 0) operation.itemIds.forEach((itemId) => add("inspect_preview_row", { itemId }));
  add("apply_batch", { operationId, operation: clone(operation), beforeItems: clone(FIXTURE), afterItems: clone(afterCommitItems), selectedItemIds: [...operation.itemIds], effectiveItemIds: [...effectiveItemIds], actualChangedItemIds: changedIds(FIXTURE, afterCommitItems), previewMatchesExecution: !mismatch });
  if (mismatch) {
    add("inspect_applied_scope", { operationId, observedChangedItemIds: changedIds(FIXTURE, afterCommitItems) });
    add("undo_batch", { operationId, beforeItems: clone(afterCommitItems), afterItems: clone(FIXTURE), restoredItemIds: changedIds(FIXTURE, afterCommitItems) });
  }
  return {
    ...base, resetFromReplicaId: replicaId, operation, intentSource: { kind: "authored_task_instruction", requestedItemIds: [...operation.itemIds], sourceRef: `${SOURCE}:BATCH-INSTRUCTION-${pad(ordinal)}` },
    beforeItems: clone(FIXTURE), previewAfterItems, afterCommitItems,
    afterItems: mismatch ? clone(FIXTURE) : clone(afterCommitItems), events,
    terminal: { kind: mismatch ? "undone_due_to_scope" : "kept", operationId },
  };
}

export function createLinkedCandidateEvaluationCorpus() {
  return {
    metadata: {
      corpusId: VERSION, schemaVersion: 1, evidenceClass: CLASS,
      provenanceStatement: "v4.2 为产品决策新构造的配对模拟使用记录；不是恢复的历史 raw data，也不是 A/B 参与者效率数据。",
      authoringMethod: "explicit_case_manifest_v1", notParticipantData: true, humanEfficiencyEvidence: false, engineeringExecutionEvidence: false, formalStudyReady: false,
      timeBasis: "fictional_scenario_elapsed_milliseconds",
      restrictions: ["organizer_only_until_requested", "actual_kernel_receipts_are_separate", "no_browser_accessibility_evidence", "route_counts_are_authored_stimuli_not_effect_estimates", "scope_failure_cannot_authorize_adoption"],
    },
    profiles: Array.from({ length: 12 }, (_, index) => ({ profileId: profileRef(index + 1), evidenceClass: CLASS })),
    evaluations: WINDOWS.map((window) => ({
      ...window,
      evidenceClass: CLASS,
      packetId: `PACKET:LINKED-EVAL:${window.candidate}:${window.windowId}`,
      protocol: protocolFor(window),
      arms: ["R0", window.candidate].map((armId) => ({
        armId, evidenceClass: CLASS, subject: subjectFor(armId),
        replicas: Array.from({ length: 12 }, (_, index) => makeReplica(window, armId, index + 1)),
        routeTasks: Array.from({ length: 48 }, (_, index) => makeRoute(window, armId, index + 1)),
        batchCases: Array.from({ length: 40 }, (_, index) => makeBatch(window, armId, index + 1)),
      })),
    })),
  };
}

function inspect(corpus) {
  const errors = [];
  const issue = (code, ref) => errors.push({ code, ref });
  const signatures = new Set();
  const uniqueId = (id) => { if (typeof id !== "string" || signatures.has(id)) issue("record_id_invalid_or_reused", id); signatures.add(id); };
  if (corpus?.metadata?.corpusId !== VERSION || corpus.metadata.evidenceClass !== CLASS || corpus.metadata.notParticipantData !== true || corpus.metadata.humanEfficiencyEvidence !== false || corpus.metadata.engineeringExecutionEvidence !== false || corpus.metadata.formalStudyReady !== false || corpus.metadata.timeBasis !== "fictional_scenario_elapsed_milliseconds") issue("evidence_boundary_invalid", "metadata");
  if (!Array.isArray(corpus.profiles) || !Array.isArray(corpus.evaluations)) return { errors: [...errors, { code: "corpus_shape_invalid", ref: "corpus" }], summaries: [] };
  const profileIds = corpus.profiles.map((entry) => entry.profileId);
  if (!sameSet(profileIds, Array.from({ length: 12 }, (_, index) => profileRef(index + 1))) || corpus.profiles.some((entry) => entry.evidenceClass !== CLASS)) issue("profile_manifest_invalid", "profiles");
  if (corpus.evaluations.length !== WINDOWS.length) issue("window_manifest_invalid", "evaluations");
  const summaries = [];
  for (const evaluation of corpus.evaluations) {
    const spec = WINDOWS.find((entry) => entry.windowId === evaluation.windowId);
    if (!spec || evaluation.protocolId !== spec.protocolId || evaluation.candidate !== spec.candidate || evaluation.packetId !== `PACKET:LINKED-EVAL:${spec.candidate}:${spec.windowId}`) { issue("evaluation_binding_invalid", evaluation.windowId); continue; }
    if (evaluation.evidenceClass !== CLASS || !same(evaluation.protocol, protocolFor(spec))) issue("protocol_invalid", evaluation.windowId);
    if (!Array.isArray(evaluation.arms) || !sameSet(evaluation.arms.map((arm) => arm.armId), ["R0", spec.candidate])) { issue("arm_manifest_invalid", evaluation.windowId); continue; }
    const armSummaries = [];
    const recordBindings = (entry, armId, ref) => {
      if (entry.evidenceClass !== CLASS || entry.sourceRef !== SOURCE || entry.windowId !== spec.windowId || entry.protocolId !== spec.protocolId || entry.revisionId !== armId || !profileIds.includes(entry.profileId)) issue("record_binding_invalid", ref);
    };
    for (const arm of evaluation.arms) {
      if (!same(arm.subject, subjectFor(arm.armId)) || arm.evidenceClass !== CLASS) issue("exact_subject_mismatch", `${spec.windowId}:${arm.armId}`);
      if (!Array.isArray(arm.replicas) || !Array.isArray(arm.routeTasks) || !Array.isArray(arm.batchCases)) { issue("arm_shape_invalid", arm.armId); continue; }
      if (arm.replicas.length !== 12 || arm.routeTasks.length !== 48 || arm.batchCases.length !== 40) issue("arm_task_counts_invalid", `${spec.windowId}:${arm.armId}`);
      if (!sameSet(arm.routeTasks.map((record) => record.pairId), Array.from({ length: 48 }, (_, index) => `ROUTE-PAIR-${pad(index + 1)}`)) || !sameSet(arm.batchCases.map((record) => record.pairId), Array.from({ length: 40 }, (_, index) => `BATCH-PAIR-${pad(index + 1)}`))) issue("paired_manifest_ids_invalid", `${spec.windowId}:${arm.armId}`);
      const replicas = new Map();
      let saveCount = 0;
      for (const replica of arm.replicas) {
        uniqueId(replica.replicaId);
        recordBindings(replica, arm.armId, replica.replicaId);
        if (replicas.has(replica.replicaId)) issue("replica_duplicate", replica.replicaId);
        replicas.set(replica.replicaId, replica);
        const items = new Map();
        let previousTime = -1;
        for (const event of replica.setupEvents) {
          uniqueId(event.eventId); recordBindings(event, arm.armId, event.eventId);
          if (event.profileId !== replica.profileId || event.replicaId !== replica.replicaId || !Number.isFinite(event.atScenarioMs) || event.atScenarioMs <= previousTime) issue("setup_scope_or_time_invalid", event.eventId);
          previousTime = event.atScenarioMs;
          const current = items.get(event.itemId);
          const reference = FIXTURE.find((item) => item.id === event.itemId);
          if (!reference) { issue("setup_item_unknown", event.eventId); continue; }
          let expected;
          if (event.type === "save_url_only") {
            if (current || event.beforeItem !== null || !same(event.input, { url: reference.url })) issue("url_only_save_invalid", event.eventId);
            expected = { ...clone(reference), note: "", tags: [], memberships: [], pending: true };
            saveCount += 1;
          } else {
            if (!current || !same(event.beforeItem, current)) { issue("setup_before_state_mismatch", event.eventId); continue; }
            expected = clone(current);
            if (event.type === "annotate_saved_item") { expected.note = reference.note; expected.tags = clone(reference.tags); }
            else if (event.type === "add_membership" && !current.memberships.includes(event.collection)) expected.memberships.push(event.collection);
            else if (event.type === "clear_pending" && current.pending) expected.pending = false;
            else issue("setup_operation_invalid", event.eventId);
          }
          if (!same(event.afterItem, expected)) issue("setup_after_state_mismatch", event.eventId);
          items.set(event.itemId, expected);
        }
        if (!same([...items.values()], FIXTURE) || !same(replica.initializedItems, FIXTURE)) issue("replica_setup_replay_mismatch", replica.replicaId);
      }
      const routeStats = { tasks: 0, successful: 0, dualEntry: 0, actionCount: 0, knownSearchTasks: 0, knownSearchWithExtraPresentation: 0, perProfile: {}, taskIds: [], dualEntryTaskIds: [] };
      for (const record of arm.routeTasks) {
        uniqueId(record.recordId); recordBindings(record, arm.armId, record.recordId);
        const replica = replicas.get(record.resetFromReplicaId);
        if (!replica || record.replicaId !== replica.replicaId || record.profileId !== replica.profileId || !same(record.beforeItems, replica.initializedItems) || !same(record.afterItems, record.beforeItems)) issue("route_replica_or_state_mismatch", record.recordId);
        const target = record.beforeItems.find((item) => item.id === record.targetItemId);
        if (!target) { issue("route_target_unknown", record.recordId); continue; }
        let surface = null;
        let collection = null;
        let searchQuery = null;
        const visited = new Set();
        let previousTime = -1;
        for (const event of record.events) {
          uniqueId(event.eventId); recordBindings(event, arm.armId, event.eventId);
          if (event.recordId !== record.recordId || event.profileId !== record.profileId || event.replicaId !== record.replicaId || !Number.isFinite(event.elapsedScenarioMs) || event.elapsedScenarioMs <= previousTime) issue("route_event_scope_or_time_invalid", event.eventId);
          previousTime = event.elapsedScenarioMs;
          if (event.type === "open_surface") {
            if (!["Inbox", "Unsorted", "Collections", "Linked"].includes(event.surface) || (event.surface === "Linked" && arm.armId === "R0")) issue("route_surface_invalid", event.eventId);
            surface = event.surface; collection = event.collection; visited.add(surface);
          } else if (event.type === "search") { surface = "Search"; searchQuery = event.query; visited.add(surface); }
          else if (event.type === "open_item") {
            if (event.itemId !== target.id || event.surface !== surface || (surface === "Inbox" && !target.pending) || (surface === "Unsorted" && target.memberships.length > 0) || (surface === "Collections" && !target.memberships.includes(collection)) || (surface === "Search" && ![target.title, target.url, target.note, ...target.tags].some((text) => String(text).toLowerCase().includes(String(searchQuery).toLowerCase())))) issue("route_open_invalid", event.eventId);
          } else issue("route_event_unknown", event.eventId);
        }
        if (record.events.at(-1)?.type !== "open_item" || record.terminal?.kind !== "target_opened" || record.terminal.itemId !== target.id || record.motivationRecord !== null) issue("route_terminal_invalid", record.recordId);
        routeStats.tasks += 1;
        if (record.events.at(-1)?.itemId === target.id) routeStats.successful += 1;
        routeStats.actionCount += record.events.length;
        routeStats.taskIds.push(record.recordId);
        routeStats.perProfile[record.profileId] = (routeStats.perProfile[record.profileId] ?? 0) + 1;
        if (visited.has("Inbox") && visited.has("Unsorted")) { routeStats.dualEntry += 1; routeStats.dualEntryTaskIds.push(record.recordId); }
        if (record.taskKind === "known_title_search") {
          routeStats.knownSearchTasks += 1;
          if (visited.has("Linked")) routeStats.knownSearchWithExtraPresentation += 1;
        }
      }
      const batchStats = { tasks: 0, initialScopeMatches: 0, scopeMismatches: 0, exactUndos: 0, kept: 0, actionCount: 0, previewRowInspections: 0, payloadPreserved: 0, membershipPendingOrthogonal: 0, taskIds: [], mismatchTaskIds: [], ordinaryTaskIds: [] };
      for (const record of arm.batchCases) {
        uniqueId(record.recordId); recordBindings(record, arm.armId, record.recordId);
        const replica = replicas.get(record.resetFromReplicaId);
        if (!replica || replica.profileId !== record.profileId || !record.replicaId.startsWith(`${replica.replicaId}:CASE-`) || !same(record.beforeItems, replica.initializedItems)) issue("batch_replica_mismatch", record.recordId);
        const op = record.operation;
        const ordinal = Number(record.pairId.replace("BATCH-PAIR-", ""));
        if (!same(op, operationFor(ordinal)) || record.intentSource?.kind !== "authored_task_instruction" || record.intentSource.sourceRef !== `${SOURCE}:BATCH-INSTRUCTION-${pad(ordinal)}` || !same(record.intentSource.requestedItemIds, op.itemIds)) issue("batch_operation_or_intent_mismatch", record.recordId);
        const effective = scopeFor(record.beforeItems, arm.subject.config, op.itemIds);
        const preview = apply(record.beforeItems, op, op.itemIds);
        const committed = apply(record.beforeItems, op, effective);
        const mismatch = !same(preview, committed);
        if (!same(record.previewAfterItems, preview) || !same(record.afterCommitItems, committed)) issue("batch_derived_state_mismatch", record.recordId);
        let selected = [];
        let previewed = false;
        let applied = false;
        let undone = false;
        let current = clone(record.beforeItems);
        let operationId = null;
        let previousTime = -1;
        for (const event of record.events) {
          uniqueId(event.eventId); recordBindings(event, arm.armId, event.eventId);
          if (event.recordId !== record.recordId || event.profileId !== record.profileId || event.replicaId !== record.replicaId || !Number.isFinite(event.elapsedScenarioMs) || event.elapsedScenarioMs <= previousTime) issue("batch_event_scope_or_time_invalid", event.eventId);
          previousTime = event.elapsedScenarioMs;
          if (event.type === "select_item") {
            if (previewed || selected.includes(event.itemId) || !op.itemIds.includes(event.itemId)) issue("batch_selection_invalid", event.eventId);
            selected.push(event.itemId);
          } else if (event.type === "preview_batch") {
            if (previewed || !same(selected, op.itemIds) || !same(event.operation, op) || !same(event.selectedItemIds, op.itemIds) || !same(event.previewedItemIds, changedIds(record.beforeItems, preview)) || !same(event.beforeItems, current) || !same(event.afterItems, preview)) issue("batch_preview_invalid", event.eventId);
            previewed = true;
          } else if (event.type === "inspect_preview_row") {
            if (!previewed || applied || arm.subject.config.scopePreview !== "explicit_per_item" || !selected.includes(event.itemId)) issue("preview_inspection_invalid", event.eventId);
            batchStats.previewRowInspections += 1;
          } else if (event.type === "apply_batch") {
            if (!previewed || applied || !same(event.operation, op) || !same(event.beforeItems, current) || !same(event.afterItems, committed) || !same(event.selectedItemIds, selected) || !same(event.effectiveItemIds, effective) || !same(event.actualChangedItemIds, changedIds(record.beforeItems, committed)) || event.previewMatchesExecution !== !mismatch) issue("batch_apply_invalid", event.eventId);
            operationId = event.operationId; current = clone(committed); applied = true;
          } else if (event.type === "inspect_applied_scope") {
            if (!applied || undone || event.operationId !== operationId || !same(event.observedChangedItemIds, changedIds(record.beforeItems, committed))) issue("applied_scope_inspection_invalid", event.eventId);
          } else if (event.type === "undo_batch") {
            if (!applied || undone || event.operationId !== operationId || !same(event.beforeItems, current) || !same(event.afterItems, record.beforeItems) || !same(event.restoredItemIds, changedIds(record.beforeItems, committed))) issue("batch_undo_invalid", event.eventId);
            current = clone(record.beforeItems); undone = true;
          } else issue("batch_event_unknown", event.eventId);
        }
        if (!applied || !same(record.afterItems, current) || record.terminal?.operationId !== operationId || record.terminal?.kind !== (undone ? "undone_due_to_scope" : "kept") || (mismatch !== undone)) issue("batch_terminal_invalid", record.recordId);
        batchStats.tasks += 1; batchStats.actionCount += record.events.length; batchStats.taskIds.push(record.recordId);
        if (mismatch) { batchStats.scopeMismatches += 1; batchStats.mismatchTaskIds.push(record.recordId); } else { batchStats.initialScopeMatches += 1; batchStats.ordinaryTaskIds.push(record.recordId); }
        if (undone && same(current, record.beforeItems)) batchStats.exactUndos += 1;
        if (!undone) batchStats.kept += 1;
        if (record.beforeItems.every((item) => same(payload(item), payload(committed.find((entry) => entry.id === item.id))))) batchStats.payloadPreserved += 1;
        if (record.beforeItems.every((item) => {
          const after = committed.find((entry) => entry.id === item.id);
          return (op.clearPending || item.pending === after.pending) && ((op.addCollection || op.removeCollection) || same(item.memberships, after.memberships));
        })) batchStats.membershipPendingOrthogonal += 1;
      }
      if (saveCount !== 72 || routeStats.tasks !== 48 || routeStats.successful !== 48 || routeStats.dualEntry !== (arm.armId === "R0" ? 20 : 7) || routeStats.knownSearchTasks !== 12 || routeStats.knownSearchWithExtraPresentation !== (arm.armId === "R0" ? 0 : 3) || Object.values(routeStats.perProfile).some((value) => value !== 4) || Object.keys(routeStats.perProfile).length !== 12 || batchStats.tasks !== 40 || batchStats.scopeMismatches !== (arm.armId === "C1" ? 3 : 0) || batchStats.payloadPreserved !== 40 || batchStats.membershipPendingOrthogonal !== 40) issue("authored_allocation_mismatch", `${spec.windowId}:${arm.armId}`);
      armSummaries.push({ armId: arm.armId, savedItems: saveCount, route: routeStats, batch: batchStats });
    }
    const [baseline, candidate] = evaluation.arms;
    for (const field of ["routeTasks", "batchCases"]) {
      if (!same(baseline[field].map((record) => [record.pairId, record.profileId, record.targetItemId ?? record.operation, record.beforeItems]), candidate[field].map((record) => [record.pairId, record.profileId, record.targetItemId ?? record.operation, record.beforeItems]))) issue("matched_task_manifest_mismatch", `${spec.windowId}:${field}`);
    }
    summaries.push({ windowId: spec.windowId, protocolId: spec.protocolId, candidate: spec.candidate, evidenceClass: CLASS, arms: armSummaries });
  }
  return { errors, summaries };
}

export function validateLinkedCandidateEvaluationCorpus(corpus) {
  try { const { errors, summaries } = inspect(corpus); return { valid: errors.length === 0, errors, summaries }; }
  catch (error) { return { valid: false, errors: [{ code: "malformed_record", ref: error instanceof Error ? error.message : String(error) }], summaries: [] }; }
}

export function summarizeLinkedCandidateEvaluationCorpus(corpus) {
  const result = validateLinkedCandidateEvaluationCorpus(corpus);
  if (!result.valid) failed(result.errors.map((entry) => entry.code).join(","));
  return { evidenceClass: CLASS, notParticipantData: true, humanEfficiencyEvidence: false, evaluations: result.summaries };
}

/**
 * Call only for an actual explicit evaluation request in the organizer state.
 * The receipt is an exact content binding, not an authentication signature.
 * subjectSnapshot must be the actual current candidate/current baseline values;
 * UI selection or a revision label alone is not sufficient.
 */
export function publishLinkedCandidateEvaluation(corpus, request, publicationHistory = []) {
  const summary = summarizeLinkedCandidateEvaluationCorpus(corpus);
  if (!request || request.explicitEvaluationRequest !== true || typeof request.requestId !== "string" || !request.requestId.trim()) failed("explicit_evaluation_request_required");
  const evaluation = corpus.evaluations.find((entry) => entry.windowId === request.windowId && entry.protocolId === request.protocolId);
  if (!evaluation) failed("unsupported_exact_evaluation");
  const candidate = evaluation.arms.find((arm) => arm.armId === evaluation.candidate);
  if (typeof request.candidateRevisionId !== "string" || !/^C[1-9]\d*$/u.test(request.candidateRevisionId) || !same(request.subjectSnapshot, { ...candidate.subject, revisionId: request.candidateRevisionId })) failed("subject_snapshot_mismatch");
  if (!sameSet(request.scope ?? [], EVALUATION_SCOPE)) failed("evaluation_scope_mismatch");
  let comparisonBinding = null;
  if (request.compareWithPacketId !== undefined) {
    const previous = corpus.evaluations.find((entry) => entry.packetId === request.compareWithPacketId);
    if (!previous || previous.packetId === evaluation.packetId) failed("comparison_packet_invalid");
    const previousSubject = previous.arms.find((arm) => arm.armId === previous.candidate).subject;
    const published = publicationHistory.find((receipt) => receipt?.kind === "authored_evaluation_publication" && receipt.packetId === previous.packetId && receipt.protocolId === previous.protocolId && receipt.windowId === previous.windowId && receipt.candidateArm === previous.candidate && typeof receipt.candidateRevisionId === "string" && /^C[1-9]\d*$/u.test(receipt.candidateRevisionId) && receipt.evidenceClass === CLASS && receipt.subjectContentSignature === canonical({ ...previousSubject, revisionId: receipt.candidateRevisionId }) && typeof receipt.requestId === "string" && receipt.requestId.trim());
    if (!published) failed("requested_comparison_publication_required");
    comparisonBinding = { packetId: published.packetId, candidateArm: published.candidateArm, actualCandidateRevisionId: published.candidateRevisionId, requestId: published.requestId, relation: "explicit_cross_window_history_reference_not_pooled_effect" };
  }
  const publicationReceipt = {
    kind: "authored_evaluation_publication", evidenceClass: CLASS,
    packetId: evaluation.packetId, requestId: request.requestId,
    candidateArm: evaluation.candidate, candidateRevisionId: request.candidateRevisionId, windowId: evaluation.windowId, protocolId: evaluation.protocolId,
    scope: [...EVALUATION_SCOPE], subjectContentSignature: canonical(request.subjectSnapshot),
    notAnEngineeringReceipt: true, notAnAuthorizationSignature: true,
  };
  return {
    packetId: evaluation.packetId, evidenceClass: CLASS,
    notParticipantData: true, humanEfficiencyEvidence: false, engineeringExecutionEvidence: false,
    provenanceStatement: corpus.metadata.provenanceStatement,
    protocol: clone(evaluation.protocol), subject: clone(request.subjectSnapshot),
    revisionBinding: { logicalArm: evaluation.candidate, authoredRevisionLabel: candidate.subject.revisionId, actualCandidateRevisionId: request.candidateRevisionId, bindingRule: "identifier_only_rebinding_with_exact_config_and_all_item_values" },
    comparisonBinding,
    arms: clone(evaluation.arms),
    summary: clone(summary.evaluations.find((entry) => entry.windowId === evaluation.windowId)),
    publicationReceipt,
    boundaries: ["全部使用事件与时刻由作者新构造", "与E0的144条目数据分开，每arm覆盖72次保存", "当前材料不包含实际UI或可访问性执行", "范围越界即使可撤销也不能被视为合格改版", "材料发布不等于参与者接受或产品采用", "返回包只含本次请求窗口和自己的matched R0"],
  };
}

/**
 * Queries operate on an already published packet, never on the future corpus.
 * @param {object} packet
 * @param {{ armId?: string, kind?: string, group?: string, recordIds?: string[] }} [options]
 */
export function queryLinkedCandidateEvaluationPacket(packet, { armId, kind, group = "all", recordIds } = {}) {
  if (packet?.evidenceClass !== CLASS || packet?.publicationReceipt?.packetId !== packet.packetId) failed("published_packet_required");
  const arm = packet.arms?.find((entry) => entry.armId === armId);
  if (!arm) failed("arm_not_in_published_packet");
  const field = kind === "batch" ? "batchCases" : kind === "route" ? "routeTasks" : null;
  if (!field || !["all", "ordinary", "scope_mismatch", "known_search"].includes(group)) failed("record_query_invalid");
  if ((group === "scope_mismatch" && kind !== "batch") || (group === "known_search" && kind !== "route")) failed("record_group_invalid");
  let records = [...arm[field]].sort((left, right) => left.recordId.localeCompare(right.recordId));
  if (recordIds !== undefined) {
    if (!Array.isArray(recordIds) || new Set(recordIds).size !== recordIds.length || recordIds.some((ref) => !records.some((record) => record.recordId === ref))) failed("record_not_in_published_packet");
    records = records.filter((record) => recordIds.includes(record.recordId));
  }
  if (group === "scope_mismatch") records = records.filter((record) => !same(record.previewAfterItems, record.afterCommitItems));
  if (group === "ordinary") records = records.filter((record) => kind === "batch" ? same(record.previewAfterItems, record.afterCommitItems) : record.events.length === 2);
  if (group === "known_search") records = records.filter((record) => record.taskKind === "known_title_search");
  return { packetId: packet.packetId, windowId: packet.protocol.windowId, armId, kind, group, selectionRule: "requested_predicate_then_record_id_ascending_no_interface_input", records: clone(records), evidenceClass: CLASS };
}
