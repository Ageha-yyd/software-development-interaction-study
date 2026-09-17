import test from 'node:test';
import assert from 'node:assert/strict';
import { getCommonOpportunities } from '../scenarios/materials/common-opportunities-v4.2.mjs';
import { validateReviewPacket, prepareReviewPacket, REVIEW_QUALITY_DIMENSIONS } from '../lib/experiment/review-packet.mjs';

const SCENARIO = 'software-common-v42-local-state';
const REVISION = 'ANCHOR-STATE-R7';

function fixture() {
  const event = (sequence, monotonicMs, name, phase, payload = {}) => ({
    schemaVersion: 'software-development-browser-preview-v1', sessionId: 'synthetic-session-1', sequence,
    scenarioId: SCENARIO, condition: 'B', phase, event: name,
    timestampUtc: '2026-09-12T00:00:00.000Z', monotonicMs, payload,
  });
  const exposure = { sessionId: 'synthetic-session-1', sequence: 2, monotonicMs: 20 };
  const submission = (index, at, finalized = false) => ({
    submissionId: `synthetic-submission-${index}`, scenarioId: SCENARIO, period: 0, condition: 'B',
    subjectRevision: REVISION, informationSpaceVersion: 'v4.2-e0',
    participantOriginalText: `合成审阅测试表达 ${index}，不是实际参与者。`,
    explicitSubmissionAtMonotonicMs: at, exposure: { ...exposure },
    dispositionValidity: 'manual_review_pending', timeToVerifiedGold: null, humanQuality: null,
    submissionIsNotVerifiedCompletion: true, participantFinalizedOpportunity: finalized,
  });
  return {
    schemaVersion: 'software-development-v4.2-review-packet', evidenceClass: 'synthetic_review_fixture',
    reviewPacketId: 'synthetic-packet', clockTimeOrigin: 1789142400000,
    formalStudyData: false, clock: 'single_document_performance_now', exportedAtMonotonicMs: 100,
    allocation: { condition: 'B', sequence: 0, allocatedAtMonotonicMs: 5, formalAssignment: false },
    currentStage: 'common-1',
    missing: ['independent disposition coding', 'formal consent and immutable collection'],
    sessions: { 'synthetic-session-1': [
      event(1, 10, 'session_started', 'baseline'),
      event(2, 20, 'trigger_stable_visible', 'trigger', { visibilityState: 'visible', informationSpaceVersion: 'v4.2-e0' }),
      event(3, 30, 'agent_response_recorded', 'trigger', { groundedNodeIds: [] }),
    ] },
    dispositions: [submission(0, 40), submission(1, 60), submission(2, 80, true)],
  };
}

function code(index, validity = 'valid', overrides = {}) {
  return {
    submissionIndex: index, reviewerId: 'synthetic-reviewer', validity,
    rationale: '合成测试中的显式编码依据；不冒称真实独立评审。',
    scenarioId: SCENARIO, period: 0, condition: 'B', sessionId: 'synthetic-session-1',
    exposureSequence: 2, revision: REVISION, ...overrides,
  };
}

function technical() {
  const rule = getCommonOpportunities()[0].gold[0];
  return {
    facts: structuredClone(rule.requiredFacts), revision: rule.revision, scope: [...rule.scope],
    action: rule.action, explicitParticipantDecision: true, evidenceRefs: [...rule.evidenceRefs],
  };
}

test('an unreviewed packet remains pending even when every sentence sounds correct and the opportunity ended', () => {
  const packet = fixture();
  packet.dispositions.forEach((entry) => { entry.participantOriginalText = '当前状态正确，明确接受。'; });
  const output = prepareReviewPacket(packet);
  assert.equal(output.valid, true);
  assert.equal(output.opportunities[0].participantFinalizedOpportunity, true);
  assert.equal(output.opportunities[0].timeToFirstValidDisposition, null);
  assert.equal(output.opportunities[0].submissions[0].reviewStatus, 'pending');
  assert.equal(output.opportunities.length, 5);
  assert.equal(output.opportunities[1].observationStatus, 'not_started');
  assert.equal(output.completionRate, null);
  assert.equal(output.restrictedTime, null);
});

