import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { launch, retry } from "./research-v42-browser-smoke.mjs";

// Requires an isolated preview server configured ONLY with the engineering mock
// provider. This exercises real routes, UI and kernel, not model comprehension.
const baseUrl = (process.env.PRODUCT_STUDY_BASE_URL ?? "http://127.0.0.1:3422").replace(/\/$/, "");
const outputDir = process.env.STUDY_SCREENSHOT_DIR;
const configuration = await (await fetch(`${baseUrl}/api/software-agent`)).json();
assert.equal(configuration.provider, "127.0.0.1:3423", "must use dedicated mock provider, never a real model");
const results = [];

for (const condition of ["A", "B"]) {
  const client = await launch(`${baseUrl}/study/software-development-v42?preview=1&condition=${condition}`);
  try {
    const send = async (text) => {
      await retry(async () => assert.equal(await client.evaluate('document.getElementById("experiment-query")?.disabled'), false));
      const before = (await client.currentSession()).filter((entry) => entry.event === "agent_response_recorded").length;
      await client.fill("experiment-query", text);
      await client.clickButton("发送查询");
      return retry(async () => {
        const entries = await client.currentSession();
        const failure = entries.at(-1);
        if (failure?.event === "agent_response_failed") throw new Error(JSON.stringify(failure.payload));
        const replies = entries.filter((entry) => entry.event === "agent_response_recorded");
        assert.ok(replies.length > before, "waiting for actual API response");
        return replies.at(-1);
      }, 40_000);
    };
    await client.waitText("共同接管");
    await retry(async () => assert.ok((await client.currentSession()).length));
    await send("[ENGINEERING MOCK] INTRODUCTION");
    await client.fill("baseline-account", "工程模拟：理解记录用于原文保留，未由真人核对。身份、归属、状态和版本回执需要分别核对。");
    const reveal = async () => {
      await retry(async () => assert.equal(await client.evaluate('document.querySelector(\'section[aria-label="Agent 下一步操作"] button\')?.disabled'), false));
      await client.clickExpression('document.querySelector(\'section[aria-label="Agent 下一步操作"] button\')');
    };
    await reveal();
    const visitedCommon = new Set();
    for (let period = 0; period < 4; period += 1) {
      await client.waitText(`共同任务 ${period + 1}/4`);
      const currentCommon = await retry(async () => {
        const id = (await client.currentSession())[0]?.scenarioId;
        assert.ok(id?.startsWith("software-common-v42") && !visitedCommon.has(id));
        return id;
      });
      visitedCommon.add(currentCommon);
      await reveal();
      await retry(async () => assert.ok((await client.currentSession()).some((entry) => entry.event === "trigger_stable_visible")));
      await client.fill("research-disposition", `工程模拟共同任务 ${period + 1}，不计有效处置。`);
      await client.clickButton("提交并结束本任务");
    }
    await client.waitText("开放开发");
    await retry(async () => assert.equal((await client.currentSession())[0]?.scenarioId, "software-product-development-v1"));
    await send("[ENGINEERING MOCK] INTRODUCTION");
    await reveal();
    const created = await retry(async () => {
      const event = (await client.currentSession()).find((entry) => entry.event === "product_session_created");
      assert.ok(event); return event;
    });
    const sessionId = created.payload.productSessionId;
    const status = () => client.evaluate(`fetch('/api/software-product', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'status',sessionId:${JSON.stringify(sessionId)}})}).then(r=>r.json())`);
    const advice = await send("ENGINEERING MOCK advice only");
    assert.equal(advice.payload.deliveryKind, "generated_response");
    assert.equal((await status()).candidateRevisionId, null);
    assert.equal(await client.evaluate('document.querySelector(\'section[aria-label="待确认产品操作"]\') !== null'), false);

    const prepared = await send("[ENGINEERING MOCK] PROPOSE_SCOPED_VERIFY");
    assert.equal(prepared.payload.deliveryKind, "product_action_prepared");
    assert.equal((await status()).candidateRevisionId, null, "prepare must not execute");
    await client.waitText("确认执行此操作");
    await client.clickButton("确认执行此操作");
    await retry(async () => assert.equal((await status()).candidateRevisionId, "C1"));
    await client.waitText("操作已执行。");
    const verified = await status();
    assert.equal(verified.currentRevisionId, "R0");
    const receipt = verified.publicFacts.find((fact) => fact.isCurrentSnapshot !== false && fact.kind === "verification_receipt");
    assert.ok(receipt.body.includes("全部内核检查通过"));
    if (condition === "B") {
      await client.clickExpression(`[...document.querySelectorAll('button[aria-label]')].find(item => item.getAttribute('aria-label') === ${JSON.stringify(receipt.title)})`);
      await client.waitText(receipt.body.split("\n")[0]);
      assert.equal(await client.evaluate('document.querySelector(\'[role="dialog"]\')?.contains(document.activeElement)'), true);
      await client.screenshot("B-product-receipt-object");
      await client.call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await client.call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await retry(async () => assert.equal(await client.evaluate('document.querySelector(\'[role="dialog"]\')'), null));
    }

    const evaluation = await send("[ENGINEERING MOCK] EVALUATE_FULL_PAGE");
    assert.equal(evaluation.payload.deliveryKind, "product_evaluation_material");
    const downloadHref = await client.evaluate('document.querySelector(\'a[href^="/api/product-evaluation?"]\')?.getAttribute("href")');
    assert.ok(downloadHref, "same Chat must contain a working complete raw-material link");
    const downloaded = await client.evaluate(`fetch(${JSON.stringify(downloadHref)}).then(async r => ({status:r.status, body:await r.json()}))`);
    assert.equal(downloaded.status, 200);
    assert.ok(JSON.stringify(downloaded.body).includes("author_constructed"));
    const evaluated = await status();
    assert.ok(evaluated.publicFacts.some((fact) => fact.kind === "evaluation_page"));
    assert.equal(evaluated.currentRevisionId, "R0");
    await client.screenshot(`${condition}-product-evaluation-page`);

    await send("[ENGINEERING MOCK] ADOPT_CHECKED_CANDIDATE");
    assert.equal((await status()).currentRevisionId, "R0");
    if (condition === "B") await client.evaluate(`(() => {
      const original = window.fetch.bind(window);
      let loseExecution = true;
      let loseFirstReconciliation = false;
      window.fetch = async function(input, init) {
        const isProduct = typeof input === 'string' && input === '/api/software-product';
        const body = isProduct && init?.body ? JSON.parse(init.body) : {};
        if (body.action === 'execute' && loseExecution) {
          loseExecution = false;
          await original(input, init);
          loseFirstReconciliation = true;
          throw new Error('engineering_injected_response_loss_after_server_commit');
        }
        if (body.action === 'status' && loseFirstReconciliation) {
          loseFirstReconciliation = false;
          throw new Error('engineering_injected_first_status_failure');
        }
        return original(input, init);
      };
    })()`);
    await client.clickButton("确认执行此操作");
    if (condition === "B") {
      await client.waitText("尚不能核对当前产品状态");
      assert.equal(await client.evaluate('document.getElementById("experiment-query").disabled'), true);
      assert.equal(await client.evaluate('[...document.querySelectorAll("button")].find(item=>item.textContent === "提交并结束本任务").disabled'), true);
      await retry(async () => assert.equal(await client.evaluate('[...document.querySelectorAll("button")].find(item=>item.textContent === "重新核对产品状态").disabled'), false));
      await client.clickButton("重新核对产品状态");
      await retry(async () => assert.ok((await client.currentSession()).some((entry) => entry.event === "product_authority_reconciled")));
      await client.waitText("没有重放操作");
    }
    await retry(async () => assert.equal((await status()).currentRevisionId, "C1"));
    await retry(async () => assert.ok((await client.currentSession()).filter((entry) => entry.event === "product_action_execution_returned").length >= (condition === "B" ? 1 : 2)));
    await send("[ENGINEERING MOCK] ROLLBACK_CURRENT");
    assert.equal((await status()).currentRevisionId, "C1");
    await client.clickButton("确认执行此操作");
    await retry(async () => assert.equal((await status()).currentRevisionId, "R0"));
    await retry(async () => assert.ok((await client.currentSession()).filter((entry) => entry.event === "product_action_execution_returned").length >= (condition === "B" ? 2 : 3)));
    const restored = await status();
    assert.ok(restored.publicFacts.some((fact) => fact.isCurrentSnapshot !== false && fact.kind === "verification_receipt" && fact.body.includes("回退后恢复检查") && fact.body.includes("全部内核检查通过")));
    assert.ok(restored.publicFacts.some((fact) => fact.isCurrentSnapshot === false && fact.id === receipt.id), "old object keeps its exact historical snapshot");
    await client.fill("research-disposition", "工程模拟：实际从已采用 C1 回滚并核对恢复回执，判断质量等待独立审阅。");
    await client.clickButton("提交并结束本任务");
    await client.waitText("本次走查已记录");
    await client.clickButton("下载完整审阅包");
    const packet = await retry(async () => {
      const entries = await client.evaluate("window.__engineeringSmokeDownloads");
      const artifact = entries.find((entry) => entry.schemaVersion === "software-development-v4.2-review-packet");
      assert.ok(artifact); return artifact;
    });
    assert.equal(packet.dispositions.at(-1).productSessionId, sessionId);
    assert.equal(packet.dispositions.at(-1).currentProductRevisionId, "R0");
    assert.equal(packet.dispositions.at(-1).humanQuality, null);
    if (outputDir) { await mkdir(outputDir, { recursive: true }); await writeFile(join(outputDir, `${condition}-product-review-packet.json`), JSON.stringify(packet, null, 2)); }
    results.push({ condition, naturalLanguageProvider: "engineering_mock_only", prepareDidNotExecute: true, directScopedCandidate: true, evaluationPublishedAndDownloaded: true, adoptionAndRollbackExecuted: true, lostResponseRecoveryExercised: condition === "B", humanEvidence: false });
  } catch (error) { await client.screenshot(`${condition}-product-failure`).catch(() => {}); throw error; }
  finally { client.close(); }
}
process.stdout.write(`${JSON.stringify({ completed: true, validationClass: "real_UI_and_kernel_with_mock_provider", results }, null, 2)}\n`);
