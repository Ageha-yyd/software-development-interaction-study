import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

// Execute the real TypeScript modules without a build, server, or provider call.
// Each loader isolates rate limits and uses an explicit non-secret test key.
function modules(fetchImplementation = async () => { throw new Error("unexpected_network_request"); }) {
  const cache = new Map();
  const context = vm.createContext({
    Request, Response, URL, TextEncoder, AbortController,
    crypto: webcrypto, setTimeout, clearTimeout,
    fetch: fetchImplementation,
    process: { env: { SOFTWARE_AGENT_API_KEY: "test-only-key" } },
  });
  function load(relativePath) {
    const path = resolve(projectRoot, relativePath);
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule);
    const output = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      fileName: path.replace(/\.mjs$/, ".ts"),
    }).outputText;
    const execute = vm.runInContext(`(function(require, module, exports) { ${output}\n})`, context, { filename: path });
    execute((specifier) => {
      if (!specifier.startsWith(".")) throw new Error(`test_unavailable_module:${specifier}`);
      return load(resolve(dirname(path), /\.(?:ts|tsx|mjs|js)$/.test(specifier) ? specifier : `${specifier}.ts`));
    }, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}

function fixtureNode(index, options = {}) {
  const nodeId = `INFO:FIELD-${index}`;
  const text = `字段事实${index}`;
  return {
    schemaVersion: 1, nodeId, title: `字段名称${index}`, body: text,
    chatAnchorText: text, groundingPhrases: [text], sourceLabel: `来源标签${index}`,
    relatedNodeIds: [], queryAliases: [`field-${index}`],
    queryResponseLead: text, queryResponseNodeIds: [nodeId],
    epistemicDepth: "L1", kind: "constraint", temporalStage: "current_r0",
    epistemicStatus: "current", availableFromStage: "history",
    scopeTags: ["test"], availableOperations: ["inspect"], ...options,
  };
}

