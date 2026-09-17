import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const plain = (value) => JSON.parse(JSON.stringify(value));
const hidden = /defectFixture|linked_rows_defect|batch_related_rows_exceed_preview|baseContentSignature|subjectContentSignature|productBinding|goldOutcome|selectedObjectRefs|objectRefs|correctChoice/;
function harness() {
  const cache = new Map();
  const context = vm.createContext({ Request, Response, URL, TextEncoder, structuredClone, crypto: webcrypto });
  function load(relativePath) {
    const path = resolve(projectRoot, relativePath);
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule);
    const output = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, fileName: path.replace(/\.mjs$/u, ".ts"),
    }).outputText;
    const run = vm.runInContext(`(function(require,module,exports){${output}\n})`, context, { filename: path });
    run((specifier) => {
      if (!specifier.startsWith(".")) throw new Error(`unexpected_dependency:${specifier}`);
      const target = resolve(dirname(path), specifier);
      return load([".ts", ".mjs", ".js"].includes(extname(target)) ? target : `${target}.ts`);
    }, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const service = load("lib/experiment/product-service.ts");
  const session = service.createProductSession();
  function act(operation) {
    const snapshot = service.productSessionSnapshot(session.sessionId);
    const preparation = service.prepareSessionAction(session.sessionId, snapshot.sessionVersion, "参与者明确要求执行此产品操作。", operation);
    assert.equal(preparation.status, "prepared");
    const result = service.executeSessionAction(session.sessionId, { ...preparation.preparedAction.requiredConfirmation, participantConfirmed: true });
    assert.equal(result.status, "executed");
    return result;
  }
  function request(overrides = {}) {
    const snapshot = service.productSessionSnapshot(session.sessionId);
    const capability = service.getSessionEvaluationCapabilities(session.sessionId).find((entry) => entry.target === "candidate");
    return { expectedSessionVersion: snapshot.sessionVersion, participantRequest: "请发布这个版本对应的模拟评价材料。", explicitEvaluationRequest: true,
      target: capability?.target, candidateRevisionId: capability?.candidateRevisionId, windowId: capability?.windowId,
      protocolId: capability?.protocolId, scope: capability?.scope, ...overrides };
  }
  const publish = (overrides) => service.publishSessionEvaluation(session.sessionId, request(overrides));
  const read = (publicationId, query) => service.querySessionEvaluation(session.sessionId, { publicationId, query });
  return { service, session, load, act, request, publish, read };
}
function pageData(result) {
  const facts = result.snapshot.publicFacts.filter((fact) => result.nodeIds.includes(fact.id) && fact.kind === "evaluation_page");
  assert.equal(facts.length, 1);
  return JSON.parse(facts[0].body.split("\n")[2]);
}