test('reviewed earlier invalid submissions followed by a valid explicit submission identify the first valid time', () => {
  const output = prepareReviewPacket(fixture(), { validityCodings: [
    code(0, 'invalid'), code(1, 'valid', { technicalDisposition: technical() }), code(2, 'valid'),
  ] });
  assert.equal(output.valid, true);
  const row = output.opportunities[0];
  assert.equal(row.timeToFirstValidDisposition, 40);
  assert.equal(row.firstValidSubmissionId, 'synthetic-submission-1');
  assert.equal(row.submissions.length, 3);
  assert.equal(row.restrictedTime, null);
  assert.equal(row.validByDeadline, null);
  assert.equal(output.reviewerIdentityVerified, false);
  assert.equal(output.reviewerIndependenceVerified, false);
  assert.equal(output.formalStudyData, false);
});

test('a later reviewed valid statement cannot establish first-valid time while an earlier statement is pending or uncertain', () => {
  for (const earlier of [[], [code(0, 'uncertain')]]) {
    const output = prepareReviewPacket(fixture(), { validityCodings: [...earlier, code(1)] });
    assert.equal(output.valid, true);
    assert.equal(output.opportunities[0].timeToFirstReviewedValidDisposition, 40);
    assert.equal(output.opportunities[0].timeToFirstValidDisposition, null);
    assert.equal(output.opportunities[0].validityStatus, 'earlier_submissions_unresolved');
  }
});

test('reviewer disagreement and a claimed valid decision contradicted by the technical predicate remain unresolved', () => {
  const disagreement = prepareReviewPacket(fixture(), { validityCodings: [code(0), code(0, 'invalid', { reviewerId: 'second-synthetic-reviewer' })] });
  assert.equal(disagreement.opportunities[0].submissions[0].reviewStatus, 'disputed');
  assert.equal(disagreement.opportunities[0].timeToFirstValidDisposition, null);
  const wrong = technical();
  wrong.facts.pending = false;
  const conflict = prepareReviewPacket(fixture(), { validityCodings: [code(0, 'valid', { technicalDisposition: wrong })] });
  assert.equal(conflict.valid, true);
  assert.equal(conflict.opportunities[0].submissions[0].reviewStatus, 'technical_conflict');
  assert.equal(conflict.opportunities[0].timeToFirstValidDisposition, null);
});

test('quality codes are separate, do not create validity, and are never averaged into the cost outcome', () => {
  const quality = { ...code(0), scores: Object.fromEntries(REVIEW_QUALITY_DIMENSIONS.map((key) => [key, 2])) };
  delete quality.validity;
  const output = prepareReviewPacket(fixture(), { qualityCodings: [quality] });
  assert.equal(output.valid, true);
  assert.equal(output.opportunities[0].qualityCodings.length, 1);
  assert.equal(output.opportunities[0].humanQuality, null);
  assert.equal(output.opportunities[0].timeToFirstValidDisposition, null);
  quality.scores.traceability = 3;
  assert.equal(prepareReviewPacket(fixture(), { qualityCodings: [quality] }).valid, false);
});

test('stable submission IDs and legacy indexes bind correctly, and conflicting references are rejected', () => {
  const byId = code(undefined, 'valid', { submissionId: 'synthetic-submission-0' });
  delete byId.submissionIndex;
  assert.equal(prepareReviewPacket(fixture(), { validityCodings: [byId] }).opportunities[0].timeToFirstValidDisposition, 20);
  const conflict = { ...byId, submissionIndex: 1 };
  assert.equal(prepareReviewPacket(fixture(), { validityCodings: [conflict] }).valid, false);
  const legacy = fixture();
  legacy.dispositions.forEach((entry) => { delete entry.submissionId; delete entry.subjectRevision; });
  delete legacy.exportedAtMonotonicMs;
  const old = prepareReviewPacket(legacy, { validityCodings: [code(0)] });
  assert.equal(old.valid, true);
  assert.equal(old.opportunities[0].firstValidSubmissionId, 'submission-index:0');
  assert.ok(old.warnings.includes('runtime_subject_revision_not_recorded:0'));
  assert.ok(old.warnings.includes('export_clock_boundary_not_recorded'));
});

test('cross-condition, cross-scenario, cross-period and cross-session human codes are rejected', () => {
  for (const override of [{ condition: 'A' }, { scenarioId: 'software-common-v42-local-portability' },
    { period: 1 }, { sessionId: 'other-session' }, { exposureSequence: 3 }, { revision: 'OLD-REVISION' }]) {
    const output = prepareReviewPacket(fixture(), { validityCodings: [code(0, 'valid', override)] });
    assert.equal(output.valid, false, JSON.stringify(override));
    assert.equal(output.opportunities.length, 0);
  }
});

