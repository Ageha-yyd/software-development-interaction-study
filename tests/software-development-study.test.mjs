import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { createReadingListE0Corpus } from "../scenarios/materials/reading-list-e0-v4.2.mjs";

const root = new URL("../", import.meta.url);

async function importTypeScript(relativePath) {
  const sourceUrl = new URL(relativePath, root);
  const source = await readFile(sourceUrl, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/(from\s+["'])(\.[^"']+)(["'])/g,
    (_whole, prefix, specifier, suffix) => `${prefix}${new URL(specifier, sourceUrl).href}${suffix}`);
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const scenarioModule = importTypeScript("scenarios/software-product-development-v1.ts");
const runtimeModule = importTypeScript("lib/experiment/runtime.ts");

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
  assert.match(html, /正在准备 v4 信息空间试用/);
});

test("instantiates the generated v4.2 E0 projection with complete H01-H09 history and accessible item/task ledgers", async () => {
  const { SOFTWARE_PRODUCT_DEVELOPMENT_V1: scenario } = await scenarioModule;
  const { createScenarioAdapter } = await runtimeModule;
  const adapter = createScenarioAdapter(scenario);
  assert.equal(scenario.informationSpaceVersion, "v4.2-e0");
  assert.equal(scenario.episodeId, "EPISODE-01-SUR-ORG");
  assert.equal(scenario.turns.length, 9);
  assert.equal(scenario.turns.filter((turn) => turn.phase === "project_history").length, 7);
  assert.equal(scenario.baselineOrdinal, 8);
  assert.equal(scenario.triggerOrdinal, 9);
  for (const [items, key] of [[scenario.informationNodes, "nodeId"], [scenario.objectAnchors, "objectRef"], [scenario.informationRelations, "relationId"]]) {
    assert.equal(new Set(items.map((item) => item[key])).size, items.length);
  }
  for (const anchor of scenario.objectAnchors) assert.equal(adapter.node(anchor.nodeId).title, anchor.label);
  const packet = adapter.buildPacket("全部144条目，以及全部72任务", "e0");
  assert.deepEqual(new Set(packet.resolution.nodeIds), new Set(["CORPUS:E0-ITEMS-ALL", "CORPUS:E0-TASKS-ALL"]));
  assert.match(adapter.node("CORPUS:E0-ITEMS-ALL").body, /共 144 个条目/);
  assert.match(adapter.node("CORPUS:E0-TASKS-ALL").body, /共 72 个计划任务/);
  assert.equal(adapter.resolveQuery("全部144条目", "history").matched, false);
  assert.equal(scenario.informationNodes.filter((item) => item.nodeId.startsWith("ITEM:")).length, 144);
  const corpus = createReadingListE0Corpus();
  assert.equal(corpus.tasks.length, 72);
  for (const task of corpus.tasks) {
    const id = task.taskId === "R0-REFIND-017" ? "TRACE:R0-REFIND-017" : `TRACE:E0:${task.taskId}`;
    assert.ok(adapter.node(id).queryAliases.includes(task.taskId));
  }
  assert.doesNotMatch(JSON.stringify(scenario), /ALFA|BETA|GAMMA|股票/);
  assert.ok(!("condition" in scenario));
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
  assert.match(runtime, /information-frontier-v4-pilot\.1/);
  assert.match(runtime, /availableProbeNodeIds/);
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
  assert.match(shell, /forceLocalAgent = isPreview && params\.get\("agent"\) === "local"/);
  assert.match(shell, /本会话不会自动切换到另一个回答器/);
  assert.match(shell, /evidenceEnvelopeHash/);
  assert.match(gateway, /createRemoteAgentGateway/);
  assert.match(gateway, /stripAgentObjectMarkup/);
  assert.match(gateway, /frontierStage/);
  assert.doesNotMatch(gateway, /visibleOrdinal/);
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

test("renders the complete v4 project history in the Chat lane before live takeover", async () => {
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
  assert.match(shell, /filter\(\(turn\) => turn\.phase === "project_history"\)/);
  assert.match(shell, /historyTurns\.map\(renderHistoryTurn\)/);
  assert.match(shell, /Participant \$\{turn\.turnId\}/);
  assert.match(shell, /Agent \$\{turn\.turnId\}/);
  assert.match(shell, /renderAgentText\(historyMessage\)/);
  assert.match(shell, /baselineSummaryTurn/);
  assert.match(shell, /baselineExchangeComplete/);
  assert.match(shell, /baseline_takeover_exchange_completed/);
  assert.match(shell, /baseline_observation_authorized/);
  assert.match(shell, /historyTranscript/);
  assert.match(shell, /\.\.\.historyTranscript/);
  assert.match(shell, /\.\.\.liveTranscript/);
  assert.doesNotMatch(shell, /availableHistorySlots|\.slice\(-14\)/);
  assert.match(shell, /origin: "workflow"/);
  assert.match(shell, /text: triggerTurn\.user/);
  assert.match(shell, /text: triggerTurn\.assistantLead/);
  assert.match(shell, /const triggerNodeIds = triggerTurn\.informationNodeIds/);
  assert.doesNotMatch(shell, /baselineTurns|renderAgentTurn/);
  assert.doesNotMatch(shell, /visibleTurns\.map\(renderTurn\)/);
  assert.match(types, /chatAnchorText:\s*string/);
  assert.match(types, /queryResponseLead:\s*string/);
  assert.match(types, /epistemicDepth:\s*InformationDepth/);
  assert.match(runtime, /scenario_chat_anchor_missing/);
  assert.match(runtime, /scenario_history_turn_missing_anchor/);
  assert.match(runtime, /scenario_turn_marker_outside_projection/);
  assert.match(runtime, /scenario_turn_marker_not_grounded/);
  assert.match(runtime, /buildPacket/);
  assert.match(scenario, /我想做一个很轻的个人阅读清单/);
  assert.match(scenario, /同一篇 Offline-first sync notes/);
  assert.match(scenario, /拖放对我可以是快捷方式，但不能是唯一方式/);
  assert.match(scenario, /我先确认一下我现在对它的理解/);
  assert.match(scenario, /好，那就冻结 R0/);
  assert.match(scenario, /E0_PROJECTION/);
  assert.doesNotMatch(scenario, /加载共同的新试用记录；这不是在要求某个预设改版|请概括当前版本/);
  assert.doesNotMatch(scenario, /当前稳定目标如下|当前保存与组织规则如下/);
});

test("answers multi-field Chat requests and does not infer a hit from unrelated recent context", async () => {
  const { SOFTWARE_PRODUCT_DEVELOPMENT_V1: scenario } = await scenarioModule;
  const { createScenarioAdapter } = await runtimeModule;
  const adapter = createScenarioAdapter(scenario);
  const multi = adapter.resolveQuery("请解释保存规则、Search 和护栏", "history");
  assert.equal(multi.matched, true);
  for (const id of ["INFO:SAVE-RULES-R0", "INFO:SEARCH-IDENTITY-R0", "INFO:PROTECTED-GUARDS-R0"]) assert.ok(multi.nodeIds.includes(id));
  const unrelated = adapter.resolveQuery("那今天月球天气怎样", "e0", ["TRACE:R0-REFIND-017"]);
  assert.equal(unrelated.matched, false);
  assert.equal(unrelated.nodeIds.length, 0);
  assert.doesNotMatch(unrelated.message, /我只能基于当前已经发布的冻结材料|请指明信息对象/);
});

test("models the participant experience as co-constructed history plus isolated attention-driven continuations", async () => {
  const dialogue = await readFile(new URL("docs/software-product-development-v1-participant-consumed-script.md", root), "utf8");
  assert.match(dialogue, /参与者可消费的代表性对话稿 v4/);
  assert.match(dialogue, /不是逐字播放脚本/);
  assert.match(dialogue, /participant-facing experience witness/);
  assert.match(dialogue, /真实参与者只会经历自己实际走出的一段/);
  assert.match(dialogue, /^## 共同前史：这个产品怎样一轮轮成为 R0/m);
  assert.match(dialogue, /^## 共同接管（不计时）：当前参与者用自己的话接回 R0/m);
  assert.match(dialogue, /^## 接续样本 A：/m);
  assert.match(dialogue, /^## 接续样本 B：/m);
  assert.match(dialogue, /^## 接续样本 C：/m);

  const prehistory = dialogue.slice(dialogue.indexOf("## 共同前史"), dialogue.indexOf("## 共同接管"));
  const takeover = dialogue.slice(dialogue.indexOf("## 共同接管"), dialogue.indexOf("## 接续样本 A"));
  // Explicit organizer-only annotations are not participant dialogue. Keep the
  // no-scoring/no-internal-ID assertion on all remaining participant prose.
  const visibleDialogue = dialogue.slice(dialogue.indexOf("## 共同前史"))
    .replace(/^> Organizer：.*$/gm, "");
  assert.equal((prehistory.match(/^\*\*你\*\*$/gm) ?? []).length, 7);
  assert.equal((prehistory.match(/^\*\*Agent\*\*$/gm) ?? []).length, 7);
  assert.equal((takeover.match(/^\*\*你\*\*$/gm) ?? []).length, 2);
  assert.equal((takeover.match(/^\*\*Agent\*\*$/gm) ?? []).length, 2);
  assert.match(prehistory, /我想做一个很轻的个人阅读清单/);
  assert.match(prehistory, /先别绑/);
  assert.match(prehistory, /拖放对我可以是快捷方式，但不能是唯一方式/);
  assert.match(takeover, /我先确认一下我现在对它的理解/);
  assert.match(takeover, /R0 已冻结/);
  assert.match(takeover, /48 次延迟找回中，有 21 次/);
  assert.match(takeover, /不能仅凭经过两个入口判断使用者迷路/);

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

  assert.match(dialogue, /允许一次取得多字段、多案例、比较和综合/);
  assert.match(dialogue, /未被请求时不主动代写下一调查或参与者理由/);
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
  assert.match(userView, /不(?:声称|预设)对象让人更快决定什么重要/);
});

test("preserves shared graph theory while the v4.2 protocol governs the bounded study design", async () => {
  const [architecture, protocol] = await Promise.all([
    readFile(new URL("docs/software-product-development-v1-scenario-information-architecture.md", root), "utf8"),
    readFile(new URL("docs/software-product-development-v1-research-protocol-v4.2.md", root), "utf8"),
  ]);
  assert.match(architecture, /Epoch -> Frontier -> Trigger/);
  assert.match(architecture, /EpistemicTransition = </);
  assert.match(architecture, /ProductRevisionTransition = </);
  assert.match(architecture, /M_planned/);
  assert.match(architecture, /M_runtimeEligible/);
  assert.match(architecture, /完整信息图不是 DAG/);
  assert.match(architecture, /CanonicalProjectHistory = </);
  assert.match(architecture, /H08 必须由当前参与者现场用自己的话完成/);
  assert.match(architecture, /RecentOutputDelta_t = </);
  assert.match(architecture, /ParticipantMotiveLine = </);
  assert.match(architecture, /CompositeOutput_t = </);
  assert.match(architecture, /latestStableOutput.*局部显著性触发器/);
  assert.doesNotMatch(architecture, /跨 family 组合在 v2 中统一 OOM/);
  assert.match(architecture, /software-product-development-v1-research-protocol-v4\.2\.md/);
  assert.match(protocol, /唯一现行合同/);
  assert.match(protocol, /未预注册、未招募、未产生人效结果/);
  assert.match(protocol, /共同任务模块先行/);
  assert.match(protocol, /开放开发模块随后/);
  assert.match(protocol, /NTE 是可选独立预试描述，不是四共同机会的入组、Gold 或计分必备字段/);
  assert.match(protocol, /不按成功、所选产品方向或对象使用筛选主要样本/);
  assert.match(protocol, /validByDeadline/);
  assert.match(protocol, /restrictedUnresolvedTime/);
  assert.match(protocol, /timeToVerifiedGold.*tExplicitDisposition/);
  assert.match(protocol, /没有合理非劣界限和足够精度时/);
  assert.match(protocol, /条件、选中对象、浮窗状态不注入 Agent/);
  assert.match(protocol, /不把 packet 中所有节点记为参与者已读/);
  assert.match(protocol, /discard = 丢弃未采用候选/);
});

test("compiles the E0 trial slice into four axes, typed edges, and a dynamic Frontier", async () => {
  const [types, runtime, route, shell] = await Promise.all([
    readFile(new URL("lib/experiment/types.ts", root), "utf8"),
    readFile(new URL("lib/experiment/runtime.ts", root), "utf8"),
    readFile(new URL("app/api/software-agent/route.ts", root), "utf8"),
    readFile(new URL("components/experiment/ExperimentShell.tsx", root), "utf8"),
  ]);
  const { SOFTWARE_PRODUCT_DEVELOPMENT_V1: scenario } = await scenarioModule;
  const depths = new Set(scenario.informationNodes.map((item) => item.epistemicDepth));
  for (const depth of ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"]) {
    assert.ok(depths.has(depth), `missing information depth ${depth}`);
  }
  assert.match(types, /InformationRelationKind/);
  assert.match(types, /availableOperations/);
  assert.match(types, /groundingPhrases/);
  const nodeIds = new Set(scenario.informationNodes.map((item) => item.nodeId));
  for (const edge of scenario.informationRelations) {
    assert.ok(nodeIds.has(edge.sourceNodeId));
    assert.ok(nodeIds.has(edge.targetNodeId));
  }
  assert.match(runtime, /frontierRef/);
  assert.match(runtime, /buildPacket/);
  assert.match(route, /当前局部类型化关系/);
  assert.match(route, /frontierStage/);
  assert.match(route, /invalidAnchorCount/);
  assert.match(route, /允许锚点短语/);
  assert.doesNotMatch(route, /visibleOrdinal|当前可见序号/);
  assert.match(shell, /setRevealedNodeIds/);
  assert.match(shell, /traversedRelationIds/);
  assert.match(shell, /object_relation_navigated/);
  assert.match(shell, /object_question_prepared/);
  assert.match(shell, /object_working_set_question_prepared/);
  assert.match(shell, /生成可编辑追问/);
  assert.match(shell, /不会改变 Agent 输入/);
  assert.doesNotMatch(shell, /visibleOrdinal|currentOrdinal/);
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
  assert.match(shell, /style=\{\{ left: objectPosition\.x, top: objectPosition\.y, maxHeight:/);
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
  assert.match(readme, /不是正式数据采集系统/);
  assert.match(readme, /所有判断保留原文并标记待审，未当作 Gold/);
  assert.match(shell, /formalDataCollection:\s*false/);
  assert.match(shell, /V4 INFORMATION SPACE PILOT · 非正式采集/);
});
