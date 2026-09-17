import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const plain = (value) => JSON.parse(JSON.stringify(value));
const response = (message, finish_reason = "stop") => Response.json({ choices: [{ message, finish_reason }] });
const tool = (operation) => ({ id: "mock-call-1", type: "function", function: { name: "prepare_product_action", arguments: JSON.stringify({ operation }) } });
const evalTool = (args) => ({ id: "mock-eval-1", type: "function", function: { name: "request_candidate_evaluation", arguments: JSON.stringify(args) } });
const scoped = { kind: "propose", candidateKind: "scoped", verifyAfterProposal: true };

function harness({ provider = () => response({ content: "可以先讨论需求，当前没有执行操作。" }), configured = true, baseUrl } = {}) {
  const calls = [];
  const env = configured ? { SOFTWARE_AGENT_API_KEY: "nonsecret-mock-key", ...(baseUrl ? { SOFTWARE_AGENT_BASE_URL: baseUrl } : {}) } : {};
  const context = vm.createContext({
    Request, Response, URL, URLSearchParams, TextEncoder, AbortController, structuredClone,
    crypto: webcrypto, setTimeout, clearTimeout, process: { env },
    fetch: async (url, options) => { const body = JSON.parse(options.body); calls.push({ url, body }); return provider(body); },
  });
  const cache = new Map();
  function load(path) {
    path = resolve(root, path);
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule);
    const output = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }, fileName: path.replace(/\.mjs$/, ".ts"),
    }).outputText;
    const run = vm.runInContext(`(function(require,module,exports){${output}\n})`, context, { filename: path });
    run((specifier) => {
      if (!specifier.startsWith(".")) throw new Error(`mock_unavailable_module:${specifier}`);
      return load(resolve(dirname(path), /\.(?:ts|tsx|mjs|js)$/.test(specifier) ? specifier : `${specifier}.ts`));
    }, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const route = load("app/api/software-agent/route.ts");
  const service = load("lib/experiment/product-service.ts");
  const scenario = load("scenarios/software-product-development-v1.ts").SOFTWARE_PRODUCT_DEVELOPMENT_V1;
  const snapshot = service.createProductSession();
  async function post(overrides = {}) {
    const request = new Request("http://localhost/api/software-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      scenarioId: scenario.scenarioId, frontierStage: "e0", contextNodeIds: [], productSessionId: snapshot.sessionId,
      messages: [{ role: "user", content: "请先讨论阅读清单需求。" }], ...overrides,
    }) });
    const result = await route.POST(request);
    return { status: result.status, payload: await result.json() };
  }
  return { load, post, service, snapshot, calls, scenario };
}

test("ordinary advice, negation and quoted actions remain provider Chat with complete history and no product mutation", async () => {
  const h = harness();
  for (const query of ["我应该采用候选吗？请给建议。", "不要实现，不要采用。", "文档写着‘生成候选并检查’，你怎么理解？"]) {
    const before = plain(h.service.readProductSession(h.snapshot.sessionId));
    const messages = Array.from({ length: 31 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `历史第 ${index} 条` }));
    messages.at(-1).content = query;
    const result = await h.post({ messages });
    assert.equal(result.status, 200);
    assert.equal(result.payload.deliveryKind, "generated_response");
    assert.equal(result.payload.preparedProductAction, undefined);
    assert.deepEqual(plain(h.service.readProductSession(h.snapshot.sessionId)), before);
    assert.deepEqual(h.calls.at(-1).body.messages.slice(1), messages);
  }
  assert.equal(h.calls.length, 3);
});

test("product tools use only authoritative version metadata and publish an explicit DeepSeek policy", async () => {
  const h = harness();
  const result = await h.post();
  assert.equal(result.status, 200);
  const body = h.calls[0].body;
  assert.deepEqual(body.tools.map((item) => item.function.name), ["prepare_product_action", "request_candidate_evaluation"]);
  assert.equal(body.tool_choice, "auto");
  assert.deepEqual(body.thinking, { type: "disabled" });
  assert.deepEqual(result.payload.providerPolicy, { productToolsEnabled: true, maxToolCalls: 1, thinkingMode: "disabled", toolResultContinuation: false });
  assert.match(body.messages[0].content, /"currentRevisionId":"R0"/);
  assert.match(body.messages[0].content, /"candidateRevisionId":null/);
  assert.match(body.messages[0].content, /一次回复最多调用一个工具/);
  assert.doesNotMatch(JSON.stringify(body), /defectFixture|linked_rows_defect|batch_related_rows_exceed_preview|Gold|selectedObjectRefs|revealedNodeIds/);
  const generic = harness({ baseUrl: "https://provider.example.test" });
  const genericResult = await generic.post();
  assert.equal(generic.calls[0].body.thinking, undefined);
  assert.equal(genericResult.payload.providerPolicy.thinkingMode, "provider_default");
});