test('empty reviewer identity, missing reasons, duplicate codes and unsupported validity fail closed', () => {
  for (const coding of [code(0, 'valid', { reviewerId: '' }), code(0, 'valid', { rationale: ' ' }), code(0, 'passed'), code(999)]) {
    assert.equal(prepareReviewPacket(fixture(), { validityCodings: [coding] }).valid, false);
  }
  assert.equal(prepareReviewPacket(fixture(), { validityCodings: [code(0), code(0)] }).valid, false);
});

test('wrong exposure sequence, timestamps, future exposure and hidden rendering cannot produce a timing row', () => {
  const mutations = [
    (p) => { p.dispositions[0].exposure.sequence = 3; },
    (p) => { p.dispositions[0].exposure.monotonicMs = 21; },
    (p) => { p.dispositions[0].explicitSubmissionAtMonotonicMs = 19; },
    (p) => { p.sessions['synthetic-session-1'][1].payload.visibilityState = 'hidden'; },
    (p) => { p.dispositions[0].exposure.sessionId = 'missing'; },
  ];
  for (const mutate of mutations) {
    const packet = fixture(); mutate(packet);
    const output = prepareReviewPacket(packet, { validityCodings: [code(0)] });
    assert.equal(output.valid, false);
    assert.equal(output.opportunities.length, 0);
  }
});

test('event sequence integrity, allocation order and same-document export boundaries are checked', () => {
  const mutations = [
    (p) => { p.sessions['synthetic-session-1'][1].sequence = 9; },
    (p) => { p.sessions['synthetic-session-1'][2].monotonicMs = 19; },
    (p) => { p.sessions['synthetic-session-1'][1].condition = 'A'; },
    (p) => { p.allocation.sequence = 1; },
    (p) => { p.exportedAtMonotonicMs = 70; },
    (p) => { p.dispositions[0].subjectRevision = 'wrong'; },
    (p) => { p.dispositions[1].submissionId = p.dispositions[0].submissionId; },
    (p) => { p.sessions['synthetic-session-1'][1].payload.informationSpaceVersion = 'v4-pilot.1'; },
    (p) => { p.dispositions[0].informationSpaceVersion = 'v4-pilot.1'; },
    (p) => { p.sessions['synthetic-session-1'][1].timestampUtc = 'not-a-timestamp'; },
    (p) => { p.clockTimeOrigin = -1; },
  ];
  for (const mutate of mutations) {
    const packet = fixture(); mutate(packet);
    assert.equal(validateReviewPacket(packet).valid, false);
  }
});

test('a finalization is retained as a participant action and subsequent same-period submissions are rejected', () => {
  const packet = fixture();
  packet.dispositions[0].participantFinalizedOpportunity = true;
  assert.ok(validateReviewPacket(packet).errors.some((entry) => entry.startsWith('submission_after_finalized_opportunity')));
});

test('missing disposition, withdrawal labels and partial sessions never receive an invented deadline value', () => {
  const packet = fixture();
  packet.dispositions = [];
  packet.currentStage = 'withdrawn';
  const output = prepareReviewPacket(packet);
  assert.equal(output.valid, true);
  assert.equal(output.opportunities[0].observationStatus, 'no_disposition_recorded');
  assert.equal(output.opportunities[0].timeToFirstValidDisposition, null);
  assert.equal(output.opportunities[0].restrictedTime, null);
  assert.equal(output.completionRate, null);
  assert.equal(output.sourceCurrentStage, 'withdrawn');
  assert.deepEqual(output.sourceMissing, packet.missing);
  assert.equal(output.sourceReviewPacketId, 'synthetic-packet');
  assert.equal(output.sourceClockTimeOrigin, packet.clockTimeOrigin);
});

test('baseline onboarding can precede B allocation in A without being scored as an A task', () => {
  const packet = fixture();
  packet.sessions.onboarding = [{ ...packet.sessions['synthetic-session-1'][0], sessionId: 'onboarding',
    scenarioId: 'software-product-development-v1', condition: 'A', monotonicMs: 1 }];
  const output = prepareReviewPacket(packet);
  assert.equal(output.valid, true);
  assert.equal(output.opportunities[4].observationStatus, 'not_started');
});

