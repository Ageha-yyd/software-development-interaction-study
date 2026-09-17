import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getCommonOpportunities } from "../scenarios/materials/common-opportunities-v4.2.mjs";

// Automated engineering interaction, never a human-study record. Uses a fresh
// headless profile and the existing Chromium CDP transport, without Playwright.
// Start the preview server separately before invoking this script.
const baseUrl = (process.env.STUDY_BASE_URL ?? "http://127.0.0.1:3421").replace(/\/$/, "");
const screenshotDir = process.env.STUDY_SCREENSHOT_DIR;
const explicitCondition = process.env.STUDY_CONDITION;
if (explicitCondition && !["A", "B"].includes(explicitCondition)) throw new Error("STUDY_CONDITION_must_be_A_or_B");
const runs = explicitCondition
  ? [{ condition: explicitCondition, useObjects: explicitCondition === "B" && process.env.STUDY_USE_OBJECTS !== "0" }]
  : [{ condition: "A", useObjects: false }, { condition: "B", useObjects: true }, { condition: "B", useObjects: false }];
const browserPath = [process.env.STUDY_BROWSER_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((path) => path && existsSync(path));
if (!browserPath) throw new Error("chromium_browser_not_found");
const materials = getCommonOpportunities();
const stripMarkup = (value) => value.replace(/\[\[[A-Z0-9:@._+-]+\|([^\]\r\n]+)\]\]/g, "$1");
const compact = (value) => value.replace(/\s+/gu, "");
const reportProgress = (stage, detail = {}) => process.stdout.write(`${JSON.stringify({ validationClass: "automated_engineering_smoke", stage, ...detail })}\n`);

export async function retry(operation, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { return await operation(); }
    catch (error) { lastError = error; await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  throw lastError ?? new Error("browser_smoke_timeout");
}

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") { server.close(); reject(new Error("debug_port_not_allocated")); return; }
      server.close(() => resolve(address.port));
    });
  });
}

