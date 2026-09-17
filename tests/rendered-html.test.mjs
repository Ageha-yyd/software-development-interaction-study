import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(path = "/") {
  return dispatch(path);
}

async function dispatch(path = "/", init = {}, env = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "text/html");
  return worker.fetch(new Request(`http://localhost${path}`, { ...init, headers }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, ...env }, { waitUntil() {}, passThroughOnException() {} });
}

function postAction(body) {
  return dispatch("/api/v5/action", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function withMockChatCompletion(content, operation) {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body: Buffer.concat(chunks).toString("utf8"),
    });
    response.writeHead(200, { "content-type": "application/json", "x-request-id": "mock-software-agent-request" });
    response.end(JSON.stringify({
      choices: [{ message: { content }, finish_reason: "stop" }],
      usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
    }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    return await operation(`http://127.0.0.1:${address.port}`, requests);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const softwareAgentEnvironmentNames = [
  "SOFTWARE_AGENT_API_KEY",
  "SOFTWARE_AGENT_BASE_URL",
  "SOFTWARE_AGENT_MODEL",
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_MODEL",
];

async function withSoftwareAgentEnvironment(values, operation) {
  const previous = new Map(softwareAgentEnvironmentNames.map((name) => [name, process.env[name]]));
  for (const name of softwareAgentEnvironmentNames) delete process.env[name];
  for (const [name, value] of Object.entries(values)) process.env[name] = value;
  try {
    return await operation();
  } finally {
    for (const name of softwareAgentEnvironmentNames) {
      const value = previous.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("renders the software development experiment base without authentication", async () => {
  const response = await render("/?preview=1&condition=B");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /软件产品开发实验基座/);
  assert.match(html, /正在准备 v4 信息空间试用/);
  assert.doesNotMatch(html, /signin-with-chatgpt|requireChatGPTUser|ChatGPT 登录/);
});

test("routes the project root through the generic software experiment shell", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /ExperimentShell/);
  assert.match(page, /SOFTWARE_PRODUCT_DEVELOPMENT_V1/);
  assert.doesNotMatch(page, /ALFA|BETA|GAMMA|Stock Intent Lab/);
});

test("renders the V5.1 coding-agent surface without redesigning it", async () => {
  const response = await render("/v5?preview=1&condition=chat_widget");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /比较三只候选股票/);
  assert.match(html, /V5\.1 交互原型/);
  assert.match(html, /形成初步判断/);
  assert.doesNotMatch(html, /Strategy|Focus|Evidence Dashboard/);
});

test("freezes the exact 25-object V5.1 manifest", async () => {
  const registry = await readFile(new URL("lib/stock-v5-registry.ts", root), "utf8");
  const ids = [...registry.matchAll(/id:\s*"([ABG]-(?:COMPANY|GROWTH|VALUATION|VOLATILITY|LIQUIDITY|CONCENTRATION|CASHFLOW|CYCLE|DEBT|DISCLOSURE|UNCERTAINTY))"/g)].map((match) => match[1]);
  assert.equal(ids.length, 25);
  assert.equal(new Set(ids).size, 25);
  assert.equal((registry.match(/kind:\s*"company"/g) ?? []).length, 3);
  assert.equal((registry.match(/kind:\s*"fact"/g) ?? []).length, 16);
  assert.equal((registry.match(/kind:\s*"event"/g) ?? []).length, 3);
  assert.equal((registry.match(/kind:\s*"uncertainty"/g) ?? []).length, 3);
  assert.match(registry, /A-UNCERTAINTY[\s\S]*B-UNCERTAINTY[\s\S]*G-UNCERTAINTY/);
});

test("derives client pointability from the shared registry", async () => {
  const page = await readFile(new URL("app/v5/V5Demo.tsx", root), "utf8");
  assert.match(page, /STOCK_V5_PUBLIC_OBJECTS/);
  assert.match(page, /const POINTABLE_OBJECTS = STOCK_V5_PUBLIC_OBJECTS/);
  assert.match(page, /new Set\(POINTABLE_OBJECTS\.map\(\(object\) => object\.id\)\)/);
  assert.doesNotMatch(page, /const COMPANIES:\s*PublicObject\[\]/);
  assert.doesNotMatch(page, /const FACTS:\s*PublicObject\[\]/);
});

test("pre-trigger company payloads do not leak future disclosures", async () => {
  const registry = await readFile(new URL("lib/stock-v5-registry.ts", root), "utf8");
  const companySection = registry.slice(registry.indexOf('id: "A-COMPANY"'), registry.indexOf('id: "A-GROWTH"'));
  assert.doesNotMatch(companySection, /最新披露|回款不确定性|再融资不确定性|逾期回款|债务集中到期/);
});

test("uses explicit submission states instead of keyword or turn advancement", async () => {
  const page = await readFile(new URL("app/v5/V5Demo.tsx", root), "utf8");
  for (const phase of ["initial_exploration", "initial_submission", "disclosure_exploration", "final_submission", "complete"]) assert.match(page, new RegExp(phase));
  assert.match(page, /beginInitialSubmission/);
  assert.match(page, /beginFinalSubmission/);
  assert.match(page, /cancelSubmissionMode/);
  assert.match(page, />形成初步判断</);
  assert.match(page, />提交最终判断</);
  assert.doesNotMatch(page, /declaresChoice/);
  assert.doesNotMatch(page, /phase === "disclosure"\s*&&\s*\/\(提交最终判断/);
});

test("uses identical fixed answer cards instead of asking participants to guess a Chat format", async () => {
  const page = await readFile(new URL("app/v5/V5Demo.tsx", root), "utf8");
  assert.match(page, /submitInitialCard/);
  assert.match(page, /submitFinalCard/);
  assert.match(page, /初步优先候选/);
  assert.match(page, /与候选直接相关的一项当前依据/);
  assert.match(page, /另一项当前依据/);
  assert.match(page, /最终优先候选/);
  assert.match(page, /最新披露如何影响了你的判断/);
  assert.match(page, /目前仍有什么不确定性/);
  assert.match(page, /系统只检查是否填写完整，不评价你的选择/);
  assert.match(page, /submission_card_validation_failed/);
  assert.doesNotMatch(page, /FACTS\.map/);
  assert.doesNotMatch(page, /function extractStock/);
});

test("classifies an object-directed Chat question without forcing a detail action", async () => {
  const response = await postAction({ utterance: "BETA 的稳定性怎么样？", phase: "initial_exploration" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.matched, false);
  assert.deepEqual(body.targetObjectIds, ["B-COMPANY"]);
  const page = await readFile(new URL("app/v5/V5Demo.tsx", root), "utf8");
  assert.match(page, /first_object_directed_action/);
  assert.match(page, /time|elapsedFromT0Ms/);
});

test("does not count a plain object statement as an object-directed request", async () => {
  const response = await postAction({ utterance: "我觉得 BETA 风险更大。", phase: "initial_exploration" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.matched, false);
  assert.deepEqual(body.targetObjectIds, []);

  const fieldStatement = await postAction({ utterance: "GAMMA 的融资条件是我很担心的点。", phase: "disclosure_exploration" });
  assert.equal(fieldStatement.status, 200);
  const fieldBody = await fieldStatement.json();
  assert.equal(fieldBody.matched, false);
  assert.deepEqual(fieldBody.targetObjectIds, []);

  const completedAnalysis = await postAction({ utterance: "我分析了 GAMMA 的融资条件，还是觉得风险较大。", phase: "disclosure_exploration" });
  assert.equal(completedAnalysis.status, 200);
  const completedBody = await completedAnalysis.json();
  assert.equal(completedBody.matched, false);
  assert.deepEqual(completedBody.targetObjectIds, []);
});

test("resolves compound and contextual detail requests", async () => {
  const compound = await postAction({ utterance: "比较 ALFA 和 BETA 的估值详情", phase: "initial_exploration" });
  assert.equal(compound.status, 200);
  assert.deepEqual((await compound.json()).evidenceEnvelope.objectIds, ["A-VALUATION", "B-VALUATION"]);

  const reversed = await postAction({ utterance: "比较 BETA 和 ALFA 的估值详情", phase: "initial_exploration" });
  assert.equal(reversed.status, 200);
  assert.deepEqual((await reversed.json()).evidenceEnvelope.objectIds, ["B-VALUATION", "A-VALUATION"]);

  const contextual = await postAction({ utterance: "查看它的详情", contextObjectIds: ["B-CASHFLOW"], phase: "initial_exploration" });
  assert.equal(contextual.status, 200);
  assert.deepEqual((await contextual.json()).evidenceEnvelope.objectIds, ["B-CASHFLOW"]);

  const ambiguousContext = await postAction({
    utterance: "查看它的详情",
    contextObjectIds: ["B-COMPANY", "B-CASHFLOW"],
    phase: "initial_exploration",
  });
  assert.equal(ambiguousContext.status, 200);
  const ambiguousBody = await ambiguousContext.json();
  assert.equal(ambiguousBody.matched, true);
  assert.equal(ambiguousBody.needsClarification, true);
});

test("the first formal final submission is terminal and receives no Gold tutoring", async () => {
  const page = await readFile(new URL("app/v5/V5Demo.tsx", root), "utf8");
  assert.match(page, /first_final_submission_recorded/);
  assert.match(page, /firstFinalSubmitted\.current = true/);
  assert.match(page, /text: "已记录你的最终判断。"/);
  assert.match(page, /phaseRef\.current = "complete"/);
  assert.match(page, /if \(!finalSubmissionDraft\.candidate\)/);
  assert.match(page, /if \(!disclosureImpact\)/);
  assert.match(page, /if \(!remainingUncertainty\)/);
  assert.match(page, /final_card_submitted/);
  assert.doesNotMatch(page, /accepted_state|primary_endpoint_reached|缺少哪个详情|缺少哪个关系/);
});

test("keeps popup payloads factual and removes directional interpretation", async () => {
  const [registry, css] = await Promise.all([
    readFile(new URL("lib/stock-v5-registry.ts", root), "utf8"),
    readFile(new URL("app/v5/v5.module.css", root), "utf8"),
  ]);
  assert.doesNotMatch(registry, /不代表|不等于|不保证|并不保证|不能替代|意味着风险|不是恢复订单的承诺|明显恶化/);
  assert.match(registry, /指标：最近一个完整年度营收同比增长/);
  assert.match(registry, /观察期：截至 2025-06-30 的过去 12 个月/);
  assert.match(registry, /披露日期：2025-06-18/);
  assert.match(registry, /待确认项：完成时间、融资成本、最终方案/);
  assert.match(css, /white-space:pre-line/);
});

test("keeps the participant-facing script neutral", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("app/v5/V5Demo.tsx", root), "utf8"),
    readFile(new URL("app/api/deepseek/route.ts", root), "utf8"),
  ]);
  assert.match(page, /如果把增长和稳定看得同样重要/);
  assert.match(page, /这个排序只是基于当前材料/);
  assert.match(page, /系统收到以上最新披露。请根据你的判断需要继续研究/);
  assert.doesNotMatch(page, /下一步我会优先核查|这些摘要说明了风险方向，但不足以直接判断严重性/);
  assert.match(route, /Evidence Envelope/);
  assert.match(route, /你不知道 Gold path/);
  assert.match(route, /不得推荐唯一的下一步/);
  assert.doesNotMatch(route, /`当前阶段：\$\{phase\}/);
});

test("rejects disclosure and uncertainty details before the trigger", async () => {
  for (const objectId of ["A-DISCLOSURE", "B-UNCERTAINTY"]) {
    const response = await postAction({ action: "OPEN_DETAIL", objectIds: [objectId], phase: "initial_exploration" });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /尚未在当前对话中出现/);
  }
});

test("reveals the corresponding uncertainty from a post-trigger event detail", async () => {
  const response = await postAction({ action: "OPEN_DETAIL", objectIds: ["B-DISCLOSURE"], phase: "disclosure_exploration" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.evidenceEnvelope.revealedObjectIds, ["B-DISCLOSURE", "B-UNCERTAINTY"]);
  assert.equal(body.evidenceEnvelope.canonicalDetails.length, 1);
  assert.doesNotMatch(body.evidenceEnvelope.canonicalDetails[0], /现有材料没有给出逾期款项最终回收时间/);
  assert.equal(typeof body.payloadHash, "string");
  assert.equal(body.payloadHash.length, 64);
});

test("allows a direct post-trigger query for an open uncertainty", async () => {
  const response = await postAction({ utterance: "查看逾期款项最终回收时间", phase: "disclosure_exploration" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.objects[0].id, "B-UNCERTAINTY");
  assert.deepEqual(body.evidenceEnvelope.revealedObjectIds, ["B-UNCERTAINTY"]);
});

test("returns the same canonical envelope for click and Chat detail paths", async () => {
  const direct = await postAction({ action: "OPEN_DETAIL", objectIds: ["A-DISCLOSURE"], phase: "disclosure_exploration" });
  const chat = await postAction({ utterance: "查看 ALFA 最新披露详情", phase: "disclosure_exploration" });
  assert.equal(direct.status, 200);
  assert.equal(chat.status, 200);
  const [directBody, chatBody] = await Promise.all([direct.json(), chat.json()]);
  assert.equal(directBody.objects[0].id, "A-DISCLOSURE");
  assert.equal(chatBody.objects[0].id, "A-DISCLOSURE");
  assert.deepEqual(directBody.evidenceEnvelope, chatBody.evidenceEnvelope);
  assert.equal(directBody.payloadHash, chatBody.payloadHash);
});

test("uses reversible object annotations without a persistent judgment panel", async () => {
  const page = await readFile(new URL("app/v5/V5Demo.tsx", root), "utf8");
  assert.match(page, /引用并评论/);
  assert.match(page, /取消引用/);
  assert.match(page, /object_annotation_saved/);
  assert.match(page, /object_annotation_removed/);
  assert.match(page, /每条均含评论/);
  assert.match(page, /message\.annotations\?\.length/);
  assert.doesNotMatch(page, /关联到当前判断|已关联到当前判断|linkedObjectIds|LINK_OBJECT/);
  assert.doesNotMatch(page, /className=\{styles\.objectMeta\}/);
});

test("validates model markers against the current evidence envelope", async () => {
  const route = await readFile(new URL("app/api/deepseek/route.ts", root), "utf8");
  const registry = await readFile(new URL("lib/stock-v5-registry.ts", root), "utf8");
  assert.match(route, /sanitizeStockV5Markup/);
  assert.match(route, /ensureStockV5ObjectMarkup/);
  assert.match(route, /autoMarkedObjectIds/);
  assert.match(route, /invalidMarkerCount/);
  assert.match(route, /evidenceEnvelopeHash/);
  assert.match(registry, /isStockV5ObjectExposed/);
  assert.match(registry, /kind:\s*"uncertainty"/);
});

test("includes object comments and full texts in reproducibility logs", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("app/v5/V5Demo.tsx", root), "utf8"),
    readFile(new URL("app/api/deepseek/route.ts", root), "utf8"),
  ]);
  assert.match(page, /commentText: text/);
  assert.match(page, /annotationComments: submittedAnnotationComments/);
  assert.match(page, /outputText: data\.content/);
  assert.match(page, /rawText: text/);
  assert.match(page, /submission_card_opened/);
  assert.match(page, /submission_card_cancelled/);
  assert.match(page, /initial_card_submitted/);
  assert.match(page, /final_card_submitted/);
  assert.match(page, /initialEvidenceTexts/);
  assert.match(route, /referencedObjectComments/);
  assert.match(route, /evidenceEnvelopeHash/);
});

test("rejects the retired persistent LINK_OBJECT action", async () => {
  const response = await postAction({ action: "LINK_OBJECT", objectIds: ["A-GROWTH"], phase: "initial_exploration" });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /不支持的对象操作/);
});

test("does not expose the DeepSeek credential to client code", async () => {
  const [route, page, example] = await Promise.all([
    readFile(new URL("app/api/deepseek/route.ts", root), "utf8"),
    readFile(new URL("app/v5/V5Demo.tsx", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(route, /DEEPSEEK_API_KEY/);
  assert.match(route, /cloudflare:workers/);
  assert.doesNotMatch(page, /DEEPSEEK_API_KEY|NEXT_PUBLIC_DEEPSEEK|VITE_DEEPSEEK/);
  assert.match(example, /^DEEPSEEK_API_KEY=$/m);
});

test("exposes a software-specific model proxy with server-only configuration", async () => {
  const missing = await withSoftwareAgentEnvironment(
    {},
    () => dispatch("/api/software-agent", { headers: { accept: "application/json" } }),
  );
  assert.equal(missing.status, 200);
  assert.deepEqual(await missing.json(), {
    configured: false,
    mode: "deterministic_local_lookup",
    model: "deepseek-v4-flash",
    provider: "api.deepseek.com",
    transcriptLimits: {
      maxMessages: 256,
      maxMessageCharacters: 256_000,
      maxTranscriptCharacters: 1_000_000,
      maxRequestBytes: 8_388_608,
      maxCanonicalMaterialCharacters: 256_000,
    },
  });

  const configured = await withSoftwareAgentEnvironment(
    {
      SOFTWARE_AGENT_API_KEY: "test-key",
      SOFTWARE_AGENT_BASE_URL: "https://models.example.test/v1",
      SOFTWARE_AGENT_MODEL: "fixture-model",
    },
    () => dispatch("/api/software-agent", { headers: { accept: "application/json" } }),
  );
  assert.equal(configured.status, 200);
  const configuration = await configured.json();
  assert.equal(configuration.configured, true);
  assert.equal(configuration.mode, "remote_chat_completion");
  assert.equal(configuration.model, "fixture-model");
  assert.equal(configuration.provider, "models.example.test");
  assert.equal(JSON.stringify(configuration).includes("test-key"), false);
});

test("calls an OpenAI-compatible software model with a condition-neutral v4 Frontier packet", async () => {
  await withMockChatCompletion(
    "可以先把快速保存链接和可靠找回作为底线，再讨论页面组织。",
    async (baseUrl, requests) => {
      const response = await withSoftwareAgentEnvironment(
        {
          SOFTWARE_AGENT_API_KEY: "test-key",
          SOFTWARE_AGENT_BASE_URL: baseUrl,
          SOFTWARE_AGENT_MODEL: "fixture-model",
        },
        () => dispatch(
          "/api/software-agent",
          {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({
              scenarioId: "software-product-development-v1",
              messages: [{ role: "user", content: "这个产品到底要守住什么？" }],
              frontierStage: "history",
              contextNodeIds: ["INFO:PRODUCT-GOAL-R0"],
            }),
          },
        ),
      );
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.mode, "remote_chat_completion");
      assert.equal(body.model, "fixture-model");
      assert.equal(body.requestId, "mock-software-agent-request");
      assert.deepEqual(body.nodeIds, ["INFO:PRODUCT-GOAL-R0"]);
      assert.ok(body.groundedNodeIds.includes("INFO:PRODUCT-GOAL-R0"));
      assert.match(body.frontierRef, /^FRONTIER:v4\.2-e0:history:/);
      assert.equal(body.evidenceEnvelopeHash.length, 64);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].method, "POST");
      assert.equal(requests[0].url, "/chat/completions");
      assert.equal(requests[0].authorization, "Bearer test-key");
      const upstreamBody = JSON.parse(requests[0].body);
      assert.equal(upstreamBody.model, "fixture-model");
      assert.equal("max_tokens" in upstreamBody, false);
      assert.match(upstreamBody.messages[0].content, /完整对话中已披露的同版本材料是场景事实来源/);
      assert.match(upstreamBody.messages[0].content, /INFO:PRODUCT-GOAL-R0/);
      assert.match(upstreamBody.messages[0].content, /信息空间版本：v4\.2-e0/);
      assert.doesNotMatch(upstreamBody.messages[0].content, /当前可见序号/);
      assert.doesNotMatch(upstreamBody.messages[0].content, /A · Chat|B · Chat|Chat-only|Chat \+ Object/);
      assert.deepEqual(upstreamBody.messages.at(-1), { role: "user", content: "这个产品到底要守住什么？" });
    },
  );
});

test("retrieves an E0 concrete trace without publishing future candidate material", async () => {
  await withMockChatCompletion(
    "可以看 [[TRACE:R0-REFIND-017|Offline-first 具体找回轨迹]]：它保留了事件顺序，但没有把行为预先解释成迷路。",
    async (baseUrl, requests) => {
      const response = await withSoftwareAgentEnvironment(
        {
          SOFTWARE_AGENT_API_KEY: "test-key",
          SOFTWARE_AGENT_BASE_URL: baseUrl,
          SOFTWARE_AGENT_MODEL: "fixture-model",
        },
        () => dispatch("/api/software-agent", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            scenarioId: "software-product-development-v1",
            messages: [{ role: "user", content: "给我 R0-REFIND-017 的具体案例" }],
            frontierStage: "e0",
            contextNodeIds: ["EVIDENCE:REFIND-PATHS-R0-01"],
          }),
        }),
      );
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(body.nodeIds, ["TRACE:R0-REFIND-017"]);
      assert.ok(body.groundedNodeIds.includes("TRACE:R0-REFIND-017"));
      assert.ok(!body.packetNodeIds.includes("RAWSET:NAV-017-01-04"));
      assert.deepEqual(body.requestedNodeIds, ["TRACE:R0-REFIND-017"]);
      assert.match(body.frontierRef, /^FRONTIER:v4\.2-e0:e0:/);
      const upstreamBody = JSON.parse(requests[0].body);
      assert.match(upstreamBody.messages[0].content, /TRACE:R0-REFIND-017/);
      assert.doesNotMatch(upstreamBody.messages[0].content, /CANDIDATE:C1|长期证据|D30/);
    },
  );
});

test("rejects generic object labels and re-anchors only exact representative phrases", async () => {
  await withMockChatCompletion(
    "[[INFO:PRODUCT-GOAL-R0|这个目标]]首先要求快速保存链接，同时保留可靠找回。",
    async (baseUrl) => {
      const response = await withSoftwareAgentEnvironment(
        {
          SOFTWARE_AGENT_API_KEY: "test-key",
          SOFTWARE_AGENT_BASE_URL: baseUrl,
          SOFTWARE_AGENT_MODEL: "fixture-model",
        },
        () => dispatch("/api/software-agent", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            scenarioId: "software-product-development-v1",
            messages: [{ role: "user", content: "这个产品到底要守住什么？" }],
            frontierStage: "history",
            contextNodeIds: ["INFO:PRODUCT-GOAL-R0"],
          }),
        }),
      );
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.invalidAnchorCount, 1);
      assert.doesNotMatch(body.message, /\|这个目标/);
      assert.match(body.message, /\[\[INFO:PRODUCT-GOAL-R0\|快速保存链接\]\]/);
      assert.deepEqual(body.nodeIds, ["INFO:PRODUCT-GOAL-R0"]);
    },
  );
});

test("rejects condition leakage and missing software model credentials", async () => {
  const missingKey = await withSoftwareAgentEnvironment(
    {},
    () => dispatch("/api/software-agent", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        scenarioId: "software-product-development-v1",
        messages: [{ role: "user", content: "现在是什么状态？" }],
        frontierStage: "history",
      }),
    }),
  );
  assert.equal(missingKey.status, 503);

  const leakedCondition = await withSoftwareAgentEnvironment(
    { SOFTWARE_AGENT_API_KEY: "test-key" },
    () => dispatch(
      "/api/software-agent",
      {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          scenarioId: "software-product-development-v1",
          messages: [{ role: "user", content: "现在是什么状态？" }],
          frontierStage: "history",
          condition: "B",
        }),
      },
    ),
  );
  assert.equal(leakedCondition.status, 400);
  assert.match((await leakedCondition.json()).error, /请求字段无效/);
  const leakedRevealState = await withSoftwareAgentEnvironment(
    { SOFTWARE_AGENT_API_KEY: "test-key" },
    () => dispatch("/api/software-agent", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        scenarioId: "software-product-development-v1",
        messages: [{ role: "user", content: "现在是什么状态？" }],
        frontierStage: "history",
        revealedNodeIds: ["TRACE:R0-REFIND-017"],
      }),
    }),
  );
  assert.equal(leakedRevealState.status, 400);
  assert.match((await leakedRevealState.json()).error, /请求字段无效/);
});