test('open-task validity requires a recorded subject revision rather than inventing a revision from prose', () => {
  const packet = fixture();
  const entries = packet.sessions['synthetic-session-1'];
  entries.forEach((entry) => { entry.scenarioId = 'software-product-development-v1'; });
  packet.dispositions.forEach((entry) => { entry.scenarioId = 'software-product-development-v1'; entry.period = 4; entry.subjectRevision = null; });
  const coding = code(0, 'valid', { scenarioId: 'software-product-development-v1', period: 4, revision: 'C2' });
  const missing = prepareReviewPacket(packet, { validityCodings: [coding] });
  assert.equal(missing.valid, true);
  assert.equal(missing.opportunities[4].submissions[0].reviewStatus, 'revision_unresolved');
  assert.equal(missing.opportunities[4].timeToFirstValidDisposition, null);
  packet.dispositions.forEach((entry) => { entry.subjectRevision = 'C2'; });
  const stated = prepareReviewPacket(packet, { validityCodings: [coding] });
  assert.equal(stated.opportunities[4].timeToFirstValidDisposition, 20);
});

test('preparation does not mutate participant statements, event arrays or external codes', () => {
  const packet = fixture();
  const codes = [code(0)];
  const originalPacket = structuredClone(packet);
  const originalCodes = structuredClone(codes);
  const output = prepareReviewPacket(packet, { validityCodings: codes });
  output.opportunities[0].submissions[0].validityCodings[0].rationale = 'changed output only';
  assert.deepEqual(packet, originalPacket);
  assert.deepEqual(codes, originalCodes);
});

test('unsupported schemas, absent allocation with submissions and fabricated prevalidated fields are rejected', () => {
  assert.equal(validateReviewPacket(null).valid, false);
  assert.equal(prepareReviewPacket({}).valid, false);
  for (const mutate of [
    (p) => { p.formalStudyData = true; },
    (p) => { p.allocation = null; },
    (p) => { p.dispositions[0].dispositionValidity = 'valid'; },
    (p) => { p.dispositions[0].timeToVerifiedGold = 20; },
    (p) => { p.clock = 'mixed_reload_clocks'; },
  ]) {
    const packet = fixture(); mutate(packet);
    assert.equal(prepareReviewPacket(packet).valid, false);
  }
});

test('per-submission review views exclude later messages and later sources while retaining exact earlier dialogue', () => {
  const packet = fixture();
  const events = packet.sessions['synthetic-session-1'];
  const extra = (monotonicMs, event, payload) => ({ ...events[0], sequence: events.length + 1,
    phase: 'trigger', monotonicMs, event, payload });
  events[2] = { ...events[2], event: 'chat_action_started', payload: { rawText: '合成原始问题，请核对当前证据。' } };
  events.push(extra(31, 'agent_response_recorded', { responseText: '已记录的 [[INFO:CURRENT|当前证据]]，不推断后续结果。' }));
  events.push(extra(32, 'evidence_text_presented', { sources: [{ text: '提交前的材料正文', source: 'authored://synthetic/current', exactRevision: REVISION }] }));
  events.push(extra(33, 'participant_confirmation_recorded', { confirmationText: '确认执行已审阅操作。', authoredReason: false }));
  events.push(extra(50, 'agent_response_recorded', { responseText: 'FUTURE_RESPONSE_MUST_NOT_LEAK' }));
  events.push(extra(51, 'evidence_text_presented', { sources: [{ text: 'FUTURE_SOURCE_MUST_NOT_LEAK', source: 'authored://synthetic/future', exactRevision: REVISION }] }));
  const result = prepareReviewPacket(packet);
  assert.equal(result.valid, true);
  const first = result.perSubmissionReviewView[0];
  assert.equal(first.reviewerView.participantOriginalText, packet.dispositions[0].participantOriginalText);
  assert.equal(first.reviewerView.precedingMessages[0].text, '合成原始问题，请核对当前证据。');
  assert.equal(first.reviewerView.precedingMessages[1].text, '已记录的 当前证据，不推断后续结果。');
  assert.equal(first.reviewerView.precedingMessages[2].origin, 'confirmation_of_presented_action');
  assert.equal(first.reviewerView.disclosedSources.length, 1);
  assert.ok(!JSON.stringify(first.reviewerView).includes('FUTURE_'));
  assert.ok(JSON.stringify(result.perSubmissionReviewView[1].reviewerView).includes('FUTURE_RESPONSE_MUST_NOT_LEAK'));
  assert.ok(result.perSubmissionReviewView[1].reviewerView.precedingMessages.some((entry) =>
    entry.origin === 'earlier_recorded_disposition' && entry.text === packet.dispositions[0].participantOriginalText));
});

