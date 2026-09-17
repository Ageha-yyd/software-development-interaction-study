import { createReadingListE0Projection } from "./materials/reading-list-e0-projection-v4.2.mjs";

import type {
  ExperimentScenario,
  InformationNode,
  InformationOperation,
  InformationRelation,
  InformationRole,
  ObjectAnchor,
  ScenarioTurn,
} from "../lib/experiment/types";

const E0_PROJECTION = createReadingListE0Projection();

type NodeAxes = Pick<
  InformationNode,
  | "epistemicDepth"
  | "kind"
  | "temporalStage"
  | "epistemicStatus"
  | "availableFromStage"
  | "scopeTags"
  | "availableOperations"
>;

function axes(
  epistemicDepth: NodeAxes["epistemicDepth"],
  kind: NodeAxes["kind"],
  temporalStage: NodeAxes["temporalStage"],
  epistemicStatus: NodeAxes["epistemicStatus"],
  availableFromStage: NodeAxes["availableFromStage"],
  scopeTags: readonly string[],
  availableOperations: readonly InformationOperation[],
): NodeAxes {
  return Object.freeze({
    epistemicDepth,
    kind,
    temporalStage,
    epistemicStatus,
    availableFromStage,
    scopeTags: Object.freeze([...scopeTags]),
    availableOperations: Object.freeze([...availableOperations]),
  });
}

const NODE_AXES: Readonly<Record<string, NodeAxes>> = Object.freeze({
  "INFO:PRODUCT-GOAL-R0": axes("L0", "goal", "product_history", "stable", "history", ["product", "direction"], ["inspect", "revisit"]),
  "INFO:SAVE-RULES-R0": axes("L1", "constraint", "product_history", "stable", "history", ["capture", "organization"], ["inspect", "compare_history", "revisit"]),
  "INFO:ORTHOGONAL-STATES-R0": axes("L2", "decision", "product_history", "stable", "history", ["processing-state", "organization"], ["inspect", "compare_history", "revisit"]),
  "INFO:SEARCH-IDENTITY-R0": axes("L2", "decision", "product_history", "stable", "history", ["retrieval", "identity"], ["inspect", "compare_history", "revisit"]),
  "INFO:PROTECTED-GUARDS-R0": axes("L1", "constraint", "current_r0", "current", "history", ["guard", "accessibility", "portability"], ["inspect", "verify_provenance", "revisit"]),
  "VERIFY:BASELINE-R0": axes("L8", "verification_receipt", "current_r0", "verified", "history", ["revision", "verification"], ["verify_provenance", "trace_source", "revisit"]),

});

const GROUNDING_PHRASES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "INFO:PRODUCT-GOAL-R0": ["快速保存链接", "可靠找回", "低摩擦保存", "保存首先是捕获"],
  "INFO:SAVE-RULES-R0": ["只提供 URL 即可保存", "保存时仍然只需要 URL", "之后再补", "不会复制出另一条资料"],
  "INFO:ORTHOGONAL-STATES-R0": ["Inbox 表示条目是否仍等待处理", "Unsorted 表示条目当前没有加入任何 Collection", "四种状态组合都合法", "四种组合在数据上都合法"],
  "INFO:SEARCH-IDENTITY-R0": ["同一条资料记录", "同一个 SavedItem", "每份内容只有一个稳定的 SavedItem", "从 Search、Inbox、Unsorted 或 Collection 打开 Offline-first sync notes", "不是各个入口分别保存一份副本"],
  "INFO:PROTECTED-GUARDS-R0": ["页面和导航可以重组", "旧深链接则继续解析到原 SavedItem", "所有变化都有菜单或按钮的等价路径", "都不得退化", "候选改版必须保持的护栏"],
  "VERIFY:BASELINE-R0": ["经过验证的 R0", "当前没有正在评价的候选版本", "R0 场景基线与模拟检查记录"],

});

