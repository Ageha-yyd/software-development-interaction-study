/**
 * E0 v4.2 author-constructed scenario data, NOT recovered pilot logs or human data.
 * The deterministic allocation below instantiates the published E0 design totals.
 * Event times belong to fictional reading-list activity, never the study clock.
 * Browser compatible: no filesystem, crypto, or Node dependencies.
 */

const EVIDENCE_CLASS = "author_constructed_simulated_scenario";
const REVISION = "R0-reading-list-e0-v4.2";
const PROTOCOL = "PROTOCOL:E0-v4.2-authoring";
const DAY = 86400000;
const D4_END = 4 * DAY - 1;
const PAD = (value) => String(value).padStart(3, "0");
const itemRef = (value) => `R0-${PAD(value)}`;
const profileRef = (value) => `PROFILE:${PAD(value)}`;
const ownerOf = (value) => profileRef(((value - 1) % 12) + 1);
const clone = (value) => JSON.parse(JSON.stringify(value));
const canonical = (value) => JSON.stringify(value, (_key, entry) => {
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return Object.fromEntries(Object.keys(entry).sort().map((key) => [key, entry[key]]));
  }
  return entry;
});
const equal = (left, right) => canonical(left) === canonical(right);
const sorted = (values) => [...values].sort();
const collectionRef = (profileId) => `COLLECTION:${profileId.split(":")[1]}:ATLAS`;

function payloadFor(index) {
  if (index === 42) return {
    title: "Offline-first sync notes",
    url: "https://reading-list.example/offline-first-sync-notes",
    note: "Project Atlas 的 offline sync 备选方案；保存时仍在比较同步策略。",
    tags: ["offline sync", "Project Atlas"],
    source: "作者构造的技术资料条目；不是外部网页抓取结果",
  };
  const topics = ["Keyboard focus", "Cache invalidation", "Import recovery", "Search indexing", "Mobile capture", "Collection history", "Undo semantics", "Sync conflicts", "Accessible menus", "URL identity", "Note provenance", "Export format"];
  const topic = topics[(index - 1) % topics.length];
  return {
    title: `${topic} notes ${PAD(index)}`,
    url: `https://reading-list.example/notes/${PAD(index)}`,
    note: `作者构造的 ${topic} 资料；第 ${Math.floor((index - 1) / 12) + 1} 组阅读上下文。`,
    tags: [topic.toLowerCase()],
    source: "作者构造的技术资料条目；不是外部网页抓取结果",
  };
}