test("direct scoped publication binds physical C1, delivers only metadata, and leaves product authority unchanged", () => {
  const h = harness();
  assert.deepEqual(plain(h.service.getSessionEvaluationCapabilities(h.session.sessionId)), []);
  assert.equal(h.session.publicFacts.some((fact) => fact.kind.startsWith("evaluation_")), false);
  h.act({ kind: "propose", candidateKind: "scoped" });
  const capabilities = h.service.getSessionEvaluationCapabilities(h.session.sessionId);
  assert.equal(capabilities.length, 1);
  assert.equal(capabilities[0].windowId, "SIM-MATCHED-W2");
  assert.equal(capabilities[0].candidateRevisionId, "C1");
  assert.doesNotMatch(JSON.stringify(capabilities), /scopeMismatches|dualEntry|SIM-MATCHED-W1|linked_rows_defect/);
  const before = plain(h.service.readProductSession(h.session.sessionId));
  const result = h.publish();
  assert.equal(result.status, "published");
  assert.deepEqual(plain(h.service.readProductSession(h.session.sessionId)), before);
  assert.equal(result.snapshot.publicFacts.filter((fact) => fact.kind.startsWith("evaluation_")).length, 2);
  assert.equal(result.pagination.deliveredRecordIds.length, 0);
  assert.equal(result.pagination.remainingRecords, 200);
  assert.equal(result.pagination.complete, false);
  assert.ok(result.message.length < h.service.MAX_EVALUATION_PAGE_CHARACTERS);
  assert.doesNotMatch(result.message, /SIM-MATCHED-W1|"beforeItems"|"setupEvents"/);
  assert.doesNotMatch(JSON.stringify(result), hidden);
  const full = JSON.parse(h.service.downloadSessionEvaluation(h.session.sessionId, result.publicationId).body);
  assert.equal(full.records.length, 200);
  assert.equal(full.revisionBinding.logicalArm, "C2");
  assert.equal(full.revisionBinding.actualCandidateRevisionId, "C1");
  assert.match(full.scopeStatement, /六条.*12 个独立六条副本/);
  assert.doesNotMatch(JSON.stringify(full), hidden);
  assert.match(result.message, /\[完整模拟评价原文\]\(\/api\/product-evaluation\?sessionId=/);
});

test("publication rejects stale, forged, wrong-window and incomplete requests atomically", () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "scoped" });
  const before = plain(h.service.productSessionSnapshot(h.session.sessionId));
  for (const patch of [
    { explicitEvaluationRequest: false }, { participantRequest: " " }, { expectedSessionVersion: -1 },
    { candidateRevisionId: "C99" }, { target: "current" }, { scope: ["matched_retrieval"] },
    { windowId: "SIM-MATCHED-W1", protocolId: "PROTOCOL:LINKED-EVAL-W1-v4.2" },
    { subjectSnapshot: { revisionId: "C1", config: {}, items: [] } }, { condition: "B" },
    { compareWithPublicationId: "unpublished" }, { query: { kind: "batch", group: "known_search" } },
    { query: { kind: "full", recordIds: ["future-record"] } },
  ]) {
    assert.throws(() => h.publish(patch));
    assert.deepEqual(plain(h.service.productSessionSnapshot(h.session.sessionId)), before);
  }
  assert.throws(() => h.service.querySessionEvaluation(h.session.sessionId, { windowId: "SIM-MATCHED-W2", query: { kind: "full" } }), /not_published/);
  const result = h.publish();
  assert.match(result.publicationId, /PUBLICATION:1$/);
  assert.throws(() => h.service.querySessionEvaluation(h.session.sessionId, { windowId: "SIM-MATCHED-W1", query: { kind: "full" } }), /not_published/);
});

test("all 200 records can be read without truncation through bounded, selection-bound pages", () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "linked" });
  const published = h.publish();
  const expected = JSON.parse(h.service.downloadSessionEvaluation(h.session.sessionId, published.publicationId).body).records;
  const records = [];
  let cursor;
  let pages = 0;
  do {
    const result = h.read(published.publicationId, { kind: "full", maxRecords: 10, ...(cursor ? { cursor } : {}) });
    const data = pageData(result);
    assert.ok(result.message.length <= h.service.MAX_EVALUATION_PAGE_CHARACTERS);
    assert.equal(result.pagination.totalRecords, 200);
    assert.equal(result.pagination.offset, records.length);
    assert.equal(data.records.length, result.pagination.deliveredRecordIds.length);
    records.push(...data.records);
    assert.equal(result.pagination.remainingRecords, 200 - records.length);
    assert.equal(result.pagination.complete, records.length === 200);
    if (pages === 0) {
      assert.throws(() => h.read(published.publicationId, { kind: "batch", cursor: result.pagination.nextCursor }), /cursor_not_for/);
      const fact = result.snapshot.publicFacts.find((entry) => entry.id === result.nodeIds[0]);
      fact.body = "client mutation";
      assert.notEqual(h.service.productSessionSnapshot(h.session.sessionId).publicFacts.find((entry) => entry.id === fact.id).body, fact.body);
    }
    cursor = result.pagination.nextCursor;
    pages += 1;
  } while (cursor);
  assert.ok(pages >= 20);
  assert.equal(new Set(records.map((record) => record.recordId)).size, 200);
  assert.deepEqual(records, expected);
  assert.throws(() => h.read(published.publicationId, { kind: "full", cursor: "invented" }), /cursor_not_for/);
});

