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
const strip = (value) => value.replace(/\[\[([A-Z0-9:@._+-]+)\|([^\]\r\n]+)\]\]/g, "$2");

// Exercise the actual POST, adapter, scenario registry and gateway. Only the
// provider/network boundary is replaced; no rewritten route logic is tested.
function harness({ configured = true, providerFails = false } = {}) {
  const cache = new Map();
  const providerRequests = [];
  let requestOrdinal = 0;
  let route;
  const context = vm.createContext({
    Request, Response, URL, TextEncoder, AbortController, structuredClone,
    crypto: webcrypto, setTimeout, clearTimeout,
    process: { env: configured ? { SOFTWARE_AGENT_API_KEY: "test-only-key", SOFTWARE_AGENT_BASE_URL: "https://provider.example", SOFTWARE_AGENT_MODEL: "test-model" } : {} },
    fetch: async (url, options) => {
      if (url === "/api/software-agent") {
        return route.POST(new Request("http://localhost/api/software-agent", options));
      }
      providerRequests.push({ url, body: JSON.parse(options.body) });
      if (providerFails) throw new Error("test_provider_failure");
      return Response.json({ choices: [{ message: { content: "这是一条请求后生成的讨论回复，尚不能据此作出产品结论。" }, finish_reason: "stop" }] });
    },
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
    const run = vm.runInContext(`(function(require, module, exports) { ${output}\n})`, context, { filename: path });
    run((specifier) => {
      if (!specifier.startsWith(".")) throw new Error(`test_unavailable_module:${specifier}`);
      const target = resolve(dirname(path), specifier);
      return load([".ts", ".mjs", ".js"].includes(extname(target)) ? target : `${target}.ts`);
    }, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  route = load("app/api/software-agent/route.ts");
  const scenario = load("scenarios/software-product-development-v1.ts").SOFTWARE_PRODUCT_DEVELOPMENT_V1;
  const adapter = load("lib/experiment/runtime.ts").createScenarioAdapter(scenario);
  async function post(query = "全部事件来源", overrides = {}, headers = {}) {
    const body = { scenarioId: scenario.scenarioId, frontierStage: "e0", contextNodeIds: [], messages: [{ role: "user", content: query }], ...overrides };
    const response = await route.POST(new Request("http://localhost/api/software-agent", {
      method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": `canonical-test-${++requestOrdinal}`, ...headers }, body: JSON.stringify(body),
    }));
    return { status: response.status, payload: await response.json() };
  }
  return { load, route, scenario, adapter, post, providerRequests };
}

test("actual POST delivers every raw event verbatim without invoking a configured provider", async () => {
  const { post, adapter, providerRequests } = harness({ providerFails: true });
  const result = await post();
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  assert.equal(result.payload.deliveryKind, "canonical_material");
  assert.equal(result.payload.mode, "remote_chat_completion");
  assert.equal(result.payload.configuredAgentMode, "remote_chat_completion");
  assert.equal(result.payload.provider, "local-canonical-material");
  assert.equal(result.payload.providerInvoked, false);
  assert.equal(result.payload.usage, null);
  assert.equal(result.payload.model, undefined);
  assert.equal(result.payload.finishReason, "canonical_complete");
  assert.equal(providerRequests.length, 0);
  assert.ok(result.payload.message.length > 100_000);
  assert.equal(strip(result.payload.message), adapter.node("CORPUS:E0-EVENTS-ALL").body);
  assert.deepEqual(result.payload.nodeIds, ["CORPUS:E0-EVENTS-ALL"]);
  assert.deepEqual(result.payload.packetNodeIds, result.payload.nodeIds);
  assert.match(result.payload.evidenceEnvelopeHash, /^[a-f0-9]{64}$/);
});

test("one explicit compound read preserves both complete task and item bodies", async () => {
  const { post, adapter, providerRequests } = harness();
  const query = "请给我全部72任务和全部144条目，不要总结";
  const result = await post(query);
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  assert.equal(result.payload.deliveryKind, "canonical_material");
  const expected = result.payload.requestedNodeIds.map((ref) => adapter.node(ref).body).join("\n\n");
  assert.equal(strip(result.payload.message), expected);
  assert.deepEqual(new Set(result.payload.nodeIds), new Set(["CORPUS:E0-TASKS-ALL", "CORPUS:E0-ITEMS-ALL"]));
  assert.match(result.payload.message, /R0-ORGRETURN-024/);
  assert.match(result.payload.message, /R0-144/);
  assert.equal(providerRequests.length, 0);
});

test("individual raw records bypass generation while questions about them still reach the model", async () => {
  const { post, providerRequests } = harness();
  for (const query of ["R0-REFIND-024", "请给我 R0-049 的完整原文", "RAW:MEM-042-03"]) {
    const result = await post(query);
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    assert.equal(result.payload.deliveryKind, "canonical_material", query);
  }
  assert.equal(providerRequests.length, 0);
  for (const query of ["R0-049 说明了什么？", "比较普通Search例子与普通Collection例子", "给我全部72任务，然后建议下一步应该改什么", "全部事件来源是否足以支持改版", "帮我综合现有材料形成产品建议", "全部事件来源值得继续投入吗", "请给我全部72任务，我还能从中获得什么启发"]) {
    const result = await post(query);
    assert.equal(result.status, 200, JSON.stringify(result.payload));
    assert.equal(result.payload.deliveryKind, "generated_response", query);
    assert.equal(result.payload.providerInvoked, true);
  }
  assert.equal(providerRequests.length, 7);
});

test("no key permits only validated current E0 material reads and cannot bypass scene, stage or body validation", async () => {
  const { post, providerRequests } = harness({ configured: false });
  const read = await post();
  assert.equal(read.status, 200);
  assert.equal(read.payload.configuredAgentMode, "deterministic_local_lookup");
  assert.equal(read.payload.providerInvoked, false);
  assert.equal((await post("给我候选下一轮的全部结果")).status, 503);
  assert.equal((await post("全部事件来源", { frontierStage: "history", contextNodeIds: ["CORPUS:E0-EVENTS-ALL"] })).status, 503);
  assert.equal((await post("全部事件来源", { frontierStage: "o1" })).status, 400);
  assert.equal((await post("全部事件来源", { scenarioId: "future-unregistered-scenario" })).status, 400);
  assert.equal((await post("全部事件来源", { condition: "B" })).status, 400);
  assert.equal((await post("全部事件来源", { selectedObjectRefs: ["CORPUS:E0-EVENTS-ALL"] })).status, 400);
  assert.equal((await post("全部事件来源", { messages: [] })).status, 400);
  assert.equal(providerRequests.length, 0);
});

test("common-opportunity registry remains available and is not confused with the E0 ledger", async () => {
  const { load, post, providerRequests } = harness();
  const common = load("scenarios/common-opportunities-v4.2.ts").COMMON_OPPORTUNITY_SCENARIOS[0];
  const result = await post("给我全部本机会材料", { scenarioId: common.scenarioId });
  assert.equal(result.status, 200, JSON.stringify(result.payload));
  assert.equal(result.payload.deliveryKind, "generated_response");
  assert.equal(providerRequests.length, 1);
});

test("largest canonical reply survives the next generated turn as complete Chat history", async () => {
  const { post, providerRequests, route } = harness();
  const initial = await post();
  const messages = [
    { role: "user", content: "全部事件来源" },
    { role: "assistant", content: initial.payload.message },
    { role: "user", content: "这些材料有哪些证据限制？" },
  ];
  const next = await post("unused", { messages });
  assert.equal(next.status, 200, JSON.stringify(next.payload));
  assert.equal(providerRequests.length, 1);
  assert.deepEqual(providerRequests[0].body.messages.slice(1), messages.map((message) => ({ ...message, content: strip(message.content) })));
  assert.equal(providerRequests[0].body.messages[2].content.length, strip(initial.payload.message).length);
  const configuration = await (await route.GET()).json();
  assert.equal(configuration.transcriptLimits.maxMessageCharacters, 256_000);
  assert.equal(configuration.transcriptLimits.maxTranscriptCharacters, 1_000_000);
  assert.equal(configuration.transcriptLimits.maxRequestBytes, 8_388_608);
});

test("message, transcript, request-byte and material-response capacities fail explicitly without truncation", async () => {
  const { post, scenario, providerRequests } = harness();
  const single = await post("unused", { messages: [{ role: "user", content: "长".repeat(256_001) }] });
  assert.equal(single.status, 413);
  assert.match(single.payload.error, /未被截断/);
  const total = await post("unused", { messages: Array.from({ length: 5 }, () => ({ role: "user", content: "长".repeat(200_001) })) });
  assert.equal(total.status, 413);
  assert.match(total.payload.error, /完整对话/);
  const bytes = await post("unused", { messages: [{ role: "user", content: "大".repeat(2_800_000) }] });
  assert.equal(bytes.status, 413);
  assert.match(bytes.payload.error, /8 MiB/);
  const declaredBytes = await post("全部事件来源", {}, { "Content-Length": "8388609" });
  assert.equal(declaredBytes.status, 413);
  const allNodes = "给我全部以下材料原文：" + scenario.informationNodes.filter((node) => node.availableFromStage === "e0").map((node) => node.nodeId).join("，");
  const output = await post(allNodes);
  assert.equal(output.status, 413, JSON.stringify(output.payload).slice(0, 300));
  assert.match(output.payload.error, /单次交付上限/);
  assert.equal(output.payload.message, undefined);
  assert.equal(providerRequests.length, 0);
});

test("a normal provider failure stays a failure and never silently switches to material lookup", async () => {
  const { post, providerRequests } = harness({ providerFails: true });
  const result = await post("请分析 R0-REFIND-024 的含义");
  assert.equal(result.status, 503);
  assert.equal(result.payload.deliveryKind, undefined);
  assert.equal(result.payload.message, undefined);
  assert.equal(providerRequests.length, 1);
});

test("remote and local gateways preserve canonical body and report invocation independently of the session transport", async () => {
  const { load, scenario, adapter, providerRequests } = harness();
  const gatewayModule = load("lib/experiment/agent-gateway.ts");
  const request = { scenarioId: scenario.scenarioId, query: "全部事件来源", frontierStage: "e0", contextNodeIds: [] };
  const remote = await gatewayModule.createRemoteAgentGateway().respond(request);
  const local = await gatewayModule.createDeterministicAgentGateway(adapter).respond(request);
  assert.equal(remote.mode, "remote_chat_completion");
  assert.equal(local.mode, "deterministic_local_lookup");
  assert.equal(remote.configuredAgentMode, "remote_chat_completion");
  assert.equal(local.configuredAgentMode, "deterministic_local_lookup");
  assert.equal(remote.deliveryKind, "canonical_material");
  assert.equal(local.deliveryKind, "canonical_material");
  assert.equal(remote.providerInvoked, false);
  assert.equal(local.providerInvoked, false);
  assert.equal(remote.message, local.message);
  assert.deepEqual(plain(remote.nodeIds), plain(local.nodeIds));
  assert.equal(providerRequests.length, 0);
});
