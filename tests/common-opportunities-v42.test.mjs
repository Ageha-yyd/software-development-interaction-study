import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCommonOpportunities,
  validateCommonOpportunities,
  evaluateCommonDisposition,
} from '../scenarios/materials/common-opportunities-v4.2.mjs';

const LOCAL = 'OP:COMMON-LOCAL-STATE';
const WATCH = 'OP:COMMON-COMPOUND-WL';
const PORT = 'OP:COMMON-LOCAL-PORTABILITY';
const MIG = 'OP:COMMON-COMPOUND-PORTABILITY';
const opportunities = getCommonOpportunities();

function validInput(id, action) {
  const rule = opportunities.find((op) => op.id === id).gold.find((gold) => gold.action === action);
  return {
    facts: structuredClone(rule.requiredFacts),
    revision: rule.revision,
    scope: [...rule.scope],
    action,
    explicitParticipantDecision: true,
    evidenceRefs: [...rule.evidenceRefs],
  };
}

test('four isolated authored opportunities have complete supported predicates and honest evidence labels', () => {
  assert.deepEqual(validateCommonOpportunities(), {
    valid: true, errors: [], opportunityCount: 4,
    evidenceClass: 'authored_synthetic_stimulus', qualifiesHumanStudy: false,
  });
  assert.equal(new Set(opportunities.map((op) => op.sandboxId)).size, 4);
  assert.equal(opportunities.filter((op) => op.complexity === 'local').length, 2);
  assert.equal(opportunities.filter((op) => op.complexity === 'compound').length, 2);
  assert.doesNotMatch(JSON.stringify(opportunities), /item-?042|Offline-first|deadlineMs|sampleSize/i);
  for (const op of opportunities) {
    assert.equal(op.factsAvailableTogether, true);
    assert.equal(op.observedParticipantData, false);
    assert.equal(op.engineeringExecutionEvidence, false);
  }
});

test('trigger introduces the problem without disclosing its decisive state or missing-check answer', () => {
  assert.doesNotMatch(opportunities.find((op) => op.id === LOCAL).trigger, /仍待处理|orthogonal|pending|不应出现在/);
  assert.doesNotMatch(opportunities.find((op) => op.id === WATCH).trigger, /焦点.*未|缺.*检查|不覆盖|失效/);
  assert.doesNotMatch(opportunities.find((op) => op.id === PORT).trigger, /R3|ID.*URL|不覆盖/);
  assert.doesNotMatch(opportunities.find((op) => op.id === MIG).trigger, /未.*验证|缺.*检查|恢复.*失败/);
});

test('explicit technically grounded confirm, limited acceptance, retain and defer pass', () => {
  for (const [id, action] of [[LOCAL, 'confirm'], [LOCAL, 'retain'], [WATCH, 'retain'], [WATCH, 'defer'],
    [PORT, 'accept'], [PORT, 'retain'], [MIG, 'accept'], [MIG, 'retain'], [MIG, 'defer']]) {
    const result = evaluateCommonDisposition(id, validInput(id, action));
    assert.equal(result.valid, true, `${id}/${action}: ${result.reasons}`);
    assert.equal(result.humanQualityAssessed, false);
    assert.equal(result.participantDecisionIndependentlyObserved, false);
  }
});

test('Full Chat may return the entire scope in one request without a click or read sequence', () => {
  const op = opportunities.find((entry) => entry.id === MIG);
  const oneCompoundResponse = validInput(MIG, 'defer');
  oneCompoundResponse.facts = Object.assign({}, ...op.facts.map((entry) => entry.assertions));
  oneCompoundResponse.evidenceRefs = op.facts.map((entry) => entry.id).reverse();
  oneCompoundResponse.scope.reverse();
  assert.equal(evaluateCommonDisposition(MIG, oneCompoundResponse).valid, true);
  assert.ok(!Object.hasOwn(oneCompoundResponse, 'clicks'));
});

test('state relation is checked precisely rather than treating all safe sounding decisions as valid', () => {
  const input = validInput(LOCAL, 'retain');
  input.facts.pending = false;
  input.facts.unsortedVisible = true;
  const result = evaluateCommonDisposition(LOCAL, input);
  assert.equal(result.valid, false);
  assert.ok(result.reasons.includes('contradicted_fact:pending'));
  assert.ok(result.reasons.includes('contradicted_fact:unsortedVisible'));
});

test('generic or incomplete defer cannot pass a real missing-check task', () => {
  const generic = validInput(WATCH, 'defer');
  generic.facts = { missingCheck: 'more-data-needed', safeRevision: 'ANCHOR-WL-R0' };
  assert.equal(evaluateCommonDisposition(WATCH, generic).valid, false);
  const incomplete = validInput(WATCH, 'defer');
  delete incomplete.facts.nextCheck;
  assert.equal(evaluateCommonDisposition(WATCH, incomplete).valid, false);
  const irrelevant = validInput(MIG, 'defer');
  irrelevant.facts.nextChecks = ['more-usage-research'];
  assert.equal(evaluateCommonDisposition(MIG, irrelevant).valid, false);
});

