import {
  createProductActionSession, prepareProductAction, executeProductAction, getPublicProductFacts,
} from "./product-action-session.mjs";
import type { PublicProductFact } from "../../scenarios/with-product-facts";
import {
  createLinkedCandidateEvaluationCorpus, publishLinkedCandidateEvaluation,
  queryLinkedCandidateEvaluationPacket,
} from "../../scenarios/materials/linked-candidate-evaluation-v4.2.mjs";
import type { PublicEvaluationFact } from "../../scenarios/with-evaluation-facts";

type Session = ReturnType<typeof createProductActionSession>;
type EvaluationArm = ReturnType<typeof createLinkedCandidateEvaluationCorpus>["evaluations"][number]["arms"][number];
type EvaluationPacket = Omit<ReturnType<typeof publishLinkedCandidateEvaluation>, "arms"> & { arms: EvaluationArm[] };
type Publication = {
  id: string; packet: EvaluationPacket; asOfProductStateVersion: number;
  participantRequest: string; summaryFactId: string; manifestFactId: string;
};
type EvaluationCursor = { publicationId: string; selection: string; offset: number };
const sessions = new Map<string, {
  state: Session; touchedAt: number; facts: Map<string, PublicProductFact>;
  publications: Map<string, Publication>; cursors: Map<string, EvaluationCursor>; nextDelivery: number;
}>();
const SESSION_LIFETIME_MS = 4 * 60 * 60 * 1000;

// A bounded preview authority. Requests never accept a replacement product,
// receipt or prepared action from the client. Restart/expiry is an explicit
// technical interruption; this process memory is not formal study storage.
export function createProductSession() {
  const now = Date.now();
  for (const [id, entry] of sessions) if (now - entry.touchedAt > SESSION_LIFETIME_MS) sessions.delete(id);
  if (sessions.size >= 256) throw new Error("product_preview_capacity_reached");
  const sessionId = crypto.randomUUID().toUpperCase();
  const state = createProductActionSession({ sessionId });
  sessions.set(sessionId, { state, touchedAt: now, facts: new Map(), publications: new Map(), cursors: new Map(), nextDelivery: 1 });
  return productSessionSnapshot(sessionId);
}

export function readProductSession(sessionId: string): Session {
  const entry = sessions.get(sessionId);
  if (!entry || Date.now() - entry.touchedAt > SESSION_LIFETIME_MS) {
    sessions.delete(sessionId);
    throw new Error("product_session_unavailable_or_expired");
  }
  entry.touchedAt = Date.now();
  return entry.state;
}

export function productSessionSnapshot(sessionId: string) {
  const state = readProductSession(sessionId);
  const entry = sessions.get(sessionId)!;
  for (const fact of getPublicProductFacts(state)) entry.facts.set(fact.id, fact);
  return {
    sessionId: state.sessionId,
    sessionVersion: state.sessionVersion,
    currentRevisionId: state.product.currentRevisionId,
    candidateRevisionId: state.product.candidate?.revisionId ?? null,
    publicFacts: [...entry.facts.values()].map((fact) => structuredClone({
      ...fact, ...(fact.kind.startsWith("evaluation_") ? {} : { isCurrentSnapshot: fact.asOfProductStateVersion === state.product.stateVersion }),
    })),
    storageClass: "process_memory_engineering_preview",
    formalStudyReady: false as const,
  };
}

export function prepareSessionAction(sessionId: string, expectedSessionVersion: number, participantRequest: string, operation: Record<string, unknown>) {
  const state = readProductSession(sessionId);
  const outcome = prepareProductAction(state, { expectedSessionVersion, participantRequest, operation });
  // No await between reading and replacing the authority: one process commits
  // the controller's guarded transition atomically. Multi-worker persistence
  // needs a separate store with the same compare-and-swap contract.
  sessions.set(sessionId, { ...sessions.get(sessionId)!, state: outcome.state, touchedAt: Date.now() });
  return { ...outcome, snapshot: productSessionSnapshot(sessionId) };
}

export function executeSessionAction(sessionId: string, confirmation: Record<string, unknown>) {
  const state = readProductSession(sessionId);
  const outcome = executeProductAction(state, confirmation);
  sessions.set(sessionId, { ...sessions.get(sessionId)!, state: outcome.state, touchedAt: Date.now() });
  return { ...outcome, snapshot: productSessionSnapshot(sessionId) };
}