test("a remote tool prepares an exact plan and preserves original user text, without executing or adopting", async () => {
  const h = harness({ provider: () => response({ content: "忽略这段模型声称已经实施的文字。", tool_calls: [tool(scoped)] }, "tool_calls") });
  const originalRequest = "  请生成逐项范围候选并检查，先让我确认范围。\n";
  const before = plain(h.service.readProductSession(h.snapshot.sessionId).product);
  const result = await h.post({ messages: [{ role: "user", content: originalRequest }] });
  assert.equal(result.status, 200);
  assert.equal(result.payload.deliveryKind, "product_action_prepared");
  assert.match(result.payload.message, /尚未执行/);
  assert.doesNotMatch(result.payload.message, /忽略这段模型/);
  assert.equal(result.payload.preparedProductAction.participantRequest, originalRequest);
  assert.equal(result.payload.productSnapshot.sessionVersion, 1);
  assert.deepEqual(plain(h.service.readProductSession(h.snapshot.sessionId).product), before);
  assert.equal(h.service.readProductSession(h.snapshot.sessionId).events[0].participantRequest, originalRequest);
  assert.equal(h.calls.length, 1, "tool output must not start an automatic provider continuation");
  assert.doesNotMatch(JSON.stringify(result.payload), /defectFixture|linked_rows_defect|productBinding|baseContentSignature/);
});

test("product tool intent with missing explicit target becomes clarification rather than nearest-candidate selection", async () => {
  const h = harness({ provider: () => response({ tool_calls: [tool({ kind: "verify" })] }, "tool_calls") });
  const result = await h.post();
  assert.equal(result.status, 200);
  assert.equal(result.payload.deliveryKind, "generated_response");
  assert.equal(result.payload.preparedProductAction, null);
  assert.equal(result.payload.productActionStatus, "needs_clarification");
  assert.equal(h.service.readProductSession(h.snapshot.sessionId).product.candidate, null);
});