function node(
  nodeId: string,
  title: string,
  body: string,
  chatAnchorText: string,
  sourceLabel: string,
  relatedNodeIds: readonly string[],
  queryAliases: readonly string[],
  queryResponseLead: string,
  queryResponseNodeIds: readonly string[],
): InformationNode {
  const nodeAxes = NODE_AXES[nodeId];
  if (nodeAxes === undefined) throw new Error(`scenario_node_axes_missing:${nodeId}`);
  const groundingPhrases = GROUNDING_PHRASES[nodeId];
  if (groundingPhrases === undefined) throw new Error(`scenario_grounding_phrases_missing:${nodeId}`);
  return Object.freeze({
    schemaVersion: 1,
    nodeId,
    title,
    body,
    chatAnchorText,
    groundingPhrases: Object.freeze([...groundingPhrases]),
    sourceLabel,
    relatedNodeIds: Object.freeze([...relatedNodeIds]),
    queryAliases: Object.freeze([...queryAliases]),
    queryResponseLead,
    queryResponseNodeIds: Object.freeze([...queryResponseNodeIds]),
    ...nodeAxes,
  });
}

const INFORMATION_NODES = Object.freeze([
  node(
    "INFO:PRODUCT-GOAL-R0",
    "个人阅读清单的稳定目标",
    "用户应能快速保存链接并在以后可靠找回；组织不得阻断保存；URL、Note、Tag、导入数据、移动端、键盘与读屏流程必须受到保护。",
    "快速保存链接",
    "R0 产品目标",
    [],
    ["产品目标", "稳定目标", "阅读清单要解决什么", "不能破坏什么", "现在做到哪了", "这个产品干嘛", "这个产品到底要守住什么", "刚接手", "卡在哪"],
    "当前场景规定 R0 可保存与找回资料，且没有已确定的下一项改版。产品目标是快速保存并可靠找回；下面保留目标、约束和场景基线。",
    ["INFO:PRODUCT-GOAL-R0", "INFO:PROTECTED-GUARDS-R0", "VERIFY:BASELINE-R0"],
  ),
  node(
    "INFO:SAVE-RULES-R0",
    "保存与 Collection 的当前规则",
    "只提供 URL 即可保存，Note、Tag 与 Collection 都可以之后再补。一条资料可以不属于任何 Collection，也可以属于一个或多个；加入 Collection 只增加组织关系，不会复制出另一条资料。",
    "只提供 URL 即可保存",
    "R0 保存与组织规则",
    ["INFO:PRODUCT-GOAL-R0", "INFO:ORTHOGONAL-STATES-R0"],
    ["保存规则", "Collection 规则", "必须先整理吗", "membership", "先存着", "以后再整理", "当下不整理"],
    "只提供 URL 即可保存，Note、Tag 和 Collection 均可稍后补充。加入 Collection 创建的是关系，不会复制条目，也不会自动清除 Inbox。",
    ["INFO:SAVE-RULES-R0", "INFO:ORTHOGONAL-STATES-R0", "INFO:PRODUCT-GOAL-R0"],
  ),
  node(
    "INFO:ORTHOGONAL-STATES-R0",
    "Inbox 与 Unsorted 是正交状态",
    "Inbox 表示条目是否仍等待处理；Unsorted 表示条目当前没有加入任何 Collection。加入 Collection 不会自动清除 Inbox，清除 Inbox 也不会改变 Collection 归属，因此四种状态组合都合法。",
    "Inbox 表示条目是否仍等待处理",
    "R0 Surface 语义",
    ["INFO:SAVE-RULES-R0", "INFO:SEARCH-IDENTITY-R0"],
    ["Inbox", "Unsorted", "正交状态", "四种状态组合", "这两个是不是重复", "有点重", "有什么区别", "迷路"],
    "Inbox 表示是否仍等待处理，Unsorted 表示是否没有 Collection 归属。两个维度独立：归类不会自动清除 Inbox，清除 Inbox 不会创建归属。",
    ["INFO:ORTHOGONAL-STATES-R0", "INFO:SAVE-RULES-R0", "INFO:SEARCH-IDENTITY-R0"],
  ),
  node(
    "INFO:SEARCH-IDENTITY-R0",
    "Search 与跨视图 identity",
    "Search 检索全部现存资料的标题、URL、Note 与 Tag；从 Inbox、Unsorted、Collection 或 Search 打开的都是同一条资料记录，而不是各个入口分别保存一份副本。",
    "同一条资料记录",
    "R0 Search/Retrieval 合同",
    ["INFO:ORTHOGONAL-STATES-R0", "VERIFY:BASELINE-R0"],
    ["Search", "跨视图 identity", "SavedItemId", "副本", "全局找回", "是不是几份", "点进去还是同一个吗", "Search 不就够了"],
    "Search、Inbox、Unsorted 和 Collection 都打开同一个 SavedItem。Search 检索标题、URL、Note 与 Tag，不以处理状态或 Collection 为前提。",
    ["INFO:SEARCH-IDENTITY-R0", "INFO:ORTHOGONAL-STATES-R0", "INFO:PROTECTED-GUARDS-R0"],
  ),
  node(
    "INFO:PROTECTED-GUARDS-R0",
    "候选改版必须保持的护栏",
    "页面和导航可以重组，但只填 URL 的快速保存、跨入口的同一条目身份、内容与组织关系保真、全局找回、旧链接兼容，以及移动端、键盘、焦点和读屏行为都不得退化。",
    "页面和导航可以重组",
    "R0 不变量与验证合同",
    ["INFO:PRODUCT-GOAL-R0", "VERIFY:BASELINE-R0"],
    ["护栏", "不变量", "不能退化", "可访问性", "深链接", "这些别动", "哪些不能改", "别把现在弄坏"],
    "场景规定的保护项包括 URL-only 保存、同一条目身份、全局找回、旧链接、数据往返以及移动端、键盘和读屏关键路径。实际候选需要自己的执行与检查记录。",
    ["INFO:PROTECTED-GUARDS-R0", "INFO:PRODUCT-GOAL-R0", "VERIFY:BASELINE-R0"],
  ),
  node(
    "VERIFY:BASELINE-R0",
    "R0 场景基线与模拟检查记录",
    "当前没有正在评价的候选版本。R0 的四种状态组合、Collection 关系、跨入口同一条目、导入导出和可访问性保护要求属于作者构造的产品前史；这里的模拟检查记录不是实际软件执行证据。",
    "当前没有正在评价的候选版本",
    "R0 当前版本验证",
    ["INFO:SEARCH-IDENTITY-R0", "INFO:PROTECTED-GUARDS-R0"],
    ["验证回执", "R0 基线", "当前 revision", "active candidate", "先别改", "先不动", "当前版本安全吗"],
    "当前没有正在评价的候选版本。这里的 R0 是作者构造前史规定的产品基线；模拟检查记录不证明本实验原型已执行过这些工程或可访问性检查。",
    ["VERIFY:BASELINE-R0", "INFO:PRODUCT-GOAL-R0", "INFO:PROTECTED-GUARDS-R0"],
  ),
  ...E0_PROJECTION.nodes.map((item) => item as InformationNode),
] satisfies readonly InformationNode[]);

