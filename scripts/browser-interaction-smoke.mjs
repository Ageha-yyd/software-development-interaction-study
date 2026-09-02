import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.STUDY_BASE_URL ?? "http://127.0.0.1:3421";
const condition = process.env.STUDY_CONDITION === "A" ? "A" : "B";
const screenshotPath = process.env.STUDY_SCREENSHOT_PATH;
const candidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserPath = candidates.find(existsSync);
if (browserPath === undefined) throw new Error("chromium_browser_not_found");

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("debug_port_not_allocated"));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

async function retry(operation, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError ?? new Error("browser_smoke_timeout");
}

const debugPort = await availablePort();
const profile = await mkdtemp(join(tmpdir(), "software-study-browser-smoke-"));
const url = `${baseUrl}/?preview=1&condition=${condition}`;
const browser = spawn(browserPath, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  "--window-size=1440,1000",
  url,
], { stdio: "ignore", windowsHide: true });

try {
  const pages = await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    if (!response.ok) throw new Error(`cdp_list_failed:${response.status}`);
    const value = await response.json();
    if (!Array.isArray(value) || value.length === 0) throw new Error("cdp_page_not_ready");
    return value;
  });
  const page = pages.find((item) => item.type === "page" && item.url.startsWith(baseUrl)) ?? pages[0];
  assert.equal(typeof page.webSocketDebuggerUrl, "string");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (typeof message.id !== "number") return;
    const waiter = pending.get(message.id);
    if (waiter === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });

  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails !== undefined) {
      throw new Error(result.exceptionDetails.text ?? "browser_evaluation_failed");
    }
    return result.result.value;
  };
  const bodyText = () => evaluate("document.body.innerText");
  const clickButton = (text) => evaluate(`(() => {
    const button = [...document.querySelectorAll("button")].find((item) =>
      item.textContent.includes(${JSON.stringify(text)}) || item.getAttribute("aria-label") === ${JSON.stringify(text)}
    );
    if (!button) throw new Error("button_not_found:${text}");
    button.click();
    return button.textContent;
  })()`);
  const fillTextarea = (id, value) => evaluate(`(() => {
    const field = document.getElementById(${JSON.stringify(id)});
    if (!(field instanceof HTMLTextAreaElement)) throw new Error("textarea_not_found:${id}");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event("input", { bubbles: true }));
    return field.value;
  })()`);
  const waitForText = (text) => retry(async () => {
    const value = await bodyText();
    if (!value.includes(text)) throw new Error(`text_not_visible:${text}`);
    return value;
  });

  await waitForText("最近对话");
  const targetConversation = condition === "B" ? "B · Chat + Object" : "A · Chat";
  const oppositeConversation = condition === "B" ? "A · Chat" : "B · Chat + Object";
  await clickButton(oppositeConversation);
  await retry(async () => {
    const active = await evaluate(`document.querySelector('button[aria-current="page"]')?.textContent ?? ""`);
    if (!active.includes(oppositeConversation)) throw new Error(`conversation_not_active:${oppositeConversation}`);
  });
  await clickButton(targetConversation);
  await retry(async () => {
    const active = await evaluate(`document.querySelector('button[aria-current="page"]')?.textContent ?? ""`);
    if (!active.includes(targetConversation)) throw new Error(`conversation_not_active:${targetConversation}`);
  });
  const initialText = await bodyText();
  assert.equal(initialText.includes("已发布对象 · 可选"), false);
  if (condition === "B") {
    await fillTextarea("experiment-query", "这个产品到底要守住什么？");
    await clickButton("发送查询");
    await waitForText("现在能确认的不是某个缺失功能");
    await clickButton("个人阅读清单的稳定目标");
    await waitForText("可选操作");
    const beforeDrag = await evaluate(`(() => {
      const card = document.querySelector('[role="dialog"]');
      const header = card?.querySelector('header');
      if (!(card instanceof HTMLElement) || !(header instanceof HTMLElement)) throw new Error("draggable_card_not_found");
      const cardRect = card.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      return {
        left: cardRect.left,
        top: cardRect.top,
        dragX: headerRect.left + Math.min(110, headerRect.width * 0.35),
        dragY: headerRect.top + headerRect.height / 2,
      };
    })()`);
    await call("Input.dispatchMouseEvent", { type: "mousePressed", x: beforeDrag.dragX, y: beforeDrag.dragY, button: "left", buttons: 1, clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: beforeDrag.dragX + 90, y: beforeDrag.dragY + 55, button: "left", buttons: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: beforeDrag.dragX + 90, y: beforeDrag.dragY + 55, button: "left", buttons: 0, clickCount: 1 });
    await retry(async () => {
      const position = await evaluate(`(() => {
        const card = document.querySelector('[role="dialog"]');
        if (!(card instanceof HTMLElement)) throw new Error("draggable_card_not_found");
        const rect = card.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
      })()`);
      if (Math.abs(position.left - beforeDrag.left) < 20 || Math.abs(position.top - beforeDrag.top) < 20) {
        throw new Error("object_card_did_not_move");
      }
      return position;
    });
    if (screenshotPath) {
      const capture = await call("Page.captureScreenshot", { format: "png", fromSurface: true });
      await writeFile(screenshotPath, Buffer.from(capture.data, "base64"));
    }
    await clickButton("选入当前考虑");
    await clickButton("关闭对象详情");
  } else {
    const text = await bodyText();
    assert.equal(text.includes("已发布对象 · 可选"), false);
  }
  await clickButton("那先看实际怎么用的");
  await waitForText("12 位场景试用者");
  await fillTextarea("experiment-query", "21 次都来回看了，这不就是迷路了吗？");
  await clickButton("发送查询");
  await waitForText("不能把 21 次跨入口访问直接写成“迷路”");
  await fillTextarea("experiment-query", "嗯，那接着说。");
  await clickButton("发送查询");
  await waitForText("我接着刚才那组信息说");
  await fillTextarea("experiment-query", "这些记录已经能说明该改导航了吗？");
  await clickButton("发送查询");
  await waitForText("现在最重要的不是从数字里硬选一个功能");
  const openConversationText = await bodyText();
  assert.equal(openConversationText.includes("看完这些，你现在最想先弄清楚或试一试什么？"), false);
  assert.equal(openConversationText.includes("结束这轮对话"), false);

  const events = await evaluate(`(() => {
    const sessions = Object.keys(localStorage)
      .filter((item) => item.startsWith("experiment-preview:software-product-development-v1:"))
      .map((key) => JSON.parse(localStorage.getItem(key)));
    return sessions.find((entries) => entries.some((item) => item.event === "trigger_revealed")) ?? [];
  })()`);
  const eventNames = events.map((item) => item.event);
  const expectedEvents = [
    "preview_condition_switched",
    "trigger_revealed",
    "chat_action_started",
    "agent_response_recorded",
  ];
  if (condition === "B") expectedEvents.push("object_action_started", "object_card_moved", "object_selected");
  for (const expected of expectedEvents) assert.ok(eventNames.includes(expected), `missing_event:${expected}`);

  const action = events.find((item) => item.event === "object_action_started");
  if (condition === "B") assert.equal(typeof action.payload.interactionStartMonotonicMs, "number");
  else assert.equal(action, undefined);
  assert.equal(events.every((item) => item.condition === condition), true);
  assert.deepEqual(events.map((item) => item.sequence), events.map((_, index) => index + 1));

  const report = {
    validationClass: "local_browser_interaction_smoke",
    scenarioId: "software-product-development-v1",
    condition,
    eventCount: events.length,
    eventNames,
    completed: true,
    formalDataCollection: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  socket.close();
} finally {
  browser.kill();
}