test('incomplete evidence blocks candidate adoption but valid retain does not require adopting a feature', () => {
  const adoption = validInput(WATCH, 'defer');
  adoption.action = 'accept';
  assert.ok(evaluateCommonDisposition(WATCH, adoption).reasons.includes('action_not_allowed_for_this_evidence'));
  assert.equal(evaluateCommonDisposition(WATCH, validInput(WATCH, 'retain')).valid, true);
});

test('historical receipt may diagnose staleness but cannot count as a current check', () => {
  const input = validInput(WATCH, 'defer');
  assert.ok(input.evidenceRefs.includes('AW:OLD-RECEIPT'));
  assert.equal(evaluateCommonDisposition(WATCH, input).valid, true);
  input.facts.oldReceiptCurrentForCancel = true;
  assert.ok(evaluateCommonDisposition(WATCH, input).reasons.includes('contradicted_fact:oldReceiptCurrentForCancel'));
  const oldSubject = validInput(WATCH, 'defer');
  oldSubject.revision = 'ANCHOR-WL-C1';
  assert.ok(evaluateCommonDisposition(WATCH, oldSubject).reasons.includes('wrong_subject_revision'));
});

test('valid export cannot be promoted into unsupported full migration acceptance', () => {
  const input = validInput(MIG, 'accept');
  assert.equal(evaluateCommonDisposition(MIG, input).valid, true);
  input.scope = ['full-migration'];
  assert.equal(evaluateCommonDisposition(MIG, input).valid, false);
  const fabricated = validInput(MIG, 'accept');
  fabricated.facts.rollbackVerified = true;
  assert.ok(evaluateCommonDisposition(MIG, fabricated).reasons.includes('contradicted_fact:rollbackVerified'));
});

test('local portability cannot extrapolate a current roundtrip into future migration or routes', () => {
  const input = validInput(PORT, 'accept');
  input.facts.coversFutureMigration = true;
  assert.equal(evaluateCommonDisposition(PORT, input).valid, false);
  const crossScope = validInput(PORT, 'accept');
  crossScope.scope.push('legacy-links');
  assert.equal(evaluateCommonDisposition(PORT, crossScope).valid, false);
  const pretendMissing = validInput(PORT, 'retain');
  pretendMissing.action = 'defer';
  assert.equal(evaluateCommonDisposition(PORT, pretendMissing).valid, false);
});

test('Agent suggestion alone or truthy substitutes cannot assert explicit participant disposition', () => {
  for (const value of [false, undefined, 'true', 1]) {
    const input = validInput(LOCAL, 'confirm');
    input.explicitParticipantDecision = value;
    assert.ok(evaluateCommonDisposition(LOCAL, input).reasons.includes('explicit_participant_decision_required'));
  }
});

test('provenance is scoped and unsupported extra assertions are rejected', () => {
  const crossEvidence = validInput(LOCAL, 'confirm');
  crossEvidence.evidenceRefs.push('AM:ROUNDTRIP');
  assert.ok(evaluateCommonDisposition(LOCAL, crossEvidence).reasons.includes('unknown_evidence:AM:ROUNDTRIP'));
  const missingEvidence = validInput(LOCAL, 'confirm');
  missingEvidence.evidenceRefs = ['AS:ITEM-201'];
  assert.equal(evaluateCommonDisposition(LOCAL, missingEvidence).valid, false);
  const hallucination = validInput(LOCAL, 'confirm');
  hallucination.facts.userUnderstandsBothViews = true;
  assert.ok(evaluateCommonDisposition(LOCAL, hallucination).reasons.includes('unsupported_fact:userUnderstandsBothViews'));
});

test('malformed structured assertions fail closed and contain no timing or click heuristic', () => {
  for (const input of [null, [], 'correct']) assert.equal(evaluateCommonDisposition(LOCAL, input).valid, false);
  assert.equal(evaluateCommonDisposition('missing', {}).valid, false);
  const duplicate = validInput(LOCAL, 'confirm');
  duplicate.evidenceRefs.push(duplicate.evidenceRefs[0]);
  assert.equal(evaluateCommonDisposition(LOCAL, duplicate).valid, false);
  const decorated = validInput(LOCAL, 'confirm');
  decorated.clickCount = 100;
  assert.ok(evaluateCommonDisposition(LOCAL, decorated).reasons.includes('unknown_disposition_field'));
});

test('consumer mutation cannot change the material or scoring authority', () => {
  const copy = getCommonOpportunities();
  copy[0].gold[0].requiredFacts.pending = false;
  copy[0].facts[0].assertions.pending = false;
  assert.equal(getCommonOpportunities()[0].facts[0].assertions.pending, true);
  assert.equal(evaluateCommonDisposition(LOCAL, validInput(LOCAL, 'confirm')).valid, true);
});

test('material validator detects unsupported Gold, provenance and cross-sandbox corruption', () => {
  const corrupted = getCommonOpportunities();
  corrupted[0].gold[0].requiredFacts.pending = false;
  corrupted[1].sandboxId = corrupted[0].sandboxId;
  corrupted[2].facts[0].source = 'human-participant-observation';
  const result = validateCommonOpportunities(corrupted);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((entry) => entry.endsWith('gold_not_supported:pending')));
  assert.ok(result.errors.some((entry) => entry.endsWith('sandbox_not_isolated')));
  assert.ok(result.errors.some((entry) => entry.endsWith('invalid_fact')));
  assert.equal(validateCommonOpportunities(null).valid, false);
});