export async function launch(url) {
  const port = await availablePort();
  const profile = await mkdtemp(join(tmpdir(), "software-research-v42-smoke-"));
  const browser = spawn(browserPath, ["--headless=new", "--disable-gpu", "--in-process-gpu", "--hide-scrollbars",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1440,1100", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  let browserDiagnostics = "";
  browser.stderr.on("data", (chunk) => {
    browserDiagnostics = (browserDiagnostics + String(chunk)).slice(-8000);
    if (process.env.STUDY_CDP_TRACE === "1") process.stderr.write(chunk);
  });
  let socket;
  const pending = new Map();
  let nextId = 0;
  try {
    const page = await retry(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (!response.ok) throw new Error(`cdp_list_failed:${response.status}`);
      const pages = await response.json();
      const found = pages.find((entry) => entry.type === "page");
      if (!found?.webSocketDebuggerUrl) throw new Error("cdp_page_not_ready");
      return found;
    });
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(String(data));
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      if (process.env.STUDY_CDP_TRACE === "1") process.stderr.write(`CDP ${method} ${params.expression?.slice(0, 90) ?? ""}\n`);
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`cdp_call_timeout:${method}\n${browserDiagnostics}`)); }, 20_000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    };
    const bodyText = () => evaluate("document.body.innerText");
    const waitText = (value) => retry(async () => {
      const text = await bodyText();
      if (!text.includes(value)) throw new Error(`text_not_visible:${value}`);
      return text;
    });
    const mouseClick = async (point) => {
      await call("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 });
      await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1 });
    };
    const clickExpression = async (expression) => {
      const point = await evaluate(`(() => {
        const item = (${expression});
        if (!(item instanceof HTMLElement)) throw new Error("click_target_missing");
        if (item.disabled) throw new Error("click_target_disabled");
        item.scrollIntoView({ block: "center", behavior: "instant" });
        const rect = item.getBoundingClientRect();
        if (!rect.width || !rect.height) throw new Error("click_target_not_visible");
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`);
      await mouseClick(point);
    };
    const buttonExpression = (text) => `[...document.querySelectorAll("button")].find((item) => item.textContent.trim() === ${JSON.stringify(text)} || item.getAttribute("aria-label") === ${JSON.stringify(text)})`;
    const clickButton = (text) => clickExpression(buttonExpression(text));
    const fill = async (id, value) => {
      await clickExpression(`document.getElementById(${JSON.stringify(id)})`);
      await call("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
      await call("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
      await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
      await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
      await call("Input.insertText", { text: value });
      await retry(async () => assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)})?.value`), value));
    };
    const sessions = () => evaluate(`Object.keys(localStorage).filter((key) => key.startsWith("experiment-preview:")).map((key) => JSON.parse(localStorage.getItem(key)))`);
    const currentSession = async () => {
      const entries = await sessions();
      return entries.sort((left, right) => (right.at(-1)?.monotonicMs ?? 0) - (left.at(-1)?.monotonicMs ?? 0))[0] ?? [];
    };
    const submitChat = async (query) => {
      const before = await currentSession();
      const beforeCount = before.filter((entry) => entry.event === "agent_response_recorded").length;
      await fill("experiment-query", query);
      await clickButton("发送查询");
      const responseEvent = await retry(async () => {
        const entries = await currentSession();
        const replies = entries.filter((entry) => entry.event === "agent_response_recorded");
        if (entries.at(-1)?.event === "agent_response_failed") throw new Error(`agent_reply_failed:${query}`);
        if (replies.length <= beforeCount) throw new Error(`agent_reply_pending:${query}`);
        return replies.at(-1);
      }, 40_000);
      assert.equal(responseEvent.payload.mode, "deterministic_local_lookup");
      assert.ok(responseEvent.payload.responseText.length > 0);
      const rendered = await evaluate(`[...document.querySelectorAll('article[aria-label="Agent"]')].at(-1)?.textContent ?? ""`);
      assert.equal(compact(rendered), compact(stripMarkup(responseEvent.payload.responseText)), "rendered response must preserve the complete logged answer");
      return responseEvent;
    };
    const screenshot = async (name) => {
      if (!screenshotDir) return;
      await mkdir(screenshotDir, { recursive: true });
      const capture = await call("Page.captureScreenshot", { format: "png", fromSurface: true });
      await writeFile(join(screenshotDir, `${name}.png`), Buffer.from(capture.data, "base64"));
    };
    const close = () => {
      for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error("browser_smoke_closed")); }
      pending.clear(); socket.close(); browser.kill();
    };
    // Capture the artifact generated by the actual download button. This hook
    // only reads its Blob and never supplies application state or scoring data.
    await call("Page.enable");
    await call("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
      window.__engineeringSmokeDownloads = [];
      const original = URL.createObjectURL;
      URL.createObjectURL = function(value) {
        if (value instanceof Blob) value.text().then((text) => {
          try { window.__engineeringSmokeDownloads.push(JSON.parse(text)); } catch { /* not a JSON artifact */ }
        });
        return original.call(this, value);
      };
    })()` });
    await call("Page.navigate", { url });
    return { call, evaluate, bodyText, waitText, clickExpression, clickButton, buttonExpression, fill, sessions, currentSession, submitChat, screenshot, close };
  } catch (error) { socket?.close(); browser.kill(); throw error; }
}