export const PRODUCT_ACTION_TOOL = Object.freeze({
  type: "function",
  function: {
    name: "prepare_product_action",
    description: "Only when the participant explicitly asks to carry out a software operation, prepare its exact scope for their review. Advice, questions about whether to act, and quoted or negated requests must remain ordinary Chat. Preparing never adopts or executes. Use current version and receipt IDs from the product facts. Unsupported product changes require clarification; never substitute the nearest supported feature.",
    parameters: {
      type: "object",
      required: ["operation"],
      additionalProperties: false,
      properties: {
        operation: {
          type: "object",
          required: ["kind"],
          additionalProperties: false,
          properties: {
            kind: { type: "string", enum: ["inspect", "propose", "verify", "adopt", "discard", "rollback", "retain", "defer"] },
            candidateKind: { type: "string", enum: ["linked", "scoped"], description: "linked = linked viewing with the initial batch preview; scoped = explicit per-item batch preview. Do not choose a candidate the participant did not request." },
            verifyAfterProposal: { type: "boolean", description: "True only if the participant requested implementation and checks together." },
            target: { type: "string", enum: ["current", "candidate"] },
            revisionId: { type: "string" }, candidateRevisionId: { type: "string" },
            supersedesCandidateId: { type: "string" }, restoreRevisionId: { type: "string" },
            pendingCandidateId: { type: ["string", "null"] }, receiptId: { type: "string" },
            view: { type: "string", enum: ["all", "Inbox", "Unsorted", "Collections", "Search"] },
            query: { type: "string" }, collection: { type: "string" },
            reason: { type: "string", description: "Preserve the participant's stated reason, without inventing it." },
            reopenCondition: { type: "string", description: "Use the participant's explicit resolving evidence or check." },
          },
        },
      },
    },
  },
});

