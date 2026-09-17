#!/usr/bin/env node
/** Organizer-only offline command. Never import this module into a client bundle. */
import { createHash } from 'node:crypto';
import { open, readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareReviewPacket, validateReviewPacket, REVIEW_QUALITY_DIMENSIONS } from '../lib/experiment/review-packet.mjs';

const HELP = `Usage: node scripts/review-v42-packet.mjs --input packet.json [--coding codes.json] [--output new-report.json]

Reads a v4.2 preview packet and optional separately authored reviewer codes.
Prints the complete validation and preparation report as JSON to stdout.
Writes a file only when --output names a new path; never overwrites any file.
No coding means pending review, not invalidity or completion. No Gold is inferred
from participant text. This command does not qualify participants or reviewers.

Coding file: { "validityCodings": [], "qualityCodings": [] }
Optional coding metadata: schemaVersion="software-development-v4.2-review-codings",
reviewPacketId matching the input packet. Reviewer codes use submissionId or a
zero-based submissionIndex plus the exact scenario/period/condition/session,
exposureSequence, revision, reviewerId and explicit rationale.

Exit 0: structurally accepted (may be entirely pending).
Exit 1: readable data failed packet or coding validation; inspect the JSON report.
Exit 2: arguments, input parsing or output-file operation failed.
`;

class CommandError extends Error {
  constructor(code, detail) { super(detail); this.code = code; }
}

function parseArguments(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return { help: true };
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    if (!['--input', '--coding', '--output'].includes(flag)) throw new CommandError('unsupported_argument', `Unsupported argument: ${flag}`);
    const name = flag.slice(2);
    if (options[name] !== undefined) throw new CommandError('duplicate_argument', `${flag} may be supplied only once.`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new CommandError('argument_value_required', `${flag} requires a file path.`);
    options[name] = value;
  }
  if (!options.input) throw new CommandError('input_required', '--input packet.json is required; use --help for usage.');
  return options;
}

async function readJson(filePath, role) {
  let bytes;
  let resolvedPath;
  try { resolvedPath = await realpath(filePath); bytes = await readFile(resolvedPath); }
  catch (error) { throw new CommandError(`${role}_read_failed`, `${filePath}: ${error.code ?? error.message}`); }
  let data;
  try { data = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/u, '')); }
  catch { throw new CommandError(`${role}_json_invalid`, `${filePath}: expected one valid UTF-8 JSON document.`); }
  return { data, source: { role, absolutePath: resolvedPath, byteLength: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') } };
}

function codingOptions(data, packet) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new CommandError('coding_document_invalid', 'The coding document must be a JSON object.');
  const allowed = ['schemaVersion', 'reviewPacketId', 'validityCodings', 'qualityCodings'];
  if (Object.keys(data).some((key) => !allowed.includes(key))) throw new CommandError('coding_fields_unsupported', `Coding document keys are limited to ${allowed.join(', ')}.`);
  if (data.schemaVersion !== undefined && data.schemaVersion !== 'software-development-v4.2-review-codings') throw new CommandError('coding_schema_mismatch', 'Unsupported coding schemaVersion.');
  if (data.reviewPacketId !== undefined && (typeof data.reviewPacketId !== 'string' || !data.reviewPacketId.trim()
    || data.reviewPacketId !== packet?.reviewPacketId)) throw new CommandError('coding_packet_mismatch', 'Coding reviewPacketId must match the input packet.');
  if ((data.validityCodings !== undefined && !Array.isArray(data.validityCodings))
    || (data.qualityCodings !== undefined && !Array.isArray(data.qualityCodings))) throw new CommandError('coding_arrays_required', 'validityCodings and qualityCodings must be arrays.');
  return { validityCodings: data.validityCodings ?? [], qualityCodings: data.qualityCodings ?? [] };
}

async function writeNewReport(filePath, serialized, sources) {
  const comparable = (value) => process.platform === 'win32' ? value.toLowerCase() : value;
  if (sources.some((source) => comparable(source.absolutePath) === comparable(filePath))) {
    throw new CommandError('output_is_input', 'Output cannot replace the packet or coding input.');
  }
  let handle;
  try {
    // Exclusive creation also rejects existing symlinks, hardlinks and reports.
    // No parent directories are created implicitly.
    handle = await open(filePath, 'wx', 0o600);
    await handle.writeFile(serialized, 'utf8');
  } catch (error) {
    throw new CommandError(error.code === 'EEXIST' ? 'output_already_exists' : 'output_write_failed', `${filePath}: ${error.code ?? error.message}`);
  } finally { await handle?.close(); }
}

export async function runReviewCli(args, { cwd = process.cwd(), stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const options = parseArguments(args);
    if (options.help) { stdout.write(HELP); return 0; }
    const packet = await readJson(resolve(cwd, options.input), 'packet');
    const coding = options.coding ? await readJson(resolve(cwd, options.coding), 'coding') : null;
    const codes = coding ? codingOptions(coding.data, packet.data) : { validityCodings: [], qualityCodings: [] };
    const validation = validateReviewPacket(packet.data);
    const preparation = prepareReviewPacket(packet.data, codes);
    const sources = [packet.source, ...(coding ? [coding.source] : [])];
    const report = {
      schemaVersion: 'software-development-v4.2-offline-review-report',
      generatedAtUtc: new Date().toISOString(),
      valid: validation.valid && preparation.valid,
      evidenceClass: 'organizer_offline_review_preparation',
      formalStudyData: false,
      sources, outputPath: options.output ? resolve(cwd, options.output) : null,
      codingInput: { provided: coding !== null, validityCodeCount: codes.validityCodings.length, qualityCodeCount: codes.qualityCodings.length },
      validation, preparation,
      reviewGuidance: {
        structureIsNotDispositionValidity: true,
        sourceIntegrityHashIsNotCollectionAuthenticity: true,
        pendingDoesNotMeanInvalid: true,
        blindedReviewerPacket: false,
        qualityDimensions: [...REVIEW_QUALITY_DIMENSIONS],
        qualityScale: [0, 1, 2],
        nextAction: preparation.valid ? 'Review original submissions and source events; provide separate reviewer codes where available.'
          : 'Resolve source or coding alignment errors before interpreting timing rows; preserve the original input.',
      },
    };
    const serialized = `${JSON.stringify(report, null, 2)}\n`;
    if (report.outputPath) await writeNewReport(report.outputPath, serialized, sources);
    stdout.write(serialized);
    return report.valid ? 0 : 1;
  } catch (error) {
    stderr.write(`${JSON.stringify({ schemaVersion: 'software-development-v4.2-review-command-error',
      valid: false, error: error.code ?? 'command_failed', detail: error.message })}\n`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await runReviewCli(process.argv.slice(2));
}
