import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("renders the legacy anonymous prototype shell without authentication", async () => {
  const response = await render("/?condition=chat_widget");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Stock Intent Lab V3\.3/);
  assert.doesNotMatch(html, /signin-with-chatgpt|requireChatGPTUser|ChatGPT 登录/);
});

test("preserves the legacy V3.3 prototype as a separate route contract", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /Array\.from\(\{ length: 8 \}/);
  assert.match(page, /qualified_initial_exposure/);
  assert.match(page, /agent_strategy_state/);
  assert.match(page, /formal_data_collection:\s*false/);
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