async function runResearch({ condition, useObjects }) {
  const label = `${condition}-${useObjects ? "objects" : "chat-only"}`;
  const client = await launch(`${baseUrl}/study/software-development-v42?preview=1&condition=${condition}&agent=local`);
  try {
    await client.waitText("共同接管");
    await retry(async () => assert.ok((await client.currentSession()).length > 0));
    assert.equal((await client.currentSession())[0].condition, "A", "onboarding precedes allocation and has no object layer");
    assert.equal(await client.evaluate(`document.querySelectorAll('[aria-label="Chat 对话"] button').length`), 0);
    await client.submitChat("工程走查：这个产品到底要守住什么？");
    await client.waitText("完成接管，进入共同任务");
    assert.equal(await client.evaluate(`document.querySelector('section[aria-label="Agent 下一步操作"] button').disabled`), true);
    await client.fill("baseline-account", "工程走查原文：我要保留条目身份，集合归属与待处理状态分开看；回执只能支持其对应版本和范围。此文字尚未经过人的理解核对。");
    await client.clickExpression(`document.querySelector('section[aria-label="Agent 下一步操作"] button')`);
    const expectedDecisions = [];
    let objectsOpened = 0;
    const visited = new Set();

    for (let period = 0; period < 4; period += 1) {
      await client.waitText(`共同任务 ${period + 1}/4`);
      const session = await retry(async () => {
        const entries = await client.currentSession();
        assert.ok(entries[0]?.scenarioId.startsWith("software-common-v42-"));
        assert.ok(!visited.has(entries[0].scenarioId));
        return entries;
      });
      const scenarioId = session[0].scenarioId;
      visited.add(scenarioId);
      assert.equal(session[0].condition, condition);
      const material = materials.find((entry) => entry.id === ({
        "software-common-v42-local-state": "OP:COMMON-LOCAL-STATE",
        "software-common-v42-compound-state": "OP:COMMON-COMPOUND-WL",
        "software-common-v42-local-portability": "OP:COMMON-LOCAL-PORTABILITY",
        "software-common-v42-compound-portability": "OP:COMMON-COMPOUND-PORTABILITY",
      })[scenarioId]);
      assert.ok(material, `unknown_common_scenario:${scenarioId}`);
      const initialText = await client.bodyText();
      assert.ok(initialText.includes(material.task), "common goal must be available before its output");
      assert.ok(!initialText.includes(material.trigger), "new result must await the participant reveal action");
      assert.ok(!session.some((entry) => entry.event === "trigger_stable_visible"));
      await client.fill("research-disposition", "工程走查：结果尚未揭示，不能提交。");
      for (const text of ["记录当前判断", "提交并结束本任务"]) {
        assert.equal(await client.evaluate(`(${client.buttonExpression(text)})?.disabled`), true);
      }
      await client.clickExpression(`document.querySelector('section[aria-label="Agent 下一步操作"] button')`);
      await client.waitText(material.trigger);
      await retry(async () => assert.ok((await client.currentSession()).some((entry) => entry.event === "trigger_stable_visible")));
      const response = await client.submitChat("请一次给我全部本机会材料以及每份资料的版本与来源。");
      for (const fact of material.facts) {
        assert.ok(response.payload.responseText.includes(fact.text), `missing_full_fact:${fact.id}`);
        assert.ok(response.payload.responseText.includes(fact.source), `missing_fact_source:${fact.id}`);
        assert.ok(response.payload.responseText.includes(fact.exactRevision), `missing_revision:${fact.id}`);
      }
      const lastFact = material.facts.at(-1);
      const renderedAnswer = await client.evaluate(`[...document.querySelectorAll('article[aria-label="Agent"]')].at(-1)?.textContent ?? ""`);
      assert.ok(renderedAnswer.includes(lastFact.text), "last requested material must remain visible");
      if (useObjects) {
        await client.clickExpression(`[...[...document.querySelectorAll('article[aria-label="Agent"]')].at(-1).querySelectorAll('button[aria-label]')].at(-1)`);
        await client.waitText("来源");
        assert.equal((await client.bodyText()).includes("信息坐标"), false, "organizer taxonomy is hidden in the controlled participant flow");
        const detail = await client.evaluate(`document.querySelector('[role="dialog"]')?.textContent ?? ""`);
        assert.ok(detail.includes(lastFact.text));
        assert.ok(detail.includes(lastFact.source));
        objectsOpened += 1;
        if (period === 0) await client.screenshot(`${label}-last-material-object`);
        await client.clickButton("关闭对象详情");
      }
      const draft = `工程走查初稿 ${period + 1}：先保留当前产品，继续核对版本与影响范围。`;
      await client.fill("research-disposition", draft);
      await client.clickButton("记录当前判断");
      await client.waitText("当前判断已记录，你可以继续查询、修改或结束本任务。");
      assert.ok((await client.bodyText()).includes(`共同任务 ${period + 1}/4`));
      assert.equal(await client.evaluate('document.getElementById("research-disposition").value'), draft);
      expectedDecisions.push(draft);
      const final = `工程走查修订 ${period + 1}：我暂不扩大采用范围。当前依据为“${lastFact.text}”。此处记录判断，等待独立核对。`;
      await client.fill("research-disposition", final);
      await client.clickButton("提交并结束本任务");
      expectedDecisions.push(final);
      reportProgress("common_opportunity_exercised", { label, period: period + 1, scenarioId, objectOpened: useObjects, goldAssessed: false });
    }

    await client.waitText("开放开发");
    await retry(async () => {
      const session = await client.currentSession();
      assert.equal(session[0]?.scenarioId, "software-product-development-v1");
      assert.equal(session[0]?.condition, condition);
    });
    assert.equal(await client.evaluate(`document.querySelectorAll('article[aria-label^="Participant H"]').length`), 7);
    await client.submitChat("工程走查：这个产品到底要守住什么？");
    await client.clickExpression(`document.querySelector('section[aria-label="Agent 下一步操作"] button')`);
    await retry(async () => assert.ok((await client.currentSession()).some((entry) => entry.event === "trigger_stable_visible")));
    const ordinary = await client.submitChat("给我普通 Search 直接找回案例。");
    assert.ok(ordinary.payload.responseText.includes("普通 Search 直接找回案例"));
    assert.ok(ordinary.payload.responseText.includes("选择规则"));
    const openDecision = "工程走查：我保留 R0；这个普通找回案例不支持直接改导航。后续需要分别核对具体范围、版本和未验证路径。";
    await client.fill("research-disposition", openDecision);
    await client.clickButton("提交并结束本任务");
    expectedDecisions.push(openDecision);
    await client.waitText("本次走查已记录");
    await client.screenshot(`${label}-research-complete`);
    await client.clickButton("下载完整审阅包");
    const packet = await retry(async () => {
      const downloads = await client.evaluate("window.__engineeringSmokeDownloads");
      const result = downloads.find((entry) => entry.schemaVersion === "software-development-v4.2-review-packet");
      assert.ok(result, "review_download_not_generated");
      return result;
    });
    assert.equal(packet.formalStudyData, false);
    assert.equal(packet.allocation.condition, condition);
    assert.equal(packet.allocation.formalAssignment, false);
    assert.equal(packet.allocation.baselineSemanticStatus, "manual_review_pending");
    assert.equal(packet.baselineCheck.automaticallyQualified, false);
    assert.ok(packet.baselineCheck.submittedAtMonotonicMs <= packet.allocation.allocatedAtMonotonicMs);
    assert.ok(packet.baselineCheck.participantOriginalText.startsWith("工程走查原文"));
    assert.equal(packet.currentStage, "review-complete");
    assert.deepEqual(packet.dispositions.map((entry) => entry.participantOriginalText), expectedDecisions);
    assert.equal(packet.dispositions.filter((entry) => entry.participantFinalizedOpportunity).length, 5);
    const allSessions = await client.sessions();
    if (screenshotDir) await writeFile(join(screenshotDir, `${label}-review-packet.json`), JSON.stringify(packet, null, 2));
    assert.equal(allSessions.length, 6);
    assert.equal(Object.keys(packet.sessions).length, 6);
    for (const session of allSessions) {
      assert.deepEqual(packet.sessions[session[0].sessionId], session);
      assert.deepEqual(session.map((entry) => entry.sequence), session.map((_, index) => index + 1));
      assert.equal(session[0].payload.formalDataCollection, false);
      for (const reply of session.filter((entry) => entry.event === "agent_response_recorded")) {
        assert.equal(typeof reply.payload.responseText, "string");
        assert.ok(reply.payload.responseText.length > 0);
      }
    }
    for (const disposition of packet.dispositions) {
      assert.equal(disposition.dispositionValidity, "manual_review_pending");
      assert.equal(disposition.timeToVerifiedGold, null);
      assert.equal(disposition.humanQuality, null);
      assert.equal(disposition.submissionIsNotVerifiedCompletion, true);
      const exposed = packet.sessions[disposition.exposure.sessionId].find((entry) => entry.sequence === disposition.exposure.sequence);
      assert.equal(exposed.event, "trigger_stable_visible");
      assert.equal(exposed.monotonicMs, disposition.exposure.monotonicMs);
      assert.ok(disposition.explicitSubmissionAtMonotonicMs >= exposed.monotonicMs);
    }
    const objectActions = allSessions.flat().filter((entry) => entry.event === "object_action_started");
    assert.equal(objectActions.length, objectsOpened);
    assert.ok(allSessions.flat().every((entry) => !["verified_gold", "primary_endpoint_reached", "formal_trial_completed"].includes(entry.event)));
    return { label, condition, useObjects, sessionCount: allSessions.length, dispositionCount: packet.dispositions.length, objectsOpened, fullResponsesPreserved: true, exposureReferencesVerified: true, goldAssessed: false };
  } catch (error) { await client.screenshot(`${label}-failure`).catch(() => {}); throw error; }
  finally { client.close(); }
}