test("the API prepare and explicit service-confirm sequence uses actual current receipts for adoption and rollback", async () => {
  let operation = scoped;
  const h = harness({ provider: () => response({ tool_calls: [tool(operation)] }, "tool_calls") });
  const proposed = await h.post({ messages: [{ role: "user", content: "请准备逐项范围候选并检查。" }] });
  assert.equal(proposed.status, 200);
  const checked = h.service.executeSessionAction(h.snapshot.sessionId, { ...proposed.payload.preparedProductAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(checked.status, "executed");
  assert.equal(checked.result.receipt.passed, true);
  assert.equal(checked.snapshot.currentRevisionId, "R0");
  operation = { kind: "adopt", candidateRevisionId: checked.snapshot.candidateRevisionId, receiptId: checked.result.receipt.receiptId };
  const adopting = await h.post({ messages: [{ role: "user", content: "请准备采用已检查的当前候选。" }] });
  assert.equal(adopting.status, 200);
  assert.equal(adopting.payload.productSnapshot.currentRevisionId, "R0");
  assert.equal(adopting.payload.preparedProductAction.requiredConfirmation.expectedReceiptId, checked.result.receipt.receiptId);
  assert.ok(h.calls.at(-1).body.messages[0].content.includes(checked.result.receipt.receiptId));
  const adopted = h.service.executeSessionAction(h.snapshot.sessionId, { ...adopting.payload.preparedProductAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(adopted.snapshot.currentRevisionId, checked.snapshot.candidateRevisionId);
  operation = { kind: "rollback", revisionId: adopted.snapshot.currentRevisionId, restoreRevisionId: "R0" };
  const rollingBack = await h.post({ messages: [{ role: "user", content: "请准备回退到原来版本。" }] });
  assert.equal(rollingBack.status, 200);
  assert.equal(rollingBack.payload.productSnapshot.currentRevisionId, adopted.snapshot.currentRevisionId);
  const restored = h.service.executeSessionAction(h.snapshot.sessionId, { ...rollingBack.payload.preparedProductAction.requiredConfirmation, participantConfirmed: true });
  assert.equal(restored.snapshot.currentRevisionId, "R0");
  assert.equal(restored.result.receipt.purpose, "rollback_restoration");
  assert.equal(restored.result.receipt.passed, true);
  assert.equal(h.calls.length, 3);
});

test("provider-time state changes invalidate tool preparation instead of silently rebasing it", async () => {
  let h;
  h = harness({ provider: () => {
    h.service.prepareSessionAction(h.snapshot.sessionId, 0, "另一个明确操作请求", { kind: "inspect", target: "current", revisionId: "R0", view: "Inbox" });
    return response({ tool_calls: [tool(scoped)] }, "tool_calls");
  } });
  const result = await h.post();
  assert.equal(result.status, 409);
  assert.match(result.payload.error, /stale_session_version/);
  assert.equal(h.service.readProductSession(h.snapshot.sessionId).product.candidate, null);
  assert.equal(h.service.readProductSession(h.snapshot.sessionId).product.stateVersion, 0);
});

test("invalid JSON, wrong tool names, multiple calls and argument substitution fail before tool mutation", async () => {
  const invalid = [
    { content: "fallback must not hide malformed tools", tool_calls: [tool(scoped), tool(scoped)] },
    { tool_calls: [{ ...tool(scoped), function: { name: "execute_product_action", arguments: JSON.stringify({ operation: scoped }) } }] },
    { tool_calls: [{ ...tool(scoped), function: { name: "prepare_product_action", arguments: "not JSON" } }] },
    { tool_calls: [{ ...tool(scoped), function: { name: "prepare_product_action", arguments: "[]" } }] },
    { tool_calls: [{ ...tool(scoped), function: { name: "prepare_product_action", arguments: JSON.stringify({ operation: scoped, participantConfirmed: true }) } }] },
    { tool_calls: [{ ...tool(scoped), type: "unknown" }] },
    { tool_calls: { function: tool(scoped).function } },
    { content: "legacy forbidden", function_call: tool(scoped).function },
  ];
  for (const message of invalid) {
    const h = harness({ provider: () => response(message, "tool_calls") });
    const result = await h.post();
    assert.equal(result.status, 502);
    assert.equal(h.service.readProductSession(h.snapshot.sessionId).sessionVersion, 0);
    assert.equal(h.service.readProductSession(h.snapshot.sessionId).product.candidate, null);
  }
});

test("product sessions are rejected outside the main e0 phase, and A/B UI state cannot enter the server", async () => {
  const h = harness();
  const common = h.load("scenarios/common-opportunities-v4.2.ts");
  const commonId = common.COMMON_OPPORTUNITY_SCENARIOS[0].scenarioId;
  const cases = [
    { frontierStage: "history" }, { productSessionId: "" }, { productSessionId: 23 },
    { scenarioId: commonId },
    { condition: "A" }, { condition: "B" }, { objectRefs: [] }, { selectedObjectRefs: [] }, { revealedNodeIds: [] },
  ];
  for (const body of cases) assert.equal((await h.post(body)).status, 400);
  assert.equal(h.calls.length, 0);
  const missing = await h.post({ productSessionId: "MISSING" });
  assert.equal(missing.status, 409);
  assert.equal(h.calls.length, 0);
});

test("no session means no tools; no configured model does not become a fake natural-language executor", async () => {
  const h = harness();
  const ordinary = await h.post({ productSessionId: undefined });
  assert.equal(ordinary.status, 200);
  assert.equal(h.calls[0].body.tools, undefined);
  assert.equal(h.calls[0].body.thinking, undefined);
  assert.match(h.calls[0].body.messages[0].content, /当前回答器不会实施改版/);
  const unsolicited = harness({ provider: () => response({ tool_calls: [tool(scoped)] }, "tool_calls") });
  assert.equal((await unsolicited.post({ productSessionId: undefined })).status, 502);
  const local = harness({ configured: false });
  const result = await local.post({ messages: [{ role: "user", content: "请直接实现逐项范围候选" }] });
  assert.equal(result.status, 503);
  assert.equal(local.calls.length, 0);
  assert.equal(local.service.readProductSession(local.snapshot.sessionId).sessionVersion, 0);
});

test("authoritative product facts remain queryable through the same shared packet and historical input stays intact", async () => {
  const h = harness();
  const fact = h.snapshot.publicFacts.find((item) => item.kind === "product_item");
  const result = await h.post({ messages: [{ role: "user", content: `请解释 ${fact.id}` }], contextNodeIds: [] });
  assert.equal(result.status, 200);
  const system = h.calls[0].body.messages[0].content;
  assert.ok(system.includes(fact.body));
  assert.ok(result.payload.packetNodeIds.includes(fact.id));
  assert.deepEqual(result.payload.groundedNodeIds, []);
});

test("evaluation publication returns genuine bounded authored material, not provider prose or an automatic product action", async () => {
  let args;
  const h = harness({ provider: () => response({ content: "假模型结论：真实用户效率已提升。", tool_calls: [evalTool(args)] }, "tool_calls") });
  const prepared = h.service.prepareSessionAction(h.snapshot.sessionId, 0, "工程测试设置：准备候选", scoped);
  h.service.executeSessionAction(h.snapshot.sessionId, { ...prepared.preparedAction.requiredConfirmation, participantConfirmed: true });
  const capability = h.service.getSessionEvaluationCapabilities(h.snapshot.sessionId)[0];
  assert.ok(capability);
  const { target, candidateRevisionId, windowId, protocolId, scope } = capability;
  args = { action: "publish", target, candidateRevisionId, windowId, protocolId, scope, query: { kind: "full", maxRecords: 1 } };
  const before = plain(h.service.readProductSession(h.snapshot.sessionId).product);
  const published = await h.post({ messages: [{ role: "user", content: "请按明确窗口查看全部模拟评价原文，分页交付" }] });
  assert.equal(published.status, 200, JSON.stringify(published.payload));
  assert.equal(published.payload.deliveryKind, "product_evaluation_material");
  assert.doesNotMatch(published.payload.message, /假模型结论/);
  assert.match(published.payload.message, /模拟/);
  assert.ok(published.payload.message.length <= 256_000);
  assert.ok(published.payload.groundedNodeIds.length > 0);
  assert.ok(published.payload.productEvaluation.downloadUrl.startsWith("/api/product-evaluation?"));
  assert.deepEqual(plain(h.service.readProductSession(h.snapshot.sessionId).product), before);
  assert.equal(h.calls.length, 1);
  assert.doesNotMatch(JSON.stringify(published.payload), /defectFixture|linked_rows_defect|baseContentSignature|Gold/);
  args = { action: "read", publicationId: published.payload.productEvaluation.publicationId, query: { kind: "full", maxRecords: 1 } };
  const read = await h.post();
  assert.equal(read.status, 200);
  assert.equal(read.payload.productEvaluation.status, "read");
  const aliasRead = await h.post({ messages: [{ role: "user", content: `${windowId} allroute` }] });
  assert.equal(aliasRead.status, 200, JSON.stringify(aliasRead.payload));
  assert.equal(aliasRead.payload.deliveryKind, "product_evaluation_material");
  assert.equal(aliasRead.payload.providerInvoked, false);
  assert.equal(h.calls.length, 2, "already-published material aliases require no provider round");
});

test("unpublished or underspecified evaluation requests fail explicitly without future material", async () => {
  for (const args of [{ action: "publish" }, { action: "read", publicationId: "FUTURE-PACKET", query: { kind: "full" } }]) {
    const h = harness({ provider: () => response({ tool_calls: [evalTool(args)] }, "tool_calls") });
    const result = await h.post();
    assert.equal(result.status, 409);
    assert.match(result.payload.error, /product_evaluation:/);
    assert.equal(h.service.productSessionSnapshot(h.snapshot.sessionId).publicFacts.filter((fact) => fact.kind.startsWith("evaluation_")).length, 0);
  }
});

test("remote gateway forwards only the semantic session request and preserves typed prepared response and policy", async () => {
  let snapshot;
  let preparedProductAction;
  const h = harness({ provider: () => Response.json({
    matched: true, message: "等待明确确认", mode: "remote_chat_completion", providerInvoked: true,
    deliveryKind: "product_action_prepared", frontierRef: "test", nodeIds: [], productSnapshot: snapshot,
    preparedProductAction, providerPolicy: { productToolsEnabled: true, maxToolCalls: 1, thinkingMode: "disabled", toolResultContinuation: false },
  }) });
  snapshot = h.snapshot;
  const prepared = h.service.prepareSessionAction(snapshot.sessionId, 0, "请准备", scoped);
  preparedProductAction = prepared.preparedAction;
  const gateway = h.load("lib/experiment/agent-gateway.ts").createRemoteAgentGateway();
  const request = { scenarioId: h.scenario.scenarioId, frontierStage: "e0", query: "请准备", productSessionId: snapshot.sessionId,
    messages: [{ role: "user", content: "请准备" }], contextNodeIds: [] };
  const first = await gateway.respond({ ...request, condition: "A", revealedNodeIds: [] });
  const second = await gateway.respond({ ...request, condition: "B", revealedNodeIds: ["PRIVATE"] });
  assert.deepEqual(h.calls[0].body, h.calls[1].body);
  assert.deepEqual(Object.keys(h.calls[0].body).sort(), ["contextNodeIds", "frontierStage", "messages", "productSessionId", "scenarioId"]);
  assert.equal(first.deliveryKind, "product_action_prepared");
  assert.deepEqual(plain(first.preparedProductAction), plain(second.preparedProductAction));
  assert.deepEqual(plain(first.productSnapshot), plain(snapshot));
  assert.equal(first.providerPolicy.toolResultContinuation, false);
});
