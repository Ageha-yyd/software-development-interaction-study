import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the anonymous research prototype shell", async () => {
  const response = await render("/?condition=chat_widget");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Stock Intent Lab V3\.3/);
  assert.match(html, /信息复用与意图调整原型/);
  assert.doesNotMatch(html, /signin-with-chatgpt|requireChatGPTUser|ChatGPT 登录/);
});

test("freezes the eight-round, nineteen-object implementation contract", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const objectIds = [...page.matchAll(/id:\s*"([ABG]-(?:GROWTH|VALUATION|VOLATILITY|LIQUIDITY|CONCENTRATION|CASHFLOW|CYCLE|DEBT|WEAKSIGNAL))"/g)].map(match => match[1]);
  assert.equal(new Set(objectIds).size, 19);
  assert.match(page, /Array\.from\(\{ length: 8 \}/);
  assert.match(page, /ROUND 05 · CONTROLLED INTERMEDIATE TRIGGER/);
  assert.match(page, /ROUND 06 · REUSE, ADJUST & CONSUME/);
  assert.match(page, /ROUND 07 · FINAL DECISION/);
  assert.match(page, /qualified_initial_exposure/);
  assert.match(page, /qualified_reaccess/);
  assert.match(page, /agent_strategy_state/);
  assert.match(page, /agent_evidence_state/);
});

test("keeps condition assignment hidden from ordinary participants", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /preview && phase === "landing"/);
  assert.match(page, /\?condition=chat_only/);
  assert.match(page, /\?condition=chat_widget/);
  assert.match(page, /window\.sessionStorage\.setItem\("stock-v3\.3-condition"/);
  assert.doesNotMatch(page, /77c|21c|3\.7×|OCFT显著/);
});

test("publishes a prototype boundary instead of empirical claims", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);
  assert.match(page, /研究原型 · 虚构数据/);
  assert.match(page, /非投资建议/);
  assert.match(page, /formal_data_collection:\s*false/);
  assert.match(layout, /公开、匿名可访问/);
});
