/**
 * Offline preparation of preview records and separately supplied reviewer codes.
 * This module is organizer-only: it imports technical predicates and must not be
 * included in a participant/client bundle. It does not infer intent from text,
 * authenticate reviewers, qualify human data, or estimate a treatment effect.
 */
import { getCommonOpportunities, evaluateCommonDisposition } from '../../scenarios/materials/common-opportunities-v4.2.mjs';

const SCHEMA = 'software-development-v4.2-review-packet';
const OPEN_SCENARIO = 'software-product-development-v1';
const COMMON_IDS = [
  'software-common-v42-local-state', 'software-common-v42-compound-state',
  'software-common-v42-local-portability', 'software-common-v42-compound-portability',
];
const SEQUENCES = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]];
const COMMON = new Map(getCommonOpportunities().map((op, index) => [COMMON_IDS[index], op]));
export const REVIEW_QUALITY_DIMENSIONS = Object.freeze([
  'evidenceSupport', 'scopeAppropriateness', 'tradeoffCalibration', 'internalConsistency', 'traceability',
]);

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const time = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const clone = (value) => structuredClone(value);
const unique = (values) => [...new Set(values)];
const expectedScenario = (allocation, period) => period === 4 ? OPEN_SCENARIO : COMMON_IDS[SEQUENCES[allocation.sequence][period]];

