import assert from "node:assert/strict";
import test from "node:test";
import { createReadingListE0Corpus, summarizeReadingListE0Corpus, validateReadingListE0Corpus } from "../scenarios/materials/reading-list-e0-v4.2.mjs";
import { createReadingListE0Projection } from "../scenarios/materials/reading-list-e0-projection-v4.2.mjs";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadStudyAdapter() {
  const scenarioSource = await readFile(new URL("../scenarios/software-product-development-v1.ts", import.meta.url), "utf8");
  const runtimeSource = await readFile(new URL("../lib/experiment/runtime.ts", import.meta.url), "utf8");
  const transpile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const projectionUrl = new URL("../scenarios/materials/reading-list-e0-projection-v4.2.mjs", import.meta.url).href;
  const scenarioJs = transpile(scenarioSource).replace('"./materials/reading-list-e0-projection-v4.2.mjs"', JSON.stringify(projectionUrl));
  const [{ SOFTWARE_PRODUCT_DEVELOPMENT_V1: scenario }, { createScenarioAdapter }] = await Promise.all([
    import(`data:text/javascript,${encodeURIComponent(scenarioJs)}`),
    import(`data:text/javascript,${encodeURIComponent(transpile(runtimeSource))}`),
  ]);
  return { scenario, adapter: createScenarioAdapter(scenario) };
}

function rejectsMutation(mutator, expectedCode) {
  const corpus = createReadingListE0Corpus();
  mutator(corpus);
  const result = validateReadingListE0Corpus(corpus);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.code === expectedCode), JSON.stringify(result.errors));
  assert.throws(() => summarizeReadingListE0Corpus(corpus), /reading_list_e0_corpus_invalid/);
}

test("E0 totals reconcile from complete records and keep scenario data separate from human evidence", () => {
  const corpus = createReadingListE0Corpus();
  const result = validateReadingListE0Corpus(corpus);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  const summary = summarizeReadingListE0Corpus(corpus);
  assert.deepEqual(summary.membership, { ever: 63, firstInSaveSession: 10, firstInLaterSession: 53, atD4: 57, withoutAtD4: 87 });
  assert.deepEqual(summary.pending, { atD4: 86, reopened: 52, notReopened: 34 });
  assert.deepEqual([summary.savedItems, summary.plannedTasks, summary.successfulPlannedTasks], [144, 72, 72]);
  assert.deepEqual([summary.delayedReturn.tasks, summary.delayedReturn.dualEntry, summary.delayedReturn.nonDualEntry, summary.organizationReturn.tasks], [48, 21, 27, 24]);
  assert.equal(summary.notParticipantData, true);
  assert.equal(corpus.metadata.humanEfficiencyEvidence, false);
  assert.equal(corpus.metadata.engineeringExecutionEvidence, false);
  assert.match(corpus.metadata.provenanceStatement, /不是找回或重建/);
  assert.equal(new Set(summary.denominatorIds.plannedTasks).size, 72);
  assert.equal(corpus.tasks.every((task) => task.motivationNoteRef === null), true);
});

test("every profile has four delayed tasks; eight organizer profiles have three unique targets each", () => {
  const corpus = createReadingListE0Corpus();
  for (const profile of corpus.profiles) {
    const tasks = corpus.tasks.filter((task) => task.profileId === profile.profileId);
    assert.equal(tasks.filter((task) => task.kind === "delayed_return").length, 4);
    const organization = tasks.filter((task) => task.kind === "organization_return");
    const expected = Number(profile.profileId.split(":")[1]) <= 8 ? 3 : 0;
    assert.equal(organization.length, expected);
    assert.equal(new Set(organization.map((task) => task.targetItemId)).size, expected);
  }
});

test("Offline-first trace joins its real state and D2 source while ordinary comparison cases remain available", () => {
  const corpus = createReadingListE0Corpus();
  const trace = corpus.tasks.find((task) => task.taskId === "R0-REFIND-017");
  const events = trace.eventIds.map((ref) => corpus.events.find((event) => event.eventId === ref));
  assert.equal(trace.targetItemId, "R0-042");
  assert.equal(trace.asOfStartState.payload.title, "Offline-first sync notes");
  assert.deepEqual(events.map((event) => event.elapsedScenarioMs / 1000), [0, 6, 14, 18]);
  const membership = corpus.events.find((event) => event.eventId === "RAW:MEM-042-03");
  assert.equal(Math.floor(membership.atScenarioMs / 86400000) + 1, 2);
  assert.deepEqual(membership.afterState.payload, membership.beforeState.payload);
  assert.deepEqual(membership.afterState.membershipIds, trace.asOfStartState.membershipIds);
  const summary = summarizeReadingListE0Corpus(corpus);
  assert.ok(summary.denominatorIds.dualEntry.includes(trace.taskId));
  assert.equal(summary.denominatorIds.pendingMemberDual.length, 12);
  assert.ok(corpus.tasks.some((task) => task.kind === "delayed_return" && task.eventIds.length === 2 && !summary.denominatorIds.dualEntry.includes(task.taskId)));
  assert.equal(corpus.notes.every((note) => note.taskId === null), true);
});