test("ordinary, mismatch, known-search and one-record reads use the published source predicates", () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "linked" });
  const published = h.publish({ query: { kind: "batch", group: "scope_mismatch", armId: "candidate" } });
  const mismatch = pageData(published);
  assert.equal(published.nodeIds.length, 3);
  assert.equal(published.pagination.totalRecords, 3);
  assert.equal(published.pagination.complete, true);
  assert.deepEqual(mismatch.records.map((entry) => entry.recordId.slice(-3)), ["004", "019", "033"]);
  assert.ok(mismatch.records.every((entry) => entry.record.terminal.kind === "undone_due_to_scope"));
  assert.equal(h.read(published.publicationId, { kind: "batch", group: "ordinary", armId: "candidate" }).pagination.totalRecords, 37);
  assert.equal(h.read(published.publicationId, { kind: "route", group: "known_search" }).pagination.totalRecords, 24);
  const one = h.read(published.publicationId, { kind: "batch", recordIds: [mismatch.records[0].recordId] });
  assert.deepEqual(pageData(one).records, mismatch.records.slice(0, 1));
  const empty = h.read(published.publicationId, { kind: "batch", group: "scope_mismatch", armId: "R0" });
  assert.equal(empty.pagination.totalRecords, 0);
  assert.equal(empty.pagination.complete, true);
  assert.deepEqual(pageData(empty).records, []);
});

test("published history stays immutable and readable after later candidates, checks and new windows", () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "linked" });
  const first = h.publish();
  const firstFacts = first.snapshot.publicFacts.filter((fact) => fact.kind.startsWith("evaluation_"));
  h.act({ kind: "propose", candidateKind: "scoped", supersedesCandidateId: "C1" });
  const second = h.publish({ compareWithPublicationId: first.publicationId });
  const parsed = JSON.parse(h.service.downloadSessionEvaluation(h.session.sessionId, second.publicationId).body);
  assert.equal(parsed.comparisonBinding.packetId, "PACKET:LINKED-EVAL:C1:SIM-MATCHED-W1");
  assert.equal(parsed.revisionBinding.actualCandidateRevisionId, "C2");
  assert.ok(parsed.records.every((record) => record.recordId.startsWith("SIM-MATCHED-W2:")));
  h.act({ kind: "verify", candidateRevisionId: "C2" });
  for (const fact of firstFacts) {
    const retained = h.service.productSessionSnapshot(h.session.sessionId).publicFacts.find((entry) => entry.id === fact.id);
    assert.deepEqual(plain(retained), plain(fact));
    assert.equal(retained.isCurrentSnapshot, undefined);
  }
  assert.equal(h.read(first.publicationId, { kind: "batch", group: "scope_mismatch", armId: "candidate" }).pagination.totalRecords, 3);
  assert.equal(h.read(second.publicationId, { kind: "batch", group: "scope_mismatch", armId: "candidate" }).pagination.totalRecords, 0);
  assert.notEqual(first.nodeIds[0], second.nodeIds[0]);
});

test("evaluation publication does not invalidate a prepared product operation or execute it", () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "scoped" });
  const snapshot = h.service.productSessionSnapshot(h.session.sessionId);
  const prepared = h.service.prepareSessionAction(h.session.sessionId, snapshot.sessionVersion, "请检查候选。", { kind: "verify", candidateRevisionId: "C1" });
  const stateBefore = plain(h.service.readProductSession(h.session.sessionId));
  const published = h.publish();
  assert.deepEqual(plain(h.service.readProductSession(h.session.sessionId)), stateBefore);
  assert.equal(published.snapshot.sessionVersion, prepared.snapshot.sessionVersion);
  const executed = h.service.executeSessionAction(h.session.sessionId, { ...prepared.preparedAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(executed.status, "executed");
  assert.equal(executed.state.product.receipts.length, 1);
});

test("exact ordinary Chat aliases read only published material and advice remains with the Agent", () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "linked" });
  h.publish();
  for (const [query, count] of [["W1 allroute", 96], ["请给我 W1 全部批量 candidate", 40], ["W1 ordinary candidate", 37], ["W1 mismatch", 3], ["SIM-MATCHED-W1:C1:BATCH-004", 1]]) {
    assert.equal(h.service.readSessionEvaluationAlias(h.session.sessionId, query).pagination.totalRecords, count);
  }
  for (const query of ["W1 allroute说明什么", "比较W1和W2", "不要发布W2", "W1 ordinary 是否值得采用", "给我W1后建议改进"]) {
    assert.equal(h.service.readSessionEvaluationAlias(h.session.sessionId, query), null);
  }
  assert.throws(() => h.service.readSessionEvaluationAlias(h.session.sessionId, "W2 allroute"), /not_published/);
});