function relation(
  relationId: string,
  sourceNodeId: string,
  targetNodeId: string,
  kind: InformationRelation["kind"],
): InformationRelation {
  return Object.freeze({ schemaVersion: 1, relationId, sourceNodeId, targetNodeId, kind });
}

const INFORMATION_RELATIONS = Object.freeze([
  relation("EDGE:GOAL:GUARDS", "INFO:PRODUCT-GOAL-R0", "INFO:PROTECTED-GUARDS-R0", "constrained_by"),
  relation("EDGE:SAVE:ORTHOGONAL", "INFO:SAVE-RULES-R0", "INFO:ORTHOGONAL-STATES-R0", "supports"),
  relation("EDGE:ORTHOGONAL:IDENTITY", "INFO:ORTHOGONAL-STATES-R0", "INFO:SEARCH-IDENTITY-R0", "depends_on"),
  relation("EDGE:VERIFY:R0", "VERIFY:BASELINE-R0", "INFO:PROTECTED-GUARDS-R0", "verifies"),
  ...E0_PROJECTION.relations.map((item) => item as InformationRelation),
] satisfies readonly InformationRelation[]);

function turn(
  turnId: string,
  phase: ScenarioTurn["phase"],
  user: string,
  assistantLead: string,
  informationNodeIds: readonly string[],
  logicalRevealOrdinal: number,
  presentedNodeIds: readonly string[] = informationNodeIds,
): ScenarioTurn {
  return Object.freeze({
    schemaVersion: 1,
    turnId,
    phase,
    user,
    assistantLead,
    informationNodeIds: Object.freeze([...informationNodeIds]),
    presentedNodeIds: Object.freeze([...presentedNodeIds]),
    logicalRevealOrdinal,
  });
}