function inspectPacket(packet) {
  const errors = [];
  const warnings = [];
  const submissions = [];
  const sessionMap = new Map();
  const fail = (code) => errors.push(code);
  if (!record(packet)) return { errors: ['packet_must_be_record'], warnings, submissions, sessionMap };
  if (packet.schemaVersion !== SCHEMA) fail('packet_schema_mismatch');
  if (packet.clock !== 'single_document_performance_now') fail('unsupported_clock');
  if (packet.formalStudyData !== false) fail('preview_boundary_required');
  if (!['engineering_preview_interaction_record', 'synthetic_review_fixture'].includes(packet.evidenceClass)) fail('unsupported_evidence_class');
  if (!record(packet.sessions) || !Array.isArray(packet.dispositions)) {
    fail('sessions_map_and_dispositions_array_required');
    return { errors, warnings, submissions, sessionMap };
  }
  const allocation = packet.allocation;
  if (allocation !== null && (!record(allocation) || !['A', 'B'].includes(allocation.condition)
    || !Number.isInteger(allocation.sequence) || allocation.sequence < 0 || allocation.sequence >= SEQUENCES.length
    || !time(allocation.allocatedAtMonotonicMs) || allocation.formalAssignment !== false)) fail('invalid_preview_allocation');
  if (allocation === null && packet.dispositions.length) fail('dispositions_without_allocation');
  const allocationValid = record(allocation) && ['A', 'B'].includes(allocation.condition)
    && Number.isInteger(allocation.sequence) && allocation.sequence >= 0 && allocation.sequence < SEQUENCES.length
    && time(allocation.allocatedAtMonotonicMs);
  const exportBound = packet.exportedAtMonotonicMs;
  if (packet.reviewPacketId !== undefined && packet.reviewPacketId !== null && !text(packet.reviewPacketId)) fail('invalid_review_packet_id');
  if (packet.clockTimeOrigin !== undefined && !time(packet.clockTimeOrigin)) fail('invalid_clock_time_origin');
  if (exportBound === undefined) warnings.push('export_clock_boundary_not_recorded');
  else if (!time(exportBound)) fail('invalid_export_clock_boundary');
  if (allocationValid && time(exportBound) && allocation.allocatedAtMonotonicMs > exportBound) fail('allocation_after_export');

  for (const [sessionId, entries] of Object.entries(packet.sessions)) {
    if (!text(sessionId) || !Array.isArray(entries) || !entries.length) { fail(`invalid_session:${sessionId}`); continue; }
    const first = entries[0];
    if (!record(first)) { fail(`invalid_session_event:${sessionId}:1`); continue; }
    const scenarioId = first.scenarioId;
    if (!COMMON.has(scenarioId) && scenarioId !== OPEN_SCENARIO) fail(`unknown_session_scenario:${sessionId}`);
    if (first.event !== 'session_started') fail(`session_start_missing:${sessionId}`);
    let previous = -1;
    for (let index = 0; index < entries.length; index += 1) {
      const event = entries[index];
      if (!record(event)) { fail(`invalid_session_event:${sessionId}:${index + 1}`); continue; }
      if (event.schemaVersion !== 'software-development-browser-preview-v1'
        || event.sessionId !== sessionId || event.scenarioId !== scenarioId || event.condition !== first.condition
        || !['A', 'B'].includes(event.condition) || !['baseline', 'trigger', 'complete'].includes(event.phase)
        || event.sequence !== index + 1 || !record(event.payload) || !text(event.event)) fail(`event_binding_mismatch:${sessionId}:${index + 1}`);
      if (!text(event.timestampUtc) || !Number.isFinite(Date.parse(event.timestampUtc))) fail(`event_wall_clock_invalid:${sessionId}:${index + 1}`);
      if (event.payload?.informationSpaceVersion !== undefined && event.payload.informationSpaceVersion !== 'v4.2-e0') fail(`event_information_space_mismatch:${sessionId}:${index + 1}`);
      if (!time(event.monotonicMs) || event.monotonicMs < previous) fail(`event_clock_invalid:${sessionId}:${index + 1}`);
      if (time(event.monotonicMs)) previous = event.monotonicMs;
      if (time(exportBound) && event.monotonicMs > exportBound) fail(`event_after_export:${sessionId}:${index + 1}`);
    }
    const onboarding = scenarioId === OPEN_SCENARIO && (!allocationValid || first.monotonicMs < allocation.allocatedAtMonotonicMs);
    if (onboarding) {
      if (first.condition !== 'A' || entries.some((event) => event?.phase === 'trigger')) fail(`onboarding_not_common_baseline:${sessionId}`);
    } else if (!allocationValid || first.condition !== allocation.condition || first.monotonicMs < allocation.allocatedAtMonotonicMs) {
      fail(`session_allocation_mismatch:${sessionId}`);
    }
    const exposures = entries.filter((event) => event?.event === 'trigger_stable_visible');
    if (exposures.length > 1) fail(`ambiguous_trigger_exposure:${sessionId}`);
    for (const event of exposures) {
      if (event.phase !== 'trigger' || event.payload?.visibilityState !== 'visible') fail(`invalid_visible_exposure:${sessionId}`);
    }
    sessionMap.set(sessionId, { sessionId, scenarioId, entries, first, onboarding, exposure: exposures[0] ?? null });
  }

  const submissionIds = new Set();
  const periodSessions = new Map();
  const closedPeriods = new Set();
  let previousSubmissionTime = -1;
  let previousPeriod = -1;
  for (let index = 0; index < packet.dispositions.length; index += 1) {
    const source = packet.dispositions[index];
    if (!record(source)) { fail(`invalid_submission:${index}`); continue; }
    const submissionId = source.submissionId ?? `submission-index:${index}`;
    if (!text(submissionId) || submissionIds.has(submissionId)) fail(`duplicate_or_invalid_submission_id:${index}`);
    submissionIds.add(submissionId);
    if (!Number.isInteger(source.period) || source.period < 0 || source.period > 4) fail(`invalid_period:${index}`);
    else if (allocationValid && (source.scenarioId !== expectedScenario(allocation, source.period)
      || source.condition !== allocation.condition)) fail(`submission_allocation_mismatch:${index}`);
    if (source.period < previousPeriod) fail(`period_order_reversed:${index}`);
    if (closedPeriods.has(source.period)) fail(`submission_after_finalized_opportunity:${index}`);
    if (typeof source.participantFinalizedOpportunity !== 'boolean') fail(`finalization_flag_required:${index}`);
    if (source.participantFinalizedOpportunity === true) closedPeriods.add(source.period);
    previousPeriod = source.period;
    if (!text(source.participantOriginalText) || source.dispositionValidity !== 'manual_review_pending'
      || source.timeToVerifiedGold !== null || source.humanQuality !== null
      || source.submissionIsNotVerifiedCompletion !== true) fail(`submission_not_pending_original_record:${index}`);
    const submitted = source.explicitSubmissionAtMonotonicMs;
    if (!time(submitted) || submitted < previousSubmissionTime) fail(`submission_clock_invalid:${index}`);
    if (time(submitted)) previousSubmissionTime = submitted;
    if (time(exportBound) && submitted > exportBound) fail(`submission_after_export:${index}`);
    const exposure = source.exposure;
    if (!record(exposure) || !text(exposure.sessionId) || !Number.isInteger(exposure.sequence)
      || exposure.sequence < 1 || !time(exposure.monotonicMs)) { fail(`exposure_reference_required:${index}`); continue; }
    const session = sessionMap.get(exposure.sessionId);
    const event = session?.entries[exposure.sequence - 1];
    if (!session || session.onboarding || session.scenarioId !== source.scenarioId || session.first.condition !== source.condition
      || event?.event !== 'trigger_stable_visible' || event?.phase !== 'trigger'
      || event?.payload?.visibilityState !== 'visible' || event?.monotonicMs !== exposure.monotonicMs) {
      fail(`submission_exposure_binding_mismatch:${index}`);
    }
    if (submitted < exposure.monotonicMs) fail(`submission_precedes_exposure:${index}`);
    if (source.sessionId !== undefined && source.sessionId !== exposure.sessionId) fail(`submission_session_mismatch:${index}`);
    const priorSession = periodSessions.get(source.period);
    if (priorSession && priorSession !== exposure.sessionId) fail(`multiple_sessions_for_period:${source.period}`);
    periodSessions.set(source.period, exposure.sessionId);
    const canonical = COMMON.get(source.scenarioId);
    const assertedRevision = source.subjectRevision ?? source.revision ?? undefined;
    if (assertedRevision !== undefined && (!text(assertedRevision) || (canonical && assertedRevision !== canonical.subjectRevision))) {
      fail(`submission_revision_mismatch:${index}`);
    }
    if (source.subjectRevision != null && source.revision != null && source.subjectRevision !== source.revision) fail(`conflicting_submission_revisions:${index}`);
    if (source.informationSpaceVersion !== undefined && (source.informationSpaceVersion !== 'v4.2-e0'
      || source.informationSpaceVersion !== event?.payload?.informationSpaceVersion)) fail(`submission_information_space_mismatch:${index}`);
    if (assertedRevision === undefined) warnings.push(`runtime_subject_revision_not_recorded:${index}`);
    submissions.push({
      submissionIndex: index, submissionId, source, sessionId: exposure.sessionId,
      expectedRevision: canonical?.subjectRevision ?? assertedRevision ?? null,
      revisionBinding: assertedRevision === undefined ? 'canonical_definition_only' : 'recorded_subject_revision',
    });
  }
  if (allocationValid) {
    for (const scenarioId of [...COMMON_IDS, OPEN_SCENARIO]) {
      const assigned = [...sessionMap.values()].filter((session) => !session.onboarding && session.scenarioId === scenarioId);
      if (assigned.length > 1) fail(`ambiguous_opportunity_sessions:${scenarioId}`);
    }
  }
  return { errors, warnings: unique(warnings), submissions, sessionMap, allocationValid };
}

