import assert from "node:assert/strict";
import test from "node:test";
import { createLinkedCandidateEvaluationCorpus, validateLinkedCandidateEvaluationCorpus, summarizeLinkedCandidateEvaluationCorpus, publishLinkedCandidateEvaluation, queryLinkedCandidateEvaluationPacket } from "../scenarios/materials/linked-candidate-evaluation-v4.2.mjs";
import { createWorkbench, proposeRevision, guardFor, previewBatch, applyBatch, undoBatch } from "../lib/experiment/product-workbench.mjs";

function evalArm(corpus, revision) { return corpus.evaluations.find((entry) => entry.candidate === revision).arms.find((arm) => arm.armId === revision); }
function request(corpus, revision) {
  const evaluation = corpus.evaluations.find((entry) => entry.candidate === revision);
  return { requestId: `REQUEST:${revision}`, explicitEvaluationRequest: true, candidateRevisionId: revision, windowId: evaluation.windowId, protocolId: evaluation.protocolId, scope: [...evaluation.protocol.scope], subjectSnapshot: structuredClone(evalArm(corpus, revision).subject) };
}
function rejectMutation(change, code) {
  const corpus = createLinkedCandidateEvaluationCorpus();
  change(corpus);
  const result = validateLinkedCandidateEvaluationCorpus(corpus);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.code === code), JSON.stringify(result.errors));
  assert.throws(() => summarizeLinkedCandidateEvaluationCorpus(corpus), /linked_evaluation/);
}

test("two new matched windows reconcile their own source events and never claim participant or engineering data", () => {
  const corpus = createLinkedCandidateEvaluationCorpus();
  const validation = validateLinkedCandidateEvaluationCorpus(corpus);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const summary = summarizeLinkedCandidateEvaluationCorpus(corpus);
  assert.equal(summary.evaluations.length, 2);
  for (const evaluation of summary.evaluations) for (const arm of evaluation.arms) {
    assert.equal(arm.savedItems, 72);
    assert.equal(arm.route.tasks, 48);
    assert.equal(arm.route.successful, 48);
    assert.equal(arm.route.dualEntry, arm.armId === "R0" ? 20 : 7);
    assert.equal(arm.batch.tasks, 40);
    assert.equal(arm.batch.scopeMismatches, arm.armId === "C1" ? 3 : 0);
    assert.equal(arm.batch.exactUndos, arm.armId === "C1" ? 3 : 0);
    assert.equal(arm.batch.payloadPreserved, 40);
    assert.equal(arm.batch.membershipPendingOrthogonal, 40);
  }
  assert.equal(corpus.metadata.notParticipantData, true);
  assert.equal(corpus.metadata.engineeringExecutionEvidence, false);
  assert.match(corpus.metadata.provenanceStatement, /不是恢复的历史/);
  const refs = corpus.evaluations.map((evaluation) => evaluation.arms.find((arm) => arm.armId === "R0").routeTasks.map((record) => record.recordId));
  assert.equal(refs[0].some((ref) => refs[1].includes(ref)), false);
});

test("all 40 paired operation cases match the actual six-item kernel for R0, C1 and C2 including exact undo", () => {
  const corpus = createLinkedCandidateEvaluationCorpus();
  for (const revision of ["R0", "C1", "C2"]) {
    const arm = revision === "R0" ? corpus.evaluations[0].arms.find((entry) => entry.armId === "R0") : evalArm(corpus, revision);
    for (const record of arm.batchCases) {
      let state = createWorkbench({ workbenchId: record.recordId });
      if (revision !== "R0") state = proposeRevision(state, { ...guardFor(state), kind: "linked" }).state;
      if (revision === "C2") state = proposeRevision(state, { ...guardFor(state), kind: "scoped", supersedesCandidateId: "C1" }).state;
      const target = revision === "R0" ? "current" : "candidate";
      const snapshot = revision === "R0" ? { revisionId: state.currentRevisionId, config: state.config, items: state.items } : { revisionId: state.candidate.revisionId, config: state.candidate.config, items: state.candidate.items };
      assert.deepEqual(snapshot, arm.subject);
      const preview = previewBatch(state, { ...guardFor(state), target, ...record.operation });
      const applied = applyBatch(state, { ...guardFor(state), target, preview });
      assert.deepEqual(revision === "R0" ? applied.state.items : applied.state.candidate.items, record.afterCommitItems, record.recordId);
      const observed = record.events.find((event) => event.type === "apply_batch");
      assert.deepEqual(applied.event.effectiveItemIds, observed.effectiveItemIds, record.recordId);
      assert.equal(applied.event.previewMatchesExecution, observed.previewMatchesExecution, record.recordId);
      if (record.terminal.kind === "undone_due_to_scope") {
        const restored = undoBatch(applied.state, { ...guardFor(applied.state), target: "candidate", operationId: applied.event.operationId });
        assert.deepEqual(restored.state.candidate.items, record.afterItems);
      }
    }
  }
});