const TURNS = Object.freeze([
  turn(
    "H01",
    "project_history",
    "我想做一个很轻的个人阅读清单。场景挺普通的：手机上刷到文章时先留住，回电脑以后再慢慢看。\n\n标签、文件夹还是别的我现在都没想清楚。我最怕的是保存之前还得填一堆东西，最后嫌麻烦干脆不存。先做个足够小、真的能让我用起来的版本吧，别一开始就把它做成知识管理系统。",
    "我先把它压成了一条最短路径：从分享菜单或网页里送进一个 URL，系统补标题和来源，给出明确的保存回执，然后这条内容就能在清单里重新打开。\n\n目前只有 URL 是必需的。Note、Tag 和 Collection 都没有被放进保存门槛里；你可以以后补，也可以一直不补。这个版本已经能完整走通保存和重新打开，但我暂时没有把“保存之后应该停在哪里”当成定论——现在为了方便检查，会进入清单页，这可能和你仍在阅读原文的情境冲突。\n\n所以第一轮真正确定下来的只有一件事：[[INFO:PRODUCT-GOAL-R0|保存首先是捕获]]，不是整理。之后从哪里接回、未处理内容集中在哪里，还是开放的。",
    ["INFO:PRODUCT-GOAL-R0"],
    1,
    [],
  ),
  turn(
    "H02",
    "project_history",
    "我刚在手机上连着存了三篇，跳去管理页这一下确实挺打断的。我当时还在看原文，并不想马上处理它。\n\n但也不能存完就消失。我晚上回来的时候，得有个地方能看到今天随手丢进去、还没管过的东西。",
    "我把保存后的行为改了：确认成功后回到原来的阅读任务，不再强制进入管理页；与此同时，新条目会出现在 Inbox，作为“以后还需要处理”的稳定入口。\n\n这里我没有把 Inbox 做成文件夹。它记录的是处理状态：条目仍待处理，或者已经清除。清除 Inbox 不会删除条目。[[INFO:SAVE-RULES-R0|保存时仍然只需要 URL]]，Note、Tag 和 Collection 继续是可选的。\n\n移动分享和浏览器内保存都重新走过了，回执与返回位置现在是一致的。还有一个语义我先没有替你决定：以后把资料放进某个 Collection，是否就应该自动算作“处理完成”。目前这两件事还没有绑定。",
    ["INFO:SAVE-RULES-R0"],
    2,
    [],
  ),
  turn(
    "H03",
    "project_history",
    "先别绑。我现在真用起来以后发现，同一篇 Offline-first sync notes 既跟 Project Atlas 有关，也跟 Weekend Reading 有关。\n\n我不想为了放进两个地方存两份。那样我以后改 Note，还要猜哪份才是真的。Collection 对我来说更像是不同情境里的归组，不应该拥有一份自己的内容副本。",
    "这里我改的是底层关系，不只是把两张重复卡片视觉上合并。\n\n现在[[INFO:SEARCH-IDENTITY-R0|每份内容只有一个稳定的 SavedItem]]。URL、标题、Note、Tag、来源和修改历史都属于它；Collection 保存的只是这个条目与某个主题之间的 membership。于是同一条资料可以同时属于 Project Atlas 和 Weekend Reading，但从两个地方打开的仍是同一个对象。\n\n我验证了一个关键行为：从一个 Collection 修改 Note，再从另一个 Collection 或 Inbox 打开，看到的是同一次修改，而不是两份逐渐分叉的数据。\n\n这也留下了一个以后需要单独处理的边界：导入旧数据或再次保存相同链接时，什么情况可以安全识别为同一条，什么情况必须让人确认。当前这次修改只确立稳定身份和多重归组，没有静默合并来源不清楚的内容。",
    ["INFO:SEARCH-IDENTITY-R0"],
    3,
    [],
  ),
  turn(
    "H04",
    "project_history",
    "用了几天以后 Inbox 开始变长了。我确实想单独看看哪些东西从来没整理过，但不要把“已经放进 Collection”和“我已经处理完了”混成一件事。\n\n我经常先把资料放进一个项目，周末才认真看；也有些东西我已经看完，不想留在 Inbox，但它根本不值得专门分类。这两种情况都很正常。",
    "你举的两个例子正好说明这里是两个维度，而不是同一条进度。\n\n我增加了 Unsorted：它只表示条目当前没有任何 Collection membership。Inbox 继续只表示条目是否仍待处理。把内容加入 Project Atlas 不会自动清除 Inbox；清除 Inbox 也不会凭空给它创建 Collection。\n\n所以 Offline-first sync notes 可以已经属于 Project Atlas、同时仍在 Inbox；另一条临时读完的资料可以已经离开 Inbox、但仍然出现在 Unsorted。[[INFO:ORTHOGONAL-STATES-R0|四种组合在数据上都合法]]。\n\n这次形成的是一个受保护的产品语义：以后可以重新设计两个状态怎么呈现，但不能因为界面看起来更简单，就悄悄把处理进度和主题归属合并。",
    ["INFO:ORTHOGONAL-STATES-R0"],
    4,
    [],
  ),
  turn(
    "H05",
    "project_history",
    "现在入口开始多了以后，我又不想每次找东西都先回忆“当时到底把它放哪儿了”。\n\n很多时候我只记得标题里有 offline，或者记得自己在 Note 里写过一句话。Search 应该在这些结构之上，而不是某个 Collection 里面的另一个小搜索框。",
    "我把 Search 做成了全局入口，覆盖现存条目的标题、URL、Note 和 Tag，不依赖它是否仍在 Inbox，也不依赖它属于哪个 Collection。\n\nSearch 本身不会成为第五份内容仓库。结果仍然指向原来的 SavedItem，所以[[INFO:SEARCH-IDENTITY-R0|从 Search、Inbox、Unsorted 或 Collection 打开 Offline-first sync notes]]，对象身份、内容和关系完全一致。\n\n我还分别检查了几种状态：仍待处理但已经归类、已经处理但没有归类、属于多个 Collection，以及只通过 Search 找回。它们都不需要先经过某个“正确页面”。\n\n现在可以确定的是，找回不应要求人先记住产品结构；至于不同入口在真实使用中各自承担什么工作，目前还没有行为证据。",
    ["INFO:SEARCH-IDENTITY-R0"],
    5,
    [],
  ),
  turn(
    "H06",
    "project_history",
    "还有个我不太敢拖到最后的问题：我旧工具里已经有几百条资料，里面有 Tag、来源和一些分组。如果导进来以后只剩一堆平的链接，那这个产品对我其实没有迁移价值。\n\n另外我以前发出去过一些条目的链接。以后就算我们重组页面，也不能让这些链接突然失效；真保不住的话，至少明确告诉我发生了什么，别静默改。",
    "我先用副本做了迁移演练，没有直接写入当前资料。第一次演练确实暴露了两个问题：部分来源信息没有跟着条目进入新结构；一个属于多个分组的条目只恢复了第一条 membership。\n\n这两个问题已经修正。现在导入和再次导出会核对 URL、标题、Note、Tag、来源以及全部 Collection 关系；无法唯一对应的内容会保留为待确认项，不会被猜测性合并。[[INFO:PROTECTED-GUARDS-R0|旧深链接则继续解析到原 SavedItem]]；如果入口结构已经变化，会经过明确的兼容跳转，而不是落到一个看似正常但语义不同的页面。\n\n这轮把数据往返、来源保留和旧链接连续性变成了产品约束。它们不是“迁移工具以后再补”的附属功能，因为一旦失真，前面建立的稳定条目身份也就不可信了。",
    ["INFO:PROTECTED-GUARDS-R0"],
    6,
    [],
  ),
  turn(
    "H07",
    "project_history",
    "我刚又只用键盘走了一遍。鼠标点起来没什么问题，但焦点从编辑框出来以后跳得有点奇怪；手机窄屏上，有些状态也得来回展开才看得明白。\n\n还有，拖放对我可以是快捷方式，但不能是唯一方式。读屏或者键盘用户不能因为我们想让界面更顺手，反而失去整理和撤销的路径。",
    "这次我没有把问题处理成“再加几个提示”。我把关键操作重新走了一遍：保存、清除 Inbox、加入或移出 Collection、全局 Search、查看变更以及撤销。\n\n窄屏下先保留条目身份和主要状态，次要信息按需展开；键盘操作完成后，焦点会回到刚刚发生变化的对象，而不是页面顶部；读屏顺序会先说明对象，再说明当前状态与可执行动作。拖放仍可使用，但[[INFO:PROTECTED-GUARDS-R0|所有变化都有菜单或按钮的等价路径]]，并在提交后给出明确反馈。\n\n我也把这类检查放进了回归门槛：以后任何候选即使改善了主要指标，只要让移动端、键盘或读屏的关键任务出现阻断、不可恢复的语义错误，或者明显增加相同任务的操作与时间成本，就不能被当成可接受版本。",
    ["INFO:PROTECTED-GUARDS-R0","VERIFY:BASELINE-R0"],
    7,
    [],
  ),
  turn(
    "S01",
    "baseline_summary",
    "我先确认一下我现在对它的理解。\n\n保存只是先把东西留下，不要求我当场整理；Inbox 讲的是还要不要处理，Unsorted 讲的是有没有 Collection；Collection 只是同一条资料和不同主题的关系；Search 可以绕过这些入口直接找原条目。所以归类不等于处理完成，清掉 Inbox 也不等于删除。\n\n如果这层理解没问题，我想先把它当成一个稳定版本，不要因为我们又想到几个功能就继续往上堆。不过你得告诉我：哪些已经证实了，哪些还只是我们觉得合理。",
    "你的理解与这份构造前史规定的 R0 一致：保存不要求组织；Inbox 与 Collection 独立；各入口打开同一条目，Search 覆盖全部条目。\n\n前史中的实现与检查是实验情境的一部分，不是本原型已完成实际工程或可访问性验证的证据。后续新增的每个候选仍需绑定自己的版本、实际操作及有效检查。\n\n当前没有正在实施的候选，也没有已经确定但未执行的改版；四日材料仅提供这组作者构造的观察记录，由你决定接下来提出什么问题。",
    ["INFO:PRODUCT-GOAL-R0","INFO:SAVE-RULES-R0","INFO:ORTHOGONAL-STATES-R0","INFO:SEARCH-IDENTITY-R0","INFO:PROTECTED-GUARDS-R0","VERIFY:BASELINE-R0"],
    8,
    [],
  ),
  turn(
    "T01",
    "trigger",
    "好，那就冻结 R0，加载这次构造的四日模拟材料；先不加入候选改版。\n\n行为记录和他们自己说的原因分开留着吧。我不想看到一次来回访问，就被系统直接写成“迷路”。",
    E0_PROJECTION.triggerLead,
    ["PILOT:R0-D4-01","EVIDENCE:REFIND-PATHS-R0-01","EVIDENCE:COLLECTION-TIMING-R0-01","EVIDENCE:COLLECTION-RETURN-R0-01","BOUNDARY:PILOT-R0-D4-01"],
    9,
    [],
  ),
] satisfies readonly ScenarioTurn[]);