export function validateReviewPacket(packet) {
  const inspection = inspectPacket(packet);
  return {
    valid: inspection.errors.length === 0, errors: inspection.errors, warnings: inspection.warnings,
    schemaVersion: 'software-development-v4.2-review-validation', qualifiesHumanStudy: false,
    reviewerIdentityVerified: false, completeObservationWindowEstablished: false,
  };
}

function bindCoding(coding, inspection, kind, index, errors) {
  const fail = (code) => errors.push(`${kind}_coding:${index}:${code}`);
  if (!record(coding)) { fail('record_required'); return null; }
  const byIndex = coding.submissionIndex === undefined ? null : inspection.submissions.find((entry) => entry.submissionIndex === coding.submissionIndex);
  const byId = coding.submissionId === undefined ? null : inspection.submissions.find((entry) => entry.submissionId === coding.submissionId);
  if (coding.submissionIndex !== undefined && (!Number.isInteger(coding.submissionIndex) || !byIndex)) fail('unknown_submission_index');
  if (coding.submissionId !== undefined && !byId) fail('unknown_submission_id');
  if (byIndex && byId && byIndex !== byId) fail('submission_id_index_conflict');
  const submission = byId ?? byIndex;
  if (!submission) { fail('submission_reference_required'); return null; }
  const source = submission.source;
  if (!text(coding.reviewerId) || !text(coding.rationale)) fail('reviewer_and_explicit_rationale_required');
  if (coding.scenarioId !== source.scenarioId || coding.period !== source.period || coding.condition !== source.condition
    || coding.sessionId !== submission.sessionId || coding.exposureSequence !== source.exposure.sequence) fail('binding_mismatch');
  if (!text(coding.revision) || (submission.expectedRevision !== null && coding.revision !== submission.expectedRevision)) fail('revision_mismatch');
  return submission;
}