export const MAX_EVALUATION_PAGE_CHARACTERS = 128_000;
const MAX_PUBLICATIONS_PER_SESSION = 8;
const MAX_EVALUATION_FACT_CHARACTERS = 8_000_000;
const EVALUATION_SCOPE = ["url_only_save", "matched_retrieval", "batch_scope_and_inverse"];
const EVALUATION_CLASS = "author_constructed_simulated_scenario";
const EVALUATION_SOURCE = "AUTHORING:linked-evaluation-v4.2-constructed-allocation-v1";
let evaluationCorpus: ReturnType<typeof createLinkedCandidateEvaluationCorpus> | undefined;
function corpus() { return evaluationCorpus ??= createLinkedCandidateEvaluationCorpus(); }
function evaluationError(code: string): never { throw new Error(`product_evaluation:${code}`); }
function plainObject(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function nonempty(value: unknown): value is string { return typeof value === "string" && !!value.trim(); }
function keysOnly(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) evaluationError("unsupported_fields");
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (plainObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export type EvaluationQuery = {
  armId?: "R0" | "candidate" | "both";
  kind: "summary" | "full" | "route" | "batch" | "setup";
  group?: "all" | "ordinary" | "scope_mismatch" | "known_search";
  recordIds?: string[];
  cursor?: string;
  maxRecords?: number;
};
type NormalizedQuery = Required<Pick<EvaluationQuery, "armId" | "kind" | "group" | "maxRecords">> & Pick<EvaluationQuery, "recordIds" | "cursor">;
function normalizeQuery(value: unknown = { kind: "summary" }): NormalizedQuery {
  if (!plainObject(value)) evaluationError("query_required");
  keysOnly(value, ["armId", "kind", "group", "recordIds", "cursor", "maxRecords"]);
  const query = { armId: "both", group: "all", maxRecords: 5, ...value } as NormalizedQuery;
  if (!["R0", "candidate", "both"].includes(query.armId) || !["summary", "full", "route", "batch", "setup"].includes(query.kind)
    || !["all", "ordinary", "scope_mismatch", "known_search"].includes(query.group)) evaluationError("query_invalid");
  if ((query.group === "scope_mismatch" && query.kind !== "batch") || (query.group === "known_search" && query.kind !== "route")
    || (["summary", "full", "setup"].includes(query.kind) && query.group !== "all")) evaluationError("query_group_invalid");
  if (!Number.isSafeInteger(query.maxRecords) || query.maxRecords < 1 || query.maxRecords > 10) evaluationError("max_records_must_be_1_to_10");
  if (query.recordIds !== undefined && (!Array.isArray(query.recordIds) || !query.recordIds.length || query.recordIds.length > 200
    || query.recordIds.some((id) => !nonempty(id)) || new Set(query.recordIds).size !== query.recordIds.length)) evaluationError("record_ids_invalid");
  if (query.kind === "summary" && (query.recordIds || query.cursor || query.armId !== "both")) evaluationError("summary_query_invalid");
  if (query.cursor !== undefined && !nonempty(query.cursor)) evaluationError("cursor_invalid");
  return query;
}

/** Available protocol metadata only; no outcomes, future packets or private configuration. */
export function getSessionEvaluationCapabilities(sessionId: string) {
  const { product } = readProductSession(sessionId);
  const targets = [
    { target: "current", revisionId: product.currentRevisionId, config: product.config, items: product.items },
    ...(product.candidate ? [{ target: "candidate", revisionId: product.candidate.revisionId, config: product.candidate.config, items: product.candidate.items }] : []),
  ];
  return targets.flatMap((target) => {
    if (!/^C[1-9]\d*$/u.test(target.revisionId)) return [];
    const evaluation = corpus().evaluations.find((window) => {
      const subject = window.arms[1].subject;
      return canonical(subject.config) === canonical(target.config) && canonical(subject.items) === canonical(target.items);
    });
    return evaluation ? [{ target: target.target, candidateRevisionId: target.revisionId,
      windowId: evaluation.windowId, protocolId: evaluation.protocolId, scope: [...EVALUATION_SCOPE],
      evidenceClass: EVALUATION_CLASS,
      coverage: "当前六条内核快照的精确内容绑定；材料另含两个组各 12 个独立六条副本，全部使用记录为作者构造。",
    }] : [];
  });
}

function downloadUrl(sessionId: string, publicationId: string) {
  return `/api/product-evaluation?sessionId=${encodeURIComponent(sessionId)}&publicationId=${encodeURIComponent(publicationId)}`;
}
function allPublicRecords(packet: EvaluationPacket) {
  return packet.arms.flatMap((arm) => [
    ...arm.replicas.map((record) => ({ armId: arm.armId, kind: "setup", recordId: record.replicaId, record })),
    ...arm.routeTasks.map((record) => ({ armId: arm.armId, kind: "route", recordId: record.recordId, record })),
    ...arm.batchCases.map((record) => ({ armId: arm.armId, kind: "batch", recordId: record.recordId, record })),
  ]).sort((left, right) => left.recordId.localeCompare(right.recordId));
}
function publicMetadata(publication: Publication) {
  const packet = publication.packet;
  return {
    publicationId: publication.id, packetId: packet.packetId, evidenceClass: packet.evidenceClass,
    asOfProductStateVersion: publication.asOfProductStateVersion,
    provenanceStatement: packet.provenanceStatement, protocol: packet.protocol,
    revisionBinding: packet.revisionBinding, comparisonBinding: packet.comparisonBinding,
    summary: packet.summary, notParticipantData: true, humanEfficiencyEvidence: false, engineeringExecutionEvidence: false,
    scopeStatement: "服务端绑定本会话的六条实际内核快照；每个模拟组另有 12 个独立六条副本、48 个找回任务和 40 个批量任务。副本不是本会话新增的条目或参与者。",
    boundaries: packet.boundaries,
  };
}
function evaluationFact(publication: Publication, suffix: string, kind: string, title: string, body: string, aliases: string[] = []): PublicEvaluationFact {
  return {
    id: `${publication.id}:${suffix}`, kind, title, body, publicationId: publication.id,
    windowId: publication.packet.protocol.windowId, revisionId: publication.packet.subject.revisionId,
    asOfProductStateVersion: publication.asOfProductStateVersion,
    evidenceClass: EVALUATION_CLASS, source: EVALUATION_SOURCE, canonicalMaterial: true,
    queryAliases: aliases, scopeTags: ["twelve-independent-six-item-replicas-per-arm", "authored-usage-records", "exact-six-item-subject-binding"],
    relatedFactIds: suffix === "SUMMARY" ? [] : [publication.summaryFactId],
  };
}
function initialFacts(publication: Publication, sessionId: string) {
  const { packet } = publication;
  const title = `${publication.id} 模拟评价摘要`;
  const summaryBody = `${title}\n${JSON.stringify(publicMetadata(publication))}\n`;
  const indexTitle = `${publication.id} 原文记录目录`;
  const records = allPublicRecords(packet);
  const manifest = records.map(({ armId, kind, recordId }) => ({ armId, kind, recordId }));
  const manifestBody = `${indexTitle}\n${JSON.stringify({ publicationId: publication.id, windowId: packet.protocol.windowId,
    totalRecords: records.length, deliveredRawRecords: 0, records: manifest,
    readContract: { function: "request_candidate_evaluation", action: "read", publicationId: publication.id,
      kinds: ["full", "route", "batch", "setup"], groups: ["all", "ordinary", "scope_mismatch", "known_search"], maxRecords: "1..10", pageCharacterLimit: MAX_EVALUATION_PAGE_CHARACTERS },
  })}\n目录不代表原文已交付或已阅读；原文可逐页读取。全部原文下载与两个条件的 Chat 使用同一个入口。\n[完整模拟评价原文](${downloadUrl(sessionId, publication.id)})`;
  return [evaluationFact(publication, "SUMMARY", "evaluation_summary", title, summaryBody),
    evaluationFact(publication, "MANIFEST", "evaluation_manifest", indexTitle, manifestBody)];
}
function selectRecords(publication: Publication, query: NormalizedQuery) {
  const candidate = publication.packet.revisionBinding.logicalArm;
  let records = allPublicRecords(publication.packet).filter((entry) => query.armId === "both" || entry.armId === (query.armId === "candidate" ? candidate : "R0"));
  if (query.kind !== "full") records = records.filter((entry) => entry.kind === query.kind);
  if (query.group !== "all") {
    const eligible = new Set(publication.packet.arms.flatMap((arm) => queryLinkedCandidateEvaluationPacket(publication.packet,
      { armId: arm.armId, kind: query.kind, group: query.group }).records.map((record: { recordId: string }) => record.recordId)));
    records = records.filter((record) => eligible.has(record.recordId));
  }
  if (query.recordIds) {
    if (query.recordIds.some((id) => !records.some((record) => record.recordId === id))) evaluationError("record_not_in_requested_published_selection");
    records = records.filter((record) => query.recordIds!.includes(record.recordId));
  }
  return records;
}
type Entry = NonNullable<ReturnType<typeof sessions.get>>;
function cloneEntry(entry: Entry): Entry {
  return { ...entry, publications: new Map(entry.publications), cursors: new Map(entry.cursors), facts: new Map(entry.facts) };
}
function storeFacts(entry: Entry, facts: PublicEvaluationFact[]) {
  const total = [...entry.facts.values()].filter((fact) => fact.kind.startsWith("evaluation_")).reduce((size, fact) => size + fact.body.length, 0)
    + facts.filter((fact) => !entry.facts.has(fact.id)).reduce((size, fact) => size + fact.body.length, 0);
  if (total > MAX_EVALUATION_FACT_CHARACTERS) evaluationError("delivered_material_capacity_reached_no_truncation");
  for (const fact of facts) {
    const existing = entry.facts.get(fact.id);
    if (existing && existing.body !== fact.body) evaluationError("immutable_fact_conflict");
    entry.facts.set(fact.id, fact);
  }
}
function delivery(entry: Entry, publication: Publication, query: NormalizedQuery, includeInitial = false) {
  const initial = includeInitial || query.kind === "summary" ? initialFacts(publication, entry.state.sessionId) : [];
  if (query.kind === "summary") {
    storeFacts(entry, initial);
    return { message: initial.map((fact) => fact.body).join("\n\n"), nodeIds: initial.map((fact) => fact.id),
      pagination: { totalRecords: allPublicRecords(publication.packet).length, deliveredRecordIds: [] as string[], remainingRecords: allPublicRecords(publication.packet).length,
        nextCursor: null as string | null, complete: false, delivery: "summary_and_manifest_only" } };
  }
  const selection = canonical({ armId: query.armId, kind: query.kind, group: query.group, recordIds: query.recordIds ?? null });
  const cursor = query.cursor ? entry.cursors.get(query.cursor) : null;
  if (query.cursor && (!cursor || cursor.publicationId !== publication.id || cursor.selection !== selection)) evaluationError("cursor_not_for_requested_publication_and_selection");
  const records = selectRecords(publication, query);
  const offset = cursor?.offset ?? 0;
  const title = `${publication.id} 原文页 ${entry.nextDelivery}`;
  const prefix = `${title}\n作者构造的模拟原文；以下完整记录属于 ${publication.packet.protocol.windowId}，不是实际 UI 执行或人的效果。\n`;
  const link = `\n[完整模拟评价原文](${downloadUrl(entry.state.sessionId, publication.id)})`;
  const headerSize = initial.reduce((size, fact) => size + fact.body.length + 2, 0);
  const pageRecords: typeof records = [];
  let body = "";
  let pagination;
  const nextToken = crypto.randomUUID();
  const render = () => {
    const nextOffset = offset + pageRecords.length;
    pagination = { totalRecords: records.length, offset, deliveredRecordIds: pageRecords.map((record) => record.recordId),
      remainingRecords: records.length - nextOffset, nextCursor: nextOffset < records.length ? nextToken : null,
      complete: nextOffset === records.length, delivery: "complete_records_page" };
    return `${prefix}${JSON.stringify({ publicationId: publication.id, selection: { armId: query.armId, kind: query.kind, group: query.group }, pagination, records: pageRecords })}${link}`;
  };
  while (offset + pageRecords.length < records.length && pageRecords.length < query.maxRecords) {
    pageRecords.push(records[offset + pageRecords.length]);
    const candidateBody = render();
    if (headerSize + candidateBody.length > MAX_EVALUATION_PAGE_CHARACTERS) {
      pageRecords.pop();
      if (!pageRecords.length) evaluationError("single_record_exceeds_page_capacity_no_truncation");
      break;
    }
    body = candidateBody;
  }
  body = render();
  if (headerSize + body.length > MAX_EVALUATION_PAGE_CHARACTERS) evaluationError("page_capacity_reached_no_truncation");
  const page = evaluationFact(publication, `PAGE:${entry.nextDelivery}`, "evaluation_page", title, body);
  storeFacts(entry, [...initial, page]);
  entry.nextDelivery += 1;
  if (offset + pageRecords.length < records.length) entry.cursors.set(nextToken, { publicationId: publication.id, selection, offset: offset + pageRecords.length });
  return { message: [...initial.map((fact) => fact.body), body].join("\n\n"), nodeIds: [...initial.map((fact) => fact.id), page.id], pagination: pagination! };
}

export interface PublishSessionEvaluationRequest {
  expectedSessionVersion: number; participantRequest: string; explicitEvaluationRequest: true;
  target: "current" | "candidate"; candidateRevisionId: string; windowId: string; protocolId: string; scope: string[];
  query?: EvaluationQuery; compareWithPublicationId?: string;
}

export function publishSessionEvaluation(sessionId: string, request: PublishSessionEvaluationRequest) {
  const state = readProductSession(sessionId);
  if (!plainObject(request)) evaluationError("publication_request_required");
  keysOnly(request, ["expectedSessionVersion", "participantRequest", "explicitEvaluationRequest", "target", "candidateRevisionId", "windowId", "protocolId", "scope", "query", "compareWithPublicationId"]);
  if (request.expectedSessionVersion !== state.sessionVersion) evaluationError("stale_session_version");
  if (request.explicitEvaluationRequest !== true || !nonempty(request.participantRequest)) evaluationError("explicit_evaluation_request_required");
  if (!["current", "candidate"].includes(request.target) || !nonempty(request.candidateRevisionId)
    || !nonempty(request.windowId) || !nonempty(request.protocolId) || !Array.isArray(request.scope)) evaluationError("exact_target_window_protocol_scope_required");
  const query = normalizeQuery(request.query);
  if (query.cursor) evaluationError("publication_cannot_reuse_read_cursor");
  const entry = cloneEntry(sessions.get(sessionId)!);
  if (entry.publications.size >= MAX_PUBLICATIONS_PER_SESSION) evaluationError("publication_capacity_reached");
  const target = request.target === "candidate" ? state.product.candidate : { revisionId: state.product.currentRevisionId, config: state.product.config, items: state.product.items };
  if (!target || target.revisionId !== request.candidateRevisionId) evaluationError("exact_revision_not_available");
  const previous = request.compareWithPublicationId ? entry.publications.get(request.compareWithPublicationId) : null;
  if (request.compareWithPublicationId !== undefined && !previous) evaluationError("comparison_not_published_in_this_session");
  const publicationId = `EVALUATION:${sessionId}:PUBLICATION:${entry.publications.size + 1}`;
  const packet = publishLinkedCandidateEvaluation(corpus(), {
    requestId: publicationId, explicitEvaluationRequest: true, candidateRevisionId: target.revisionId,
    windowId: request.windowId, protocolId: request.protocolId, scope: request.scope,
    subjectSnapshot: { revisionId: target.revisionId, config: target.config, items: target.items },
    ...(previous ? { compareWithPacketId: previous.packet.packetId } : {}),
  }, previous ? [previous.packet.publicationReceipt] : []);
  const publication: Publication = { id: publicationId, packet, participantRequest: request.participantRequest,
    asOfProductStateVersion: state.product.stateVersion, summaryFactId: `${publicationId}:SUMMARY`, manifestFactId: `${publicationId}:MANIFEST` };
  entry.publications.set(publicationId, publication);
  const result = delivery(entry, publication, query, true);
  sessions.set(sessionId, entry);
  return { status: "published" as const, ...result, publicationId, downloadUrl: downloadUrl(sessionId, publicationId), snapshot: productSessionSnapshot(sessionId) };
}

export function querySessionEvaluation(sessionId: string, request: { publicationId?: string; windowId?: string; query: EvaluationQuery }) {
  readProductSession(sessionId);
  if (!plainObject(request)) evaluationError("read_request_required");
  keysOnly(request, ["publicationId", "windowId", "query"]);
  if ((!nonempty(request.publicationId) && !nonempty(request.windowId)) || (request.publicationId && request.windowId)) evaluationError("one_publication_or_window_required");
  const entry = cloneEntry(sessions.get(sessionId)!);
  const publication = request.publicationId ? entry.publications.get(request.publicationId)
    : [...entry.publications.values()].reverse().find((value) => value.packet.protocol.windowId === request.windowId);
  if (!publication) evaluationError("window_not_published_in_this_session");
  const result = delivery(entry, publication, normalizeQuery(request.query));
  sessions.set(sessionId, entry);
  return { status: "read" as const, ...result, publicationId: publication.id,
    downloadUrl: downloadUrl(sessionId, publication.id), snapshot: productSessionSnapshot(sessionId) };
}

/** Exact ordinary Chat read aliases; synthesis, suggestions and unknown wording stay with the Agent. */
export function readSessionEvaluationAlias(sessionId: string, participantRequest: string) {
  if (typeof participantRequest !== "string") return null;
  const text = participantRequest.trim().replace(/^(?:请给我|请列出|请读取|请查看|读取|查看|show\s+|read\s+)/iu, "").replace(/[。.!！]$/u, "").trim();
  const single = /^(SIM-MATCHED-W[12]):(R0|C1|C2):(ROUTE|BATCH)-(\d{3})$/u.exec(text);
  if (single) return querySessionEvaluation(sessionId, { windowId: single[1],
    query: { kind: single[3] === "ROUTE" ? "route" : "batch", recordIds: [text] } });
  const match = /^(SIM-MATCHED-W[12]|W[12]|EVALUATION:[A-F0-9-]+:PUBLICATION:[1-9]\d*)\s*(allroute|allbatch|all|full|ordinary|mismatch|known_search|setup|summary|全部找回|全部批量|全集|普通批量|范围异常|已知标题查找|保存事件|摘要)(?:\s+(R0|candidate|both))?$/iu.exec(text);
  if (!match) return null;
  const selectors: Record<string, Pick<EvaluationQuery, "kind" | "group">> = {
    allroute: { kind: "route", group: "all" }, 全部找回: { kind: "route", group: "all" },
    allbatch: { kind: "batch", group: "all" }, 全部批量: { kind: "batch", group: "all" },
    all: { kind: "full" }, full: { kind: "full" }, 全集: { kind: "full" },
    ordinary: { kind: "batch", group: "ordinary" }, 普通批量: { kind: "batch", group: "ordinary" },
    mismatch: { kind: "batch", group: "scope_mismatch" }, 范围异常: { kind: "batch", group: "scope_mismatch" },
    known_search: { kind: "route", group: "known_search" }, 已知标题查找: { kind: "route", group: "known_search" },
    setup: { kind: "setup" }, 保存事件: { kind: "setup" }, summary: { kind: "summary" }, 摘要: { kind: "summary" },
  };
  const ref = match[1].toUpperCase();
  const armId = match[3]?.toLowerCase() === "r0" ? "R0" : match[3]?.toLowerCase() as "candidate" | "both" | undefined;
  return querySessionEvaluation(sessionId, {
    ...(ref.startsWith("EVALUATION:") ? { publicationId: ref } : { windowId: ref.startsWith("SIM-") ? ref : `SIM-MATCHED-${ref}` }),
    query: { ...selectors[match[2].toLowerCase()], ...(armId ? { armId } : {}) },
  });
}

/** The download contains every published raw record, never private config or hidden oracles. */
export function downloadSessionEvaluation(sessionId: string, publicationId: string) {
  readProductSession(sessionId);
  const publication = sessions.get(sessionId)!.publications.get(publicationId);
  if (!publication) evaluationError("window_not_published_in_this_session");
  return { body: JSON.stringify({ ...publicMetadata(publication), records: allPublicRecords(publication.packet) }),
    filename: `${publication.packet.protocol.windowId}-${publication.packet.subject.revisionId}-simulated-records.json`,
    contentType: "application/json; charset=utf-8" };
}

/** Model tool arguments cannot replace authoritative state or the original request. */
export function executeSessionEvaluationTool(sessionId: string, expectedSessionVersion: number, participantRequest: string, args: unknown) {
  if (!plainObject(args)) evaluationError("tool_arguments_required");
  keysOnly(args, ["action", "target", "candidateRevisionId", "windowId", "protocolId", "scope", "publicationId", "query", "compareWithPublicationId"]);
  const state = readProductSession(sessionId);
  if (state.sessionVersion !== expectedSessionVersion) evaluationError("stale_session_version");
  if (!nonempty(participantRequest)) evaluationError("explicit_evaluation_request_required");
  if (args.action === "publish") {
    if (args.publicationId !== undefined) evaluationError("publication_id_is_server_assigned");
    const { action: _action, ...request } = args;
    void _action;
    return publishSessionEvaluation(sessionId, { ...request, expectedSessionVersion, participantRequest,
      explicitEvaluationRequest: true } as PublishSessionEvaluationRequest);
  }
  if (args.action === "read") {
    keysOnly(args, ["action", "publicationId", "windowId", "query"]);
    return querySessionEvaluation(sessionId, { ...(args.publicationId !== undefined ? { publicationId: args.publicationId as string } : {}),
      ...(args.windowId !== undefined ? { windowId: args.windowId as string } : {}), query: args.query as EvaluationQuery });
  }
  return evaluationError("explicit_publish_or_read_required");
}

export const EVALUATION_TOOL = Object.freeze({
  type: "function",
  function: {
    name: "request_candidate_evaluation",
    description: "Publish authored simulated evaluation material only when explicitly requested for an exact available product snapshot. Use available protocol metadata; never invent a window, scope or revision, and never treat advice, a negation or a quotation as authorization. Publication does not execute checks, change, adopt or grade the product. Read only previously published material. Full/route/batch queries return complete records in bounded pages with nextCursor; never claim a page is the entire dataset. No prerequisite linked evaluation is needed for a directly requested scoped candidate. Keep original material verbatim; do not rewrite or continue another model turn after delivery.",
    parameters: {
      type: "object", required: ["action"], additionalProperties: false,
      properties: {
        action: { type: "string", enum: ["publish", "read"] },
        target: { type: "string", enum: ["current", "candidate"] },
        candidateRevisionId: { type: "string" }, windowId: { type: "string" }, protocolId: { type: "string" },
        scope: { type: "array", items: { type: "string", enum: EVALUATION_SCOPE }, minItems: 3, maxItems: 3, uniqueItems: true },
        publicationId: { type: "string", description: "Read a published packet by its server-issued ID; use windowId instead only to read its latest already-published packet." },
        compareWithPublicationId: { type: "string", description: "Only for explicitly requested cross-window historical comparison; no pooled effect or prerequisite." },
        query: {
          type: "object", required: ["kind"], additionalProperties: false,
          properties: {
            armId: { type: "string", enum: ["R0", "candidate", "both"] },
            kind: { type: "string", enum: ["summary", "full", "route", "batch", "setup"] },
            group: { type: "string", enum: ["all", "ordinary", "scope_mismatch", "known_search"] },
            recordIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 200, uniqueItems: true },
            cursor: { type: "string", description: "Opaque nextCursor from the same publication and exact selection; retain kind/group/armId/recordIds." },
            maxRecords: { type: "integer", minimum: 1, maximum: 10 },
          },
        },
      },
    },
  },
});