test("independent construction is deterministic without sharing mutable state", () => {
  const first = createReadingListE0Corpus();
  const second = createReadingListE0Corpus();
  assert.deepEqual(first, second);
  first.items[0].payload.note = "changed";
  assert.notEqual(first.items[0].payload.note, second.items[0].payload.note);
});

test("rejects a deleted raw event even when the visible aggregate and terminal are unchanged", () => {
  rejectsMutation((corpus) => {
    corpus.events = corpus.events.filter((event) => event.eventId !== "RAW:NAV-017-02");
  }, "task_event_manifest_mismatch");
});

test("rejects using another simulated account's collection", () => {
  rejectsMutation((corpus) => {
    const event = corpus.events.find((entry) => entry.eventId === "RAW:MEM-042-03");
    event.collectionId = "COLLECTION:001:ATLAS";
  }, "membership_owner_invalid");
});

test("rejects a relation event that silently rewrites content while counts stay the same", () => {
  rejectsMutation((corpus) => {
    corpus.events.find((event) => event.eventId === "RAW:MEM-042-03").afterState.payload.note = "silently rewritten";
  }, "mutation_after_state_or_payload_mismatch");
});

test("rejects opening a member target from Unsorted rather than confusing first visit with successful entry", () => {
  rejectsMutation((corpus) => {
    const trace = corpus.tasks.find((task) => task.taskId === "R0-ORGRETURN-024");
    const search = corpus.events.find((event) => event.eventId === trace.eventIds[1]);
    search.type = "open_surface";
    search.surface = "Unsorted";
    delete search.query;
    corpus.events.find((event) => event.eventId === trace.eventIds[2]).surface = "Unsorted";
  }, "target_not_visible_in_surface");
});

test("rejects snapshots that misrepresent source events without changing row totals", () => {
  rejectsMutation((corpus) => {
    corpus.snapshots[0].itemStates.find((entry) => entry.itemId === "R0-042").pending = false;
  }, "d4_snapshot_replay_mismatch");
});

test("rejects stale or foreign task state and non-matching search results", () => {
  rejectsMutation((corpus) => {
    corpus.tasks.find((task) => task.taskId === "R0-REFIND-017").asOfStartState.membershipIds = [];
  }, "task_start_state_mismatch");
  rejectsMutation((corpus) => {
    corpus.events.find((event) => event.eventId === "RAW:NAV-017-03").query = "not in any target field";
  }, "target_does_not_match_search");
});

test("rejects relabeling scenario records as participant evidence or inventing task motivation", () => {
  rejectsMutation((corpus) => { corpus.metadata.notParticipantData = false; }, "evidence_boundary_invalid");
  rejectsMutation((corpus) => { corpus.tasks[0].motivationNoteRef = corpus.notes[0].noteId; }, "unsupported_task_motivation_link");
});

test("malformed input fails closed and cannot produce a reconciled summary", () => {
  assert.equal(validateReadingListE0Corpus(null).valid, false);
  assert.throws(() => summarizeReadingListE0Corpus({}), /corpus_shape_invalid/);
});

test("canonical E0 projection is ledger-derived and rejects broken source data", () => {
  const corpus = createReadingListE0Corpus();
  const projection = createReadingListE0Projection(corpus);
  assert.match(projection.triggerLead, /12 个使用画像完成了 144 次保存和 72 次计划内找回/);
  assert.match(projection.triggerLead, /48 次延迟找回中，有 21 次/);
  assert.match(projection.triggerLead, /到第四日，57 个条目/);
  assert.match(projection.sourceStatement, /非真实参与者或软件执行证据/);
  corpus.events = corpus.events.filter((event) => event.eventId !== "RAW:NAV-017-02");
  assert.throws(() => createReadingListE0Projection(corpus), /reading_list_e0_corpus_invalid/);
});