// Preserve the words shown to a participant while removing UI-only pointable
// marker syntax. Original event bytes remain in the untouched source packet.
const displayedText = (value) => value.replace(/\[\[[A-Z0-9:@._+-]+\|([^\]\r\n]+)\]\]/gu, '$1');

function submissionReviewViews(inspection) {
  return inspection.submissions.map((submission, ordinal) => {
    const source = submission.source;
    const session = inspection.sessionMap.get(submission.sessionId);
    const cutoff = source.explicitSubmissionAtMonotonicMs;
    // Equal timestamps without an event-sequence bound do not prove whether the
    // event preceded the submission. Exclude that ambiguous boundary.
    const preceding = session.entries.filter((event) => event.monotonicMs < cutoff);
    const messages = [];
    const sources = [];
    const missing = new Set(['static_task_history_not_fully_captured', 'presentation_does_not_establish_reading']);
    const sourceKeys = new Set();
    const sourceEventSequences = [];
    for (const event of preceding) {
      const payload = event.payload;
      let message = null;
      if (event.event === 'chat_action_started') {
        if (text(payload.rawText)) message = { role: 'participant', origin: 'participant_written', text: payload.rawText };
        else missing.add('participant_request_text_not_recorded');
      } else if (event.event === 'agent_response_recorded') {
        if (text(payload.responseText)) message = { role: 'assistant',
          origin: payload.mode === 'frozen_trigger_turn' ? 'authored_task_result'
            : payload.mode === 'executed_product_operation' ? 'product_result_presented' : 'agent_returned',
          text: displayedText(payload.responseText) };
        else missing.add('agent_response_text_not_recorded');
      } else if (event.event === 'participant_confirmation_recorded') {
        if (text(payload.confirmationText)) message = { role: 'participant', origin: 'confirmation_of_presented_action', text: payload.confirmationText };
        else missing.add('confirmation_text_not_recorded');
      } else if (event.event === 'evidence_text_presented' || event.event === 'evidence_text_visible') {
        if (!Array.isArray(payload.sources) || !payload.sources.length) missing.add('presented_source_text_not_recorded');
        for (const entry of Array.isArray(payload.sources) ? payload.sources : []) {
          if (!record(entry) || !text(entry.text) || !text(entry.source) || !text(entry.exactRevision)) {
            missing.add('presented_source_record_incomplete'); continue;
          }
          const rendered = { text: displayedText(entry.text), source: entry.source, exactRevision: entry.exactRevision };
          const key = JSON.stringify(rendered);
          if (!sourceKeys.has(key)) { sourceKeys.add(key); sources.push(rendered); }
          sourceEventSequences.push(event.sequence);
        }
      }
      if (message) messages.push({ time: event.monotonicMs, sequence: event.sequence, message });
      // The publicFacts array can contain unshown items; never promote that
      // entire snapshot into material disclosed to a participant.
    }
    if (!sources.length) missing.add('separately_recorded_source_text_unavailable');
    const ambiguous = session.entries.filter((event) => event.monotonicMs === cutoff);
    if (ambiguous.length) missing.add('equal_timestamp_event_order_unresolved');
    for (const prior of inspection.submissions) {
      if (prior.submissionIndex >= submission.submissionIndex || prior.sessionId !== submission.sessionId) continue;
      messages.push({ time: prior.source.explicitSubmissionAtMonotonicMs, sequence: Number.MAX_SAFE_INTEGER,
        message: { role: 'participant', origin: 'earlier_recorded_disposition', text: prior.source.participantOriginalText } });
    }
    messages.sort((left, right) => left.time - right.time || left.sequence - right.sequence);
    const reviewUnitId = `review-unit-${String(ordinal + 1).padStart(6, '0')}`;
    return {
      internalBinding: {
        reviewUnitId, submissionIndex: submission.submissionIndex, submissionId: submission.submissionId,
        scenarioId: source.scenarioId, period: source.period, condition: source.condition,
        sessionId: submission.sessionId, subjectRevision: submission.expectedRevision,
        exposureSequence: source.exposure.sequence, exposureAtMonotonicMs: source.exposure.monotonicMs,
        submissionAtMonotonicMs: cutoff, includedEventSequences: preceding.map((event) => event.sequence),
        sourceTextEventSequences: unique(sourceEventSequences),
        excludedEqualTimestampEventSequences: ambiguous.map((event) => event.sequence),
        missing: [...missing],
      },
      reviewerView: {
        schemaVersion: 'software-development-v4.2-submission-review-view', reviewUnitId,
        participantOriginalText: source.participantOriginalText,
        precedingMessages: messages.map((entry) => entry.message),
        disclosedSources: sources,
        materialCompleteness: 'manual_review_pending',
        qualityAssessment: null,
        conditionAndTimingMetadataOmitted: true,
        contentMayRevealInterface: true,
      },
    };
  });
}

