import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, linkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMAND = fileURLToPath(new URL('../scripts/review-v42-packet.mjs', import.meta.url));
const SCENARIO = 'software-common-v42-local-state';
const REVISION = 'ANCHOR-STATE-R7';
const SESSION = 'synthetic-cli-session';

function syntheticPacket() {
  const event = (sequence, monotonicMs, name, phase) => ({
    schemaVersion: 'software-development-browser-preview-v1', sessionId: SESSION, sequence,
    scenarioId: SCENARIO, condition: 'B', phase, event: name,
    timestampUtc: '2026-09-12T00:00:00.000Z', monotonicMs,
    payload: { informationSpaceVersion: 'v4.2-e0', ...(phase === 'trigger' ? { visibilityState: 'visible' } : {}) },
  });
  return {
    schemaVersion: 'software-development-v4.2-review-packet', reviewPacketId: 'synthetic-cli-packet',
    evidenceClass: 'synthetic_review_fixture', formalStudyData: false,
    clock: 'single_document_performance_now', clockTimeOrigin: 1789142400000, exportedAtMonotonicMs: 60,
    allocation: { condition: 'B', sequence: 0, allocatedAtMonotonicMs: 5, formalAssignment: false },
    currentStage: 'common-1', missing: ['independent coding', 'formal consent'],
    sessions: { [SESSION]: [event(1, 10, 'session_started', 'baseline'), event(2, 20, 'trigger_stable_visible', 'trigger')] },
    dispositions: [{
      submissionId: 'synthetic-cli-submission', scenarioId: SCENARIO, period: 0, condition: 'B',
      subjectRevision: REVISION, informationSpaceVersion: 'v4.2-e0',
      participantOriginalText: '合成 CLI 测试表达，不是真实参与者：先保留当前产品，说明核对范围。',
      explicitSubmissionAtMonotonicMs: 40, exposure: { sessionId: SESSION, sequence: 2, monotonicMs: 20 },
      dispositionValidity: 'manual_review_pending', timeToVerifiedGold: null, humanQuality: null,
      submissionIsNotVerifiedCompletion: true, participantFinalizedOpportunity: true,
    }],
  };
}

function syntheticCode() {
  return {
    submissionId: 'synthetic-cli-submission', reviewerId: 'synthetic-cli-reviewer',
    validity: 'valid', rationale: '人为构造的测试编码，只验证 CLI 接线，不证明真实判断有效。',
    scenarioId: SCENARIO, period: 0, condition: 'B', sessionId: SESSION, exposureSequence: 2, revision: REVISION,
  };
}

function workspace(t) {
  const directory = mkdtempSync(join(tmpdir(), 'v42-review-cli-'));
  t.after(() => {
    assert.equal(resolve(dirname(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('v42-review-cli-'));
    rmSync(directory, { recursive: true, force: true });
  });
  const input = join(directory, 'synthetic packet.json');
  writeFileSync(input, JSON.stringify(syntheticPacket(), null, 2));
  return { directory, input };
}

function invoke(args, cwd) {
  const result = spawnSync(process.execPath, [COMMAND, ...args], { encoding: 'utf8', cwd });
  assert.equal(result.error, undefined);
  return result;
}

test('default CLI invocation is read-only, emits complete pending review and hashes the actual input bytes', (t) => {
  const { directory, input } = workspace(t);
  const before = readFileSync(input);
  const result = invoke(['--input', input], directory);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.equal(report.validation.valid, true);
  assert.equal(report.preparation.sourceEvidenceClass, 'synthetic_review_fixture');
  assert.equal(report.preparation.opportunities[0].submissions[0].reviewStatus, 'pending');
  assert.equal(report.preparation.opportunities[0].timeToFirstValidDisposition, null);
  assert.equal(report.preparation.completionRate, null);
  assert.equal(report.sources[0].sha256, createHash('sha256').update(before).digest('hex'));
  assert.equal(report.outputPath, null);
  assert.equal(report.reviewGuidance.blindedReviewerPacket, false);
  assert.equal(report.preparation.perSubmissionReviewView.length, 1);
  assert.equal(report.preparation.perSubmissionReviewView[0].reviewerView.participantOriginalText,
    syntheticPacket().dispositions[0].participantOriginalText);
  assert.deepEqual(readFileSync(input), before);
  assert.deepEqual(readdirSync(directory), [basename(input)]);
});

test('explicit --output exclusively creates one new report equal to the complete stdout JSON', (t) => {
  const { directory, input } = workspace(t);
  const output = join(directory, 'new report.json');
  const result = invoke(['--input', input, '--output', output], directory);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(output, 'utf8'), result.stdout);
  assert.equal(JSON.parse(result.stdout).outputPath, output);
  assert.deepEqual(readdirSync(directory).sort(), [basename(input), basename(output)].sort());
});

test('existing outputs, input aliases and hardlinks are never overwritten', (t) => {
  const { directory, input } = workspace(t);
  const alias = join(directory, 'input-hardlink.json');
  linkSync(input, alias);
  const existing = join(directory, 'existing report.json');
  writeFileSync(existing, 'retain this existing artifact');
  for (const output of [input, join(directory, '.', basename(input)), alias, existing]) {
    const before = readFileSync(output);
    const result = invoke(['--input', input, '--output', output], directory);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.ok(['output_is_input', 'output_already_exists'].includes(JSON.parse(result.stderr).error));
    assert.deepEqual(readFileSync(output), before);
  }
});

test('separately supplied synthetic coding reaches preparation and keeps quality apart from timing', (t) => {
  const { directory, input } = workspace(t);
  const coding = join(directory, 'synthetic codes.json');
  const quality = { ...syntheticCode(), scores: { evidenceSupport: 1, scopeAppropriateness: 1,
    tradeoffCalibration: 1, internalConsistency: 1, traceability: 1 } };
  delete quality.validity;
  writeFileSync(coding, JSON.stringify({ schemaVersion: 'software-development-v4.2-review-codings',
    reviewPacketId: 'synthetic-cli-packet', validityCodings: [syntheticCode()], qualityCodings: [quality] }));
  const before = readFileSync(coding);
  const result = invoke(['--input', input, '--coding', coding], directory);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.preparation.opportunities[0].timeToFirstValidDisposition, 20);
  assert.equal(report.preparation.opportunities[0].qualityCodings.length, 1);
  assert.equal(report.preparation.opportunities[0].humanQuality, null);
  assert.equal(report.preparation.reviewerIdentityVerified, false);
  assert.equal(report.formalStudyData, false);
  assert.equal(report.sources.length, 2);
  assert.deepEqual(readFileSync(coding), before);
  const overwrite = invoke(['--input', input, '--coding', coding, '--output', coding], directory);
  assert.equal(overwrite.status, 2);
  assert.deepEqual(readFileSync(coding), before);
});