/** Create a new, independently editable copy of the bounded E0 authoring corpus. */
export function createReadingListE0Corpus() {
  const corpus = {
    metadata: {
      schemaVersion: 1,
      corpusId: "reading-list-e0-v4.2",
      evidenceClass: EVIDENCE_CLASS,
      authoringMethod: "deterministic_constructed_allocation_v1",
      provenanceStatement: "为 v4.2 新构造的完整 E0 情境记录；保留既有设计总量，不是找回或重建的历史原始数据。",
      revisionRef: REVISION,
      protocolRef: PROTOCOL,
      scenarioWindowEndMs: D4_END,
      timeBasis: "fictional_scenario_elapsed_milliseconds",
      notParticipantData: true,
      humanEfficiencyEvidence: false,
      engineeringExecutionEvidence: false,
      formalStudyReady: false,
      missingSourceFields: ["task-specific motivation for all delayed-return tasks", "actual reading-list implementation test receipts", "post-E0 candidate and long-horizon records"],
    },
    profiles: Array.from({ length: 12 }, (_, index) => ({
      profileId: profileRef(index + 1),
      replicaRef: `REPLICA:E0:${PAD(index + 1)}`,
      label: `模拟使用画像 ${index + 1}`,
      evidenceClass: EVIDENCE_CLASS,
    })),
    collections: Array.from({ length: 12 }, (_, index) => ({
      collectionId: collectionRef(profileRef(index + 1)),
      profileId: profileRef(index + 1),
      title: "Project Atlas",
      initializedBeforeWindow: true,
      evidenceClass: EVIDENCE_CLASS,
    })),
    items: [],
    events: [],
    tasks: [],
    notes: [],
    snapshots: [],
  };
  const state = new Map();
  const profiles = new Map(corpus.profiles.map((profile) => [profile.profileId, profile]));
  const addEvent = (event) => {
    corpus.events.push({
      revisionRef: REVISION,
      protocolRef: PROTOCOL,
      evidenceClass: EVIDENCE_CLASS,
      sourceRef: "AUTHORING:E0-v4.2-deterministic-allocation",
      taskId: null,
      ...event,
      replicaRef: profiles.get(event.profileId).replicaRef,
    });
  };
  for (let index = 1; index <= 144; index += 1) {
    const itemId = itemRef(index);
    const profileId = ownerOf(index);
    const sessionId = `SESSION:${profileId}:D1-SAVE`;
    const atScenarioMs = 10000 + index * 1000;
    const item = { itemId, profileId, payload: payloadFor(index), savedAtScenarioMs: atScenarioMs, saveSessionId: sessionId, evidenceClass: EVIDENCE_CLASS };
    corpus.items.push(item);
    const afterState = { itemId, pending: true, membershipIds: [], payload: clone(item.payload) };
    state.set(itemId, afterState);
    addEvent({ eventId: `RAW:SAVE-${PAD(index)}`, type: "save_item", itemId, profileId, sessionId, atScenarioMs, beforeState: null, afterState: clone(afterState), input: { url: item.payload.url } });
  }

  // 63 ever-members: 1..11, 22..63, 87..96. Ten first joins are in save sessions.
  const everMembers = Array.from({ length: 144 }, (_, index) => index + 1)
    .filter((index) => index <= 11 || (index >= 22 && index <= 63) || (index >= 87 && index <= 96));
  for (const index of everMembers) {
    const item = corpus.items[index - 1];
    const beforeState = clone(state.get(item.itemId));
    const afterState = { ...clone(beforeState), membershipIds: [collectionRef(item.profileId)] };
    state.set(item.itemId, afterState);
    addEvent({
      eventId: index === 42 ? "RAW:MEM-042-03" : `RAW:MEM-${PAD(index)}-ADD`,
      type: "add_membership", itemId: item.itemId, profileId: item.profileId,
      sessionId: index <= 10 ? item.saveSessionId : `SESSION:${item.profileId}:D2-ORGANIZE`,
      atScenarioMs: index <= 10 ? item.savedAtScenarioMs + 1 : DAY + index * 1000,
      collectionId: collectionRef(item.profileId), beforeState, afterState: clone(afterState),
    });
  }
  // Six explicitly sourced final removals explain 63 ever-members versus 57 at D4.
  for (let index = 91; index <= 96; index += 1) {
    const item = corpus.items[index - 1];
    const beforeState = clone(state.get(item.itemId));
    const afterState = { ...clone(beforeState), membershipIds: [] };
    state.set(item.itemId, afterState);
    addEvent({ eventId: `RAW:MEM-${PAD(index)}-REMOVE`, type: "remove_membership", itemId: item.itemId, profileId: item.profileId, sessionId: `SESSION:${item.profileId}:D3-ORGANIZE`, atScenarioMs: 2 * DAY + index * 1000, collectionId: collectionRef(item.profileId), beforeState, afterState: clone(afterState) });
  }
  for (let index = 87; index <= 144; index += 1) {
    const item = corpus.items[index - 1];
    const beforeState = clone(state.get(item.itemId));
    const afterState = { ...clone(beforeState), pending: false };
    state.set(item.itemId, afterState);
    addEvent({ eventId: `RAW:PROCESS-${PAD(index)}`, type: "set_pending", itemId: item.itemId, profileId: item.profileId, sessionId: `SESSION:${item.profileId}:D3-PROCESS`, atScenarioMs: 2 * DAY + 3600000 + index * 1000, pending: false, beforeState, afterState: clone(afterState) });
  }

  const makeTask = (ordinal, kind, targetIndex, firstSurface, dual) => {
    const delayed = kind === "delayed_return";
    const taskId = delayed ? `R0-REFIND-${PAD(ordinal)}` : `R0-ORGRETURN-${PAD(ordinal)}`;
    const item = corpus.items[targetIndex - 1];
    const taskOrdinal = delayed ? ordinal : 48 + ordinal;
    const startedAtScenarioMs = 3 * DAY + taskOrdinal * 100000;
    const sessionId = `SESSION:${item.profileId}:D4:${taskId}`;
    const route = [];
    const openSurface = (surface, elapsedScenarioMs) => route.push({ type: "open_surface", surface, elapsedScenarioMs, ...(surface === "Collections" ? { collectionId: collectionRef(item.profileId) } : {}) });
    const search = (elapsedScenarioMs) => route.push({ type: "search", surface: "Search", query: targetIndex === 42 ? "offline sync" : item.payload.title, elapsedScenarioMs });
    const openItem = (surface, elapsedScenarioMs) => route.push({ type: "open_item", surface, itemId: item.itemId, elapsedScenarioMs });
    if (dual) {
      openSurface(firstSurface, 0);
      openSurface(firstSurface === "Inbox" ? "Unsorted" : "Inbox", 6000);
      if (firstSurface === "Inbox") { search(14000); openItem("Search", 18000); }
      else openItem("Inbox", 10000);
    } else if (firstSurface === "Search") {
      search(0); openItem("Search", 4000);
    } else {
      openSurface(firstSurface, 0);
      const current = state.get(item.itemId);
      const visible = firstSurface === "Inbox" ? current.pending : firstSurface === "Unsorted" ? current.membershipIds.length === 0 : current.membershipIds.includes(collectionRef(item.profileId));
      if (visible) openItem(firstSurface, 5000);
      else { search(5000); openItem("Search", 9000); }
    }
    const eventIds = [];
    route.forEach((step, index) => {
      const eventId = delayed && ordinal === 17 ? `RAW:NAV-017-${String(index + 1).padStart(2, "0")}` : `RAW:${taskId}:${index + 1}`;
      eventIds.push(eventId);
      addEvent({ ...step, eventId, taskId, profileId: item.profileId, sessionId, atScenarioMs: startedAtScenarioMs + step.elapsedScenarioMs });
    });
    corpus.tasks.push({
      taskId, kind, protocolRef: PROTOCOL, revisionRef: REVISION, profileId: item.profileId,
      replicaRef: profiles.get(item.profileId).replicaRef, sessionId, targetItemId: item.itemId,
      startedAtScenarioMs, endedAtScenarioMs: startedAtScenarioMs + route.at(-1).elapsedScenarioMs,
      asOfStartState: clone(state.get(item.itemId)), eventIds, evidenceClass: EVIDENCE_CLASS,
      motivationNoteRef: null,
    });
  };
  for (let ordinal = 1; ordinal <= 48; ordinal += 1) {
    const targetIndex = ordinal === 17 ? 42 : ordinal === 42 ? 17 : ordinal;
    let first = ordinal <= 12 ? "Inbox" : ordinal <= 23 ? "Unsorted" : ordinal <= 37 ? "Search" : "Collections";
    if (ordinal === 12) first = "Unsorted";
    if (ordinal === 17) first = "Inbox";
    makeTask(ordinal, "delayed_return", targetIndex, first, ordinal <= 21);
  }
  // Eight organizer profiles, three unique previously organized targets each.
  const organizationTargets = Array.from({ length: 8 }, (_, index) => [index + 1, index + 25, index + 37]).flat();
  organizationTargets.forEach((targetIndex, index) => {
    const first = index < 10 ? "Search" : index < 19 ? "Collections" : index < 22 ? "Inbox" : "Unsorted";
    makeTask(index + 1, "organization_return", targetIndex, first, false);
  });
  // Four unassigned ordinary opens are separate from the 72 planned tasks.
  for (let index = 49; index <= 52; index += 1) {
    const item = corpus.items[index - 1];
    const sessionId = `SESSION:${item.profileId}:D4-UNASSIGNED`;
    const atScenarioMs = 3 * DAY + 8 * 3600000 + index * 1000;
    addEvent({ eventId: `RAW:UNASSIGNED-${PAD(index)}-SEARCH`, type: "search", profileId: item.profileId, sessionId, atScenarioMs, surface: "Search", query: item.payload.title });
    addEvent({ eventId: `RAW:UNASSIGNED-${PAD(index)}-OPEN`, type: "open_item", itemId: item.itemId, profileId: item.profileId, sessionId, atScenarioMs: atScenarioMs + 4000, surface: "Search" });
  }
  const noteTexts = [
    ["later_processing", "我这次先把链接留下，打算下次再处理。"],
    ["later_processing", "移动端保存时没有决定分到哪里，准备回到电脑后整理。"],
    ["later_processing", "这批内容是给之后的工作留的，这四天没有打算全部打开。"],
    ["deliberate_checking", "我分别核对还要不要处理，以及是否已经放进主题。"],
    ["deliberate_checking", "我这次关心的是处理状态和归属两件事。"],
    ["entry_uncertainty", "这次回来时，我不确定应该先从哪个入口开始。"],
    ["entry_uncertainty", "我需要重新看一下两个入口各自表示什么。"],
    ["topic_context", "我通过 Collection 找回了当时正在做的主题。"],
  ];
  corpus.notes = noteTexts.map(([declaredTopic, text], index) => ({
    noteId: `NOTE:E0-${PAD(index + 1)}`, profileId: profileRef(index + 1),
    scope: "profile_window_context", taskId: null, declaredTopic, text,
    evidenceClass: EVIDENCE_CLASS,
    sourceRef: "AUTHORING:E0-v4.2-context-statements",
    limitation: "作者构造的画像说明，未链接到某次找回，不能逐任务归因或估计动机比例。",
  }));
  corpus.events.sort((left, right) => left.atScenarioMs - right.atScenarioMs || left.eventId.localeCompare(right.eventId));
  corpus.snapshots = [{ snapshotId: "SNAPSHOT:E0-D4", revisionRef: REVISION, atScenarioMs: D4_END, itemStates: [...state.values()].map(clone).sort((left, right) => left.itemId.localeCompare(right.itemId)), evidenceClass: EVIDENCE_CLASS }];
  return corpus;
}