function fixture(nodes, relations = []) {
  return {
    schemaVersion: 1, scenarioId: "chat-parity-fixture", episodeId: "test",
    informationSpaceVersion: "v4-pilot.1", title: "test", shortTitle: "test", description: "test",
    baselineOrdinal: 1, triggerOrdinal: 2, baselineActionLabel: "test", intentPrompt: "test",
    intentPlaceholder: "test", completionMessage: "test",
    informationNodes: nodes, informationRelations: relations, turns: [], objectAnchors: [],
    frontierRoots: { history: [nodes[0].nodeId], e0: [] },
  };
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const runtime = modules()("lib/experiment/runtime.ts");

test("one request retrieves all fifteen independently named fields without packet or anchor truncation", () => {
  const nodes = Array.from({ length: 15 }, (_, index) => fixtureNode(index));
  const adapter = runtime.createScenarioAdapter(fixture(nodes));
  const query = nodes.map((item) => item.queryAliases[0]).join("，以及 ");
  const packet = adapter.buildPacket(query, "history");
  assert.equal(packet.resolution.matched, true);
  assert.deepEqual(new Set(packet.resolution.nodeIds), new Set(nodes.map((item) => item.nodeId)));
  assert.equal(packet.nodes.length, 15);
  const grounded = adapter.markGroundedPhrases(packet.resolution.message, packet.resolution.nodeIds);
  assert.equal(grounded.nodeIds.length, 15);
});

test("context and graph proximity cannot turn an unrelated question into a retrieval hit", () => {
  const nodes = [fixtureNode(1), fixtureNode(2)];
  const relations = [{ schemaVersion: 1, relationId: "EDGE:TEST", sourceNodeId: nodes[0].nodeId, targetNodeId: nodes[1].nodeId, kind: "supports" }];
  const adapter = runtime.createScenarioAdapter(fixture(nodes, relations));
  for (const query of ["火星气候怎么样", "那今天的天气怎么样", "再看一个新的城市"]) {
    const result = adapter.resolveQuery(query, "history", [nodes[0].nodeId]);
    assert.equal(result.matched, false);
    assert.equal(result.nodeIds.length, 0);
  }
});

test("shared aliases require disambiguation unless one matching referent is in Chat context", () => {
  const nodes = [fixtureNode(1, { queryAliases: ["共同术语"] }), fixtureNode(2, { queryAliases: ["共同术语"] })];
  const adapter = runtime.createScenarioAdapter(fixture(nodes));
  const ambiguous = adapter.resolveQuery("看看共同术语", "history");
  assert.equal(ambiguous.matched, false);
  assert.equal(ambiguous.nodeIds.length, 0);
  const contextual = adapter.resolveQuery("看看共同术语", "history", [nodes[1].nodeId]);
  assert.deepEqual(plain(contextual.nodeIds), [nodes[1].nodeId]);
});

test("specific references suppress only contained alias hits, preserving separate requested fields", () => {
  const nodes = [fixtureNode(1, { queryAliases: ["Search"] }), fixtureNode(2, { queryAliases: ["Search offline sync"] })];
  const adapter = runtime.createScenarioAdapter(fixture(nodes));
  assert.deepEqual(plain(adapter.resolveQuery("看看 Search offline sync", "history").nodeIds), [nodes[1].nodeId]);
  assert.deepEqual(new Set(adapter.resolveQuery("看看 Search offline sync，再解释 Search", "history").nodeIds), new Set(nodes.map((item) => item.nodeId)));
});

test("referential follow-up uses a unique context and asks when several referents remain", () => {
  const nodes = [fixtureNode(1), fixtureNode(2)];
  const adapter = runtime.createScenarioAdapter(fixture(nodes));
  assert.deepEqual(plain(adapter.resolveQuery("那这个呢？", "history", [nodes[0].nodeId]).nodeIds), [nodes[0].nodeId]);
  assert.equal(adapter.resolveQuery("那这个呢？", "history", nodes.map((item) => item.nodeId)).matched, false);
});

test("packet includes requested bundle and Chat context, without roots, UI disclosure, or neighbor expansion", () => {
  const nodes = [fixtureNode(1), fixtureNode(2), fixtureNode(3), fixtureNode(4)];
  const relations = [{ schemaVersion: 1, relationId: "EDGE:TEST", sourceNodeId: nodes[1].nodeId, targetNodeId: nodes[2].nodeId, kind: "derived_from" }];
  const adapter = runtime.createScenarioAdapter(fixture(nodes, relations));
  const packet = adapter.buildPacket("field-2", "history", [nodes[3].nodeId], [nodes[2].nodeId]);
  assert.deepEqual(plain(packet.nodes.map((item) => item.nodeId)), [nodes[1].nodeId, nodes[3].nodeId]);
  assert.equal(packet.relations.length, 0);
});

test("later evidence remains unavailable before its common trigger", () => {
  const nodes = [fixtureNode(1), fixtureNode(2, { availableFromStage: "e0" })];
  const adapter = runtime.createScenarioAdapter(fixture(nodes));
  assert.equal(adapter.resolveQuery("field-2", "history").matched, false);
  assert.equal(adapter.resolveQuery("field-2", "e0").matched, true);
});

test("real scenario answers multi-field references without retrieving the raw trace neighbor", () => {
  const scenario = modules()("scenarios/software-product-development-v1.ts").SOFTWARE_PRODUCT_DEVELOPMENT_V1;
  const adapter = runtime.createScenarioAdapter(scenario);
  const packet = adapter.buildPacket("解释产品目标、保存规则、Search、护栏，再查看具体案例", "e0");
  assert.equal(packet.resolution.matched, true);
  assert.ok(packet.resolution.nodeIds.includes("TRACE:R0-REFIND-017"));
  assert.ok(packet.resolution.nodeIds.includes("INFO:SAVE-RULES-R0"));
  assert.ok(!packet.nodes.some((item) => item.nodeId === "RAWSET:NAV-017-01-04"));
});

test("deterministic metadata separates requested evidence from anchors actually returned", async () => {
  const nodes = [fixtureNode(1, { queryResponseNodeIds: ["INFO:FIELD-1", "INFO:FIELD-2"] }), fixtureNode(2)];
  const adapter = runtime.createScenarioAdapter(fixture(nodes, [{
    schemaVersion: 1, relationId: "EDGE:REQUESTED-ONLY", sourceNodeId: nodes[0].nodeId,
    targetNodeId: nodes[1].nodeId, kind: "derived_from",
  }]));
  const gateway = modules()("lib/experiment/agent-gateway.ts").createDeterministicAgentGateway(adapter);
  const result = await gateway.respond({ scenarioId: adapter.scenario.scenarioId, query: "field-1", frontierStage: "history" });
  assert.deepEqual(plain(result.requestedNodeIds), nodes.map((item) => item.nodeId));
  assert.deepEqual(plain(result.groundedNodeIds), [nodes[0].nodeId]);
  assert.deepEqual(plain(result.traversedRelationIds), []);
});

function apiHarness(content = "当前材料不足以支持这个判断。", finishReason = "stop") {
  const upstream = [];
  const load = modules(async (_url, options) => {
    upstream.push(JSON.parse(options.body));
    return Response.json({ choices: [{ message: { content }, finish_reason: finishReason }] });
  });
  const route = load("app/api/software-agent/route.ts");
  const scenario = load("scenarios/software-product-development-v1.ts").SOFTWARE_PRODUCT_DEVELOPMENT_V1;
  async function post(overrides = {}) {
    const body = {
      scenarioId: scenario.scenarioId, frontierStage: "history", contextNodeIds: [],
      messages: [{ role: "user", content: "产品目标" }], ...overrides,
    };
    const response = await route.POST(new Request("http://localhost/api/software-agent", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    return { status: response.status, payload: await response.json() };
  }
  return { route, post, upstream };
}

test("API preserves complete histories longer than sixteen messages and former per-message limits", async () => {
  const { post, upstream } = apiHarness();
  const messages = Array.from({ length: 41 }, (_, index) => ({
    role: index % 2 ? "assistant" : "user", content: index === 0 ? `最初的历史${"完整内容".repeat(750)}` : `历史消息 ${index}`,
  }));
  messages.at(-1).content = "产品目标";
  const result = await post({ messages });
  assert.equal(result.status, 200);
  assert.deepEqual(upstream[0].messages.slice(1), messages);
  assert.doesNotMatch(upstream[0].messages[0].content, /80–320|当前 Frontier：/);
  assert.match(upstream[0].messages[0].content, /允许一轮查询多个字段/);
});

test("API rejects explicit transcript overflow without sending truncated input upstream", async () => {
  const { post, upstream } = apiHarness();
  const cases = [
    Array.from({ length: 257 }, () => ({ role: "user", content: "完整历史" })),
    [{ role: "user", content: "长".repeat(256_001) }],
    Array.from({ length: 5 }, () => ({ role: "user", content: "长".repeat(200_001) })),
  ];
  for (const messages of cases) {
    const result = await post({ messages });
    assert.equal(result.status, 413);
    assert.match(result.payload.error, /未被截断/);
  }
  assert.equal(upstream.length, 0);
});

test("API checks actual request bytes without trusting content-length", async () => {
  const { post, upstream } = apiHarness();
  const result = await post({ messages: [{ role: "user", content: "大".repeat(360_000) }] });
  assert.equal(result.status, 413);
  assert.equal(upstream.length, 0);
});

test("API records only output anchors as disclosed and rejects provider-truncated answers", async () => {
  const { post } = apiHarness();
  const result = await post();
  assert.equal(result.status, 200);
  assert.ok(result.payload.requestedNodeIds.length > 0);
  assert.deepEqual(result.payload.groundedNodeIds, []);
  assert.deepEqual(result.payload.traversedRelationIds, []);
  const truncated = await apiHarness("部分答案", "length").post();
  assert.equal(truncated.status, 502);
  assert.match(truncated.payload.error, /截断/);
});

test("API forbids UI state fields and uses the same evidence envelope for the same semantic request", async () => {
  const { post, upstream } = apiHarness();
  const first = await post();
  const second = await post();
  assert.deepEqual(upstream[0], upstream[1]);
  assert.equal(first.payload.evidenceEnvelopeHash, second.payload.evidenceEnvelopeHash);
  for (const extra of [{ condition: "B" }, { selectedObjectRefs: [] }, { revealedNodeIds: [] }]) {
    assert.equal((await post(extra)).status, 400);
  }
});

test("remote gateway forwards the full semantic request and omits UI reveal state", async () => {
  const captured = [];
  const load = modules(async (_url, options) => {
    captured.push(JSON.parse(options.body));
    return Response.json({ matched: false, message: "测试回复", nodeIds: [], groundedNodeIds: [], requestedNodeIds: [], mode: "remote_chat_completion", frontierRef: "test" });
  });
  const gateway = load("lib/experiment/agent-gateway.ts").createRemoteAgentGateway();
  const request = { scenarioId: "test", query: "最后一问", frontierStage: "history", contextNodeIds: [], messages: Array.from({ length: 25 }, (_, index) => ({ role: "user", content: `第${index}问` })) };
  await gateway.respond({ ...request, revealedNodeIds: [] });
  await gateway.respond({ ...request, revealedNodeIds: ["PRIVATE:UI-REVEAL"] });
  assert.deepEqual(captured[0], captured[1]);
  assert.deepEqual(captured[0].messages, request.messages);
  assert.ok(!("revealedNodeIds" in captured[0]));
});