function anchor(
  objectRef: string,
  nodeId: string,
  label: string,
  role: InformationRole,
  logicalRevealOrdinal: number,
): ObjectAnchor {
  return Object.freeze({ schemaVersion: 1, objectRef, nodeId, label, role, logicalRevealOrdinal });
}

const OBJECT_ANCHORS = Object.freeze([
  anchor("CONCEPT:PRODUCT-GOAL-R0", "INFO:PRODUCT-GOAL-R0", "个人阅读清单的稳定目标", "resource", 1),
  anchor("DECISION:SAVE-OPTIONAL-R0", "INFO:SAVE-RULES-R0", "保存与 Collection 的当前规则", "constraint", 2),
  anchor("DECISION:ORTHOGONAL-STATES-R0", "INFO:ORTHOGONAL-STATES-R0", "Inbox 与 Unsorted 是正交状态", "constraint", 4),
  anchor("DECISION:SEARCH-IDENTITY-R0", "INFO:SEARCH-IDENTITY-R0", "Search 与跨视图 identity", "constraint", 3),
  anchor("CONSTRAINT:PROTECTED-GUARDS-R0", "INFO:PROTECTED-GUARDS-R0", "候选改版必须保持的护栏", "constraint", 6),
  anchor("VERIFY:BASELINE-R0", "VERIFY:BASELINE-R0", "R0 场景基线与模拟检查记录", "verification", 7),
  ...E0_PROJECTION.nodes.map((item) => anchor(
    item.nodeId,
    item.nodeId,
    item.title,
    item.kind === "verification_receipt" ? "verification" : item.kind === "boundary" ? "constraint" : "evidence",
    9,
  )),
] satisfies readonly ObjectAnchor[]);