function inspectCorpus(corpus) {
  const errors = [];
  const fail = (code, ref) => errors.push({ code, ref });
  const requiredArrays = ["profiles", "collections", "items", "events", "tasks", "notes", "snapshots"];
  if (!corpus || typeof corpus !== "object" || requiredArrays.some((key) => !Array.isArray(corpus[key]))) {
    return { errors: [{ code: "corpus_shape_invalid", ref: "corpus" }], summary: null };
  }
  if (corpus.metadata?.evidenceClass !== EVIDENCE_CLASS || corpus.metadata.notParticipantData !== true || corpus.metadata.humanEfficiencyEvidence !== false || corpus.metadata.engineeringExecutionEvidence !== false || corpus.metadata.formalStudyReady !== false || corpus.metadata.timeBasis !== "fictional_scenario_elapsed_milliseconds") fail("evidence_boundary_invalid", "metadata");
  if (corpus.metadata?.revisionRef !== REVISION || corpus.metadata?.protocolRef !== PROTOCOL || corpus.metadata?.scenarioWindowEndMs !== D4_END) fail("corpus_binding_invalid", "metadata");
  const unique = (rows, key) => {
    const map = new Map();
    rows.forEach((row) => {
      if (!row || typeof row[key] !== "string" || !row[key]) { fail("record_id_invalid", key); return; }
      if (map.has(row[key])) fail("duplicate_record_id", row[key]);
      if (row.evidenceClass !== EVIDENCE_CLASS) fail("record_evidence_class_invalid", row[key]);
      map.set(row[key], row);
    });
    return map;
  };
  const profiles = unique(corpus.profiles, "profileId");
  const collections = unique(corpus.collections, "collectionId");
  const items = unique(corpus.items, "itemId");
  const events = unique(corpus.events, "eventId");
  const tasks = unique(corpus.tasks, "taskId");
  unique(corpus.notes, "noteId");
  unique(corpus.snapshots, "snapshotId");
  for (const item of items.values()) {
    if (!profiles.has(item.profileId) || !item.payload || typeof item.payload.url !== "string") fail("item_owner_or_payload_invalid", item.itemId);
  }
  for (const collection of collections.values()) {
    if (!profiles.has(collection.profileId)) fail("collection_owner_invalid", collection.collectionId);
  }
  const state = new Map();
  const saved = new Map();
  const firstMembership = new Map();
  const opened = new Set();
  const taskEvents = new Map([...tasks.keys()].map((key) => [key, []]));
  const surfaceBySession = new Map();
  const seenTaskStart = new Set();
  let previousTime = -1;
  for (const event of corpus.events) {
    if (!event || typeof event.eventId !== "string") continue;
    if (!Number.isFinite(event.atScenarioMs) || event.atScenarioMs < previousTime || event.atScenarioMs > D4_END || event.atScenarioMs < 0) fail("event_time_invalid", event.eventId);
    previousTime = event.atScenarioMs;
    if (event.revisionRef !== REVISION || event.protocolRef !== PROTOCOL || !event.sourceRef) fail("event_binding_invalid", event.eventId);
    if (!profiles.has(event.profileId) || event.replicaRef !== profiles.get(event.profileId)?.replicaRef || typeof event.sessionId !== "string") fail("event_owner_invalid", event.eventId);
    const task = event.taskId === null ? null : tasks.get(event.taskId);
    if (event.taskId !== null && !task) fail("event_task_missing", event.eventId);
    if (task) {
      taskEvents.get(task.taskId).push(event);
      if (task.profileId !== event.profileId || task.sessionId !== event.sessionId) fail("task_event_scope_mismatch", event.eventId);
      if (event.elapsedScenarioMs !== event.atScenarioMs - task.startedAtScenarioMs) fail("task_event_relative_time_invalid", event.eventId);
      if (!seenTaskStart.has(task.taskId)) {
        seenTaskStart.add(task.taskId);
        if (!equal(task.asOfStartState, state.get(task.targetItemId))) fail("task_start_state_mismatch", task.taskId);
      }
    }
    const item = event.itemId ? items.get(event.itemId) : null;
    if (event.itemId && (!item || item.profileId !== event.profileId)) fail("event_item_owner_mismatch", event.eventId);
    const sessionKey = `${event.profileId}/${event.sessionId}`;
    const current = event.itemId ? state.get(event.itemId) : null;
    if (event.type === "save_item") {
      if (!item || current || event.beforeState !== null || event.atScenarioMs !== item.savedAtScenarioMs || event.sessionId !== item.saveSessionId || !equal(event.input, { url: item.payload.url })) fail("save_event_invalid", event.eventId);
      const expected = item ? { itemId: item.itemId, pending: true, membershipIds: [], payload: clone(item.payload) } : null;
      if (!equal(event.afterState, expected)) fail("save_initial_state_invalid", event.eventId);
      if (expected) { state.set(item.itemId, expected); saved.set(item.itemId, event); }
    } else if (["add_membership", "remove_membership", "set_pending"].includes(event.type)) {
      if (!current || !equal(event.beforeState, current)) { fail("mutation_before_state_mismatch", event.eventId); continue; }
      const expected = clone(current);
      if (event.type === "set_pending") {
        if (typeof event.pending !== "boolean" || current.pending === event.pending) fail("pending_transition_invalid", event.eventId);
        expected.pending = event.pending;
      } else {
        const collection = collections.get(event.collectionId);
        if (!collection || collection.profileId !== event.profileId) fail("membership_owner_invalid", event.eventId);
        if (event.type === "add_membership") {
          if (current.membershipIds.includes(event.collectionId)) fail("membership_add_duplicate", event.eventId);
          expected.membershipIds = sorted(new Set([...current.membershipIds, event.collectionId]));
          if (!firstMembership.has(event.itemId)) firstMembership.set(event.itemId, event);
        } else {
          if (!current.membershipIds.includes(event.collectionId)) fail("membership_remove_absent", event.eventId);
          expected.membershipIds = current.membershipIds.filter((ref) => ref !== event.collectionId);
        }
      }
      if (!equal(event.afterState, expected)) fail("mutation_after_state_or_payload_mismatch", event.eventId);
      state.set(event.itemId, expected);
    } else if (event.type === "open_surface" || event.type === "search") {
      if (!["Inbox", "Unsorted", "Search", "Collections"].includes(event.surface)) fail("surface_invalid", event.eventId);
      if (event.type === "search" && (event.surface !== "Search" || typeof event.query !== "string" || !event.query.trim())) fail("search_query_invalid", event.eventId);
      if (event.surface === "Collections" && collections.get(event.collectionId)?.profileId !== event.profileId) fail("collection_surface_owner_invalid", event.eventId);
      surfaceBySession.set(sessionKey, { surface: event.surface, collectionId: event.collectionId, query: event.query });
    } else if (event.type === "open_item") {
      const route = surfaceBySession.get(sessionKey);
      if (!current || !route || route.surface !== event.surface) fail("open_item_route_invalid", event.eventId);
      else {
        if ((route.surface === "Inbox" && !current.pending) || (route.surface === "Unsorted" && current.membershipIds.length !== 0) || (route.surface === "Collections" && !current.membershipIds.includes(route.collectionId))) fail("target_not_visible_in_surface", event.eventId);
        if (route.surface === "Search") {
          const haystack = [current.payload.title, current.payload.url, current.payload.note, ...current.payload.tags].join(" ").toLowerCase();
          if (typeof route.query !== "string" || !haystack.includes(route.query.toLowerCase())) fail("target_does_not_match_search", event.eventId);
        }
      }
      if (task && event.itemId !== task.targetItemId) fail("task_opened_wrong_identity", event.eventId);
      if (saved.has(event.itemId) && event.atScenarioMs > saved.get(event.itemId).atScenarioMs) opened.add(event.itemId);
    } else fail("event_type_unknown", event.eventId);
  }

  const delayed = [];
  const organization = [];
  const completed = [];
  const dual = [];
  const pendingMemberDual = [];
  const firstCounts = { delayed_return: { Inbox: 0, Unsorted: 0, Search: 0, Collections: 0 }, organization_return: { Inbox: 0, Unsorted: 0, Search: 0, Collections: 0 } };
  for (const task of tasks.values()) {
    if (!["delayed_return", "organization_return"].includes(task.kind)) { fail("task_kind_invalid", task.taskId); continue; }
    const target = items.get(task.targetItemId);
    if (!target || target.profileId !== task.profileId || task.replicaRef !== profiles.get(task.profileId)?.replicaRef || task.protocolRef !== PROTOCOL || task.revisionRef !== REVISION) fail("task_binding_invalid", task.taskId);
    const ordered = taskEvents.get(task.taskId);
    if (!equal(task.eventIds, ordered.map((event) => event.eventId)) || ordered.length < 2) fail("task_event_manifest_mismatch", task.taskId);
    if (ordered[0]?.atScenarioMs !== task.startedAtScenarioMs || ordered.at(-1)?.atScenarioMs !== task.endedAtScenarioMs) fail("task_interval_mismatch", task.taskId);
    const result = ordered.at(-1);
    if (result?.type === "open_item" && result.itemId === task.targetItemId) completed.push(task.taskId);
    else fail("task_terminal_identity_missing", task.taskId);
    if (task.kind === "organization_return" && (!firstMembership.has(task.targetItemId) || firstMembership.get(task.targetItemId).atScenarioMs >= task.startedAtScenarioMs)) fail("organization_return_without_prior_organization", task.taskId);
    if (task.motivationNoteRef !== null) fail("unsupported_task_motivation_link", task.taskId);
    const first = ordered.find((event) => event.type === "open_surface" || event.type === "search");
    if (first && Object.hasOwn(firstCounts[task.kind], first.surface)) firstCounts[task.kind][first.surface] += 1;
    if (task.kind === "delayed_return") {
      delayed.push(task.taskId);
      const visited = new Set(ordered.filter((event) => ["open_surface", "search"].includes(event.type)).map((event) => event.surface));
      if (visited.has("Inbox") && visited.has("Unsorted")) {
        dual.push(task.taskId);
        if (task.asOfStartState?.pending && task.asOfStartState.membershipIds?.length > 0) pendingMemberDual.push(task.taskId);
      }
    } else organization.push(task.taskId);
  }
  const finalStates = [...state.values()].sort((left, right) => left.itemId.localeCompare(right.itemId));
  if (corpus.snapshots.length !== 1 || corpus.snapshots[0]?.atScenarioMs !== D4_END || corpus.snapshots[0]?.revisionRef !== REVISION || !equal(corpus.snapshots[0]?.itemStates, finalStates)) fail("d4_snapshot_replay_mismatch", "SNAPSHOT:E0-D4");
  const memberIds = finalStates.filter((entry) => entry.membershipIds.length > 0).map((entry) => entry.itemId);
  const pendingIds = finalStates.filter((entry) => entry.pending).map((entry) => entry.itemId);
  const reopenedIds = pendingIds.filter((ref) => opened.has(ref));
  const sameSessionIds = [...firstMembership].filter(([ref, event]) => event.sessionId === saved.get(ref)?.sessionId).map(([ref]) => ref);
  const noteCounts = { later_processing: 0, deliberate_checking: 0, entry_uncertainty: 0, topic_context: 0 };
  for (const note of corpus.notes) {
    if (!profiles.has(note.profileId) || note.scope !== "profile_window_context" || note.taskId !== null || !note.sourceRef || !note.limitation || !Object.hasOwn(noteCounts, note.declaredTopic)) fail("context_note_scope_invalid", note.noteId);
    else noteCounts[note.declaredTopic] += 1;
  }
  const summary = {
    evidenceClass: EVIDENCE_CLASS,
    notParticipantData: true,
    profiles: profiles.size,
    savedItems: saved.size,
    plannedTasks: tasks.size,
    successfulPlannedTasks: completed.length,
    delayedReturn: { tasks: delayed.length, successful: delayed.filter((ref) => completed.includes(ref)).length, dualEntry: dual.length, nonDualEntry: delayed.length - dual.length, pendingMemberDual: pendingMemberDual.length, firstVisitedSurface: firstCounts.delayed_return },
    organizationReturn: { tasks: organization.length, successful: organization.filter((ref) => completed.includes(ref)).length, firstVisitedSurface: firstCounts.organization_return },
    membership: { ever: firstMembership.size, firstInSaveSession: sameSessionIds.length, firstInLaterSession: firstMembership.size - sameSessionIds.length, atD4: memberIds.length, withoutAtD4: state.size - memberIds.length },
    pending: { atD4: pendingIds.length, reopened: reopenedIds.length, notReopened: pendingIds.length - reopenedIds.length },
    contextNotes: { total: corpus.notes.length, declaredTopics: noteCounts, perTaskMotivationAvailable: false },
    denominatorIds: { savedItems: sorted(saved.keys()), plannedTasks: sorted(tasks.keys()), delayedReturn: sorted(delayed), organizationReturn: sorted(organization), dualEntry: sorted(dual), pendingMemberDual: sorted(pendingMemberDual), everMembership: sorted(firstMembership.keys()), firstMembershipInSaveSession: sorted(sameSessionIds), membershipAtD4: sorted(memberIds), pendingAtD4: sorted(pendingIds), pendingReopened: sorted(reopenedIds) },
  };
  const totals = { profiles: [summary.profiles, 12], saved: [summary.savedItems, 144], planned: [summary.plannedTasks, 72], successful: [summary.successfulPlannedTasks, 72], delayed: [summary.delayedReturn.tasks, 48], organization: [summary.organizationReturn.tasks, 24], dual: [summary.delayedReturn.dualEntry, 21], pendingMemberDual: [summary.delayedReturn.pendingMemberDual, 12], ever: [summary.membership.ever, 63], sameSession: [summary.membership.firstInSaveSession, 10], laterSession: [summary.membership.firstInLaterSession, 53], membershipD4: [summary.membership.atD4, 57], pendingD4: [summary.pending.atD4, 86], reopened: [summary.pending.reopened, 52], notReopened: [summary.pending.notReopened, 34], notes: [summary.contextNotes.total, 8] };
  Object.entries(totals).forEach(([key, [actual, expected]]) => { if (actual !== expected) fail("e0_design_total_mismatch", `${key}:${actual}/${expected}`); });
  if (!equal(firstCounts.delayed_return, { Inbox: 12, Unsorted: 11, Search: 14, Collections: 11 }) || !equal(firstCounts.organization_return, { Inbox: 3, Unsorted: 2, Search: 10, Collections: 9 })) fail("first_visited_distribution_mismatch", "tasks");
  if (!equal(noteCounts, { later_processing: 3, deliberate_checking: 2, entry_uncertainty: 2, topic_context: 1 })) fail("context_note_distribution_mismatch", "notes");
  const trace = tasks.get("R0-REFIND-017");
  const traceEvents = taskEvents.get("R0-REFIND-017") ?? [];
  if (trace?.targetItemId !== "R0-042" || trace?.asOfStartState?.pending !== true || !trace?.asOfStartState?.membershipIds?.includes(collectionRef(ownerOf(42))) || !equal(traceEvents.map((event) => event.elapsedScenarioMs), [0, 6000, 14000, 18000]) || !equal(traceEvents.map((event) => event.type), ["open_surface", "open_surface", "search", "open_item"]) || traceEvents[0]?.surface !== "Inbox" || traceEvents[1]?.surface !== "Unsorted" || traceEvents[2]?.query !== "offline sync" || !events.has("RAW:MEM-042-03")) fail("offline_first_anchor_mismatch", "R0-REFIND-017");
  return { errors, summary };
}

/** Replay records and validate ownership, route visibility, state, and E0 totals. */
export function validateReadingListE0Corpus(corpus) {
  try {
    const { errors, summary } = inspectCorpus(corpus);
    return { valid: errors.length === 0, errors, evidenceClass: EVIDENCE_CLASS, summary };
  } catch (error) {
    return { valid: false, errors: [{ code: "malformed_record", ref: error instanceof Error ? error.message : String(error) }], evidenceClass: EVIDENCE_CLASS, summary: null };
  }
}

/** Invalid corpus data is never silently presented as a reconciled summary. */
export function summarizeReadingListE0Corpus(corpus) {
  const result = validateReadingListE0Corpus(corpus);
  if (!result.valid) throw new Error(`reading_list_e0_corpus_invalid:${result.errors.map((entry) => entry.code).join(",")}`);
  return result.summary;
}
