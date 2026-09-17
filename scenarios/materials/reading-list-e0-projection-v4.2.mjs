import { createReadingListE0Corpus, summarizeReadingListE0Corpus } from "./reading-list-e0-v4.2.mjs";

const SOURCE = "v4.2 作者新构造的模拟情境；非历史恢复数据、非真实参与者或软件执行证据。";
const uniq = (values) => [...new Set(values)];
const escapeCell = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const table = (headings, rows) => [
  `| ${headings.join(" | ")} |`,
  `| ${headings.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
].join("\n");
const byKey = (rows, key) => new Map(rows.map((row) => [row[key], row]));
const taskNodeRef = (taskId) => taskId === "R0-REFIND-017" ? "TRACE:R0-REFIND-017" : `TRACE:E0:${taskId}`;
const itemNodeRef = (itemId) => itemId === "R0-042" ? "ITEM:R0-042@D4T17" : `ITEM:E0:${itemId}@D4`;
const stateText = (state) => `pending=${state.pending}; membership=[${state.membershipIds.join(", ")}]`;

function eventText(event) {
  const detail = event.type === "save_item" ? `输入 ${JSON.stringify(event.input)}；状态 ${stateText(event.afterState)}`
    : event.beforeState ? `${stateText(event.beforeState)} → ${stateText(event.afterState)}；payload ${JSON.stringify(event.beforeState.payload) === JSON.stringify(event.afterState.payload) ? "未变" : "已变"}`
      : [event.surface, event.collectionId, event.query ? `query=${JSON.stringify(event.query)}` : "", event.itemId].filter(Boolean).join("; ");
  return `${event.eventId} · ${event.type} · t=${event.atScenarioMs} 场景毫秒 · ${event.profileId} / ${event.replicaRef} / ${event.sessionId} · ${detail} · 来源 ${event.sourceRef}`;
}

function makeNode(nodeId, title, text, epistemicDepth, kind, queryAliases, relatedNodeIds = [], groundingPhrases = []) {
  const body = `${title}\n\n${text}`;
  return Object.freeze({
    schemaVersion: 1,
    nodeId, title, body, chatAnchorText: title,
    groundingPhrases: Object.freeze(uniq([title, ...groundingPhrases]).filter((phrase) => body.includes(phrase))),
    sourceLabel: `${title} · v4.2 构造材料`,
    relatedNodeIds: Object.freeze(uniq(relatedNodeIds)),
    queryAliases: Object.freeze(uniq(queryAliases)),
    queryResponseLead: body,
    queryResponseNodeIds: Object.freeze([nodeId]),
    epistemicDepth, kind, temporalStage: "e0_observation",
    epistemicStatus: kind === "boundary" ? "uncertain" : "observed",
    availableFromStage: "e0",
    scopeTags: Object.freeze(["e0", "author-constructed", "ledger-derived"]),
    availableOperations: Object.freeze(["inspect", "expand_scope", "inspect_case", "trace_source", "compare_history", "verify_provenance", "revisit"]),
  });
}

/** Same canonical corpus projection for Chat and optional object access. */
export function createReadingListE0Projection(corpus = createReadingListE0Corpus()) {
  const summary = summarizeReadingListE0Corpus(corpus);
  const items = byKey(corpus.items, "itemId");
  const events = byKey(corpus.events, "eventId");
  const tasks = byKey(corpus.tasks, "taskId");
  const snapshots = byKey(corpus.snapshots[0].itemStates, "itemId");
  const delayed = summary.denominatorIds.delayedReturn.map((ref) => tasks.get(ref));
  const organization = summary.denominatorIds.organizationReturn.map((ref) => tasks.get(ref));
  const dual = summary.denominatorIds.dualEntry.map((ref) => tasks.get(ref));
  const nonDual = delayed.filter((task) => !summary.denominatorIds.dualEntry.includes(task.taskId));
  const cohort = summary.denominatorIds.pendingMemberDual.map((ref) => tasks.get(ref));
  const trace = tasks.get("R0-REFIND-017");
  const traceEvents = trace.eventIds.map((ref) => events.get(ref));
  const membershipEvent = events.get("RAW:MEM-042-03");
  const item042 = items.get(trace.targetItemId);
  const collection042 = corpus.collections.find((entry) => entry.collectionId === membershipEvent.collectionId);
  const visitDistribution = (counts, order = ["Inbox", "Unsorted", "Search", "Collections"]) => order.map((surface) => `${surface} ${counts[surface]}`).join("、");
  const routeText = (task) => task.eventIds.map((ref) => {
    const event = events.get(ref);
    const action = event.type === "search" ? `Search ${event.query}` : event.type === "open_item" ? `打开 ${event.itemId}` : event.surface;
    return `${event.elapsedScenarioMs / 1000}秒 ${action}`;
  }).join(" → ");
  const taskRow = (task) => [task.taskId, task.profileId, task.targetItemId, stateText(task.asOfStartState), routeText(task), task.eventIds.join(", ")];
  const taskTable = (rows) => table(["任务", "画像", "目标", "开始状态", "完整访问过程（模拟时钟）", "事件来源"], rows.map(taskRow));
  const taskText = (task) => `${SOURCE}\n\n协议 ${task.protocolRef}，版本 ${task.revisionRef}，隔离账号 ${task.replicaRef}。\n\n${taskTable([task])}\n\n条目标题：${items.get(task.targetItemId).payload.title}。最终事件打开目标 identity；没有任务级动机说明。\n\n${task.eventIds.map((ref) => eventText(events.get(ref))).join("\n\n")}`;
  const ordinarySearch = delayed.find((task) => task.eventIds.length === 2 && events.get(task.eventIds[0]).type === "search");
  const ordinaryCollection = delayed.find((task) => task.eventIds.length === 2 && events.get(task.eventIds[0]).surface === "Collections");
  const pilotPhrase = `${summary.profiles} 个使用画像完成了 ${summary.savedItems} 次保存和 ${summary.plannedTasks} 次计划内找回`;
  const refindPhrase = `${summary.delayedReturn.tasks} 次延迟找回中，有 ${summary.delayedReturn.dualEntry} 次在打开目标前经过 Inbox 和 Unsorted`;
  const memberPhrase = `到第四日，${summary.membership.atD4} 个条目已有 Collection 归属`;
  const nodes = [
    makeNode("PILOT:R0-D4-01", "四日模拟情境总览", `${SOURCE}\n\n${pilotPhrase}，均成功。计划任务包括 ${summary.delayedReturn.tasks} 次延迟找回和 ${summary.organizationReturn.tasks} 次组织后回访；后者属于总计，不是额外任务。另有 ${summary.contextNotes.total} 段独立情境说明。完整任务、条目和事件均可一次请求。当前无候选改版结果。`, "L3", "observation", ["四日观察", "四日内部试用", "四日材料", "四日情境", "试用摘要", "试下来怎么样", "这几天发生了什么", "这组数据来自谁", "模拟材料来源"], ["EVIDENCE:REFIND-PATHS-R0-01", "EVIDENCE:COLLECTION-TIMING-R0-01", "EVIDENCE:COLLECTION-RETURN-R0-01", "CORPUS:E0-TASKS-ALL", "CORPUS:E0-ITEMS-ALL", "EVIDENCE:E0-CONTEXT-NOTES", "EVIDENCE:E0-PENDING"], [pilotPhrase]),
    makeNode("EVIDENCE:REFIND-PATHS-R0-01", "延迟找回路径观察", `${SOURCE}\n\n${summary.delayedReturn.successful}/${summary.delayedReturn.tasks} 找到正确条目。${refindPhrase}；另外 ${summary.delayedReturn.nonDualEntry} 次没有同时经过两者。首次访问入口是 ${visitDistribution(summary.delayedReturn.firstVisitedSurface)}。首次访问与最终打开目标的入口分别记录；这组记录没有逐任务动机说明。`, "L3", "observation", ["延迟找回", "找回路径", "跨入口次数", "双入口分布", "是不是迷路", "为什么两个都看", `${summary.delayedReturn.dualEntry}/${summary.delayedReturn.tasks}`], ["COHORT:R0-PENDING-MEMBER", "CORPUS:E0-DELAYED-TASKS", "CORPUS:E0-DUAL-TASKS", "CORPUS:E0-NONDUAL-TASKS", "TRACE:E0-ORDINARY-SEARCH", "TRACE:E0-ORDINARY-COLLECTION", "BOUNDARY:PILOT-R0-D4-01"], [refindPhrase]),
    makeNode("EVIDENCE:COLLECTION-TIMING-R0-01", "组织时机观察", `${SOURCE}\n\n${summary.membership.ever}/${summary.savedItems} 个条目至少有过一次 membership；${summary.membership.firstInSaveSession} 个在保存 session 首次归类，${summary.membership.firstInLaterSession} 个在后续 session 首次归类。${memberPhrase}，${summary.membership.withoutAtD4} 个没有；各次关系添加与移除可追溯。此窗口未构造“新建额外 Collection”的记录。`, "L3", "observation", ["组织时机", "首次归类", "后来才整理", "归类总数", `${summary.membership.atD4} 个`, `${summary.membership.ever}/${summary.savedItems}`, "membership 汇总"], ["CORPUS:E0-ITEMS-ALL", "CORPUS:E0-EVENTS-ALL", "BOUNDARY:PILOT-R0-D4-01"], [memberPhrase]),
    makeNode("EVIDENCE:COLLECTION-RETURN-R0-01", "组织后回访观察", `${SOURCE}\n\n${new Set(organization.map((task) => task.profileId)).size} 个画像各有 ${organization.length / new Set(organization.map((task) => task.profileId)).size} 个不同的组织后目标，合计 ${summary.organizationReturn.successful}/${summary.organizationReturn.tasks} 完成。首次访问入口为 ${visitDistribution(summary.organizationReturn.firstVisitedSurface, ["Search", "Collections", "Inbox", "Unsorted"])}。任务最终打开原条目；某个条目可以在不同协议任务中再次出现，不能因此算成新的画像。`, "L3", "observation", ["组织后回访", "整理完怎么找回来", "回访入口分布", `${summary.organizationReturn.successful}/${summary.organizationReturn.tasks}`], ["CORPUS:E0-ORGANIZATION-TASKS", "BOUNDARY:PILOT-R0-D4-01"]),
    makeNode("BOUNDARY:PILOT-R0-D4-01", "本次证据边界", `${SOURCE}\n\n这些记录支持检查事件、状态和汇总的一致性。没有真实招募或真实使用观察，没有实际产品工程与可访问性执行回执，没有候选评价或长期结果。画像说明未绑定每次找回；成功找回不能证明过程没有恢复成本，经过两个入口也不能自动解释成迷路。`, "L3", "boundary", ["证据边界", "不能推出什么", "能证明什么", "支持与恢复事件", "缺了什么", "真实用户研究", "动机能确定吗"], ["PILOT:R0-D4-01", "EVIDENCE:E0-CONTEXT-NOTES"], ["成功找回不能证明过程没有恢复成本"]),
    makeNode("COHORT:R0-PENDING-MEMBER", "双状态目标群组", `${SOURCE}\n\n双入口任务中，${cohort.length} 个目标在开始时同时 pending 且有 membership。它们依照状态取交集，并不按好坏或动机分组。\n\n${taskTable(cohort)}\n\n“经过 Unsorted”并不表示目标在那里可见；实际打开入口见各任务最后的事件。`, "L4", "cohort", ["双状态目标", "pending+member", "pending member", "同样状态的其他任务", "双状态群组"], ["TRACE:R0-REFIND-017", "CORPUS:E0-DUAL-TASKS"]),
    makeNode("TRACE:R0-REFIND-017", "Offline-first 具体找回轨迹", taskText(trace), "L5", "trace", ["具体案例", "offline sync 这次找回", "Offline-first 轨迹", "R0-REFIND-017", "先看 Inbox 再看 Unsorted", "实际怎么走的", ...trace.eventIds], ["ITEM:R0-042@D4T17", "RAWSET:NAV-017-01-04", "BOUNDARY:PILOT-R0-D4-01"]),
    makeNode("ITEM:R0-042@D4T17", "R0-042 在 D4T17 的条目状态", `${SOURCE}\n\n${item042.itemId}，${item042.payload.title}：${stateText(trace.asOfStartState)}；Collection 名称 ${collection042.title}。\n\n${JSON.stringify(item042.payload, null, 2)}\n\n其原身份从保存、关系变更到本次找回保持一致。\n\n${corpus.events.filter((event) => event.itemId === item042.itemId).map(eventText).join("\n\n")}`, "L6", "entity_state", ["R0-042", "D4T17", "Offline-first sync notes", "条目当时状态", "pending 又有归属"], ["REL:R0-042:ATLAS@D4T17", "RAW:MEM-042-03", "INFO:SEARCH-IDENTITY-R0"]),
    makeNode("REL:R0-042:ATLAS@D4T17", "R0-042 与 Project Atlas 的当时关系", `${SOURCE}\n\n${membershipEvent.collectionId}（${collection042.title}）属于 ${item042.profileId} 的隔离账号。${membershipEvent.itemId} 在 ${membershipEvent.sessionId} 添加该关系，当前 D4T17 集合为 [${trace.asOfStartState.membershipIds.join(", ")}]。这是原条目的关系，不是另一份内容。\n\n${eventText(membershipEvent)}`, "L6", "relation_state", ["Project Atlas membership", "Atlas 关系", "什么时候加入 Atlas", "关系当时状态"], ["RAW:MEM-042-03", "ITEM:R0-042@D4T17"]),
    makeNode("RAWSET:NAV-017-01-04", "找回任务的有序事件", `${SOURCE}\n\n${trace.taskId} 的完整 ${traceEvents.length} 条事件：\n\n${traceEvents.map(eventText).join("\n\n")}\n\n秒数来自模拟任务时钟；没有参与者思考时间或动机测量。`, "L7", "raw_event_set", ["原始路径", "四条事件", "事件顺序", "Search offline sync", "trace 从哪里来"], ["RECEIPT:R0-PILOT-INTEGRITY", "TRACE:R0-REFIND-017"]),
    makeNode("RAW:MEM-042-03", "R0-042 的 D2 membership 事件", `${SOURCE}\n\n${eventText(membershipEvent)}\n\n前后 payload 使用字段相等检查；此处没有声称获得实际软件或外部签发的 digest 证明。`, "L7", "raw_event", ["RAW:MEM-042-03", "membership 原始事件", "D2 加入", "前后 membership set", "组织关系来源"], ["RECEIPT:R0-PILOT-INTEGRITY", "REL:R0-042:ATLAS@D4T17"]),
    makeNode("RECEIPT:R0-PILOT-INTEGRITY", "E0 材料重放检查", `${SOURCE}\n\n本次投影先重放 ${corpus.events.length} 条构造事件，并检查 ${summary.savedItems} 条目、${summary.plannedTasks} 计划任务、账号隔离、关系前后状态、入口可见性和 D4 快照。检查通过才发布本投影。\n\n该检查证明这组构造材料内部一致；它不是实际阅读清单的工程回执、外部签名或历史日志恢复证明。完整记录仍可直接查阅。`, "L8", "verification_receipt", ["来源回执", "一致性", "protocol", "provenance", "数据可靠吗", "数字怎么核对", "有没有漏事件", "原始数据和汇总一致吗"], ["CORPUS:E0-EVENTS-ALL", "CORPUS:E0-TASKS-ALL", "CORPUS:E0-ITEMS-ALL"]),
    makeNode("EVIDENCE:E0-PENDING", "D4 待处理与再次打开", `${SOURCE}\n\nD4 有 ${summary.pending.atD4} 个 pending 条目。其中 ${summary.pending.reopened} 个保存后再次打开，${summary.pending.notReopened} 个没有。再次打开来自计划任务及独立非计划访问；非计划访问没有计入 ${summary.plannedTasks} 次任务。\n\n再次打开的 ID：${summary.denominatorIds.pendingReopened.join(", ")}。\n\n未再次打开的 ID：${summary.denominatorIds.pendingAtD4.filter((ref) => !summary.denominatorIds.pendingReopened.includes(ref)).join(", ")}。\n\n没有逐条动机说明，未打开不能被自动判为忘记或拖延。`, "L3", "observation", ["待处理条目", "待处理汇总", `${summary.pending.atD4} 个`, `${summary.pending.reopened} 个`, `${summary.pending.notReopened} 个`, "有没有再次打开", "backlog", "积压"], ["CORPUS:E0-ITEMS-ALL", "CORPUS:E0-EVENTS-ALL", "EVIDENCE:E0-CONTEXT-NOTES"]),
    makeNode("EVIDENCE:E0-CONTEXT-NOTES", "全部情境说明", `${SOURCE}\n\n以下 ${corpus.notes.length} 段说明是作者为画像构造的独立情境文本，未绑定某次找回。\n\n${table(["说明", "画像", "文本", "范围"], corpus.notes.map((note) => [note.noteId, note.profileId, note.text, note.limitation]))}`, "L4", "observation", ["情境说明", `${summary.contextNotes.total} 段说明`, "他们自己怎么说", "使用情境记录", "全部情境说明"], ["BOUNDARY:PILOT-R0-D4-01"]),
    makeNode("CORPUS:E0-TASKS-ALL", "全部计划任务及完整路径", `${SOURCE}\n\n共 ${summary.plannedTasks} 个计划任务，协议 ${corpus.metadata.protocolRef}，revision ${corpus.metadata.revisionRef}。每行给出起始状态、完整访问序列及来源 ID。\n\n${taskTable(corpus.tasks)}`, "L4", "cohort", ["全部72任务", "全部 72 任务", "全部72个任务", "全部 72 个任务", "所有计划任务", "任务总账", "任务清单", "全部任务和路径"], corpus.tasks.map((task) => taskNodeRef(task.taskId))),
    makeNode("CORPUS:E0-DELAYED-TASKS", "全部延迟找回任务", `${SOURCE}\n\n${taskTable(delayed)}`, "L4", "cohort", ["全部48任务", "全部 48 任务", "全部延迟任务", "全部延迟找回", "所有延迟找回"], delayed.map((task) => taskNodeRef(task.taskId))),
    makeNode("CORPUS:E0-ORGANIZATION-TASKS", "全部组织后回访任务", `${SOURCE}\n\n${taskTable(organization)}`, "L4", "cohort", ["全部24任务", "全部 24 任务", "全部组织后回访", "所有组织后回访"], organization.map((task) => taskNodeRef(task.taskId))),
    makeNode("CORPUS:E0-DUAL-TASKS", "全部双入口任务", `${SOURCE}\n\n${taskTable(dual)}\n\n这些任务没有任务级动机说明。`, "L4", "cohort", ["全部21次", "全部 21 次", "全部21个", "全部双入口", "所有跨两个入口的案例"], dual.map((task) => taskNodeRef(task.taskId))),
    makeNode("CORPUS:E0-NONDUAL-TASKS", "全部非双入口任务", `${SOURCE}\n\n${taskTable(nonDual)}`, "L4", "cohort", ["另外27次", "另外 27 次", "全部非双入口", "未跨两个入口的案例"], nonDual.map((task) => taskNodeRef(task.taskId))),
    makeNode("CORPUS:E0-ITEMS-ALL", "全部条目与 D4 状态", `${SOURCE}\n\n共 ${summary.savedItems} 个条目。每条保留独立 identity；各账号的同名 Collection 通过完整 ID 区分。\n\n${table(["条目 / 画像", "标题 / URL", "Note / Tag / 来源", "D4 状态", "保存事件"], corpus.items.map((item) => [item.itemId + " / " + item.profileId, item.payload.title + " / " + item.payload.url, item.payload.note + " / " + item.payload.tags.join(", ") + " / " + item.payload.source, stateText(snapshots.get(item.itemId)), corpus.events.find((event) => event.type === "save_item" && event.itemId === item.itemId).eventId]))}`, "L6", "entity_state", ["全部144条目", "全部 144 条目", "全部144个条目", "全部 144 个条目", "所有条目", "条目总账", "完整条目清单"], corpus.items.map((item) => itemNodeRef(item.itemId))),
    makeNode("CORPUS:E0-EVENTS-ALL", "全部 E0 事件来源", `${SOURCE}\n\n以下是按模拟时间排序的 ${corpus.events.length} 个事件；每行显示原事件 ID、类型、账号、session、操作和来源。状态变更显示前后值，payload 在各条目节点及条目总账中完整保存。\n\n${corpus.events.map(eventText).join("\n\n")}`, "L7", "raw_event_set", ["全部原始事件", "所有原始事件", "完整事件总账", "全部事件来源", "所有事件来源", "完整 raw corpus"], ["CORPUS:E0-TASKS-ALL", "CORPUS:E0-ITEMS-ALL", "RECEIPT:R0-PILOT-INTEGRITY"]),
    makeNode("TRACE:E0-ORDINARY-SEARCH", "普通 Search 直接找回案例", `选择规则：在延迟任务中，按任务 ID 排序，取第一个仅含 Search 和打开目标两步的任务。该规则在 A/B 相同。\n\n${taskText(ordinarySearch)}`, "L5", "trace", ["普通Search例子", "普通 Search 例子", "普通Search案例", "普通 Search 案例", "直接使用Search的例子", "直接使用 Search 的例子", "普通例子", "不要最糟的"], [taskNodeRef(ordinarySearch.taskId), itemNodeRef(ordinarySearch.targetItemId)]),
    makeNode("TRACE:E0-ORDINARY-COLLECTION", "普通 Collection 直接找回案例", `选择规则：在延迟任务中，按任务 ID 排序，取第一个仅含 Collection 与打开目标两步的任务。该规则在 A/B 相同。\n\n${taskText(ordinaryCollection)}`, "L5", "trace", ["普通Collection例子", "普通 Collection 例子", "普通Collection案例", "普通 Collection 案例", "直接从Collection找回", "直接从 Collection 找回"], [taskNodeRef(ordinaryCollection.taskId), itemNodeRef(ordinaryCollection.targetItemId)]),
  ];
  for (const task of corpus.tasks.filter((entry) => entry.taskId !== trace.taskId)) {
    nodes.push(makeNode(taskNodeRef(task.taskId), `${task.taskId} 的完整找回记录`, taskText(task), "L5", "trace", [task.taskId, ...task.eventIds], [itemNodeRef(task.targetItemId), "CORPUS:E0-TASKS-ALL"]));
  }
  for (const item of corpus.items.filter((entry) => entry.itemId !== item042.itemId)) {
    const itemEvents = corpus.events.filter((event) => event.itemId === item.itemId);
    nodes.push(makeNode(itemNodeRef(item.itemId), `${item.itemId} 的内容、D4 状态与来源`, `${SOURCE}\n\n${JSON.stringify(item.payload, null, 2)}\n\n${stateText(snapshots.get(item.itemId))}\n\n${itemEvents.map(eventText).join("\n\n")}`, "L6", "entity_state", [item.itemId, item.payload.title, ...itemEvents.filter((event) => event.taskId === null).map((event) => event.eventId)], ["CORPUS:E0-ITEMS-ALL", "INFO:SEARCH-IDENTITY-R0"]));
  }
  const relations = [];
  const existing = new Set();
  for (const node of nodes) for (const target of node.relatedNodeIds) {
    const key = `${node.nodeId}=>${target}`;
    if (!existing.has(key)) {
      existing.add(key);
      relations.push(Object.freeze({ schemaVersion: 1, relationId: `EDGE:E0-v4.2:${node.nodeId}:${target}`, sourceNodeId: node.nodeId, targetNodeId: target, kind: node.kind === "trace" && target.startsWith("ITEM:") ? "same_item_at_time" : node.kind === "cohort" ? "illustrated_by" : node.kind === "verification_receipt" ? "verifies" : "derived_from" }));
    }
  }
  const triggerLead = `四日观察包已可查看。这是为本次产品决策任务新构造的模拟使用记录，不是恢复的历史原始数据。\n\n[[PILOT:R0-D4-01|${pilotPhrase}]]，均成功。[[EVIDENCE:REFIND-PATHS-R0-01|${refindPhrase}]]；[[EVIDENCE:COLLECTION-TIMING-R0-01|${memberPhrase}]]。另有 ${summary.contextNotes.total} 段情境说明，分别涉及稍后处理、状态核对、入口选择和主题回访。\n\n这些记录绑定 ${corpus.metadata.revisionRef}。访问路径没有逐次对应的动机说明，不能仅凭经过两个入口判断使用者迷路。当前没有新候选，也没有修改产品。`;
  return Object.freeze({ summary, nodes: Object.freeze(nodes), relations: Object.freeze(relations), triggerLead, corpusId: corpus.metadata.corpusId, sourceStatement: SOURCE });
}