export const SOFTWARE_PRODUCT_DEVELOPMENT_V1 = Object.freeze({
  schemaVersion: 1,
  scenarioId: "software-product-development-v1",
  episodeId: "EPISODE-01-SUR-ORG",
  informationSpaceVersion: "v4.2-e0",
  subjectRevisionRef: "R0-reading-list-e0-v4.2",
  title: "软件产品开发实验基座",
  shortTitle: "Reading List · Episode 01",
  description: "上面是作者为本研究构造的产品开发前史，描述产品如何成为 R0；不是真实项目的执行记录。现在由你接手：请用自己的话说明当前状态，或指出尚未弄清楚的地方。",
  baselineOrdinal: 8,
  triggerOrdinal: 9,
  baselineActionLabel: "冻结 R0，查看四日模拟记录",
  intentPrompt: "看完这些，你现在最想先弄清楚或试一试什么？",
  intentPlaceholder: "像平时聊天一样说就行，例如：我先不改导航，想弄清楚他们为什么会来回看。",
  completionMessage: "这轮对话已经保存。你的原话不会被自动改写成最终方案，也不代表候选改版已经通过。",
  informationNodes: INFORMATION_NODES,
  informationRelations: INFORMATION_RELATIONS,
  frontierRoots: Object.freeze({
    history: Object.freeze([
      "INFO:PRODUCT-GOAL-R0",
      "INFO:SAVE-RULES-R0",
      "INFO:ORTHOGONAL-STATES-R0",
      "INFO:SEARCH-IDENTITY-R0",
      "INFO:PROTECTED-GUARDS-R0",
      "VERIFY:BASELINE-R0",
    ]),
    e0: Object.freeze([
      "PILOT:R0-D4-01",
      "EVIDENCE:REFIND-PATHS-R0-01",
      "EVIDENCE:COLLECTION-TIMING-R0-01",
      "EVIDENCE:COLLECTION-RETURN-R0-01",
      "BOUNDARY:PILOT-R0-D4-01",
    ]),
  }),
  turns: TURNS,
  objectAnchors: OBJECT_ANCHORS,
} satisfies ExperimentScenario);