test("C1 scope expansion is one hop, and ordinary cases and product costs prevent a universal dominance story", () => {
  const corpus = createLinkedCandidateEvaluationCorpus();
  const c1 = evalArm(corpus, "C1");
  const record = c1.batchCases.find((entry) => entry.pairId === "BATCH-PAIR-004");
  assert.deepEqual(record.events.find((event) => event.type === "apply_batch").effectiveItemIds, ["R0-042", "R0-043"]);
  assert.equal(record.events.find((event) => event.type === "apply_batch").effectiveItemIds.includes("R0-047"), false);
  const summary = summarizeLinkedCandidateEvaluationCorpus(corpus);
  const first = summary.evaluations[0].arms;
  assert.equal(first.find((arm) => arm.armId === "C1").batch.ordinaryTaskIds.length, 37);
  assert.equal(first.find((arm) => arm.armId === "C1").route.knownSearchWithExtraPresentation, 3);
  assert.equal(first.find((arm) => arm.armId === "R0").route.knownSearchWithExtraPresentation, 0);
  const c2 = summary.evaluations[1].arms.find((arm) => arm.armId === "C2");
  assert.ok(c2.batch.previewRowInspections > 0);
  const c1Ordinary = c1.batchCases.filter((entry) => entry.terminal.kind === "kept");
  assert.ok(c1Ordinary.some((entry) => evalArm(corpus, "C2").batchCases.find((other) => other.pairId === entry.pairId).events.length > entry.events.length));
});

test("publishing is explicit and exact-state bound; either candidate can be evaluated first without revealing the other", () => {
  const corpus = createLinkedCandidateEvaluationCorpus();
  assert.throws(() => publishLinkedCandidateEvaluation(corpus, { ...request(corpus, "C1"), explicitEvaluationRequest: false }), /explicit_evaluation_request_required/);
  const direct = request(corpus, "C2");
  direct.candidateRevisionId = "C1";
  direct.subjectSnapshot.revisionId = "C1";
  const directPacket = publishLinkedCandidateEvaluation(corpus, direct);
  assert.equal(directPacket.subject.revisionId, "C1");
  assert.equal(directPacket.subject.config.kind, "scoped");
  assert.deepEqual(directPacket.revisionBinding, { logicalArm: "C2", authoredRevisionLabel: "C2", actualCandidateRevisionId: "C1", bindingRule: "identifier_only_rebinding_with_exact_config_and_all_item_values" });
  assert.doesNotMatch(JSON.stringify(directPacket), /SIM-MATCHED-W1|linked_rows_defect/);
  const c1 = publishLinkedCandidateEvaluation(corpus, request(corpus, "C1"));
  assert.deepEqual(c1.arms.map((arm) => arm.armId), ["R0", "C1"]);
  assert.doesNotMatch(JSON.stringify(c1), /C2|SIM-MATCHED-W2/);
  assert.equal(c1.publicationReceipt.notAnEngineeringReceipt, true);
  const c2 = publishLinkedCandidateEvaluation(corpus, request(corpus, "C2"), [c1.publicationReceipt]);
  assert.deepEqual(c2.arms.map((arm) => arm.armId), ["R0", "C2"]);
  assert.equal(c2.protocol.windowId, "SIM-MATCHED-W2");
  assert.equal(c2.comparisonBinding, null);
  const compare = { ...request(corpus, "C2"), compareWithPacketId: c1.packetId };
  assert.throws(() => publishLinkedCandidateEvaluation(corpus, compare), /requested_comparison_publication_required/);
  assert.equal(publishLinkedCandidateEvaluation(corpus, compare, [c1.publicationReceipt]).comparisonBinding.packetId, c1.packetId);
  const stale = request(corpus, "C2");
  stale.subjectSnapshot.items[0].pending = false;
  assert.throws(() => publishLinkedCandidateEvaluation(corpus, stale, [c1.publicationReceipt]), /subject_snapshot_mismatch/);
  const wrongConfig = request(corpus, "C1");
  wrongConfig.subjectSnapshot.config = structuredClone(evalArm(corpus, "C2").subject.config);
  assert.throws(() => publishLinkedCandidateEvaluation(corpus, wrongConfig), /subject_snapshot_mismatch/);
  assert.throws(() => publishLinkedCandidateEvaluation(corpus, { ...request(corpus, "C1"), windowId: "SIM-MATCHED-W2" }), /unsupported_exact_evaluation/);
  assert.throws(() => publishLinkedCandidateEvaluation(corpus, { ...request(corpus, "C1"), scope: ["matched_retrieval"] }), /evaluation_scope_mismatch/);
});

