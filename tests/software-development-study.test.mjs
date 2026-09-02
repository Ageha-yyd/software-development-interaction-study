import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the dedicated software product development route", async () => {
  const response = await render("/study/software-product-development-v1?preview=1&condition=A");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /软件产品开发实验基座/);
  assert.match(html, /正在准备冻结实验基线/);
});

test("freezes eleven information nodes, eight turns, and eleven additive object anchors", async () => {
  const source = await readFile(new URL("scenarios/software-product-development-v1.ts", root), "utf8");
  assert.equal((source.match(/\bnode\(\s*\n\s*"/g) ?? []).length, 11);
  assert.equal((source.match(/\bturn\(\s*"/g) ?? []).length, 8);
  assert.equal((source.match(/\banchor\(\s*"/g) ?? []).length, 11);
  assert.match(source, /EPISODE-01-SUR-ORG/);
  assert.match(source, /本次证据边界/);
  assert.doesNotMatch(source, /ALFA|BETA|GAMMA|股票/);
  assert.doesNotMatch(source, /condition\s*:/);
});

test("keeps B additive and records real action-start timestamps", async () => {
  const [shell, runtime, telemetry] = await Promise.all([
    readFile(new URL("components/experiment/ExperimentShell.tsx", root), "utf8"),
    readFile(new URL("lib/experiment/runtime.ts", root), "utf8"),
    readFile(new URL("lib/experiment/telemetry.ts", root), "utf8"),
  ]);
  assert.match(shell, /condition !== "B"/);
  assert.match(shell, /选择不是提交要求/);
  assert.match(shell, /完整 Chat/);
  assert.match(shell, /interactionStartMonotonicMs = eventMonotonicMs\(\)/);
  assert.ok(shell.indexOf("interactionStartMonotonicMs = eventMonotonicMs()") < shell.indexOf("gateway.respond"));
  assert.match(runtime, /scenario_object_projection_mismatch/);
  assert.match(runtime, /scenario_object_reveal_mismatch/);
  assert.match(telemetry, /software-development-browser-preview-v1/);
  assert.match(telemetry, /localStorage\.setItem/);
});

test("locks one condition-neutral Agent transport per browser session", async () => {
  const [shell, gateway, route, example] = await Promise.all([
    readFile(new URL("components/experiment/ExperimentShell.tsx", root), "utf8"),
    readFile(new URL("lib/experiment/agent-gateway.ts", root), "utf8"),
    readFile(new URL("app/api/software-agent/route.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(shell, /fetch\("\/api\/software-agent"/);
  assert.match(shell, /agentRuntime\.mode === "remote_chat_completion" \? remoteGateway : localGateway/);
  assert.match(shell, /本会话不会自动切换到另一个回答器/);
  assert.match(shell, /evidenceEnvelopeHash/);
  assert.match(gateway, /createRemoteAgentGateway/);
  assert.match(gateway, /stripAgentObjectMarkup/);
  assert.doesNotMatch(gateway, /condition|selectedObjectRefs|objectRef/);
  assert.match(route, /allowedBodyKeys/);
  assert.match(route, /SOFTWARE_AGENT_API_KEY/);
  assert.match(route, /Evidence|唯一事实来源|信息包/);
  assert.doesNotMatch(route, /StockV5|ALFA|BETA|GAMMA/);
  assert.match(example, /^SOFTWARE_AGENT_API_KEY=$/m);
  assert.match(example, /^SOFTWARE_AGENT_BASE_URL=https:\/\/api\.deepseek\.com$/m);
});

test("uses the top bar for preview conditions and the sidebar for real conversations", async () => {
  const [shell, css] = await Promise.all([
    readFile(new URL("components/experiment/ExperimentShell.tsx", root), "utf8"),
    readFile(new URL("components/experiment/experiment-shell.module.css", root), "utf8"),
  ]);
  assert.match(shell, /最近对话/);
  assert.match(shell, /A · Chat/);
  assert.match(shell, /B · Chat \+ Object/);
  assert.match(shell, /研究者条件切换/);
  assert.match(shell, /assignedConversation/);
  assert.match(shell, /openObject\(object\.objectRef, "inline", event\.currentTarget\)/);
  assert.doesNotMatch(shell, /已发布对象 · 可选/);
  assert.doesNotMatch(shell, /object_shelf/);
  assert.doesNotMatch(shell, /研究者条件预览|conversationList|activeConversation/);
  assert.doesNotMatch(css, /\.objectShelf\b/);
  assert.match(css, /\.conditionSwitch\b/);
  assert.doesNotMatch(css, /\.conversationList\b|\.activeConversation\b/);
});

test("keeps a lightweight Chat layer with source-style transient object details", async () => {
  const [shell, css] = await Promise.all([
    readFile(new URL("components/experiment/ExperimentShell.tsx", root), "utf8"),
    readFile(new URL("components/experiment/experiment-shell.module.css", root), "utf8"),
  ]);
  assert.match(shell, /messageStream/);
  assert.match(shell, /workflowMessage/);
  assert.doesNotMatch(shell, /closeConversation|Agent 对话收口|结束这轮对话/);
  assert.doesNotMatch(shell, /scenario\.intentPrompt|intent_submitted|preview_episode_completed/);
  assert.doesNotMatch(shell, /product-intent|fixed_submission_card|提交产品意图/);
  assert.match(shell, /objectModal/);
  assert.match(shell, /objectBackdrop/);
  assert.doesNotMatch(shell, /关联信息：/);
  assert.doesNotMatch(shell, /phaseBar|conversationHeading|neutralNotice/);
  assert.doesNotMatch(shell, /inlineObjectDetail|objectPanel/);
  assert.doesNotMatch(shell, /对象引用|首次公开/);
  assert.doesNotMatch(css, /\.phaseBar\b|\.conversationHeading\b|\.neutralNotice\b/);
  assert.doesNotMatch(css, /\.inlineObjectDetail\b|\.objectPanel\b/);
  assert.doesNotMatch(css, /\.closeConversation\b|\.selectionNote\b/);
  const objectLinkRule = css.match(/\.objectLink\s*\{[^}]+\}/s)?.[0] ?? "";
  assert.match(objectLinkRule, /color:\s*#5578c5/i);
  assert.match(objectLinkRule, /text-decoration-style:\s*dotted/i);
  assert.doesNotMatch(objectLinkRule, /font-size|font-weight/);
});

test("renders progressive Agent replies as Codex-like plain prose without replaying fixed participant turns", async () => {
  const [shell, css, scenario, types, runtime] = await Promise.all([
    readFile(new URL("components/experiment/ExperimentShell.tsx", root), "utf8"),
    readFile(new URL("components/experiment/experiment-shell.module.css", root), "utf8"),
    readFile(new URL("scenarios/software-product-development-v1.ts", root), "utf8"),
    readFile(new URL("lib/experiment/types.ts", root), "utf8"),
    readFile(new URL("lib/experiment/runtime.ts", root), "utf8"),
  ]);
  assert.match(shell, /item\.body\.indexOf\(item\.chatAnchorText\)/);
  assert.match(shell, /aria-label=\{item\.title\}/);
  assert.match(shell, /\{item\.chatAnchorText\}/);
  assert.doesNotMatch(shell, /styles\.agentMark|styles\.completeMark|styles\.nodePunctuation|styles\.nodeSource/);
  const informationNodeRule = css.match(/\.informationNode\s*\{[^}]+\}/s)?.[0] ?? "";
  assert.doesNotMatch(informationNodeRule, /border|padding/);
  assert.doesNotMatch(css, /\.informationNode:last-child|\.nodeHeading\b|\.nodePunctuation\b|\.nodeSource\b|\.agentMark\b|\.completeMark\b/);
  assert.match(css, /\.agentMessage, \.workflowMessage\s*\{[^}]*display:\s*block/s);
  assert.match(css, /\.nodeList\s*\{[^}]*gap:\s*10px/s);
  assert.match(shell, /filter\(\(turn\) => turn\.phase === "baseline_summary"\)/);
  assert.match(shell, /origin: "workflow"/);
  assert.match(shell, /text: triggerTurn\.user/);
  assert.match(shell, /text: triggerTurn\.assistantLead/);
  assert.match(shell, /turn\.presentedNodeIds \?\? turn\.informationNodeIds/);
  assert.doesNotMatch(shell, /visibleTurns\.map\(renderTurn\)/);
  assert.match(types, /chatAnchorText:\s*string/);
  assert.match(types, /queryResponseLead:\s*string/);
  assert.match(runtime, /scenario_chat_anchor_missing/);
  assert.match(scenario, /我隔了一阵子没看/);
  assert.match(scenario, /那 Inbox 和 Unsorted 不是有点重吗/);
  assert.match(scenario, /那先看实际怎么用的/);
  assert.doesNotMatch(scenario, /加载共同的新试用记录；这不是在要求某个预设改版|请概括当前版本/);
  assert.doesNotMatch(scenario, /当前稳定目标如下|当前保存与组织规则如下/);
});

test("answers colloquial grounded queries without frozen-material form language", async () => {
  const runtime = await readFile(new URL("lib/experiment/runtime.ts", root), "utf8");
  assert.match(runtime, /我还没完全抓到你指的是哪一段/);
  assert.match(runtime, /不把它们拆成几轮小问答/);
  assert.match(runtime, /explicitMatches/);
  assert.match(runtime, /contextualMatches/);
  assert.match(runtime, /queryResponseLead/);
  assert.doesNotMatch(runtime, /我只能基于当前已经发布的冻结材料|请指明信息对象|以下是当前冻结材料中的对应信息/);
});

test("models the participant experience as co-constructed history plus isolated attention-driven continuations", async () => {
  const dialogue = await readFile(new URL("docs/software-product-development-v1-participant-consumed-script.md", root), "utf8");
  assert.match(dialogue, /参与者可消费的代表性对话稿 v4/);
  assert.match(dialogue, /不是逐字播放脚本/);
  assert.match(dialogue, /participant-facing experience witness/);
  assert.match(dialogue, /真实参与者只会经历自己实际走出的一段/);
  assert.equal((dialogue.match(/^## /gm) ?? []).length, 5);
  assert.match(dialogue, /^## 共同前史：这个产品怎样一轮轮成为 R0/m);
  assert.match(dialogue, /^## 共同接管（不计时）：当前参与者用自己的话接回 R0/m);
  assert.match(dialogue, /^## 接续样本 A：/m);
  assert.match(dialogue, /^## 接续样本 B：/m);
  assert.match(dialogue, /^## 接续样本 C：/m);

  const prehistory = dialogue.slice(dialogue.indexOf("## 共同前史"), dialogue.indexOf("## 共同接管"));
  const takeover = dialogue.slice(dialogue.indexOf("## 共同接管"), dialogue.indexOf("## 接续样本 A"));
  const visibleDialogue = dialogue.slice(dialogue.indexOf("## 共同前史"));
  assert.equal((prehistory.match(/^\*\*你\*\*$/gm) ?? []).length, 7);
  assert.equal((prehistory.match(/^\*\*Agent\*\*$/gm) ?? []).length, 7);
  assert.equal((takeover.match(/^\*\*你\*\*$/gm) ?? []).length, 2);
  assert.equal((takeover.match(/^\*\*Agent\*\*$/gm) ?? []).length, 2);
  assert.match(prehistory, /我想做一个很轻的个人阅读清单/);
  assert.match(prehistory, /先别绑/);
  assert.match(prehistory, /拖放对我可以是快捷方式，但不能是唯一方式/);
  assert.match(takeover, /我先确认一下我现在对它的理解/);
  assert.match(takeover, /R0 已冻结/);
  assert.match(takeover, /48 次延迟找回里有 21 次/);
  assert.match(takeover, /没有哪一个被预先标成“最值得看”/);

  assert.match(dialogue, /我先卡在“多带入 1 条”这里/);
  assert.match(dialogue, /现在反而是那 9 个一直直接用 Search 的人/);
  assert.match(dialogue, /我第一反应不是 21 次跨入口/);
  assert.match(dialogue, /别因为我提到 backlog 就直接做提醒/);
  assert.match(dialogue, /我暂时都不想直接翻译成功能问题/);
  assert.match(dialogue, /一个基本没变的反例/);
  assert.match(dialogue, /我先不直接实现，因为/);
  assert.match(dialogue, /已经停止完整联动候选/);
  assert.match(dialogue, /把经过评价的简单保存视图提升为当前产品/);
  assert.doesNotMatch(visibleDialogue, /\bW_L\b|\bCELL:|packet|current pointer|epistemic|pair state|exact state/i);
  assert.doesNotMatch(dialogue, /目前最值得继续追|我们先回答|接下来只观察/);
  assert.doesNotMatch(dialogue, /^### |^## 路径[一二三四]|输入框提示|聊天回复 ·|信息卡 ·/m);

  const roleBlocks = [...dialogue.matchAll(/\*\*(Agent|你)\*\*\s*\r?\n\r?\n([\s\S]*?)(?=\r?\n\r?\n\*\*(?:Agent|你)\*\*|\r?\n\r?\n## |$)/g)];
  const participantLengths = roleBlocks.filter((match) => match[1] === "你").map((match) => match[2].trim().length);
  const agentLengths = roleBlocks.filter((match) => match[1] === "Agent").map((match) => match[2].trim().length).sort((left, right) => left - right);
  const agentMedian = agentLengths[Math.floor(agentLengths.length / 2)];
  assert.ok(participantLengths.length >= 30);
  assert.ok(participantLengths.filter((length) => length >= 60).length >= 12);
  assert.ok(agentMedian >= 180);
  assert.ok(agentLengths.reduce((sum, length) => sum + length, 0) > participantLengths.reduce((sum, length) => sum + length, 0) * 2);
});

test("keeps v4 inventory and user-facing overview aligned with the dialogue experience", async () => {
  const [inventory, userView] = await Promise.all([
    readFile(new URL("docs/software-product-development-v1-participant-content-inventory.md", root), "utf8"),
    readFile(new URL("docs/software-product-development-v1-user-view.md", root), "utf8"),
  ]);
  assert.match(inventory, /v4 共享图组装规则/);
  assert.match(inventory, /不得用开场卡片替代 H01–H07 的既有开发对话和 H08–H09 的当前参与者接管/);
  assert.match(inventory, /当前参与者必须在 H08 现场用自己的话接回状态/);
  assert.match(inventory, /RecentOutputDelta\(new\/updated\/reopened\/stale\/unanswered\)/);
  assert.match(inventory, /PACKET:R0-BACKLOG-DISPOSITION-v1/);
  assert.match(inventory, /PACKET:R0-LONGHORIZON-CROSSCASE-v1/);
  assert.match(inventory, /PACKET:R0-STATE-BOUNDARY-CROSSCASE-v1/);
  assert.match(inventory, /PACKET:F-DIRECT-FIRST-EVAL-v1/);
  assert.match(inventory, /PACKET:F-DIRECT-REVISED-E2-v1/);
  assert.match(inventory, /authoring content/);
  assert.match(inventory, /不能进入正式 runtime 或 scored collection/);

  assert.match(userView, /用户视角入口 v4/);
  assert.match(userView, /一段从项目最初想法开始的完整 Chat 历史/);
  assert.match(userView, /三段彼此隔离、由作者构造的代表性可能接续/);
  assert.match(userView, /A 是完整 Chat。B 是完全相同的 Chat/);
  assert.match(userView, /不声称对象让人更快决定什么重要/);
});

test("models output-contingent exploration as a shared non-DAG semantic graph", async () => {
  const architecture = await readFile(new URL("docs/software-product-development-v1-scenario-information-architecture.md", root), "utf8");
  assert.match(architecture, /Epoch -> Frontier -> Trigger/);
  assert.match(architecture, /OpportunitySpec = </);
  assert.match(architecture, /OpportunityObservation = </);
  assert.match(architecture, /OpportunitySpec_A\(opportunity\) = OpportunitySpec_B\(opportunity\)/);
  assert.match(architecture, /EpistemicTransition = </);
  assert.match(architecture, /ProductRevisionTransition = </);
  assert.match(architecture, /M_planned/);
  assert.match(architecture, /M_runtimeEligible/);
  assert.match(architecture, /packetEligibilityKeyDigest \+ frozenPacketManifestDigest/);
  assert.match(architecture, /M_runtimeEligible` 是 state 与 exact eligibility\/manifest 的关系/);
  assert.match(architecture, /parentRevisionRefs: exact set/);
  assert.match(architecture, /CELL:L\+F/);
  assert.match(architecture, /CELL:L\+V/);
  assert.match(architecture, /CELL:F\+V/);
  assert.match(architecture, /PACKET:V-DIRECT-LONGHORIZON-v1/);
  assert.match(architecture, /OP:COMMON-LOCAL-STATE/);
  assert.match(architecture, /OP:COMMON-COMPOUND-WL/);
  assert.match(architecture, /OP:COMMON-LOCAL-PORTABILITY/);
  assert.match(architecture, /OP:COMMON-COMPOUND-PORTABILITY/);
  assert.match(architecture, /OP:DIRECTED-STATE-DEFINITION/);
  assert.match(architecture, /OP:DIRECTED-PORTABILITY-RECEIPT/);
  assert.match(architecture, /predeclared_directed_request/);
  assert.match(architecture, /L_STATE→C_STATE→L_PORT→C_PORT/);
  assert.match(architecture, /TRACE:R0-LONGHORIZON-042/);
  assert.match(architecture, /RECON:R0-ORG-57-71/);
  assert.match(architecture, /D4→D30 continuation protocol/);
  assert.match(architecture, /PROMOTION:V-DIRECT-O3/);
  assert.match(architecture, /VERIFY:V-AFTER-PROMOTION/);
  assert.match(architecture, /RECEIPT:TERMINAL-V-O3/);
  assert.match(architecture, /完整信息图不是 DAG/);
  assert.match(architecture, /CanonicalProjectHistory = </);
  assert.match(architecture, /H08 必须由当前参与者现场用自己的话完成/);
  assert.match(architecture, /RecentOutputDelta_t = </);
  assert.match(architecture, /ParticipantMotiveLine = </);
  assert.match(architecture, /CompositeOutput_t = </);
  assert.match(architecture, /latestStableOutput.*局部显著性触发器/);
  assert.match(architecture, /authoring audit 以 40%–60% 为目标范围/);
  assert.match(architecture, /NTE 不是 CHI_v6 已有 RQ\/SAP 的既定变量/);
  assert.match(architecture, /对象通路不负责让参与者更快决定“该关心什么”/);
  assert.match(architecture, /`21\/48` aggregate → Offline-first trace/);
  assert.match(architecture, /`4` 次 saved-view maintenance → 一次改名/);
  assert.match(architecture, /PACKET:R0-BACKLOG-DISPOSITION-v1/);
  assert.match(architecture, /PACKET:R0-LONGHORIZON-CROSSCASE-v1/);
  assert.match(architecture, /PACKET:R0-STATE-BOUNDARY-CROSSCASE-v1/);
  assert.match(architecture, /PACKET:F-DIRECT-FIRST-EVAL-v1/);
  assert.match(architecture, /PACKET:F-DIRECT-REVISED-E2-v1/);
  assert.match(architecture, /CELL:FOCUS-NR-C1/);
  assert.match(architecture, /authoring_pending/);
  assert.match(architecture, /output-induced reframing/);
  assert.match(architecture, /O1-O3/);
  assert.doesNotMatch(architecture, /NTE 与 top-choice concentration。它们只用于确认 frontier 的探索性和既有分析模型所需 moderator/);
  assert.doesNotMatch(architecture, /跨 family 组合在 v2 中统一 OOM/);
  assert.doesNotMatch(architecture, /每个 bounded trial 只有两个 condition-neutral external evidence windows/);
});

test("anchors object cards at their trigger and supports bounded dragging", async () => {
  const [shell, css] = await Promise.all([
    readFile(new URL("components/experiment/ExperimentShell.tsx", root), "utf8"),
    readFile(new URL("components/experiment/experiment-shell.module.css", root), "utf8"),
  ]);
  assert.match(shell, /objectAnchorPosition/);
  assert.match(shell, /getBoundingClientRect\(\)/);
  assert.match(shell, /setPointerCapture/);
  assert.match(shell, /onPointerMove=\{moveObjectDrag\}/);
  assert.match(shell, /object_card_moved/);
  assert.match(shell, /style=\{\{ left: objectPosition\.x, top: objectPosition\.y \}\}/);
  const backdropRule = css.match(/\.objectBackdrop\s*\{[^}]+\}/s)?.[0] ?? "";
  const modalRule = css.match(/\.objectModal\s*\{[^}]+\}/s)?.[0] ?? "";
  assert.doesNotMatch(backdropRule, /justify-content|padding:/);
  assert.match(modalRule, /position:\s*fixed/);
  assert.doesNotMatch(modalRule, /\bright\s*:|\btop\s*:/);
  assert.match(css, /cursor:\s*grab/);
});

test("uses a white-purple tokenized theme for both conditions", async () => {
  const css = await readFile(new URL("components/experiment/experiment-shell.module.css", root), "utf8");
  assert.match(css, /--page:\s*#fbfaff/i);
  assert.match(css, /--sidebar:\s*#f4f0ff/i);
  assert.match(css, /--panel:\s*#ffffff/i);
  assert.match(css, /--accent:\s*#6d28d9/i);
  assert.match(css, /prefers-reduced-motion/);
});

test("keeps formal collection claims out of the engineering preview", async () => {
  const [readme, shell] = await Promise.all([
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("components/experiment/ExperimentShell.tsx", root), "utf8"),
  ]);
  assert.match(readme, /第一阶段工程预览，不是正式数据采集系统/);
  assert.match(shell, /formalDataCollection:\s*false/);
  assert.match(shell, /ENGINEERING PREVIEW · 非正式采集/);
});