/**
 * Separate codes have {submissionId OR submissionIndex, reviewerId, rationale,
 * scenarioId, period, condition, sessionId, exposureSequence, revision}.
 * Validity codes add validity: valid|invalid|uncertain and optional
 * technicalDisposition (the explicit common-predicate input). Quality codes add
 * scores for all REVIEW_QUALITY_DIMENSIONS. No code is extracted from chat text.
 */
export function prepareReviewPacket(packet, { validityCodings = [], qualityCodings = [] } = {}) {
  const inspection = inspectPacket(packet);
  const result = {
    schemaVersion: 'software-development-v4.2-analysis-preparation',
    valid: false, errors: [...inspection.errors], warnings: [...inspection.warnings],
    evidenceClass: 'offline_preparation_from_supplied_preview_and_codes',
    sourceEvidenceClass: record(packet) ? packet.evidenceClass ?? null : null,
    sourceReviewPacketId: record(packet) ? packet.reviewPacketId ?? null : null,
    sourceCurrentStage: record(packet) ? packet.currentStage ?? null : null,
    sourceMissing: record(packet) ? clone(packet.missing ?? null) : null,
    sourceClockTimeOrigin: record(packet) ? packet.clockTimeOrigin ?? null : null,
    sourceExportedAtMonotonicMs: record(packet) ? packet.exportedAtMonotonicMs ?? null : null,
    allocation: record(packet) ? clone(packet.allocation ?? null) : null,
    formalStudyData: false, reviewerIdentityVerified: false, reviewerIndependenceVerified: false,
    codingReliabilityEstablished: false, naturalLanguageInferred: false,
    productStateExecutionVerified: false,
    deadlinePolicy: null, completeObservationWindowEstablished: false,
    restrictedTime: null, completionRate: null, opportunities: [], perSubmissionReviewView: [],
  };
  if (result.errors.length) return result;
  result.perSubmissionReviewView = submissionReviewViews(inspection);
  if (!Array.isArray(validityCodings) || !Array.isArray(qualityCodings)) {
    result.errors.push('coding_arrays_required'); return result;
  }
  const validity = new Map();
  const quality = new Map();
  const seen = new Set();
  for (let index = 0; index < validityCodings.length; index += 1) {
    const coding = validityCodings[index];
    const bound = bindCoding(coding, inspection, 'validity', index, result.errors);
    if (!bound) continue;
    if (!['valid', 'invalid', 'uncertain'].includes(coding.validity)) result.errors.push(`validity_coding:${index}:unknown_validity`);
    const key = `validity:${bound.submissionIndex}:${coding.reviewerId}`;
    if (seen.has(key)) result.errors.push(`validity_coding:${index}:duplicate_reviewer_code`);
    seen.add(key);
    let technicalEvaluation = null;
    if (coding.technicalDisposition !== undefined) {
      const common = COMMON.get(bound.source.scenarioId);
      if (!common) result.errors.push(`validity_coding:${index}:no_common_predicate_for_open_task`);
      else {
        if (coding.technicalDisposition?.revision !== coding.revision) result.errors.push(`validity_coding:${index}:technical_revision_mismatch`);
        technicalEvaluation = evaluateCommonDisposition(common.id, coding.technicalDisposition);
      }
    }
    const codes = validity.get(bound.submissionIndex) ?? [];
    codes.push({ ...clone(coding), technicalEvaluation, identityAndIndependence: 'not_authenticated' });
    validity.set(bound.submissionIndex, codes);
  }
  for (let index = 0; index < qualityCodings.length; index += 1) {
    const coding = qualityCodings[index];
    const bound = bindCoding(coding, inspection, 'quality', index, result.errors);
    if (!bound) continue;
    const key = `quality:${bound.submissionIndex}:${coding.reviewerId}`;
    if (seen.has(key)) result.errors.push(`quality_coding:${index}:duplicate_reviewer_code`);
    seen.add(key);
    if (!record(coding.scores) || Object.keys(coding.scores).length !== REVIEW_QUALITY_DIMENSIONS.length
      || !REVIEW_QUALITY_DIMENSIONS.every((dimension) => Number.isInteger(coding.scores[dimension])
        && coding.scores[dimension] >= 0 && coding.scores[dimension] <= 2)) result.errors.push(`quality_coding:${index}:five_scores_0_to_2_required`);
    const codes = quality.get(bound.submissionIndex) ?? [];
    codes.push({ ...clone(coding), identityAndIndependence: 'not_authenticated' });
    quality.set(bound.submissionIndex, codes);
  }
  if (result.errors.length) return result;

  const reviewed = inspection.submissions.map((submission) => {
    const codes = validity.get(submission.submissionIndex) ?? [];
    const values = unique(codes.map((code) => code.validity));
    let reviewStatus = codes.length === 0 ? 'pending' : values.length > 1 ? 'disputed' : values[0];
    if (codes.some((code) => code.validity === 'valid' && code.technicalEvaluation?.valid === false)) reviewStatus = 'technical_conflict';
    if (reviewStatus === 'valid' && submission.expectedRevision === null) reviewStatus = 'revision_unresolved';
    return {
      submissionIndex: submission.submissionIndex, submissionId: submission.submissionId,
      scenarioId: submission.source.scenarioId, period: submission.source.period, condition: submission.source.condition,
      sessionId: submission.sessionId, subjectRevision: submission.expectedRevision,
      revisionBinding: submission.revisionBinding,
      participantOriginalText: submission.source.participantOriginalText,
      submittedAtMonotonicMs: submission.source.explicitSubmissionAtMonotonicMs,
      exposure: clone(submission.source.exposure),
      participantFinalizedOpportunity: submission.source.participantFinalizedOpportunity,
      reviewStatus, validityCodings: codes, qualityCodings: quality.get(submission.submissionIndex) ?? [],
    };
  });
  if (inspection.allocationValid) {
    for (let period = 0; period <= 4; period += 1) {
      const scenarioId = expectedScenario(packet.allocation, period);
      const submissions = reviewed.filter((entry) => entry.period === period);
      const session = [...inspection.sessionMap.values()].find((entry) => !entry.onboarding && entry.scenarioId === scenarioId);
      const firstReviewedValid = submissions.find((entry) => entry.reviewStatus === 'valid');
      const earlierUnresolved = firstReviewedValid ? submissions.some((entry) => entry.submissionIndex < firstReviewedValid.submissionIndex
        && entry.reviewStatus !== 'invalid') : false;
      const provisionalTime = firstReviewedValid ? firstReviewedValid.submittedAtMonotonicMs - firstReviewedValid.exposure.monotonicMs : null;
      result.opportunities.push({
        scenarioId, period, condition: packet.allocation.condition,
        opportunityId: COMMON.get(scenarioId)?.id ?? null,
        sessionId: session?.sessionId ?? null,
        subjectRevision: COMMON.get(scenarioId)?.subjectRevision ?? submissions[0]?.subjectRevision ?? null,
        exposureAtMonotonicMs: session?.exposure?.monotonicMs ?? null,
        participantFinalizedOpportunity: submissions.some((entry) => entry.participantFinalizedOpportunity),
        observationStatus: !session ? 'not_started' : !session.exposure ? 'exposure_not_established'
          : submissions.length === 0 ? 'no_disposition_recorded' : 'submissions_available',
        validityStatus: firstReviewedValid ? earlierUnresolved ? 'earlier_submissions_unresolved' : 'reviewed_valid'
          : submissions.length && submissions.every((entry) => entry.reviewStatus === 'invalid') ? 'reviewed_submissions_invalid' : 'pending_or_uncertain',
        firstReviewedValidSubmissionId: firstReviewedValid?.submissionId ?? null,
        timeToFirstReviewedValidDisposition: provisionalTime,
        firstValidSubmissionId: firstReviewedValid && !earlierUnresolved ? firstReviewedValid.submissionId : null,
        timeToFirstValidDisposition: earlierUnresolved ? null : provisionalTime,
        timingUnit: 'milliseconds',
        restrictedTime: null, validByDeadline: null,
        humanQuality: null, qualityCodings: submissions.flatMap((entry) => entry.qualityCodings),
        submissions,
      });
    }
  }
  return { ...result, valid: true };
}