test("ordinary, all and scope-exception queries operate only within a published packet", () => {
  const corpus = createLinkedCandidateEvaluationCorpus();
  const packet = publishLinkedCandidateEvaluation(corpus, request(corpus, "C1"));
  const ordinary = queryLinkedCandidateEvaluationPacket(packet, { armId: "C1", kind: "batch", group: "ordinary" });
  const exceptions = queryLinkedCandidateEvaluationPacket(packet, { armId: "C1", kind: "batch", group: "scope_mismatch" });
  assert.equal(ordinary.records.length, 37);
  assert.equal(exceptions.records.length, 3);
  assert.equal(queryLinkedCandidateEvaluationPacket(packet, { armId: "C1", kind: "batch" }).records.length, 40);
  assert.equal(queryLinkedCandidateEvaluationPacket(packet, { armId: "R0", kind: "route", group: "known_search" }).records.length, 12);
  assert.throws(() => queryLinkedCandidateEvaluationPacket(packet, { armId: "C2", kind: "batch" }), /arm_not_in_published_packet/);
  assert.throws(() => queryLinkedCandidateEvaluationPacket(packet, { armId: "C1", kind: "batch", recordIds: ["SIM-MATCHED-W2:C2:BATCH-004"] }), /record_not_in_published_packet/);
});

test("cross-window copied records, inaccurate paired targets and repurposed evidence labels are rejected", () => {
  rejectMutation((corpus) => { evalArm(corpus, "C2").routeTasks[0] = structuredClone(evalArm(corpus, "C1").routeTasks[0]); }, "record_binding_invalid");
  rejectMutation((corpus) => { evalArm(corpus, "C1").routeTasks[0].targetItemId = "R0-044"; }, "matched_task_manifest_mismatch");
  rejectMutation((corpus) => { corpus.metadata.engineeringExecutionEvidence = true; }, "evidence_boundary_invalid");
});

test("preview omissions, fabricated effective scopes, lost payload and incomplete undo cannot survive reconciliation", () => {
  rejectMutation((corpus) => { evalArm(corpus, "C1").batchCases[3].events.find((event) => event.type === "apply_batch").effectiveItemIds = ["R0-042"]; }, "batch_apply_invalid");
  rejectMutation((corpus) => { evalArm(corpus, "C2").batchCases[3].events.find((event) => event.type === "preview_batch").selectedItemIds = []; }, "batch_preview_invalid");
  rejectMutation((corpus) => { evalArm(corpus, "C1").batchCases[3].afterCommitItems[0].note = "lost"; }, "batch_derived_state_mismatch");
  rejectMutation((corpus) => { evalArm(corpus, "C1").batchCases[3].events.find((event) => event.type === "undo_batch").afterItems[1].memberships = []; }, "batch_undo_invalid");
});

test("material queries cannot fabricate a missing group and malformed input fails closed", () => {
  assert.equal(validateLinkedCandidateEvaluationCorpus(null).valid, false);
  const corpus = createLinkedCandidateEvaluationCorpus();
  const packet = publishLinkedCandidateEvaluation(corpus, request(corpus, "C1"));
  assert.throws(() => queryLinkedCandidateEvaluationPacket(packet, { armId: "C1", kind: "route", group: "scope_mismatch" }), /record_group_invalid/);
  assert.throws(() => queryLinkedCandidateEvaluationPacket(corpus, { armId: "C1", kind: "batch" }), /published_packet_required/);
});