async function runWorkbench() {
  const client = await launch(`${baseUrl}/study/software-development-v42/workbench`);
  try {
    await client.waitText("阅读清单实现检查");
    const revision = () => client.evaluate('document.querySelector(\'[data-testid="current-revision"]\')?.textContent');
    assert.equal(await revision(), "R0");
    await client.clickButton("创建候选");
    await client.waitText("候选 C1");
    await client.clickButton("执行候选检查");
    await client.waitText("检查失败");
    assert.ok((await client.bodyText()).includes("scope_changes_only_selected_items"));
    await client.clickButton("采用当前回执对应候选");
    await client.waitText("passing_candidate_receipt_required");
    assert.equal(await revision(), "R0");
    await client.clickExpression('document.querySelector(\'input[type="checkbox"]\')');
    await client.clickButton("创建候选");
    await client.waitText("候选 C2");
    await client.clickButton("执行候选检查");
    await client.waitText("本内核检查通过");
    await client.clickButton("采用当前回执对应候选");
    await retry(async () => assert.equal(await revision(), "C2"));
    await client.screenshot("workbench-C2-adopted");
    await client.clickButton("回滚已采用版本并验证");
    await retry(async () => assert.equal(await revision(), "R0"));
    await client.clickButton("下载状态、事件与检查");
    const state = await retry(async () => {
      const downloads = await client.evaluate("window.__engineeringSmokeDownloads");
      const result = downloads.find((entry) => entry.schemaVersion === "software-product-workbench-v42.1");
      assert.ok(result); return result;
    });
    assert.equal(state.currentRevisionId, "R0");
    assert.equal(state.items.length, 6);
    assert.equal(state.evidenceClass, "authored_implementation_sandbox");
    const c1 = state.receipts.find((entry) => entry.revisionId === "C1");
    assert.deepEqual(c1.checks.filter((entry) => !entry.passed).map((entry) => entry.name), ["scope_changes_only_selected_items", "preview_matches_execution"]);
    assert.ok(state.receipts.find((entry) => entry.revisionId === "C2").passed);
    assert.equal(state.receipts.at(-1).purpose, "rollback_restoration");
    assert.ok(state.receipts.at(-1).passed);
    assert.equal(state.events.filter((entry) => entry.type === "candidate_adopted").length, 1);
    assert.equal(state.events.at(-1).restorationVerified, true);
    return { c1Rejected: true, c2Adopted: true, rollbackVerified: true, humanEfficiencyEvidence: false };
  } catch (error) { await client.screenshot("workbench-failure").catch(() => {}); throw error; }
  finally { client.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const results = [];
  for (const run of runs) results.push(await runResearch(run));
  const workbench = process.env.STUDY_SKIP_WORKBENCH === "1" ? null : await runWorkbench();
  process.stdout.write(`${JSON.stringify({
    validationClass: "automated_engineering_browser_smoke", informationSpaceVersion: "v4.2-e0",
    humanEfficiencyEvidence: false, formalStudyData: false, results, workbench, completed: true,
  }, null, 2)}\n`);
}