test('reviewer view omits allocation, clocks, audit IDs and object events rather than claiming perfect blinding', () => {
  const packet = fixture();
  packet.sessions['synthetic-session-1'][2] = { ...packet.sessions['synthetic-session-1'][2],
    event: 'object_detail_visible', payload: { objectRef: 'B_OBJECT_PATH', nodeId: 'SECRET_NODE', body: 'UNRECORDED_SOURCE' } };
  const result = prepareReviewPacket(packet);
  const { reviewerView, internalBinding } = result.perSubmissionReviewView[0];
  const forbidden = new Set(['condition', 'period', 'scenarioId', 'sessionId', 'submissionId', 'sequence',
    'monotonicMs', 'timestampUtc', 'objectRef', 'nodeId', 'exposure', 'submittedAtMonotonicMs']);
  const inspect = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) { assert.ok(!forbidden.has(key), key); inspect(child); }
  };
  inspect(reviewerView);
  assert.equal(reviewerView.contentMayRevealInterface, true);
  assert.equal(reviewerView.qualityAssessment, null);
  assert.equal(reviewerView.materialCompleteness, 'manual_review_pending');
  assert.equal(internalBinding.condition, 'B');
  assert.equal(internalBinding.submissionAtMonotonicMs, 40);
  assert.ok(!JSON.stringify(reviewerView).includes('B_OBJECT_PATH'));
  assert.ok(!JSON.stringify(reviewerView).includes('UNRECORDED_SOURCE'));
  assert.ok(internalBinding.missing.includes('separately_recorded_source_text_unavailable'));
});

test('unshown public snapshot facts and other-session material are not backfilled into a review view', () => {
  const packet = fixture();
  packet.sessions['synthetic-session-1'][2] = { ...packet.sessions['synthetic-session-1'][2],
    event: 'product_action_execution_returned', payload: { publicFacts: [{ text: 'UNSHOWN_PRODUCT_ITEM', source: 'executable_product_session', exactRevision: REVISION }] } };
  packet.sessions.onboarding = [
    { ...packet.sessions['synthetic-session-1'][0], sessionId: 'onboarding', scenarioId: 'software-product-development-v1', condition: 'A', monotonicMs: 1 },
    { ...packet.sessions['synthetic-session-1'][0], sessionId: 'onboarding', scenarioId: 'software-product-development-v1', condition: 'A', monotonicMs: 2,
      sequence: 2, event: 'agent_response_recorded', payload: { responseText: 'OTHER_SESSION_TEXT' } },
  ];
  const result = prepareReviewPacket(packet);
  assert.equal(result.valid, true);
  const serialized = JSON.stringify(result.perSubmissionReviewView[0].reviewerView);
  assert.ok(!serialized.includes('UNSHOWN_PRODUCT_ITEM'));
  assert.ok(!serialized.includes('OTHER_SESSION_TEXT'));
  for (const fact of getCommonOpportunities()[0].facts) assert.ok(!serialized.includes(fact.text));
});

test('equal-timestamp event ambiguity is excluded and marked rather than assuming a future event came first', () => {
  const packet = fixture();
  packet.sessions['synthetic-session-1'][2] = { ...packet.sessions['synthetic-session-1'][2], monotonicMs: 40,
    event: 'agent_response_recorded', payload: { responseText: 'AMBIGUOUS_BOUNDARY_TEXT' } };
  const result = prepareReviewPacket(packet);
  assert.equal(result.valid, true);
  assert.ok(!JSON.stringify(result.perSubmissionReviewView[0].reviewerView).includes('AMBIGUOUS_BOUNDARY_TEXT'));
  assert.deepEqual(result.perSubmissionReviewView[0].internalBinding.excludedEqualTimestampEventSequences, [3]);
  assert.ok(result.perSubmissionReviewView[0].internalBinding.missing.includes('equal_timestamp_event_order_unresolved'));
});

test('review views stay available for a valid source when separately supplied coding has an alignment error', () => {
  const result = prepareReviewPacket(fixture(), { validityCodings: [code(0, 'valid', { revision: 'wrong-revision' })] });
  assert.equal(result.valid, false);
  assert.equal(result.perSubmissionReviewView.length, 3);
  assert.equal(result.perSubmissionReviewView[0].reviewerView.participantOriginalText, fixture().dispositions[0].participantOriginalText);
  assert.deepEqual(result.opportunities, []);
});