test("public projection contains delivered bodies and same optional object content without future records", () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "scoped" });
  const result = h.publish({ query: { kind: "batch", armId: "candidate", maxRecords: 1 } });
  const base = h.load("scenarios/software-product-development-v1.ts").SOFTWARE_PRODUCT_DEVELOPMENT_V1;
  const scenario = h.load("scenarios/with-product-facts.ts").withProductFacts(base, result.snapshot.publicFacts);
  const adapter = h.load("lib/experiment/runtime.ts").createScenarioAdapter(scenario);
  assert.equal(scenario.informationNodes.filter((node) => node.scopeTags.includes("published-evaluation-material")).length, 3);
  for (const id of result.nodeIds) {
    const fact = result.snapshot.publicFacts.find((entry) => entry.id === id);
    assert.equal(adapter.node(id).body, fact.body);
    assert.equal(adapter.anchor(`OBJECT:${id}`).nodeId, id);
    assert.ok(result.message.includes(fact.title));
    const resolved = adapter.resolveQuery(id, "e0");
    assert.ok(resolved.nodeIds.includes(id));
    assert.ok(resolved.message.includes(fact.body));
    assert.ok(adapter.node(id).scopeTags.includes("twelve-independent-six-item-replicas-per-arm"));
    assert.ok(!adapter.node(id).scopeTags.includes("six-item-product-kernel"));
  }
  assert.doesNotMatch(result.message, /SIM-MATCHED-W1/);
  assert.equal(adapter.frontier("history").eligibleNodeIds.some((id) => id.startsWith("EVALUATION:")), false);
});

test("actual download GET returns all public raw records only for the owning published session", async () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "linked" });
  const published = h.publish();
  const route = h.load("app/api/product-evaluation/route.ts");
  const response = await route.GET(new Request(`http://localhost${published.downloadUrl}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-disposition"), /^attachment;/);
  const body = await response.text();
  assert.equal(body, h.service.downloadSessionEvaluation(h.session.sessionId, published.publicationId).body);
  assert.equal(JSON.parse(body).records.length, 200);
  assert.doesNotMatch(body, hidden);
  const other = h.service.createProductSession();
  for (const [query, status] of [[`sessionId=${other.sessionId}&publicationId=${published.publicationId}`, 404], [`sessionId=${h.session.sessionId}&publicationId=UNPUBLISHED`, 404], [`sessionId=${h.session.sessionId}`, 400], [`sessionId=${h.session.sessionId}&publicationId=${published.publicationId}&condition=B`, 400]]) {
    assert.equal((await route.GET(new Request(`http://localhost/api/product-evaluation?${query}`))).status, status);
  }
});

test("one evaluation tool preserves typed publish/read boundaries and never accepts client authority", () => {
  const h = harness();
  h.act({ kind: "propose", candidateKind: "scoped" });
  const { expectedSessionVersion, participantRequest, explicitEvaluationRequest: _explicit, ...args } = h.request();
  void _explicit;
  const result = h.service.executeSessionEvaluationTool(h.session.sessionId, expectedSessionVersion, participantRequest, { action: "publish", ...args });
  assert.equal(result.status, "published");
  const read = h.service.executeSessionEvaluationTool(h.session.sessionId, expectedSessionVersion, "读取普通批量记录。", { action: "read", publicationId: result.publicationId, query: { kind: "batch", group: "ordinary", armId: "candidate" } });
  assert.equal(read.pagination.totalRecords, 40);
  for (const injected of [{ subjectSnapshot: {} }, { condition: "B" }, { expectedSessionVersion: 999 }, { participantRequest: "替换" }]) {
    assert.throws(() => h.service.executeSessionEvaluationTool(h.session.sessionId, expectedSessionVersion, participantRequest, { action: "publish", ...args, ...injected }), /unsupported_fields/);
  }
  assert.throws(() => h.service.executeSessionEvaluationTool(h.session.sessionId, -1, participantRequest, { action: "read", publicationId: result.publicationId }), /stale_session/);
  assert.equal(h.service.EVALUATION_TOOL.function.name, "request_candidate_evaluation");
});