test("actual scenario adapter accepts the generated graph, marks source nodes, and hides all E0 before takeover", async () => {
  const { scenario, adapter } = await loadStudyAdapter();
  assert.equal(scenario.informationSpaceVersion, "v4.2-e0");
  assert.equal(new Set(scenario.informationNodes.map((node) => node.nodeId)).size, scenario.informationNodes.length);
  assert.equal(scenario.objectAnchors.length, scenario.informationNodes.length);
  const before = adapter.buildPacket("全部72任务和全部144条目", "history");
  assert.equal(before.nodes.some((node) => node.availableFromStage === "e0"), false);
  const after = adapter.buildPacket("全部72任务和全部144条目", "e0");
  assert.equal(after.resolution.matched, true, after.resolution.message);
  assert.ok(after.resolution.nodeIds.includes("CORPUS:E0-TASKS-ALL"));
  assert.ok(after.resolution.nodeIds.includes("CORPUS:E0-ITEMS-ALL"));
  const grounded = adapter.markGroundedPhrases(after.resolution.message, after.resolution.nodeIds);
  assert.ok(grounded.nodeIds.includes("CORPUS:E0-TASKS-ALL"));
  assert.ok(grounded.nodeIds.includes("CORPUS:E0-ITEMS-ALL"));
});

test("one Chat request returns every requested task or item and an individual ID locates its own source", async () => {
  const { adapter } = await loadStudyAdapter();
  const corpus = createReadingListE0Corpus();
  const taskPacket = adapter.buildPacket("给我全部72任务和完整路径", "e0");
  assert.equal(taskPacket.resolution.matched, true, taskPacket.resolution.message);
  for (const task of corpus.tasks) {
    assert.ok(taskPacket.resolution.message.includes(task.taskId), task.taskId);
    for (const eventId of task.eventIds) assert.ok(taskPacket.resolution.message.includes(eventId), eventId);
  }
  const itemPacket = adapter.buildPacket("给我全部144条目", "e0");
  assert.equal(itemPacket.resolution.matched, true, itemPacket.resolution.message);
  for (const item of corpus.items) {
    assert.ok(itemPacket.resolution.message.includes(item.itemId), item.itemId);
    assert.ok(itemPacket.resolution.message.includes(item.payload.url), item.itemId);
  }
  const single = adapter.buildPacket("R0-REFIND-024", "e0");
  assert.equal(single.resolution.matched, true, single.resolution.message);
  assert.deepEqual([...single.resolution.nodeIds], ["TRACE:E0:R0-REFIND-024"]);
  assert.match(single.resolution.message, /RAW:R0-REFIND-024:1/);
  const item = adapter.buildPacket("R0-049", "e0");
  assert.equal(item.resolution.matched, true, item.resolution.message);
  assert.match(item.resolution.message, /RAW:UNASSIGNED-049-OPEN/);
});

test("ordinary Search and Collection examples use fixed selection rules and expose full traces", async () => {
  const { adapter } = await loadStudyAdapter();
  for (const [query, expected] of [["普通Search例子", "TRACE:E0-ORDINARY-SEARCH"], ["普通Collection例子", "TRACE:E0-ORDINARY-COLLECTION"]]) {
    const packet = adapter.buildPacket(query, "e0");
    assert.equal(packet.resolution.matched, true, packet.resolution.message);
    assert.deepEqual([...packet.resolution.nodeIds], [expected]);
    assert.match(packet.resolution.message, /选择规则/);
    assert.match(packet.resolution.message, /RAW:R0-REFIND/);
    const node = packet.nodes.find((entry) => entry.nodeId === expected);
    assert.equal(node.body, packet.resolution.message);
  }
});

test("full event packet is opt-in and its content is identical for Chat text and the object node", async () => {
  const { scenario, adapter } = await loadStudyAdapter();
  const packet = adapter.buildPacket("全部事件来源", "e0");
  assert.equal(packet.resolution.matched, true, packet.resolution.message);
  const raw = packet.nodes.find((node) => node.nodeId === "CORPUS:E0-EVENTS-ALL");
  assert.equal(packet.resolution.message, raw.body);
  for (const event of createReadingListE0Corpus().events) assert.ok(raw.body.includes(event.eventId), event.eventId);
  const trigger = scenario.turns.find((entry) => entry.phase === "trigger");
  assert.equal(trigger.informationNodeIds.includes(raw.nodeId), false);
  assert.equal(trigger.assistantLead.includes("RAW:SAVE-"), false);
});