test('readable invalid packet returns exit 1 with full validation and can be explicitly archived to a new report', (t) => {
  const { directory, input } = workspace(t);
  const packet = syntheticPacket(); packet.dispositions[0].exposure.sequence = 1;
  writeFileSync(input, JSON.stringify(packet));
  const output = join(directory, 'invalid record review.json');
  const result = invoke(['--input', input, '--output', output], directory);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.validation.valid, false);
  assert.ok(report.validation.errors.some((error) => error.includes('exposure_binding_mismatch')));
  assert.deepEqual(report.preparation.opportunities, []);
  assert.equal(readFileSync(output, 'utf8'), result.stdout);
});

test('coding alignment failure is separate from packet validity and returns exit 1', (t) => {
  const { directory, input } = workspace(t);
  const coding = join(directory, 'wrong revision codes.json');
  writeFileSync(coding, JSON.stringify({ validityCodings: [{ ...syntheticCode(), revision: 'wrong-revision' }] }));
  const result = invoke(['--input', input, '--coding', coding], directory);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.validation.valid, true);
  assert.equal(report.preparation.valid, false);
  assert.ok(report.preparation.errors.some((error) => error.includes('revision_mismatch')));
});

test('malformed JSON and mismatched coding envelope do not create output files', (t) => {
  const { directory, input } = workspace(t);
  const coding = join(directory, 'invalid codes.json');
  const output = join(directory, 'must not exist.json');
  for (const content of ['{', 'null', '[]', '{"validityCodings":null}', '{"reviewPacketId":"different"}',
    '{"schemaVersion":"old-codes"}', '{"unknown":true}']) {
    writeFileSync(coding, content);
    const result = invoke(['--input', input, '--coding', coding, '--output', output], directory);
    assert.equal(result.status, 2, content);
    assert.equal(result.stdout, '');
    assert.ok(JSON.parse(result.stderr).error.startsWith('coding_'));
    assert.equal(existsSync(output), false);
  }
  writeFileSync(input, '{');
  const result = invoke(['--input', input, '--output', output], directory);
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stderr).error, 'packet_json_invalid');
  assert.equal(existsSync(output), false);
});

test('UTF-8 BOM and paths containing spaces are accepted without rewriting input', (t) => {
  const { directory, input } = workspace(t);
  writeFileSync(input, `\uFEFF${JSON.stringify(syntheticPacket())}`);
  const before = readFileSync(input);
  const result = invoke(['--input', basename(input)], directory);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readFileSync(input), before);
});

test('argument failures are explicit and --help performs no file operation', (t) => {
  const { directory, input } = workspace(t);
  for (const args of [[], ['--input'], ['--unknown', input], ['--input', input, '--input', input],
    ['--input', input, '--output', '--coding', input]]) {
    const result = invoke(args, directory);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(JSON.parse(result.stderr).valid, false);
  }
  const help = invoke(['--help'], directory);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Exit 0: structurally accepted/);
  assert.deepEqual(readdirSync(directory), [basename(input)]);
});

test('missing input and absent output parent return exit 2 without creating directories', (t) => {
  const { directory, input } = workspace(t);
  const missingInput = invoke(['--input', join(directory, 'absent.json')], directory);
  assert.equal(missingInput.status, 2);
  assert.equal(JSON.parse(missingInput.stderr).error, 'packet_read_failed');
  const output = join(directory, 'absent-parent', 'review.json');
  const result = invoke(['--input', input, '--output', output], directory);
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stderr).error, 'output_write_failed');
  assert.equal(existsSync(dirname(output)), false);
});
