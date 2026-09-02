# 软件产品开发实验整体剧本信息架构 v4

状态：`architecture_reopened_for_output_contingent_v4_experience_contract_added_content_packets_not_frozen_runtime_not_aligned`

适用场景：`software-product-development-v1`

产品基底：个人阅读清单 Web App

研究领域：单一软件产品开发领域

## 1. 本文冻结什么

本文是实验体验的信息架构上游事实源。v4 冻结的目标是产品世界、共同建构的项目前史、共享信息图、语义迁移语法、exact-state 结果包、跨阶段关系和合法终态谓词，而不是四条参与者路线。完整 raw corpus、pair-state packet 与 runtime participant copy 仍明确未冻结，不能把本稿误称为 participant package 或 runtime。

本文不重新设计论文中的 Claim、RQ 或统计模型，也不加入跨域任务。当前样本只负责把软件产品开发领域做深、做厚、做成真正的 `state -> evidence -> judgment -> state` 信息空间。

当前运行时中的六段历史、一次 Trigger、一个固定候选和一次结果只能视为早期工程 witness，不是本架构的边界。v2 中已经写出的 Hub、Focus、Context 与 R0 数值继续作为可重索引的 authoring packet library；其旧 family 路线、same-family parent 限制和两窗口终局不是 v4 的规范性拓扑。运行时只有覆盖本文后，才可称为 v4 场景实现。

## 2. 参与者应当经历什么

参与者接手的不是一道功能实现题，而是一个已经可用、正在增长、方向尚未确定的软件产品：

> 一个个人阅读清单已经能快速保存并可靠找回内容。随着移动快速保存形成的短生命周期积压与长期资料积累同时增长，现有入口、状态和组织方式开始承担不同工作；团队需要根据逐步出现的证据决定下一步方向，但当前材料不能预先指定应改变哪一部分。

参与者是产品负责人，负责：

- 理解历史决定、当前产品状态和证据边界；
- 判断当前最值得解决的问题和优先服务的使用情境；
- 形成、修订、组合、撤回或暂缓产品方向；
- 判断新证据是否改变了当前决定；
- 接受一个与证据、状态和受保护约束一致的终态。

Machine 负责：

- 阅读项目和冻结材料；
- 把自然语言产品意图落实为候选 revision；
- 完成实现、排错、测试和技术验证；
- 接收由独立、condition-blind evaluator 发布的 participant-safe 新证据，并据此继续协作；
- 诚实报告未知、证据边界和失效状态。

Machine 可以是模型、脚本、真人或其他执行端。它的身份不是本场景的研究变量。

Candidate-use evidence 不由 Machine 自己生成。独立 evaluator 只读取 condition-neutral 产品 state，publication gateway 在 reveal 前重新检查 revision、frontier、guard 和 verification；A/B 与 Machine 在同一逻辑时点只收到同一 participant-safe projection。

参与者实际经历必须满足：高层目标保持稳定；新输出先改变当前可辩护的下一步集合或相对显著性；参与者随后可以进行零次或多次 Probe，再 Commit 一个语义迁移并 Verify；Verify 或外部评价产生的新输出进入下一 epoch。Hub、Focus、Context 和 Evidence-first 都不能成为开场可见菜单，也不能与终局一一对应。

### 2.1 Baseline 是共同项目历史，不是一条交接摘要

R0 必须从项目最初的模糊目标开始，经过至少六组有来有回的真实对话逐步形成。当前 participant-facing witness 使用七组既有开发对话形成轻量捕获、保存后返回、稳定条目身份、多重归组、Inbox/Unsorted 正交语义、全局 Search、数据迁移与旧链接和可访问性；随后由当前参与者现场完成 H08 的不计时接管，并在 H09 明确授权 R0 现状观察后才发布共同 Trigger。每一项 guard 都必须能追到一次实际结果、一次用户纠正或一次明确取舍，不能由 Agent 在开场一次声明。

```text
CanonicalProjectHistory = <
  orderedUserAgentExchanges,
  revisionAfterEachExchange,
  evidenceSeenAtThatTime,
  participantStatedRationales,
  decisionsAndRejectedSimplifications,
  unresolvedQuestions,
  protectedConstraints
>
```

共同前史在 A/B 中具有相同 Chat 文本、顺序、产品状态与底层对象；B 只能获得附加的对象访问路径，不能得到额外历史事实。前史阅读、当前参与者的 H08 接管和 Trigger 前的自由定向不计入主要 OCFT。H08 必须由当前参与者现场用自己的话完成，不能从历史角色曾经说过相似内容而推定通过；Agent 可自然纠正或回答，直到 baseline predicate 成立。第一个 scored Trigger 只能在 R0、前史和当前 guard 均通过该共同基础检查后稳定发布；检查不要求复述研究者术语，也不以 Chat turn 数作为资格标准。

最后一轮 R0 摘要只是此前共同经历的索引。若删除前面的对话后，摘要仍足以恢复全部语义、理由与边界，就说明 baseline 又退化成一次性信息倾倒。

### 2.2 最近输出改变显著性，但不会清空历史

```text
VisibleTaskContext_t = <
  stableGoal,
  currentProductState,
  witnessedHistory,
  currentEpistemicState,
  participantWorkingSet,
  latestStableOutput,
  protectedConstraints
>

RecentOutputDelta_t = <
  newlyMentionedObjectRefs,
  updatedObjectRefs,
  reopenedObjectRefs,
  invalidatedOrStaleObjectRefs,
  stillUnansweredQuestions
>
```

`latestStableOutput` 是局部显著性触发器，不是完整 task state，更不是下一步命令。Agent 每次发布结果时都要自然说明：本轮新发生了什么；它更新、挑战或重新打开了哪些旧对象/判断；哪些旧问题仍未回答。旧证据、参与者理由、已拒绝的简化和版本关系继续存在，后续可以回访、比较或重新解释。

同一最新输出必须至少保留两个在当前证据下都可辩护的 semantic successor，才可以作为高探索性 authoring witness。参与者可以只追其中一条；未追的线变为 dormant，而不是被删除。后续输出可使 dormant line 再次显著，例如 Hub 结果里的 Search-first 边界可以重新打开长期情境，Focus 结果里的“主题组织未改善”也可以重新打开 Collection/Context。

### 2.3 记录人的表达线，不宣称读取人的内在注意

```text
ParticipantMotiveLine = <
  stableGoal,
  participantStatedRationales,
  foregroundedQuestions,
  dormantQuestions,
  reopenedQuestions,
  acceptedConstraints,
  rejectedHypotheses
>
```

只有参与者在语言中明确表达的理由，或他明确提出的 task-relevant semantic request，才进入上述 ledger。选择对象、停留、滚动或点击只能证明一次交互发生，不能被解释成“更在意”“已经理解”或任何潜在认知状态。Agent 可以复述“你刚才说 X 是因为 Y”，但不能用“你显然更关心……”替参与者生成动机。

代表性样本必须让参与者在相当比例的 scored turns 中真正选择当前可辩护的 Probe、reframe、request-evidence、Commit 或 revisit 边；authoring audit 以 40%–60% 为目标范围。它只是防止剧本退化成连续的“继续/运行下一步”，不是参与者纳入标准、实验自变量或新的统计 estimand。实现、测试、确认范围等 directed turns 可以存在，不要求每个 Chat turn 都分岔。

### 2.4 Agent 输出要深厚，但采用渐进揭示

Agent 的中立不是少说话。一个自然回复可以同时包含顶层事实、与旧状态的关系和证据边界，也可以提及两到四个新的或更新的稳定对象；但 concrete trace、raw event、receipt 和完整 lineage 只在参与者沿相应边 Probe 后展开。深厚来自可继续纵向追溯和横向连接，不来自在第一条回复中摊平全部层级。

```text
CompositeOutput_t = <
  headline,
  independentlyVerifiableUpdates[],
  linksToPriorState[],
  boundary,
  availableButNotYetRevealedNeighborhood
>
```

回复里的多个更新不等于多个独立样本。最小编码粒度是一次可独立验证、能够改变任务判断或可执行状态的 semantic transition，不是一段文字、一张卡或一次点击。

### 2.5 同一中立输出要能支持不同的代表性可能轨迹

参与者审阅样本采用“共同前史 + 同一中立 Trigger + 多个彼此隔离的可能接续 witness”，而不是“一个人看到三个方向按钮”。这些是作者构造的可达性与自然度样本，不是已经观察到的 participant trajectory；当前 witness 至少包含：

- 注意 `21/48` 跨入口行为，追到 Offline-first trace、联动候选和 batch scope exception，随后因 Search-first 边界转向长期情境；
- 注意“先保存、以后处理”的说明，先观察 backlog，再形成无提醒的手动 Focus，并被“完成不等于归档”例外重新导向状态语义；
- 不把四日行为翻译成功能，先追 R0 的长期组织变化与反例，最终保留现状并写下 reopen 条件。

这些只是图可达性的自然 witness，不是预设的三个 terminal。每条都必须允许修订、停止、回到 verified R0、跨到另一条 dormant line 或形成 authoring packet 中尚未列名但仍在 product manifold 内的新 request。

## 3. 稳定产品方向与不可破坏边界

### 3.1 稳定方向 `GOAL:G0`

> 用户能够快速保存链接，并在以后可靠找回；组织能力不得阻断保存；随着资料增长，产品可以支持更丰富的处理和组织，但不能以数据、身份、可访问性或可恢复性退化为代价。

### 3.2 受保护约束

| ID | 约束 |
| --- | --- |
| `GUARD:CAPTURE-OPTIONAL-ORG` | 只提供 URL 即可保存，组织字段始终可选。 |
| `GUARD:CANONICAL-IDENTITY` | 所有入口打开同一个 `SavedItemId`，不制造页面副本。 |
| `GUARD:ORTHOGONAL-STATE` | Inbox 的 `pending/cleared` 与 Collection membership 相互独立。 |
| `GUARD:PAYLOAD` | URL、Title、Note、Tag 和来源信息不得被静默改写或丢失。 |
| `GUARD:MULTI-MEMBERSHIP` | 一个 SavedItem 可以属于零个、一个或多个 Collection。 |
| `GUARD:GLOBAL-SEARCH` | Search 覆盖全部现存 SavedItem，并返回 canonical identity。 |
| `GUARD:PORTABILITY` | Import/export 保持 payload、membership 和来源往返保真。 |
| `GUARD:ROUTE-CONTINUITY` | 旧深链接必须继续解析或得到明确兼容重定向。 |
| `GUARD:ACCESSIBILITY` | 关键任务零阻断、零不可逆语义错误、焦点目标确定且可解释；mobile、keyboard、screen-reader 三个 protocol 分别计算 `candidate median active actions / matched-R0 median` 与 `candidate median active time / matched-R0 median`，六个 ratio 均须 `<=1.20`。Ratio 用未四舍五入值判定，participant-facing 报告按 half-up 保留两位；阈值内的额外成本仍作为产品权衡，任一越界则 verification 不能 current。 |
| `GUARD:REVERSIBILITY` | 批量、自动或结构性变化必须可预览、可撤销并保留 provenance。 |

这些约束限制候选，却不规定界面形态和产品答案。

## 4. 产品世界的横向范围

### 4.1 利益相关者

| ID | 稳定需要 | 与其他需要的张力 |
| --- | --- | --- |
| `STK:QUICK-CAPTURE` | 手机或扩展中立即保存并回到原任务 | 与保存时结构化输入冲突 |
| `STK:DELAYED-READER` | 稍后处理尚未阅读或尚未判断的条目 | 与长期资料库语义冲突 |
| `STK:KNOWN-ITEM-REFINDER` | 用记得的标题、来源或时间重新找到条目 | 与复杂导航和状态模型冲突 |
| `STK:THEME-BROWSER` | 通过主题集合重新进入一组资料 | 与 Search-first 简化冲突 |
| `STK:MULTICONTEXT-ORGANIZER` | 多上下文归组、Note、Tag 和批量整理 | 与轻量使用和移动密度冲突 |
| `STK:ACCESSIBILITY` | 稳定、可预测、低歧义的导航和状态表达 | 与高密度筛选器和拖放冲突 |
| `STK:DATA-OWNER` | 导入、导出、恢复和来源可追溯 | 与静默合并和自动重写冲突 |
| `STK:MAINTAINER` | schema、Search、同步和 route 可维护 | 与重复语义和特殊分支冲突 |

这些 stakeholder 是产品需求中的稳定角色，不是根据试用行为推断出的用户动机。

### 4.2 产品模块

| ID | 模块 | 当前职责 | 在本剧本中的地位 |
| --- | --- | --- | --- |
| `MOD:CAPTURE` | Capture | URL、扩展、移动分享、批量导入 | 保护为主，可因候选被重新打开 |
| `MOD:IDENTITY` | Item identity | SavedItemId、payload、来源 | 受保护依赖，可因合并/去重被重新打开 |
| `MOD:PROCESSING` | Processing state | Inbox pending/cleared | 可探索 |
| `MOD:SURFACE` | Saved surfaces | Inbox、Unsorted、列表投影与状态呈现 | 可探索，并依赖 Processing 与 Organization |
| `MOD:ORGANIZATION` | Organization | Collection 与 membership | 可探索 |
| `MOD:RETRIEVAL` | Retrieval | Search、最近访问、已知项找回 | 可探索但必须保持全局找回 |
| `MOD:NAVIGATION` | Navigation | 一级入口、route、深链接 | 候选的横向依赖 |
| `MOD:READING-CONTEXT` | Reading context | R0 已有 Note、Tag 和来源上下文 | 所有方向均可见；只有新增 relation、saved view 或 compare 才属于 candidate delta |
| `MOD:MAINTENANCE` | Maintenance | duplicate、dead link、undo、restore | 在批量或关系化候选中展开 |
| `MOD:DEVICE-DATA` | Device/data | 移动、离线、同步、导入导出 | 保护和边界证据 |
| `MOD:ACCESSIBILITY` | Accessibility | 键盘、焦点、读屏、窄屏 | 所有可见变化的横切 guard |

### 4.3 核心产品张力

| ID | 两端 |
| --- | --- |
| `TENSION:FRICTION-STRUCTURE` | 零摩擦捕获 ↔ 结构化信息 |
| `TENSION:QUEUE-LIBRARY` | 短期处理队列 ↔ 长期资料库 |
| `TENSION:UNIFIED-DISTINCT` | 统一入口 ↔ 清晰的独立语义 |
| `TENSION:AUTOMATION-CONTROL` | 自动帮助 ↔ 可预测、可撤销 |
| `TENSION:RICHNESS-ACCESS` | 信息丰富度 ↔ 移动和可访问性负担 |
| `TENSION:GROWTH-TRUST` | 激活与使用增长 ↔ 数据和长期信任 |

## 5. 信息空间的四个轴

本剧本不是一棵页面树，而是四轴相交的版本化信息图。

### 5.1 纵向语义层级

| 层 | 内容 | 典型对象 |
| --- | --- | --- |
| `L0` | 稳定方向 | Goal |
| `L1` | stakeholder、job 与 guard | Stakeholder、Constraint |
| `L2` | 产品范围与版本索引 | Module、Revision、Decision summary |
| `L3` | 当前语义主张或信息包 | Observation、Hypothesis、Intent、Candidate、EvidencePack、Boundary |
| `L4` | scope、cohort、subgroup 或 affected-module 分解 | Cohort、Subgroup、Dependency group |
| `L5` | concrete case、delta、exception 或 timeline | Trace、Timeline、SemanticDelta、Exception |
| `L6` | entity as-of state 与有版本关系 | SavedItem state、Membership、Route relation |
| `L7` | raw event、source fragment 与操作事实 | RawEvent、TranscriptFragment、Diff fact |
| `L8` | provenance、protocol 与验证回执 | SourceReceipt、ProtocolReceipt、VerificationReceipt |

每个对象只有一个 primary `epistemicDepth`，并另带独立的 `temporalStage`。历史 Decision 与当前 Decision 可以处于同一纵向层，但属于不同时间坐标；Verification 一律作为来源/回执位于 `L8`。任何顶层摘要都只能成为下一层的索引，不能一次性压平这些层级。`L0-L8` 是整个 trial 在已授权阶段中的累计可达深度，不要求同一时刻全部可见，更不授权预注册 future object。

### 5.2 横向范围

参与者可以横向穿越：

- 不同 stakeholder；
- 不同产品模块；
- 行为、定性、支持、可访问性和工程证据；
- 相互竞争的解释和候选方向；
- 同一 SavedItem 在不同 route、时间和 membership 中的状态；
- 当前结果与历史决定、受保护约束之间的关系。

### 5.3 `Epoch -> Frontier -> Trigger` 时间模型

```text
Epoch = <
  epochRef,
  currentProductState,
  currentEpistemicState,
  trigger,
  frontier,
  publishedObjectRefs,
  openUnknowns,
  currentEvidenceByState,
  transitionSupport,
  evaluationBudgetState
>

Trigger = <
  outputRef,
  newlyVisibleFacts,
  newlyVisibleRelations,
  reopenedUnknowns,
  invalidatedEvidenceRefs,
  openedTransitions,
  closedTransitions,
  reweightedTransitions
>

Frontier = <
  exactProductStateDigest,
  exactVisibleSnapshotDigest,
  availableProbeEdges,
  eligibleCommitEdges,
  currentGuardState,
  packetEligibility
>
```

一个局部 episode 从新输出成为 Trigger 开始。参与者先 Orient，可零次或多次沿当前局部邻域 Probe；当证据足够时 Commit 一个语义迁移并 Verify。Verify 或独立 evaluator 发布的 state-contingent output 生成下一 Frontier：

```text
Orient -> Probe* -> Commit -> Verify -> state-contingent output -> next Trigger
             ^                                                |
             |------ revisit / compare / reinterpret ----------|
```

v4 的代表性完整轨迹在共同 `E0` 后最多有三个新的 condition-neutral output epoch：`O1`、`O2`、`O3`。每个 epoch 只发布与当时 exact state 或 scoped evidence request 唯一匹配的 sealed packet；参与者如何分配这些 epoch 由先前输出后的真实决定决定。固定的是 session horizon、packet manifold 和揭示条件，不是必须出现的产品路线、Probe 数或 Chat turn 数。

产品状态可以回到 R0，但 epistemic state 不回滚：已经看到的证据、被否定的假设、比较关系和旧 revision 继续存在并可被回访。提前停止、撤回和技术失败仍单独编码，不为凑够 epoch 强迫参与者继续。

### 5.4 共享机会图与候选迁移分布

每个 canonical frontier 冻结的是当时可支持的语义迁移集合 `TransitionSupport(F_k)`，不是四个按钮或终局。语义迁移可以是 Acquire、Disambiguate、Compare、Validate、Constrain、Substitute、Reclassify、Compose、Revise、Rollback、Request-evidence、Defer 或 Verify。

正式实验前，可以按 EETF 提出的资格化方法让独立预试参与者看到相同的 `product state + visible output + goal`，用开放式回答说明下一步；盲编码后得到 `D_pre(F_k)=P(e_next | S_k,O_k,G,population_spec)`、NTE 与 top-choice concentration。它们用于确认 frontier 是否真的具有群体层面的下一步分散性，不向参与者、Machine 或 endpoint validator 公开，也不替参与者选择方向。NTE 不是 CHI_v6 已有 RQ/SAP 的既定变量；除非论文与 SAP 另行明确绑定，它只能作为场景资格化或探索性 moderator。只有 exact canonical snapshot 能继承其预试分布，任意临时状态不能冒领。

canonical `F_k@subject` 只表示 Trigger 首次稳定可见时的 exact snapshot。每次 Probe reveal、working-set 变化或 freshness 更新都创建新的 derived frontier `F_k@subject#p_n`，其 `exactVisibleSnapshotDigest`、available edges 与 eligible commits 重新计算；derived frontier 不继承 canonical `D_pre/NTE`，只能作为 realized exploratory path 记录。它可以继续 Probe，但不能用自环假装可见状态没有改变。

完整信息图不是 DAG：Probe 可以回到历史决定或旧证据；两个不同方向可以汇合为同一 semantic state；新输出可以打开跨模块 transition；discard 或 rollback 后可以从已验证 safe state 形成另一方向。rollback/rebase 后形成的是更晚 epoch 的 `ProductState=R0 + retained EpistemicState` frontier，绝不重放初始 E0 或冒领初始 F0 的 NTE。未来 packet 在对应 Commit 和 Verify 前仍必须逻辑上不可寻址。

## 6. 对象与关系合同

### 6.1 可对象化单位

一个信息单位只有同时具备稳定身份、明确边界、独立可指代性、可检查状态、来源和后续用途时，才可成为对象。单个数字、表格单元、样式标签和隐藏评分不是对象。

```text
InformationObject = <
  stableRef,
  semanticType,
  title,
  summary,
  scope,
  revision,
  provenance,
  freshness,
  relations[],
  revealPrerequisites
>
```

### 6.2 关系类型

| Relation | 含义 |
| --- | --- |
| `derived_from` | observation 来自哪组 trace、protocol 或原始事件 |
| `illustrated_by` | 非穷尽的代表性实例；不能替代完整 provenance/reconciliation |
| `concerns` | evidence、unknown 或 candidate 涉及哪个 stakeholder/module |
| `constrains` | guard 或 dependency 限制 candidate |
| `constrained_by` | `constrains` 的显式 inverse；candidate/revision 指回具体 guard 或 dependency |
| `supports` | evidence 与某 hypothesis 一致，但不等于推荐 |
| `challenges` | evidence 暴露 hypothesis 的反例或边界 |
| `conflicts_with` | 两个需要、方向或结果形成真实取舍 |
| `depends_on` | 当前判断或验证依赖另一状态 |
| `same_item_at_time` | trace 指向某个时间点的同一 SavedItem |
| `same_item_over_time` | timeline 把多个有序时间点绑定到同一 canonical SavedItem；每个 as-of state 仍可单独下钻 |
| `membership_at_time` | item 与 Collection 的有版本关系 |
| `answers` | 已发布 observation 在其冻结 scope 内回答哪个 EvidenceRequest；不授权邻近问题或 future candidate 结果 |
| `reconciles` | receipt 证明 trace/raw events 已包含在指定 aggregate 与 denominator 中且未重复计数 |
| `verified_by` | object、revision 或 guard 指向验证它的 Verification/Receipt |
| `verifies` | Verification/Receipt 指向它所验证的 object、revision 或 guard |
| `invalidates` | 新写入使旧 evidence/verification 不再 current |
| `invalidates_for_branch` | 旧 evidence 对父 revision 仍可用，但因 read/write-set 相交而不能用于新 branch |
| `reopens` | 新信息使已接受模块重新成为未决问题 |
| `revises` | 新 candidate 从哪个先前 candidate 演化 |
| `rolls_back_to` | 当前状态回到哪个已验证 ancestor |
| `authorizes` | participant decision 授权某 revision/request 进入下一 protocol |
| `rejects` | participant 拒绝或丢弃未晋升 candidate，不移动 current pointer |
| `compares_with` | 两个候选、cohort 或状态可以并列检查 |
| `supersedes` | 新判断取代旧判断，但不删除历史事实 |

`supports` 和 `challenges` 只表达可追溯关系，不能合成为产品方向分数。

### 6.3 Participant-visible 字段清单

| 类型 | 最低可见字段 | 默认下钻 |
| --- | --- | --- |
| Goal/Stakeholder | 当前需要、适用情境、关联 guard | 历史决定、冲突需要 |
| Decision | 当时决定、理由、revision、保留约束 | 原始 exchange、delta、verification |
| ProductState/Revision | 当前行为、affected modules、current/stale | semantic delta、parents、read/write dependencies |
| EvidencePack | observation、population、protocol scope、boundary、freshness | cohort、trace、source/provenance |
| Cohort | 冻结分组定义、denominator、aggregate | concrete trace、counterexample |
| Trace/Timeline | 起始状态、事件序列、target、outcome | as-of item、route 和 membership relation |
| Unknown/Hypothesis | 未知内容、竞争解释、证据需求 | supporting/challenging evidence |
| Candidate | participant intent、目标情境、实际 delta、保留约束、风险 | affected module、verification、candidate evidence |
| Verification | subject revision、检查范围、currentness、失败边界 | individual guard receipts |
| Decision/Terminal | disposition、证据依据、接受的权衡、deferred unknown、reopen condition | current state 与历史 alternative |

Hypothesis 只有在 participant 或 Machine 的共同 Chat 中实际表达后才能成为可指代对象；B 不得预先创建假设卡来暗示方向。A 不需要知道 `stableRef`，用自然语言名称和当前上下文即可取得相同字段。

### 6.4 Organizer-only 隔离信息

以下内容用于 authoring、覆盖和评分，但永不进入参与者 Chat、DOM、可访问性树、搜索索引或对象标题：

- legacy `F1-F3` packet cluster、NormalizedProductSemanticStateV3、`M_planned/M_runtimeEligible` coverage、pair-state authoring status；
- 未选分支的 response payload、seed、raw trace 和 future refs；
- Opportunity GoldSet、pre-study NTE distribution、analysisContractId、endpoint predicate、required-edge predicate 和 oracle verdict；
- assignment、object usage、turn、time 和 interaction telemetry；
- canonical digests、lease、CAS、publication state 和 audit receipt ID；
- “支持方向/反对方向”的 authoring 标签或任何 candidate ranking。

参与者只能看到当前已经发布的事实、来源、限制和关系；隐藏 authoring 分类不能改变 Machine 的内容、排序或措辞。

正式运行时必须从 participant workspace、Machine 可读工具和客户端 bundle 中物理排除本文的 organizer-only 段落与未选分支数据；不能只依赖 prompt 要求 Machine 忽略，也不能把内容打包后用界面隐藏。

独立发布链：

```text
candidate/evidence-request commit
  -> trusted semantic extractor
  -> unique coverage predicate or OOM
  -> condition-blind sealed evaluator
  -> hidden EvidenceBundle
  -> publication gateway rechecks
       semanticStateDigest + artifactDigest + frontierDigest
       + packetEligibilityKeyDigest + frozenPacketManifestDigest
       + guardDigest + verificationDigest
  -> one atomic visible pointer
  -> same participant-safe Chat projection for A/B/Machine
```

gateway 必须从当前 state 与 receipts 重新计算完整 `PacketEligibilityKey`，因此会同时重检 `stateEvaluationClass`、`evaluationOrdinal`、`protocolDigest`、`itemAndProfileManifestDigest`、`requiredPredecessorReceiptRefs`、`packetVersion` 以及对应 frozen manifest digest；不能只核对 semantic state 或 protocol。`condition`、object refs、selection、turn、latency 和 render state 都不得进入 evaluation key。Relevant state 在 evaluation 或 reveal 前改变时，旧包只能留在 organizer audit 并标记 stale，不得 participant-visible。

## 7. Act 0：共同开发前史

前史必须表现为真实产品状态变化，而不是为了展示事实而写的问答。

| Event | 真实开发事件 | 产生的核心对象 |
| --- | --- | --- |
| `H01` | 接受 URL-only capture，组织字段保持可选 | `DECISION:CAPTURE-R0`、`VERIFY:CAPTURE-R0` |
| `H02` | 接受保存后回到原任务，同时新增项进入 Inbox | `DECISION:CONTINUITY-R0` |
| `H03` | 接受 canonical SavedItem 和 multi-membership | `DECISION:IDENTITY-R0`、`DECISION:MEMBERSHIP-R0` |
| `H04` | 接受 Inbox 与 Unsorted 的正交状态 | `DECISION:ORTHOGONAL-R0` |
| `H05` | 接受全局 Search 和跨入口同一 identity | `DECISION:SEARCH-R0` |
| `H06` | 处理导入、深链接和数据往返边界 | `DECISION:PORTABILITY-R0` |
| `H07` | 修复移动、键盘、焦点和读屏问题 | `DECISION:ACCESSIBILITY-R0` |
| `H08` | 参与者用自己的话重建产品模型；Machine 只纠正 Unsorted 是关系投影，并区分已验证行为与未知使用代价 | `BASELINE-COMMON-GROUND:R0`、`REVISION:R0`、`VERIFY:R0` |
| `H09` | 参与者冻结 R0 并授权四日现状观察；Machine 绑定版本后发布共同中立 Trigger | `REQUEST:R0-D4`、`PILOT:R0-D4`、`TRIGGER:E0` |

正式阶段前的共同 summary 只显示：稳定目标、当前四个主要入口、受保护约束类别、R0 已接受，以及可以回看上述历史。它不复述每个决定的理由、diff 和回执；参与者对 baseline 的把握来自 H01–H09 的累积，而不是这条 summary。

## 8. Act 1：R0 证据前沿 `E0`

### 8.1 顶层共同 Trigger

所有参与者先获得同一条复合但有损的最新输出：四日试用、context notes、支持事件和工程/可访问性回执已经冻结；144/144 次 URL-only capture 与 72/72 次计划内找回完成，48 次延迟找回中有 21 次同时经过 Inbox 和 Unsorted，第四日 57/144 个条目具有 Collection 归属，8 段情境说明包含彼此竞争的解释；没有候选被比较，现有材料不能指定产品方向。该输出只发布 aggregate、它更新的旧状态与 boundary；concrete trace、完整 membership timeline、raw event 和 receipt 仍需沿相应对象 Probe 后才出现。

顶层只自然出现以下索引对象：

| Ref | 对象 |
| --- | --- |
| `PILOT:R0-D4` | 四日结构化试用来源 |
| `OBS:R0-BEHAVIOR` | 保存、找回与组织行为观察 |
| `QUAL:R0-CONTEXT-NOTES` | opt-in context notes 与 think-aloud fragments |
| `OPS:R0-SUPPORT-INCIDENTS` | 支持、导入和恢复事件 |
| `VERIFY:R0-A11Y-DATA` | 可访问性、数据和深链接回执 |
| `BOUNDARY:R0-D4` | 证据边界 |
| `VERIFY:R0` | 当前 R0 验证回执 |

查看 `OBS:R0-BEHAVIOR` 后才出现三个 aggregate children：

- `OBS:R0-REFIND`：12 位场景试用者保存 144 个新条目；72 个计划内找回任务全部成功；48 个延迟找回任务中，21 个在打开目标前访问 Inbox 与 Unsorted 两个入口，27 个没有；
- `OBS:R0-ORG-TIMING`：63 个新增条目曾获得 membership，其中 10 个在保存 session 首次归类，53 个在 later session 首次归类；第四日 57/144 仍有 membership，87/144 为 zero-membership；
- `OBS:R0-ORG-RETURN`：24 个组织后回访任务全部成功，首次入口为 Search 10、Collections 9、Inbox 3、Unsorted 2。

其他 source-typed children：

- `QUAL:R0-CONTEXT-NOTES` 含 8 条 opt-in context note：3 条描述先保存后处理，2 条描述有意核对两种状态，2 条描述不确定应从哪个入口开始，1 条描述通过主题集合恢复上下文；它们是具体情境，不代表总体动机分布；
- `OPS:R0-SUPPORT-INCIDENTS` 含 16 个已解决事件：6 个入口/可见性问题、5 个导入或来源 identity 问题、3 个 Collection 删除/恢复问题、2 个键盘焦点问题；没有数据丢失，也不能由事件数量推出候选方向；
- `VERIFY:R0-A11Y-DATA` 绑定 12/12 个关键可访问性任务、4 份共 1,200 个 SavedItem 的 import/export rehearsal，以及 40/40 个 legacy deep-link resolution；
- 所有材料都标记 `simulated_scenario_evidence`，不冒充现实用户研究或因果证据。

### 8.2 可纵向下钻的来源

这些对象不是一次性显示的目录，而是在 participant 请求相应 aggregate 后逐层出现：

```text
Observation
  -> frozen cohort
    -> concrete trace or membership timeline
      -> SavedItem as-of state
        -> route / membership relation
          -> raw event and protocol provenance
```

具体实例包括：

- 四个 `pending/cleared × membership/no-membership` cohort；
- 48 条延迟找回 trace；
- 63 条曾发生 membership 的 timeline；
- 24 条组织后回访 trace；
- 8 条 context-note/source fragment 和 16 条 support incident trace；
- 对应 SavedItem 的 as-of payload、surface state 和 membership relation；
- 任务 protocol、target partition、denominator 和 raw-event provenance。

### 8.3 Trigger 后真正未决的问题

| Ref | 未知 |
| --- | --- |
| `UNKNOWN:DUAL-VISIT` | 跨两个 surface 是有意核对，还是额外的上下文恢复？ |
| `UNKNOWN:STATE-LEGIBILITY` | 用户能否稳定区分 pending 与 zero-membership？ |
| `UNKNOWN:ORG-TIMING` | later-session organization 是有意集中整理，还是包含额外成本？ |
| `UNKNOWN:COLLECTION-VALUE` | Collections 的价值主要是主题浏览、已知项找回还是多上下文归组？ |
| `UNKNOWN:LONG-HORIZON` | 四日后的长期资料积累会怎样改变使用？ |
| `UNKNOWN:COHORT` | 不同使用情境是否需要不同默认入口或可选模式？ |

当前证据不能授权合并、删除、隐藏、降级或保留任一页面，也不能把某个行为解释成偏好。

## 9. 共享语义状态面与第一次 Commit

### 9.1 隐藏 packet cluster、可组合 primitive 与 exact state

参与者只用自然语言表达问题框架、优先使用情境、候选方向、必须保留的约束和希望验证的假设。v2 已有的三类 candidate packet 在 v4 中降级为内部 packet cluster；它们帮助复用结果与检查覆盖，不是路线、问题分类、推荐或对象目录。Evidence-first 不再是第四个 family，而是任意 frontier 都可执行的 `Request-evidence` 语义操作。

| Packet cluster | 已有宽候选 | 核心假设 | 主要张力 |
| --- | --- | --- | --- |
| `F1:LINKED-HUB` | 联动 Saved Hub：用统一 workspace 和可见 filters 联结 Inbox、Unsorted、Search 与 Collections，同时保留 legacy routes | 跨入口行为主要包含定位和上下文重建成本 | 统一上下文 ↔ 状态密度和可访问性 |
| `F2:FOCUS-QUEUE` | 可选 Focus Queue：在 Inbox 之上增加与其正交的 Focus 状态，Collection 继续独立，提醒和模式均可撤销 | later-session 行为主要反映时间和注意力管理 | 处理流程 ↔ 把资料库任务化 |
| `F3:CONTEXT-WORKSPACE` | 情境主题工作区：在 R0 Note/Tag/Collection 之上增加有边界的 saved view、比较或 relation context | 跨 surface 行为主要是在重建主题上下文 | 语义丰富度 ↔ 轻量用户和 a11y 负担 |

产品状态用可组合 primitive 表示，而不是用 family label 表示：

| Primitive | 语义 |
| --- | --- |
| `L` | 在不合并 Inbox 与 Collection membership 的前提下，共同呈现两个独立状态并保留直接入口 |
| `F` | 可选手动 Focus 状态；与 Inbox、membership 正交，不强制提醒 |
| `V` | 有 provenance、可撤销的简单 saved view；默认普通页面，不隐含 compare/relation graph |

v2 的较宽第一版候选重新记为 `W_L=L+later-session batch`、`W_F=F+optional reminder`、`W_V=V+compare+relation context`。缩小状态 `L/F/V` 分别对应 `HUB-P1/FOCUS-P1/CONTEXT-P1`；三类已修复但仍较宽的 C2 继续作为独立 exact states。v4 必须区分“计划覆盖”与“已有完整 packet、当前可运行”：

```text
M_planned = {
  R0,
  CELL:HUB-C1, CELL:HUB-C2, CELL:HUB-P1,
  CELL:FOCUS-C1, CELL:FOCUS-C2, CELL:FOCUS-NR-C1, CELL:FOCUS-P1,
  CELL:CONTEXT-C1, CELL:CONTEXT-C2, CELL:CONTEXT-P1,
  CELL:L+F, CELL:L+V, CELL:F+V
}

M_runtimeEligible = {
  <exactSubjectSemanticStateDigest,
   packetEligibilityKeyDigest,
   frozenPacketManifestDigest>
  where normalized state uniquely matches M_planned
    and the exact PacketEligibilityKey + FrozenPacketManifest are complete
}
```

`M_runtimeEligible` 是 state 与 exact eligibility/manifest 的关系，不是 state 名称集合。同一 V 对 `V-direct-from-R0` key 可以 eligible，而对尚未冻结的 `V-after-W_V` key 仍必须 `packet_unavailable`。`L+F`、`L+V`、`F+V` 是真正的 pair state，不是把两个单项结果相加；它们必须各自拥有 pair-interaction protocol、exact manifest、exception、guard/a11y closure 和结果包，才有对应 tuple 进入 `M_runtimeEligible`。命中 `M_planned` 但当前 exact key/manifest 尚未完成是 `packet_unavailable`，不是 OOM；三元组合、未冻结 axis 或改变 protected semantics 才是 out-of-manifold。“跨 packet cluster”“从一个问题解释转向另一个”或“回到 R0 后形成另一候选”本身绝不能成为 OOM 理由。

所有 exact state 使用相同的上层信息预算：同一 common-core evaluation、state-specific task pack、一个 interaction/exception pack 和一个 boundary。功能数量、对象深度和 evidence card 数不能让某一方向天然显得更完整。pair state 还必须有专门的 interaction pack，不能拼接两个单项 packet 冒充组合证据。

Trusted extractor 从实际 committed build 生成 parent-free 的 condition-neutral product state；revision lineage 与 packet eligibility 分开验证。它们都不读取 participant 原话、条件或对象 telemetry：

```text
NormalizedProductSemanticStateV3 = <
  surfaceTopology: separate | linked | shared,
  focusStateModel: none | orthogonal_optional,
  contextWorkspace: baseline | bounded_optional,
  contextCapabilitySet: exact sorted subset of [saved_view, compare, relation_context],
  contextDefault: baseline | contextual_entry | simple_view,
  dualStatePresentation: separate | linked | co_visible,
  organizationEntrySet: exact sorted set,
  batchAvailability: none | later_session,
  selectionPersistence: none | within_view | cross_view,
  scopeConfirmation: none | count_only | explicit_object_preview,
  disclosurePolicy: baseline | always_visible | progressive,
  notificationPolicy: none | optional_default_off,
  stateExplanation: baseline | explicit,
  conflictHandling: baseline | explicit_choice,
  legacyRoutePolicy: preserve | redirect_with_compatibility,
  affectedModules: exact sorted set,
  primaryBehavioralAxes: exact sorted set,
  capabilityPrimitives: exact sorted subset of [L,F,V],
  unknownExtensions
>

ArtifactStateSignature = <
  normalizedSemanticStateDigest,
  artifactDigest
>

RevisionLineageReceipt = <
  trialRef,
  childRevisionRef,
  parentRevisionRefs: non-empty exact set,
  fromSemanticStateDigests,
  toSemanticStateDigest,
  participantIntentDigest,
  triggerVisibilityReceipt,
  frontierDigest,
  transitionVerificationDigest
>

PacketEligibilityKey = <
  scenarioVersion,
  exactSubjectSemanticStateDigest,
  exactArtifactStateDigest,
  stateEvaluationClass: first_evaluation | long_horizon | integration | pair_interaction,
  evaluationOrdinal,
  protocolDigest,
  itemAndProfileManifestDigest,
  requiredPredecessorReceiptRefs: exact set,
  packetVersion
>
```

相同 normalized semantic state 即使由不同 parent 到达，也具有相同 semantic digest，因而可以形成 fan-in；其 revision refs 与 lineage receipts 仍不同。packet 是否可用还取决于 evaluation class、ordinal、protocol 与 required predecessor receipts，不能仅凭 state 名称领取结果。

Evidence packet 使用 exact covered state，而不是只看 packet cluster：

R0 signature baseline 固定为：`surface=separate`、`focus=none`、`context=baseline/[]`、`contextDefault=baseline`、`dualState=separate`、`organizationEntrySet=[collections,detail,inbox,search,unsorted]`、`batch=none`、`selection=none`、`confirmation=none`、`disclosure=baseline`、`notification=none`、`stateExplanation=baseline`、`conflictHandling=baseline`、`legacy=preserve`、`affectedModules=[]`、`primaryBehavioralAxes=[]`、`unknownExtensions=[]`。Digest 字段必须来自实际 build，不能由 authoring label 填写。

| Cell | 必须精确满足的 protocol-sensitive axes | 可发布 packet |
| --- | --- | --- |
| `CELL:HUB-C1` | `linked/co_visible`；org entries=`[collections,detail,hub,inbox,search,unsorted]`；batch=`later_session`；selection=`cross_view`；confirmation=`count_only`；disclosure=`always_visible`；focus=`none`；context=`baseline/[]`；notification=`none`；legacy=`preserve`；affected=`[ACCESSIBILITY,NAVIGATION,ORGANIZATION,SURFACE]`；primary=`[cross_surface_linkage,dual_state_legibility,later_session_batch,selection_scope]` | Hub E1、unchanged-C1 E2 |
| `CELL:HUB-C2` | HUB-C1，但 confirmation=`explicit_object_preview`、disclosure=`progressive`、stateExplanation=`explicit` | Hub C2-integration E2 |
| `CELL:HUB-P1` | HUB-C2，但 batch=`none`、selection=`none`、confirmation=`none`；affected=`[ACCESSIBILITY,NAVIGATION,SURFACE]`；primary=`[cross_surface_linkage,dual_state_legibility]` | Hub partial-revision E2 |
| `CELL:FOCUS-C1` | surface=`separate`；focus=`orthogonal_optional`；notification=`optional_default_off`；stateExplanation=`baseline`；conflict=`baseline`；context=`baseline/[]`；batch=`none`；legacy=`preserve`；affected=`[ACCESSIBILITY,DEVICE-DATA,PROCESSING,RETRIEVAL]`；primary=`[attention_state,disposition_legibility,notification_tolerance,sync_conflict]` | Focus E1、unchanged-C1 E2 |
| `CELL:FOCUS-C2` | FOCUS-C1，但 stateExplanation=`explicit`、conflict=`explicit_choice` | Focus C2-integration E2 |
| `CELL:FOCUS-NR-C1` | FOCUS-C1，但 notification=`none`；stateExplanation=`baseline`；conflict=`baseline`；primary=`[attention_state,disposition_legibility,sync_conflict]` | `PACKET:F-DIRECT-FIRST-EVAL-v1`（authoring pending） |
| `CELL:FOCUS-P1` | FOCUS-C2，但 notification=`none`；primary=`[attention_state,disposition_legibility,sync_conflict]` | Focus partial-revision E2 |
| `CELL:CONTEXT-C1` | surface=`separate`；focus=`none`；context=`bounded_optional/[compare,relation_context,saved_view]`；default=`contextual_entry`；org entries=`[collections,context_workspace,detail,inbox,search,unsorted]`；notification=`none`；selection=`within_view`；confirmation=`count_only`；legacy=`preserve`；affected=`[ACCESSIBILITY,DEVICE-DATA,MAINTENANCE,NAVIGATION,ORGANIZATION,READING-CONTEXT,SURFACE]`；primary=`[advanced_mode_access,context_reconstruction,relation_scope,structure_maintenance]` | Context E1、unchanged-C1 E2 |
| `CELL:CONTEXT-C2` | CONTEXT-C1，但 default=`simple_view`、confirmation=`explicit_object_preview`、disclosure=`progressive` | Context C2-integration E2 |
| `CELL:CONTEXT-P1` | CONTEXT-C2，但 capability set=`[saved_view]`、confirmation=`count_only`；primary=`[advanced_mode_access,context_reconstruction,structure_maintenance]` | Context partial-revision E2 |

上表十个 cell 中，九个是已有单 cluster packet 的重新索引，`CELL:FOCUS-NR-C1` 是 v4 attention witness 新增的 exact intermediate state。v4 formal content freeze 前还必须补齐：

| Exact pair state | 必须精确满足的 axes | 结果要求 |
| --- | --- | --- |
| `CELL:L+F` | `surface=linked`、`dualState=co_visible`、org entries=`[collections,detail,hub,inbox,search,unsorted]`、`focus=orthogonal_optional`、`notification=none`、`stateExplanation=explicit`、`conflict=explicit_choice`、`context=baseline/[]`、`contextDefault=baseline`、`batch=none`、`selection=none`、`confirmation=none`、`disclosure=progressive`、`legacy=preserve`、primitives=`[F,L]`、affected=`[ACCESSIBILITY,DEVICE-DATA,NAVIGATION,PROCESSING,RETRIEVAL,SURFACE]`、primary=`[attention_state,cross_surface_linkage,disposition_legibility,dual_state_legibility,sync_conflict]` | 独立 common core、state-interaction、sync/legibility exception、pair a11y/undo closure |
| `CELL:L+V` | `surface=linked`、`dualState=co_visible`、org entries=`[collections,context_workspace,detail,hub,inbox,search,unsorted]`、`focus=none`、`context=bounded_optional/[saved_view]`、`contextDefault=simple_view`、`batch=none`、`selection=within_view`、`confirmation=count_only`、`disclosure=progressive`、`stateExplanation=explicit`、`notification=none`、`conflict=baseline`、`legacy=preserve`、primitives=`[L,V]`、affected=`[ACCESSIBILITY,DEVICE-DATA,MAINTENANCE,NAVIGATION,ORGANIZATION,READING-CONTEXT,SURFACE]`、primary=`[advanced_mode_access,context_reconstruction,cross_surface_linkage,dual_state_legibility,structure_maintenance]` | 独立 common core、context/state interaction、scope/maintenance exception、pair a11y/undo/export closure |
| `CELL:F+V` | `surface=separate`、`dualState=separate`、org entries=`[collections,context_workspace,detail,inbox,search,unsorted]`、`focus=orthogonal_optional`、`notification=none`、`stateExplanation=explicit`、`conflict=explicit_choice`、`context=bounded_optional/[saved_view]`、`contextDefault=simple_view`、`batch=none`、`selection=within_view`、`confirmation=count_only`、`disclosure=progressive`、`legacy=preserve`、primitives=`[F,V]`、affected=`[ACCESSIBILITY,DEVICE-DATA,MAINTENANCE,NAVIGATION,ORGANIZATION,PROCESSING,READING-CONTEXT,RETRIEVAL,SURFACE]`、primary=`[advanced_mode_access,attention_state,context_reconstruction,disposition_legibility,structure_maintenance,sync_conflict]` | 独立 common core、attention/context interaction、maintenance/sync exception、pair a11y/undo/export closure |

现阶段这些 pair cell 是 `required_authoring_surface`，属于 `M_planned`，但没有任何 pair-specific eligibility tuple 属于 `M_runtimeEligible`。任何实现命中它们而 packet 尚未冻结时必须以 `packet_unavailable` fail closed；不得从 F1/F2/F3 数字推导或拼接结果。

单-cluster 表中未写为 non-baseline 的 schema field 必须等于上述 R0 baseline；C2/P1 的“但”只覆盖明示字段，其余逐字段继承其点名的 authoring base cell。pair 表已经显式列出所有 protocol-sensitive axes，不从任一 product parent 隐式继承。`primaryBehavioralAxes`、`affectedModules` 和 `capabilityPrimitives` 必须精确匹配，`unknownExtensions` 必须为空。这样不存在“命中 cluster 后免费获得未实现能力”的路径。

Lineage 也是 exact predicate，不是事后 provenance 注释：

- 所有 `*-C1` 必须满足 `parentSemanticStateDigest + parentArtifactDigest = 本 trial 进入时已验证 REVISION:R0`，并绑定该 trial 的 baseline receipt；
- child 的 product parent 必须是同一 trial 中实际 verified current state，或是经 discard/rollback/rebase receipt 重新验证的 R0；parent 不能根据想要的结果包虚构；
- `RevisionLineageReceipt` 绑定 trial、一个或多个真实 product parent、child、trigger reveal、participant intent/authorization 与 frontier；跨 trial 复用、detached build、伪造 parent 或伪造 reveal 一律 OOM；跨 cluster 的信息回访、重新 framing、verified rebase 或命中 exact pair state 均是合法迁移；
- unchanged-C1 E2 直接绑定原 C1 revision 和 D1 second-protocol authorization，不创建伪 C2 parent。

唯一匹配规则：

- `F1/F2/F3` 只用于组织者检索已有 packet；actual evaluator 必须按 normalized signature 命中 `M_planned` 中一个且仅一个 exact state，再以完整 `PacketEligibilityKey` 检查它是否属于 `M_runtimeEligible`；
- `Request-evidence` 不是 candidate signature：它生成 scoped EvidenceRequestReceipt，产品 semantic/artifact digest 不变，且结果可以在后续 epoch 重新进入候选形成；
- 同时具有两个 primitive 只有在唯一命中 `CELL:L+F/L+V/F+V` 时才属于 planned manifold；packet 未完成时是 `packet_unavailable`；三元组合、超过预注册 primary axes、未验证 extension 或改变 protected semantics 时才是 `out_of_manifold`；
- 对上表任一已列 axis 的额外或不同取值一律 OOM；`projection_safe` 只允许 `field ∉ protocolReadSet` 且独立 `ProjectionSafetyReceipt` 以行为等价测试证明结果不变，participant-visible delta 永远不能被忽略；
- v2 的 `P1` cells 仍可复用为单 primitive partial packet；pair state 的 partial rollback 必须移动到一个已有 exact state并重新验证，不能从 pair packet 中挑有利 bullet；
- 两个 exact predicate 同时命中属于 authoring error，不能靠优先级选择；
- 相同 normalized state、artifact、PacketEligibilityKey 和 frontier 必须产生相同 evidence，重试不能 reroll。

自然语言候选可以同时涉及多个模块；系统不得强迫参与者先选 packet cluster 或拆成单模块话术。若 actual build 不唯一命中 frozen state，Machine 可以诚实实现并保留 artifact，但 evaluator 不发布近邻结果，trial 停在 verified safe state。OOM 的理由必须是“exact state 未覆盖或保护语义被改变”，不能是“参与者发生了 output-induced reframing”。

共同 E0 后有三个 condition-neutral output epoch `O1-O3`。Candidate evaluation、R0 scoped evidence 或 exact-state re-evaluation 每次 reveal 消耗一个 epoch；同一 epoch 只发布一个 exact subject state/request 的 packet。Probe 已发布对象不消耗新 epoch，重试不能 reroll。participant 可以先请求证据、再形成候选，也可以在 candidate result 后回到 R0 证据，再从新输出形成另一候选。

任何 evidence request 都只回答其请求范围，不免费获得 future candidate 结果。若后续自然形成候选，必须先 Commit、从实际 build 提取 exact state、Verify lineage/guards，再使用剩余 epoch 唯一命中 sealed packet。没有剩余 epoch 或 packet 未冻结时只能安全 defer；不能提前读取 future packet，也不能因为先取证就把参与者锁进 R0 终局。

### 9.2 候选提交后出现的对象

```text
INTENT:C1
  -> CANDIDATE:C1
    -> DELTA:C1
      -> affected modules / dependency read-write set
        -> VERIFY:C1
          -> candidate-specific evaluation eligibility
```

候选至少记录：目标使用情境、问题假设、实际 module delta、保留约束、明确不做的内容、风险、read/write set 和当前验证。

版本关系使用五个不同角色，不能把“可评价”“当前试验状态”“提议接受”和“最终写入”混成同一个指针：

- `historicalAcceptedRevision`：进入本 trial 前已经接受并验证的 R0；
- `candidateRevision(parent)`：隔离的 C1/C2 候选；commit 只使其可评价，不自动改变任何 current pointer；
- `trialCurrentRevision`：当前获授权接受下一阶段验证的 revision，初始为 R0；D1 明确保留/推进 C1 或 C2 且验证 current 后才可移动；
- `proposedFinalRevision`：participant disposition 提交给 endpoint validator 的目标 revision，可为空；
- `finalAcceptedRevision`：不属于 validator 输入，仅在一个且只有一个合法 endpoint 成立后由 atomic CAS 写入。

每个 revision 都有自己的 evidence frontier。OOM、candidate discard、rollback 或 defer 都必须明确留下一个 verified safe state。

在 `CANDIDATE:C1` commit 且 `VERIFY:C1` current 之前，任何 candidate-contingent `E1:CANDIDATE` 对象都不存在。R0 evidence request 走独立的 `R0EvidenceRequestReceipt -> E1:R0-CONTINUATION` 路径，不需要也不伪造 C1。

## 10. Exact-state / request output packet catalogue

本节保存 v2 已经写出的单-cluster exact-state packet；它们可以在 v4 的 `O1-O3` 中由任何合法 lineage 唯一命中，不再分别属于四条剧情。`COHORT:R0-D4` 只产生 E0，不充当 future candidate 的对照。每个 candidate packet 使用独立的 `COHORT:E1-PAIRED-12`：12 个冻结 scenario-user profiles 各有一份 candidate replica 和一份 matched R0 replica，二者共享 item/task manifest、起始状态和 protocol；当前 packet 无缺失。对照 refs 分别为 `REF:F1-E1-R0`、`REF:F2-E1-R0`、`REF:F3-E1-R0`，不能用 E0 数字冒充。后续 exact-state packet 纵向延续同一 paired profiles；任何 attrition/missingness 必须进入 payload。

所有 candidate output 都先运行同一 common core，再运行一个 exact-state-specific secondary pack：

| Common core | 固定 denominator |
| --- | ---: |
| URL-only quick capture | 144 |
| known-item refind | 48 |
| orthogonal-state comprehension | 12 |
| mobile/keyboard/screen-reader critical task | 12 |
| identity、payload、Search、route、import/export guard | 全部受影响 closure |

E1 common-core outcome matrix：

| Family | Quick capture | Known-item refind | 首次正确解释正交状态 | Critical a11y |
| --- | --- | --- | --- | --- |
| F1 | 144/144，无新增必填 | 48/48 | 10/12 | 12/12，guard 内 |
| F2 | 144/144，无新增必填 | 48/48 | 9/12 | 12/12，guard 内 |
| F3 | 144/144，无新增必填 | 48/48 | 10/12 | 12/12，guard 内 |

E1 accessibility ratios（每格=`actions/time`）：

| Family | Mobile | Keyboard | Screen reader |
| --- | --- | --- | --- |
| F1 | `1.13/1.15` | `1.15/1.17` | `1.17/1.18` |
| F2 | `1.03/1.05` | `1.06/1.07` | `1.08/1.09` |
| F3 | `1.08/1.10` | `1.15/1.16` | `1.18/1.19` |

E1 reversibility closure：

| Family | Participant-safe receipt |
| --- | --- |
| F1 | 40/40 batch attempts 在 commit 前显示 operation、count 与 affected filters，commit 后有 exact inverse/undo；C2 的 object-level scope preview 是改进项，不是 C1 才开始拥有撤销能力 |
| F2 | 36/36 processed/deferred transitions 在 commit 前显示 target 与 prior→next Focus/Inbox state，commit 后记录 atomic delta 和 exact inverse；undo 不改变 payload/membership |
| F3 | 18/18 saved-view/relation mutation attempts 在 commit 前显示 affected-item count，commit 后有 provenance 与 exact inverse；false inclusion 的移除也保留 history |

各包有同样的顶层槽位：CommonCore、BranchObservation、Subgroup/Exception、Verification、Boundary。初始共同 Chat 只发布 headline、上述对象索引与 boundary；精确 aggregate 在查看 Observation 后出现，cohort/exception/trace 再按请求逐层出现。下列 bullet 是完整 authoring payload，不是一次性发送给 participant 的一条消息。

所有结果是预冻结的 `simulated_scenario_evidence`，来源字段明确区分 moderated task、event trace、context note、accessibility protocol 和 engineering rehearsal。Candidate-specific matched R0 与 candidate trace 只在当前 evaluation 后共同发布，不能从 R0 阶段提前读取。

### 10.1 `F1:LINKED-HUB` 的 `E1`

- `[moderated task + event trace]` 48/48 个已知项找回成功；secondary state-view visit 从 matched R0 的 20/48 变为 7/48，但 route 数只作 topology 描述，不能单独解释为认知成本；
- `[topology-invariant trace]` median active steps 从 8 变为 6，出现 backtrack 或 clarification 的任务从 9/48 变为 5/48；
- `[comprehension]` 10/12 能正确说明 pending 与 zero-membership，2 位在窄屏下把两个 filter chip 解释为同一处理状态；
- `[branch task]` 40 个 later-session batch organization attempt 中 37 个作用于预期 scope，3 个因跨 filter 保留选择而使用 undo；
- `[subgroup]` 12 个 Search-first 回访任务中 9 个直接使用 Search，主题浏览任务继续使用 Collections；
- `[a11y + engineering]` legacy route、payload、identity 和 import/export current；12/12 关键任务完成，六项 ratio 见上表并均未超过 `1.20`；
- `[boundary]` 该包只测短期 matched tasks，不能说明长期是否形成统一入口习惯。

张力：导航重建减少，但双状态表达、selection scope 和窄屏密度成为新问题。

### 10.2 `F2:FOCUS-QUEUE` 的 `E1`

F2 新增 `FocusStatus = none | active | deferred`，它与 Inbox 和 membership 正交；“处理完成”原子地设置 `Inbox=cleared` 且 `FocusStatus=none`，不 archive、不删除，也不改变 membership。

- `[event trace]` 144/144 次保存仍可不组织，quick-save active path 未增加必填步骤；
- `[branch task]` 36/36 个 backlog task 最终得到正确 disposition：32 个 processed-now、4 个 intentionally-deferred；其中 5/36 的首次解释需要一次语义 clarification，不能把合理 defer 计作失败；
- `[comprehension]` 9/12 首次能区分 Focus、Inbox cleared 和 archive，另外 3 位在查看关系说明后纠正；
- `[common-core trace]` 48/48 个已知项找回成功，8/48 在状态变化后直接使用受保护的 Search 路径；Search 不是失败后的“rescue”；
- `[subgroup]` 主题浏览仍主要依赖 Collections；7/12 开启可选提醒，5/12 保持关闭，不能由此推断接受或厌烦；
- `[a11y + engineering]` payload、identity、Search 和 export current，12/12 critical tasks 与六项 ratio 均在 guard 内；
- `[boundary]` 尚未观察长期 backlog、提醒容忍和跨设备 state conflict。

张力：处理进度更可见，但产品可能被误读为任务管理器。

### 10.3 `F3:CONTEXT-WORKSPACE` 的 `E1`

- `[precommitted target-set task]` candidate commit 前已冻结相同 target item set、precision/recall 与 false-inclusion 规则；24 个主题综合任务中 23 个找到完整目标组，matched R0 为 20/24，candidate 出现 3 个 false inclusions，R0 为 5 个；
- `[common core]` 48/48 个已知项找回成功，Search-first 路径没有改变；
- `[uptake split]` 8/12 使用过 R0 已有的 Note/Tag/multi-membership；新增能力的精确使用为 saved view 5/12、compare 4/12、relation context 3/12，union 为 6/12。互斥 pattern cells 冻结为：all-three=2、saved+compare-only=1、saved+relation-only=1、compare-only=1、saved-only=1、compare+relation-only=0、relation-only=0、none=6；R0 能力与 candidate 能力不得合并成 uptake；
- `[maintenance trace]` 新建主题结构中出现 5 组名称或 scope 重叠，需要 merge、rename、abandon 或明确边界；
- `[a11y]` quick save 保持安静，workspace 遍历层级增加但 12/12 critical tasks 仍在 `1.20×` guard 内；
- `[engineering]` export round-trip、canonical identity、protected payload、Global Search、legacy route/deep-link 与 post-save continuity current；
- `[boundary]` 短期主题任务可能高估长期收益，且轻量情境的理解成本仍未知。

张力：主题上下文恢复改善，但结构维护、语义重叠和可访问性成本上升。

### 10.4 Scoped `Request-evidence` 的 R0 continuation packet

若 participant 在任意 eligible frontier 提交明确、可执行的 `R0EvidenceRequestReceipt`，可以消耗当前 output epoch 发布独立于 candidate 的 R0 continuation：

- `[protocol]` 这是从共同 D4 baseline 延伸至 D30 的独立 continuation protocol；D11/D18 organization events 与 D30 return task 都在同一预冻结 task/raw-event manifest 中，不属于 14-day packet；
- `[lineage]` 同一 12 个 R0 continuation profiles 全部保留，无 missingness；
- `[event trace]` 72/72 个找回任务成功；48 个 repeat-pattern tasks 中有 15 个 secondary state-view visit，24 个 novel-context tasks 中有 8 个；
- `[organization timeline]` 原 144 个条目的 current membership 从 57 增至 71，9 个条目在 later sessions 中发生两次以上有来源的重组；
- `[think-aloud]` 12 个 trace 中，5 个明确有意核对两种状态、4 个需要额外上下文恢复、3 个同时包含两者；
- `[return route]` 24 个主题回访中 Search 14、Collections 10；
- `[boundary]` 它不包含任何 future candidate 的效果；新输出可以支持保留 R0、形成或重排 future candidate hypothesis，或在下一 epoch 请求另一项 boundary evidence。任何新候选仍必须独立 Commit、Verify 并命中自己的 sealed packet。

v4 participant witness 还实例化两个 scoped child packet；二者在 raw manifest 与 reconciliation 完成前保持 `authoring_pending`，不能进入正式 runtime：

- `PACKET:R0-BACKLOG-DISPOSITION-v1`：D4 的 86 个 pending items 分解为保存后再次打开 52、未再次打开 34；匹配的 36 个 disposition tasks 分解为 now=27、explicit defer=6、uncertain=3；六个 defer 的回访分解为 rationale reconstruction=4、Note sufficient=2。它只允许从 participant-stated rationale 编码，不从 inactivity 推断遗忘；
- `PACKET:R0-LONGHORIZON-CROSSCASE-v1`：把九个 repeated sourced-reorganization items 按 observable theme-boundary change、Note sufficiency 与 multi-project membership 做重叠分类，并发布 Offline-first 变化实例与 Keyboard focus 稳定反例。它是同一 D4→D30 packet 的纵向 child，不增加九条之外的 item 或 event。

两份 child packet 都必须绑定 exact `R0EvidenceRequestReceipt`。第一份回答处理时机但不授权 Focus/提醒；第二份细化长期组织但不授权 saved view/关系图。Participant 可以据此形成候选、继续 Probe 或保留 R0。

### 10.5 非支配关系

三个宽候选与 Request-evidence 不存在统一效用分：Linked Hub 优先降低状态导航重建，但承担密度和 scope 风险；Focus Queue 优先处理时序，但不改善主题组织且可能任务化；Context Workspace 优先长期语义上下文，但提高维护和遍历成本；Request-evidence 最小化即时改版风险，但消耗同样有限的 output epoch 并保留候选效果未知。场景不提供这些取舍的权重，因此不能从上述数字推出全体参与者共享的 winner。

## 11. Output-induced transition support

任何 state/request-contingent output 后至少存在以下真实语义方向；它们是机会边，不是按钮：

- 保留同一 C1，并授权第二个长期/集成 protocol；这不要求 intent change；
- 针对 exception 精炼 C1；
- 在同一或不同模块间把已实现、可验证的 delta Compose 成 exact pair state；
- 部分回滚，保留有效 delta；
- 完整回滚到已验证 R0；
- 丢弃隔离 candidate 或 rollback 后，从已验证 R0 rebase 到另一 candidate；
- 重新打开被影响的 Identity、Capture、Navigation、Accessibility 或 Organization；
- 请求另一类冻结证据；
- 在 current safe state 提前停止；它保留在 ITT，但未命中宏观产品 endpoint 时属于 observed noncompletion。

只有新的实质 participant intent 才能产生新 revision。保持同一 state 只需要 participant 授权已经冻结的下一阶段 protocol，不伪装成新 intent。Machine 不得在看到结果后自行连续实现下一候选或自动花费下一 output epoch。

### 11.1 预冻结的典型 transition support

| 当前 packet/state | 输出后可覆盖修订 | 新增依赖 |
| --- | --- | --- |
| Linked Hub | progressive disclosure、显式双状态说明、scope preview、保留 direct routes、焦点恢复 | Navigation、Accessibility、undo |
| Focus Queue | opt-in manual Focus、提醒默认关闭、processed-now / intentionally-deferred 与 archive 明确分离、跨设备 conflict handling | Processing、Device/Data、Search |
| Context Workspace | 高级区可选、flat-by-default、saved view 与 Collection 边界、relation provenance、批量撤销 | Reading Context、Maintenance、Export、Accessibility |
| Request-evidence / R0 | 继续 scoped boundary request；或由新证据形成 `W_L/W_F/W_V/L/F/V` 候选 | R0 protocol、candidate build、exact packet 与 future reopen condition |
| 任一 single-primitive state | 经新输出进入 `L+F/L+V/F+V`，或 partial rollback/rebase 到另一 single state | pair-interaction protocol、所有 union read/write dependencies、独立 verification |

v4 允许跨 packet cluster 的 Probe、reframing、verified rebase 与三个 pair state。pair state 在其独立 packet 尚未完成前属于 `required_authoring_surface`，不能进入 participant runtime；这是一项内容缺口，不是把跨模块探索判为概念错误。三个 pair state 必须做对称 authoring review，不能只给某一组合开放 future evidence。

## 12. Long-horizon / integration exact-state packets

这些 packet 不重复首次 evaluation。它们可以在剩余 `O1-O3` 中绑定未经修改的 candidate、输出后修订的 exact state、pair state，或新的 scoped R0 request；重点验证长期边界、新依赖和集成状态。所有 candidate state 继续运行相同 common core，state-specific secondary pack 只补充该 exact state 特有的信息。

每个 packet 继承相同的 participant-visible 槽位与逐层揭示规则：先发布 `headline + object index + boundary`，再按请求打开 Aggregate、Cohort/Exception、Trace/Relation 与 Raw/Receipt；下列内容同样是 authoring payload，不能一次性平铺成 Chat 回复。

未经修改 C1 的 E2 common-core outcome：

| Exact cell | Quick capture | Known-item refind | 首次正确解释正交状态 | Critical a11y tasks |
| --- | --- | --- | --- | --- |
| `CELL:HUB-C1` | 144/144，无新增必填 | 48/48 | 10/12 | 12/12，六项 ratio 均在 guard 内 |
| `CELL:FOCUS-C1` | 144/144，无新增必填 | 48/48 | 9/12 | 12/12，六项 ratio 均在 guard 内 |
| `CELL:CONTEXT-C1` | 144/144，无新增必填 | 48/48 | 10/12 | 12/12，六项 ratio 均在 guard 内 |

下表是 **C2 integration** 的 common-core outcome，不得回填到未修改的 C1：

| Family | Quick capture | Known-item refind | 首次正确解释正交状态 | Critical a11y tasks |
| --- | --- | --- | --- | --- |
| F1 | 144/144 | 48/48 | 11/12 | 12/12，六项 ratio 均在 guard 内 |
| F2 | 144/144 | 48/48 | 11/12 | 12/12，六项 ratio 均在 guard 内 |
| F3 | 144/144 | 48/48 | 10/12 | 12/12，六项 ratio 均在 guard 内 |

C2 E2 accessibility ratios（每格=`actions/time`，分母为同 protocol matched R0）：

| Family | Mobile | Keyboard | Screen reader |
| --- | --- | --- | --- |
| F1 | `1.10/1.12` | `1.12/1.15` | `1.16/1.18` |
| F2 | `1.04/1.06` | `1.06/1.07` | `1.08/1.09` |
| F3 | `1.10/1.12` | `1.16/1.17` | `1.18/1.19` |

### 12.1 未修改 C1 的 long-horizon `E2`

保留 C1 并授权第二阶段是完整路径，不要求制造 C2。以下三个 packet 由各自 exact C1 cell 直接命中，绝不假定 C2 的 preview、progressive disclosure、explicit explanation 或 conflict choice 已存在。

#### `CELL:HUB-C1`

- 48/48 known-item refind 成功，secondary state-view visit 为 8/48；topology-invariant median active steps 为 7，backtrack/clarification 为 6/48；
- 10/12 首次正确解释 pending 与 zero-membership；另外 2 位查看关系说明后纠正；
- 40 个 later-session batch attempt 中 36 个作用于预期 scope，4 个因 C1 只有 count-level confirmation 而在 commit 后使用 exact undo 修复；没有 object-level preview 或 progressive disclosure；
- mobile=`1.12/1.14`、keyboard=`1.14/1.16`、screen-reader=`1.16/1.18`；40/40 operation/count/filter confirmation、inverse receipt 和 protected payload closure current；
- boundary：统一入口习惯增加，但窄屏 state legibility 与跨 filter scope 仍未消失。

#### `CELL:FOCUS-C1`

- 36/36 backlog task 得到正确 disposition：31 个 processed-now、5 个 intentionally-deferred；9/12 首次正确区分 Focus、Inbox cleared 与 archive；
- 7/12 开启提醒，5/12 保持关闭；此分布不被解释为接受度排名；
- 12 个 offline/sync conflict case 均无数据丢失，5 个因 C1 仍使用 baseline conflict handling 而需要人工 clarification；不得借用 C2 的 explicit explanation/choice；
- mobile=`1.04/1.06`、keyboard=`1.07/1.08`、screen-reader=`1.09/1.10`；36/36 pre-commit target/prior→next preview、atomic delta、exact inverse、payload/membership closure current；
- boundary：Focus 的长期可理解性仍分 cohort，且主题组织问题没有改善。

#### `CELL:CONTEXT-C1`

- 第 14 日 16/18、第 30 日 16/18 恢复完整 target set；matched R0 分别为 15/18 与 14/18；
- 发生 9 次 rename、merge 或 abandon maintenance action；false inclusion 与 clarification 均高于 C2 包，且 C1 没有 simple-view default、object-level preview 或 progressive disclosure；
- mobile=`1.09/1.11`、keyboard=`1.16/1.17`、screen-reader=`1.19/1.19`；18/18 mutation receipt 显示 affected count、provenance、exact inverse，export/import closure current；
- canonical identity、protected payload、Global Search、legacy route/deep-link、post-save continuity 与 navigation/surface verification current；
- boundary：长期恢复优势与维护、理解和遍历成本同时存在，不能推导 compulsory adoption。

### 12.2 Linked Hub `C2` integration 包

- 48/48 找回成功，secondary state-view visit 为 5/48；该 route 指标仍只作 topology 描述；
- topology-invariant median active steps 为 6，backtrack/clarification 为 4/48；
- 11/12 正确解释两个正交状态，剩余 1 位通过查看关系说明完成纠正；
- 44 个 batch attempt 中 4 个在 scope preview 后取消、40 个 commit、0 个 wrong-scope；其中 1 个随后因产品判断改变而使用 undo；
- legacy route、deep link、import/export、mobile、keyboard 和 reader checks current；44/44 scope preview/commit-or-cancel receipt 与 40/40 committed inverse receipt current；
- 12 个 Search-first 回访任务中 9 个直接使用 Search，说明 Hub 并非所有路径的必要入口；
- progressive disclosure 降低窄屏密度，但二级 filter 发现成本仍存在；六项 a11y ratio 见 C2 表，判定均基于未四舍五入值。

### 12.3 Focus Queue `C2` integration 包

- quick save 保持无新增必填步骤；
- 36/36 个 backlog task 得到正确 disposition：34 个 processed-now、2 个 intentionally-deferred；11/12 首次正确区分 Focus、cleared、archive 和 Collection；
- 6/12 主动进入 opt-in Focus，另 6 位继续使用 Search、Inbox 或 Collections，两类路径都能完成；
- 12 个离线/同步 conflict case 均无数据丢失，其中 3 个要求用户显式选择 current state；
- 主题浏览和多上下文归组没有因 Focus 得到改善；
- 12/12 critical a11y tasks current，六项 ratio 见 C2 表；36/36 pre-commit target/prior→next preview、atomic delta、exact inverse 和 protected payload receipt current；
- 当前证据支持把 Focus 做成可选 mode，也允许因 cohort 边界而 defer，不能授权默认强制开启。

### 12.4 Context Workspace `C2` integration 包

- target item set、precision/recall 和 false-inclusion rules 在 C1 前已冻结；第 14 日 17/18 个任务恢复完整目标组，matched R0 为 15/18；第 30 日为 17/18，matched R0 为 14/18；两个时点分别报告，不合并掩盖时间效应；
- 12/12 首次 workspace-setup mutation 在 commit 前有 affected-object preview，commit 后有 provenance 与 exact inverse；其中 3 个错误 relation link 经 inverse 修正；另有 7/7 后续 rename、merge 或 abandon maintenance mutation 具备同样的 preview/provenance/inverse，没有数据丢失；
- 4/12 轻量 profiles 始终停留 simple view，其中 2 位在首次看到高级区时需要 clarification；
- relation、Note、Tag 和 multi-membership 的 export/import round-trip 保持 provenance；
- 12/12 mobile/keyboard/reader critical tasks 完成，六项 ratio 见 C2 表；12/12 setup、7/7 maintenance 与 3/3 relation correction receipts current；
- canonical identity、protected payload、Global Search、legacy route/deep-link、post-save continuity 与 navigation/surface verification current；
- 结果支持特定主题情境，也暴露真实 setup、maintenance 和 comprehension 成本；接受 optional mode、partial rollback 或 defer 均可成立。

### 12.5 Exact single-primitive state packets

Partial acceptance 不靠从完整包中挑有利 bullet。以下 participant-safe payload 均绑定 exact single-primitive state，但 packet eligibility 仍由 `stateEvaluationClass + evaluationOrdinal + requiredPredecessorReceiptRefs` 决定；表中同一 state 名称不能越过 eligibility key 借用结果。Candidate 与 matched-R0 aggregate/trace 在同一 reveal 原子发布，仍使用 CommonCore、BranchObservation、Subgroup/Exception、Verification、Boundary 五个槽位。

- `CELL:HUB-P1` 当前 packet 只覆盖 `W_L output -> revise to L -> long_horizon`，required predecessor 为对应 W_L result 与 L verification；R0 直接形成 L 仍缺 first-evaluation packet。
- `CELL:FOCUS-P1` 已有 frozen packet 只覆盖 `W_F output -> revise to F -> long_horizon`，required predecessor 为对应 W_F result 与 F verification。v4 attention witness 新增 `PACKET:F-DIRECT-FIRST-EVAL-v1`，其 subject 是 `CELL:FOCUS-NR-C1`，lineage 为 `R0 evidence -> participant Commit no-reminder Focus -> first evaluation`；第一次 output 后再由 participant 修订为 `CELL:FOCUS-P1`，对应新的 `PACKET:F-DIRECT-REVISED-E2-v1`。两份 packet 在 raw manifest、matched-R0 reconciliation 与 receipts 完成前都保持 `authoring_pending`，不得借用下表既有 long-horizon payload 或进入正式 runtime。
- `CELL:CONTEXT-P1` 的下表 payload 冻结为 `PACKET:V-DIRECT-LONGHORIZON-v1`：evaluator replica 从 sealed matched R0 item/profile manifest 直接安装并验证 exact V，再运行第 14/30 日 protocol；required predecessor 是 `VERIFY:V-FROM-R0`，不需要也不读取 W_V result。若从 W_V revise 到 V，必须另有 `PACKET:V-AFTER-WV-*` eligibility key，不能自动借用 direct packet。

| Exact cell | 完整 common core | Branch observation + matched R0 | Subgroup / exception | Reversibility / closure | Boundary |
| --- | --- | --- | --- | --- | --- |
| `CELL:HUB-P1` | capture 144/144；refind 48/48；state 11/12；a11y 12/12，mobile=`1.06/1.08`、keyboard=`1.10/1.12`、reader=`1.14/1.16` | topology-invariant median steps 7 vs R0 8；backtrack/clarification 6/48 vs R0 9/48；P1 不存在 batch/persistent-selection task | 12 个 Search-first 中 9 个直接 Search；1/12 窄屏 profile 需 state clarification | legacy/deep-link、identity、Search、payload 和 navigation/surface current；本 revision 无 batch mutation | 降低导航重建但放弃批量收益；state density 仍需长期观察 |
| `CELL:FOCUS-P1` | capture 144/144；refind 48/48；state 11/12；a11y 12/12，mobile=`1.03/1.05`、keyboard=`1.05/1.06`、reader=`1.07/1.08` | 36/36 disposition 正确；median active steps 6 vs matched R0 Inbox-only 7；notification capability 已移除；12 conflict cases 无数据丢失 | 6/12 使用 manual Focus，6/12 沿 Search/Inbox/Collections；3/12 conflict cases 触发显式选择 | 36/36 target/prior→next preview、inverse、identity、payload/membership receipt current；Search/export/sync closure current | 保留手动 Focus 但失去 reminder value；不能外推到提醒使用情境 |
| `CELL:CONTEXT-P1` / `PACKET:V-DIRECT-LONGHORIZON-v1` | capture 144/144；refind 48/48；state 10/12；a11y 12/12，mobile=`1.07/1.09`、keyboard=`1.12/1.14`、reader=`1.15/1.17` | 仅保留 saved view；第 14 日 16/18 vs matched R0 15/18，第 30 日 16/18 vs matched R0 14/18；compare/relation context 均不存在 | 5/12 使用 saved view，7/12 保持 simple view；2/12 首次进入 advanced area 需 clarification | 12/12 setup 与 4/4 maintenance mutation 有 affected-count preview、provenance、inverse；identity、payload、Search、legacy/deep-link、post-save continuity、import/export round-trip current | 维护成本降低但不能回答 relation/compare 的恢复价值 |

`PACKET:F-DIRECT-FIRST-EVAL-v1` 的 participant-safe authoring payload 固定为：36/36 disposition 正确，32 个 processed-now、4 个 intentionally-deferred，5/36 的首次状态解释需要澄清；6/12 使用 manual Focus，6/12 沿 Search/Inbox/Collections；12 个 conflict cases 无数据丢失，其中 5 个因 baseline conflict expression 需要人工说明；12/12 critical accessibility tasks 完成，六项 ratio 按 `CELL:FOCUS-NR-C1` 的 direct matched-R0 protocol 独立计算；一条 Weekend Reading trace 揭示“清除 Inbox 与 Focus 不等于 archive，Collection 保留”。该 packet 不包含 reminder capability、explicit conflict choice 或主题组织效果。

`PACKET:F-DIRECT-REVISED-E2-v1` 只在 first-evaluation result、participant revision intent、`CELL:FOCUS-P1` implementation 与 verification 全部 current 后发布：36/36 disposition 正确，34 个 processed-now、2 个 intentionally-deferred；11/12 首次正确区分 Focus、cleared、archive 与 Collection；6/12 使用 manual Focus、6/12 保持原路径；12 个 conflict cases 无数据丢失，其中 3 个实际触发并列来源后的明确选择；36/36 state mutations 有 preview/inverse，12/12 critical accessibility tasks current。它仍无 reminder，且明确不改善主题组织。

### 12.6 后续 R0 boundary 包

如果连续 output epoch 都用于 R0，后一个 request 必须回答与先前 R0 packet 不同的预冻结问题。例如 state-legibility boundary pack：

- `[lineage]` 延续 E1:R0 的同一 12 个 profiles，0 missingness；24 个 balanced tasks=`12 profiles × 2 contexts`，且 request/protocol/R0 digests current；
- 24 个 balanced new/return context tasks 中，9 个明确进行有意状态核对、7 个发生额外 context reconstruction、8 个沿单一路径直接完成；
- v4 crosscase child 把 7 个额外 reconstruction 分解为：5 个同时具有 theme-boundary change、Note insufficient、multi-project 中至少两项，2 个没有该交叉；8 个 direct tasks 中 6 个属于 boundary stable + single-project + Note sufficient，2 个不完全符合该模式；
- 10/12 首次正确解释 pending 与 zero-membership，2 位在查看历史决定后纠正；
- 12/12 accessibility tasks current，Search、Collections 和两种 saved surface 均有合法完成路径；
- 该包可以支持 `baseline_retained` 或形成 future product hypothesis，但不能声称 R0 已经最优。

上述 crosscase child 在 task-level raw reconciliation 完成前标为 `PACKET:R0-STATE-BOUNDARY-CROSSCASE-v1 / authoring_pending`。它只能描述共现与反例，不能把复杂度组合提升为原因，也不能把 deliberate checking 编码为 repair。

## 13. Reopen、freshness 与版本关系

任何 relevant mutation 都产生新 revision，但 freshness 是 `evidence × subjectRevision × protocol × dependencyReadSet` 的关系，不是整份历史上的全局布尔值。父 revision 的 evidence 对父 revision 仍可 current；当新 revision 的 write set 与其 read set 相交时，它只会对该新 revision 变为 `not_applicable/stale_for_branch`。旧事实不删除，也不能冒充新 candidate 的结果。

```text
ProductState = <
  semanticStateDigest,
  artifactDigest,
  moduleStates,
  activeEvidenceFrontier,
  openAndReopenedUnknowns,
  protectedGuardState,
  currentVerification,
  stateEvidenceFrontiers,
  parentRevisionRefs: exact set
>

EpistemicState = <
  visibleObjectRefs,
  workingSets,
  comparedRevisionRefs,
  acceptedAndRejectedHypotheses,
  reopenedUnknowns,
  knownEvidenceFreshness,
  lastTriggerRef
>

EpistemicTransition = <
  transitionKind: acquire | reveal | disambiguate | validate | compare | constrain | substitute | reclassify | reinterpret | reopen | request_evidence | working_set_update | verify,
  fromVisibleSnapshotDigest,
  toVisibleSnapshotDigest,
  subjectObjectRefs,
  traversedRelationRefs,
  addedOrReweightedUnknownRefs,
  freshnessChanges,
  participantOrMachineActReceipt,
  transitionVerification
>

ProductRevisionTransition = <
  transitionKind: candidate_commit | promote | revise | compose | merge | rebase | candidate_discard | rollback,
  fromSemanticStateDigest,
  toSemanticStateDigest,
  parentRevisionRefs: exact set,
  childRevisionRef?,
  participantIntentDigest,
  affectedModules,
  dependencyReadSet,
  dependencyWriteSet,
  invalidatedEvidence,
  invalidatedVerification,
  committedRevision,
  transitionVerification
>
```

名义上的新消息、候选名称或界面标签不改变 `semanticStateDigest`，就不算产品 state transition。Candidate manifest 必须从实际 committed build 中提取；不能根据 participant 的关键词选择预写 branch。相同 semantic/artifact state、frontier 和 protocol 必须复现相同 evidence，不允许通过重试 reroll。

关键依赖：

```text
Capture -> SaveReceipt -> Post-save continuity
Organization -> membership -> Unsorted projection -> Surface
Identity -> Surface + Organization + Search + Import/Export
Navigation -> all route observations + deep links
Shared workspace -> Surface + Organization + Navigation + Accessibility
Batch operation -> Organization + Identity + Undo + protected payload
Focus state -> Processing + Search + Device/Data
Context relation -> Reading Context + Organization + Export + Accessibility
```

规则：

- 改变 surface topology，会使读取旧 route 的 E0/E1 路径证据对新 branch 标记为 `stale_for_branch`；它们对原 subject revision 保持其既有 current/historical 状态；
- 改变 membership projection，会重新打开 Surface 与 Organization 的联合验证；
- 改变 identity policy，必须重新验证 Search、import/export、surface 和 organization；
- 改变 save-time salience，必须重新验证 quick capture 和 post-save continuity；
- 丢弃从未移动 `trialCurrentRevision` 的隔离 candidate 是 `reject/discard candidate branch`，不是 rollback；
- rollback 只指 `trialCurrentRevision` 已从 ancestor 移到 adopted descendant 后再实际移回 ancestor；它是一个新 transition，必须重新验证恢复后的真实状态；
- rollback、discard 或 rebase 只改变产品 current pointer/lineage；EpistemicState 保留已见证据、比较与被否定假设；
- reopen 必须创建新的 event/epoch 并引用历史状态，不能原地重写旧 acceptance；
- merge 必须记录 parents、保留/舍弃的 delta、冲突处理和新验证；
- participant 建立的比较组或 working set 必须记录成员、来源、revision 和创建理由，不能变成无 provenance 的答案集合；
- refutation 使用 `challenges/supersedes`，不得改写原始 evidence。

`EpistemicTransition` 构成允许 revisit、compare、reopen 和 reinterpret 的非 DAG semantic ledger；每次 Probe reveal 都生成新的 `toVisibleSnapshotDigest`。`ProductRevisionTransition` 构成不可变 revision DAG，merge/compose 可以有多个 `parentRevisionRefs`；event/provenance ledger 仍按 epoch 与 ordinal append-only。rollback 是追加事件并移动 current pointer，不删除 descendant、旧 evidence 或 provenance。

## 14. 多个合法终态

参与者最终提交的是可审计的产品方向包，而不是代码或固定答案。其语义内容包括：目标使用情境、选择或组合的方向、主要证据链、保留约束、被拒但仍合理的方向、修订理由、当前风险和下一次 reopen 条件。

```text
EndpointInput = <
  currentSemanticStateDigest,
  historicalAcceptedRevision,
  trialCurrentRevision,
  safeStateRevision,
  proposedFinalRevision?,
  candidateRevision?,
  qualifyingEvidenceReceipts,
  currentGuardAndVerificationClosure,
  requiredInfoActionVerificationEdges,
  typedParticipantDisposition,
  revisionIsPartial?,
  revisionIsOptionalMode?,
  partialDelta?,
  pointerTransitionReceipt?,
  packetEligibilityStatus,
  outOfManifold,
  acceptedAndRejectedDeltas,
  acknowledgedTradeoffs,
  deferredUnknownsAndReopenConditions,
  pendingWorkFenceReceipt?,
  pendingWork
>
```

| EndpointSet | Condition-neutral predicate |
| --- | --- |
| `ACCEPT_VERIFIED_STATE` | `typedParticipantDisposition=accept_verified_state`；`outOfManifold=false`；`proposedFinalRevision=trialCurrentRevision=candidateRevision`；normalized state 唯一命中 `M_planned`，且当前 `<stateDigest, PacketEligibilityKeyDigest, FrozenPacketManifestDigest>` tuple 命中 `M_runtimeEligible`；全部 active primitives/pair interaction、affected modules、required edges、guards 和 verification current；保留/舍弃 delta、trade-off、unknown 与 reopen condition 完整；无 pending work |
| `ROLLBACK_TO_VERIFIED_ANCESTOR` | `typedParticipantDisposition=rollback_to_verified_ancestor`；qualifying receipt 先绑定已 adopted descendant；pointer receipt 再证明 current pointer 实际移回 verified ancestor；`proposedFinalRevision=trialCurrentRevision=ancestor`；恢复状态的 modules、guards、verification 和 required edges current；descendant evidence 留在 EpistemicState/history；无 pending work；`outOfManifold=false` |
| `RETAIN_BASELINE` | `typedParticipantDisposition=retain_baseline`；无伪 rollback；`trialCurrentRevision=proposedFinalRevision=R0`；至少一份与当前决定相关且 current 的 scoped R0 result 已发布；R0 modules、guards、verification、required edges current；相关 unknown 与 reopen condition 被承认；不声称 R0 全局最优；无 pending work；`outOfManifold=false` |
| `DEFER_AT_SAFE_STATE` | `typedParticipantDisposition=defer_at_safe_state`；`proposedFinalRevision=∅`；`outOfManifold=false`；`safeStateRevision=trialCurrentRevision` 且与 current digest 一致；该 state 的 modules、guards、verification 与 required edges current；decision-sensitive unknown、scope、reopen/expiry 条件完整；`pendingWork=∅`，曾存在的工作均有 cancellation/fence receipt |
| `PACKET_UNAVAILABLE_DEFER` | `typedParticipantDisposition=packet_unavailable_defer`；actual state 唯一命中 `M_planned`，但当前 exact `<stateDigest, PacketEligibilityKeyDigest, FrozenPacketManifestDigest>` tuple 不在 `M_runtimeEligible`；`outOfManifold=false`；没有近邻或拼接结果；safe state、guards、verification 与 required edges current；缺失 PacketEligibilityKey/manifest、authoring requirement 与 reopen condition 明确；pending work 已 fence |
| `UNSUPPORTED_STATE_DEFER` | `typedParticipantDisposition=unsupported_state_defer`；`proposedFinalRevision=∅`；`outOfManifold=true`；qualifying receipt 记录 exact unsupported state、epoch 与零/多 manifest 命中，且没有近邻结果；safe state、guards、verification 与 required edges current；pending work 已 fence；reopen 条件明确 |

`revisionIsPartial`、`revisionIsOptionalMode`、`revisionIsCompound` 和 `capabilityPrimitives` 由 sealed extractor 从 normalized exact state 派生，只作为描述、分层或预注册 secondary analysis 字段，不决定 participant 必须进入哪一种终局。Participant 只需自然表达接受范围；condition-blind compiler 选择唯一通用 predicate，不向 participant 暴露 endpoint label。

Validator 不读取或预写 `finalAcceptedRevision`。唯一 predicate 成立后才生成：

```text
EndpointValidationOutput = <
  uniqueEndpoint,
  validatedProposedFinalRevision?,
  endpointInputDigest,
  validationReceipt
>

atomic terminal commit:
  CAS(terminalStatus=OPEN
      + expected trialCurrentRevision
      + endpointInputDigest
      + finalAcceptedRevision=empty
      + TerminalCommitReceipt=absent)
    -> assert accepting/rollback/baseline proposedFinalRevision == trialCurrentRevision
    -> finalAcceptedRevision = validatedProposedFinalRevision
       OR no final revision for valid defer
    -> TerminalCommitReceipt
```

CAS 成功后同时设置 `terminalStatus=COMMITTED`；即使 valid defer 不写 final revision，receipt/status 也阻止重复提交。CAS 失败、input digest 改变、已有 terminal receipt 或 predicate 不再唯一时不写/覆盖终态，并回到 neutral clarification/重新验证；因此不存在“为了命中 endpoint 而提前写 final pointer”的循环或二次终态覆盖。

`PACKET_UNAVAILABLE_DEFER` 与 `UNSUPPORTED_STATE_DEFER` 都是诚实的安全 disposition，并单列为 `primaryEndpointAttained=false`；前者区分“planned 但 packet 尚未冻结”，后者才是 out-of-manifold。二者都保留 assignment，不能为了得到后续 packet 而改投邻近 state，也不与常规 exact-state outcome 合并。

`NoncompletionOrAbortSet` 与 EndpointSet 分离：

- `early_stop`：在没有满足宏观产品 endpoint 时停止，作为观察到的 noncompletion/competing outcome 报告；
- `withdrawal`：参与者撤回，不进入产品 endpoint；
- `technical_invalid`：guard、isolation、lineage 或 publication 失败；
- `publication_failed`：没有 current participant-visible result，不能用 hidden/stale 包结束。

Typed disposition 先由 condition-blind compiler 规范化。若零个 endpoint predicate 命中，则 neutral clarification 或 incomplete；若两个以上同时命中，则 `ambiguous_endpoint` fail closed，不能用优先级猜测。`withdrawal > technical_invalid > publication_failed > early_stop` 只用于 mutually exclusive trial-status 编码，不把 abort 伪装为产品终态。

硬 validity oracle 只判断实际 state、evidence、guard、freshness 和 participant decision 是否一致，不评判哪个产品方向最好，也不读取 condition、对象使用率、Chat turn 或 intent 是否改变。决策质量由独立盲评 rubric 报告，至少分开评估 evidence coverage、trade-off calibration、scope appropriateness、internal coherence 和 traceability；rater 看不到 condition、对象 uptake 和 interaction cost，质量不与速度合成一个分数。

## 15. 参与者信息图

```mermaid
flowchart TD
  G[stable goal + guards] --> E0[E0 trigger on verified R0]
  E0 --> F0[canonical F0@R0]
  F0 --> P0[Probe]
  P0 --> F0P[derived F0@R0#p_n; new snapshot digest]
  F0P --> P0
  F0 --> D0[Commit exact state or scoped request in TransitionSupport]
  F0P --> D0
  D0 --> V0[Verify lineage / state / request / guards]
  V0 --> O1[O1@exact subject]

  O1 --> F1[canonical F1@subject]
  F1 --> P1[Probe / compare / revisit / reinterpret]
  P1 --> F1P[derived F1@subject#p_n]
  F1P --> P1
  F1 --> D1[Commit next exact state / request / discard / rollback / rebase]
  F1P --> D1
  D1 --> V1[Verify current product + retained epistemic state]
  V1 --> O2[O2@exact subject]

  O2 --> F2[canonical F2@subject]
  F2 --> P2[Probe / cross-revision compare / reopen]
  P2 --> F2P[derived F2@subject#p_n]
  F2P --> P2
  F2 --> D2[Commit next exact state / request / discard / rollback / rebase]
  F2P --> D2
  D2 --> V2[Verify current product + retained epistemic state]
  V2 --> O3[O3@exact subject]

  O3 --> F3[canonical F3@subject]
  F3 --> P3[Probe / verify trade-off and boundary]
  P3 --> F3P[derived F3@subject#p_n]
  F3P --> P3
  F3 --> DISP[participant disposition]
  F3P --> DISP
  DISP --> ADOPT[promote/adopt candidate then verify current pointer]
  DISP --> RETAIN[retain verified R0]
  DISP --> RBACK[rollback adopted descendant to verified ancestor]
  DISP --> DEFER[defer at verified safe state]
  ADOPT --> T[condition-neutral EndpointSet]
  RETAIN --> T
  RBACK --> T
  DEFER --> T
```

`F_k@subject` 中的 subject 由实际 output 决定，例如 `F1@W_L`、`F1@W_F`、`F1@W_V`、`F1@R0-request`，它们拥有不同的 `TransitionSupport` 与独立 canonical NTE snapshot，绝不先汇入一个通用 F1。相同规则适用于每个 exact-state `F2/F3`。

fan-in 发生在 parent-free normalized state，而不是先合并 frontier。例如 `F1@W_L -> CELL:L+V` 与 `F1@W_V -> CELL:L+V` 可以产生相同 semantic digest，但各自保留不同 RevisionLineageReceipt；只有相应 `PacketEligibilityKey` 完整时才进入同一 state-specific output protocol。

discard、rollback 或 rebase 之后，下一节点写作 `F_(k+1)@R0+history`：ProductState 为重新验证的 R0，EpistemicState 仍携带先前结果。它不会回到 E0/F0，也不会重置 epoch 或重用初始 NTE。Probe 的回边同样总是落到新的 derived snapshot，不是回到原 canonical frontier。

该图是 participant semantic opportunity graph。与之并行的 revision lineage 仍是不可变 DAG，event/provenance ledger 仍 append-only。早期停止不从图中删除；它作为 assigned-condition 的 observed noncompletion/competing outcome 保留，而不是被排除或默认视为 non-informative censoring。完整机会图的深度不能反过来成为 participant inclusion rule。

## 16. A/B 两种访问路径

冻结关系：

```text
Facts_A(S) = Facts_B(S)
SemanticOps_A(S) = SemanticOps_B(S)
TransitionCore_A = TransitionCore_B
EvidenceSchedule_A = EvidenceSchedule_B
OpportunitySpec_A(O) = OpportunitySpec_B(O)
EndpointSet_A(S) = EndpointSet_B(S)
NoncompletionOrAbortClassifier_A(S) = NoncompletionOrAbortClassifier_B(S)
TrialStatusEncoding_A(S) = TrialStatusEncoding_B(S)
ModelBackendPrompt_A = ModelBackendPrompt_B
ToolAndExecutionPolicy_A = ToolAndExecutionPolicy_B
SamplingSeedRetryFallback_A = SamplingSeedRetryFallback_B
AgentInput_A = AgentInput_B = common Chat semantic projection + current product state

Paths_A = full Chat
Paths_B = full Chat + optional object paths
```

Agent input 明确排除 condition、B-only anchors、expanded/selected state、object role/ref、render state 和 object telemetry。A 的自然语言请求与 B 的 Chat/显式对象请求先进入同一 normalizer；语义等价时必须得到相同 evidence、transition、verification、reply policy 和 terminal digest。

| 信息行为 | A：完整 Chat | B：相同 Chat + 可选对象 |
| --- | --- | --- |
| 回看历史决定 | 滚动、搜索、自然语言询问 | 相同能力，也可从已出现 Decision 原位展开 |
| 从 aggregate 到 trace | 要求查看 cohort、例外或原始路径 | 相同能力，也可沿 `derived_from` 展开 |
| 比较多个证据 | 在 Chat 中指明对象或让 Machine 重述 | 相同能力，也可多选形成工作集 |
| 跨模块追关系 | 询问依赖、冲突或受影响范围 | 相同能力，也可 follow relation |
| 回访旧 revision | 搜索历史并询问 current/stale | 相同能力，也可沿 version rail 回访 |
| 提交产品意图 | 自然语言 | 相同完整 Chat；选择对象只可辅助指代 |
| 实现、验证、回滚 | 自然语言调用相同 Machine 能力 | 相同 Chat 或对象辅助指代，进入同一 semantic core |

Architecture-level A route 已在此冻结，不推迟到 GUI 阶段：

| 对象/字段 | A 中无需 opaque ref 的自然语言路径 | B 的可选附加路径 |
| --- | --- | --- |
| Goal/Guard | “当前稳定目标是什么？哪些内容不能改变？展开可访问性阈值。” | 从已出现 Goal/Guard 展开 |
| Historical Decision | “为什么 Inbox 和 Unsorted 被定义为独立状态？给我原始历史和验证。” | 从 Decision 追到 source/receipt |
| EvidencePack/Boundary | “展开四日试用的观察、适用人群、协议范围和未测内容。” | 原位展开 pack 与 boundary |
| Cohort/Aggregate | “按四种状态分组比较找回路径，给 denominator。” | follow `derived_from` 或 compare |
| Trace/Timeline | “给一个与总体趋势不同的具体 trace，以及当时 item 状态。” | 从 cohort 下钻到 trace |
| Relation/Provenance | “这条记录当时属于哪些 Collection？该结论来自哪些 raw events？” | follow relation/source |
| Candidate/Delta | “当前候选实际改变了哪些模块、状态和 route？哪些 guard 保持不变？” | 从 Candidate 展开 delta/dependency |
| Verification/Freshness | “哪些回执 current？这次改动让哪些旧证据 stale？” | version/freshness navigation |
| Comparison/Working set | “比较这些已公开证据/候选的共同点、冲突和边界。” | 显式多选后发同一 scoped request |
| Action/Disposition | “按这个意图实现并验证”“回滚到已验证 R0”“保持当前安全状态并说明 reopen 条件” | 对象只辅助指代，调用同一 transition core |

任一 participant-visible 字段必须可由上述模式与自然名称取得；实现时若新增字段，必须同步增加 A route conformance，不能把新字段变成 B-only 能力。

B 全程不用对象仍是有效 B trial。对象只有在参与者真实选择、展开或建立 scoped request 后才计为对象事件，不能自动注入 `selectedObjectRefs`。

### 16.1 这份剧本实际承载 Claim 的位置

对象通路不负责让参与者更快决定“该关心什么”。只有当最近输出已经让某个对象或关系对该参与者显著、且参与者开始取得信息或指定操作后，下面这些同信息语义边才构成成本机会：

| 已显著的对象/边 | A：完整 Chat 中的等价路径 | B：可选对象路径 | 预期承载的可观测成本 |
| --- | --- | --- | --- |
| `21/48` aggregate → Offline-first trace | 用自然语言重新定位“刚才那个跨两个入口的数字”，请求一条完整案例并消歧范围 | 从已自然提及的 aggregate 展开一个有来源 trace | target re-identification、request specification、context reconstruction |
| Offline-first 在 R0 / Linked / D30 的状态 | 重述条目名、版本、日期和希望比较的字段 | 从同一稳定 SavedItem 打开 version-bound state/lineage | referent repair、version disambiguation、comparison/verification |
| `3/40` undo → 6 条中多选 1 条 | 确认是哪组三次、哪个候选、哪一次撤销，再索取 scope | 从 aggregate 到 exception 再到 mutation receipt | exception location、scope reconstruction、source verification |
| Focus 完成前后状态 | 用语言重建 Focus、Inbox、Archive 与 Collection 的前后关系 | 打开已发布 state-delta receipt 与 inverse | relation reconstruction、operation specification、post-action verification |
| `9` 个 repeated reorganization → D2/D11/D18/D30 | 多轮恢复条目、时间和 membership 变化 | 从条目对象进入有界时间线 | long-history retrieval、temporal reconstruction |
| `4` 次 saved-view maintenance → 一次改名 | 重新定位当前 revision 和四次中的具体事件 | 从 maintenance aggregate 进入 exact event/provenance | exception targeting、provenance check |

每一行都要求 `Facts_A=Facts_B`、同一 semantic endpoint、同一 Machine policy 与同一 evidence schedule。B 的锚点只能在对象已经由共同 Chat 自然出现后存在；不得提前显著化作者希望参与者选择的方向，也不得为 B 额外生成摘要。A 通过自然语言取得同一字段的 conformance test 与 B 的稳定对象 identity 必须同时通过。

确认性分析只使用预注册、两条件共同 eligible 的 opportunity。上述开放轨迹中的 self-selected 边可以作为生态效度与机制诊断，不能在事后按对象使用与否挑选成主效应样本。点击、展开或更少 Chat turn 也不能单独证明 Claim；必须与首次进入 acceptable semantic state、protected-state 保持和质量评分共同解释。

## 17. Future evidence 揭示日程

| 阶段 | 可以存在 | 必须不存在 |
| --- | --- | --- |
| R0 history | Goal、Decision、Guard、R0 Verification | E0、candidate、future branch |
| E0 published | R0 headline、boundary、按 Probe 出现的 aggregate/raw children、canonical F0 | future candidate/request result、packet cluster label、NTE distribution |
| candidate committed for `O_k` | Intent、actual Candidate、Delta、lineage、Verification、normalized exact state | 未完成 evaluation 的 `O_k`、任何不匹配 exact state 的 result |
| evidence request committed for `O_k` | Request scope、protocol eligibility、current subject digest | 未完成的 `O_k`、任一 future candidate result |
| `O_k` revealed | 当前 exact subject state/request 的 headline、object index、boundary 与按 Probe children | `O_(k+1)`、未命中 state、hidden pair interaction、ranking/oracle |
| next epoch authorized | 当前 revision/request、reopen/invalidation、new verification、remaining horizon | 未完成 evaluation 的下一 packet |
| terminal committed | 当前 state、历史 evidence、accepted/rejected deltas、trade-off、unknown、reopen condition | 未揭示 future packet、hidden score、未选 state result |

未来对象不能先注册再用 CSS 隐藏；在逻辑上必须不可寻址。B 只能锚定已经由共同 Chat 自然发布的对象。每次 reveal 都必须通过第 6.4 节的 atomic publication gateway；Machine 不能读取 hidden bundle 后自行重述。

## 18. 预注册的 episode opportunities

`EndpointSet` 是整场产品 disposition；它不能代替局部 output-contingent episode 的 acceptable GoldSet。预注册静态定义与 trial 后观测必须分开：

```text
OpportunitySpec = <
  specVersion,
  opportunityId,
  templateId,
  matchedTaskSetRef,
  goalRef,
  canonicalSubjectStateDigest,
  canonicalFrontierDigest,
  eligibleEpochClass,
  triggerClass: state_contingent_output | predeclared_directed_request,
  qualifyingTriggerRef,
  episodeClass,
  complexityClass,
  counterbalanceScheduleRef,
  sandboxResetClass,
  preStudyNteRef,
  analysisContractId,
  requiredSemanticEdgeBundle,
  acceptableGoldPredicates[],
  executableVerifierRef,
  protectedPredicates,
  clockSource,
  fixedWaitingExclusionPolicy,
  pausePolicy,
  deferAndNoncompletionOutcomeClass
>

OpportunityObservation = <
  opportunitySpecDigest,
  trialRef,
  counterbalanceSequenceRef,
  periodOrdinal,
  sandboxResetReceipt,
  exposureReceipt,
  actualSubjectRevisionRef,
  actualFrontierDigest,
  epochRef,
  triggerVisibilityReceipt,
  tTriggerStableVisible,
  tFirstVerifiedGold,
  targetDuration,
  informationDuration,
  actionDuration,
  verifyDuration,
  activeDuration,
  wallDuration,
  fixedWaitingDuration,
  pauseDuration,
  repairAndBacktrackEvents,
  matchedGoldPredicateRef?,
  outcomeStatus,
  observationReceipt
>

OpportunitySpec_A(opportunity) = OpportunitySpec_B(opportunity)
SessionEndpointSet_A = SessionEndpointSet_B
```

一条 observation 只有在以下条件全部成立时才可进入相应分析集合：`opportunitySpecDigest` 精确命中冻结 Spec；actual subject/frontier/epoch/trigger visibility 与 Spec 一致；counterbalance sequence、period 与 sandbox reset receipt 有效；exposure receipt 证明该 trigger 在对应 A/B 中以相同 participant-safe 内容稳定可见；canonical pre-study snapshot digest 匹配；Gold verifier 与 Endpoint/Noncompletion classifier 使用 Spec 中的版本。任一 digest、period、reset、snapshot 或 exposure 不匹配都 fail closed，不得用邻近 opportunity 补齐。该 conformance contract 仍需在 runtime 中实现；目前只完成架构定义。

当前场景的开放连续经历、独立 common anchors 与 directed controls 至少定义以下 canonical contracts。后两者在隔离 period 中发生，不是开放剧本的隐藏必经路线。`preStudyNteRef` 与 `analysisContractId` 在独立预试和论文/SAP 显式绑定前保持 pending；pending contract 可以用于内容审阅，不能冒充已冻结 scored episode：

| Opportunity | Qualifying Trigger | 预注册语义负担 | `acceptableGoldPredicates[]`（首次 verified 命中任一即结束） | 当前分析地位 |
| --- | --- | --- | --- | --- |
| `OP:COMMON-LOCAL-STATE` | shared isolated output 首次揭示同一 item 已有 membership 且仍为 Inbox pending | `MATCHSET:STATE-ORTHOGONAL` 的 local template；单一 SavedItem、单一正交状态关系，不要求 product mutation 或 dependency propagation | `GOLD:LOCAL-DISAMBIGUATED`：正确保留 membership 与 pending 两字段及 canonical identity；或 `GOLD:LOCAL-QUALIFIED-UNKNOWN`：明确指出当前 output 不足以推断动机 | `episodeClass=output_contingent`、`complexityClass=local`；所有 randomized participants eligible；candidate confirmatory anchor，NTE/analysis binding pending |
| `OP:COMMON-COMPOUND-WL` | shared isolated W_L output 首次同时揭示 route benefit、state-legibility exception、scope exception 与 Search-first boundary | `MATCHSET:STATE-ORTHOGONAL` 的 compound template；多个 evidence objects、两类 exception、candidate freshness、Surface/Organization/Navigation/Accessibility protected predicates 的共同判断 | `GOLD:COMPOUND-REVISE-EXACT`、`GOLD:COMPOUND-DISCARD-AND-REQUEST`、`GOLD:COMPOUND-KEEP-FOR-PROTOCOL`、`GOLD:COMPOUND-SAFE-DEFER` | `episodeClass=output_contingent`、`complexityClass=compound`；所有 randomized participants eligible；candidate confirmatory anchor，NTE/analysis binding pending |
| `OP:COMMON-LOCAL-PORTABILITY` | shared isolated output 首次显示 `VERIFY:R0` 的 import/export receipt 与其 exact R0 revision/scope | `MATCHSET:PORTABILITY-CURRENTNESS` 的 local template；一个 receipt、一条 `verifies` relation 与一个 subject revision | `GOLD:LOCAL-RECEIPT-CURRENT`：把 receipt、R0 与声明范围正确绑定；或 `GOLD:LOCAL-RECEIPT-QUALIFIED-UNKNOWN`：指出 output 缺少的 currentness/scope 条件 | `episodeClass=output_contingent`、`complexityClass=local`；所有 randomized participants eligible；candidate confirmatory anchor，NTE/analysis binding pending |
| `OP:COMMON-COMPOUND-PORTABILITY` | shared isolated optional-context candidate output 同时显示 export round-trip、canonical identity、multi-membership、source provenance、legacy route 与 candidate-specific freshness | `MATCHSET:PORTABILITY-CURRENTNESS` 的 compound template；协调多个 receipts、revision-scoped freshness、Identity/Organization/Navigation/Device-Data dependencies 与 protected predicates | `GOLD:COMPOUND-PORTABILITY-QUALIFIED`：正确绑定 candidate revision、current/stale receipts 与全部 protected dependencies；或 `GOLD:COMPOUND-PORTABILITY-SAFE-DEFER`：缺少任一 required receipt 时不外推 | `episodeClass=output_contingent`、`complexityClass=compound`；所有 randomized participants eligible；candidate confirmatory anchor，NTE/analysis binding pending |
| `OP:DIRECTED-STATE-DEFINITION` | Machine 输出前，predeclared task request 已稳定显示“找到当前 R0 中 Inbox 与 Unsorted 的精确定义及二者关系” | directed retrieval；target/request、允许来源和成功谓词在输出前固定，不依赖任何 state-contingent output | `GOLD:DIRECTED-STATE-FOUND`：定位 current R0 定义并正确返回正交关系与 receipt；或预注册的 unavailable/noncompletion outcome | `episodeClass=directed`、`complexityClass=directed_control`；所有 randomized participants eligible；NTE/analysis binding pending；不进入 Local/Compound sample |
| `OP:DIRECTED-PORTABILITY-RECEIPT` | Machine 输出前，predeclared task request 已稳定显示“定位 current import/export 回执及其 exact revision” | directed retrieval；一个预先指定 target 与 verification relation，request 在输出前已知 | `GOLD:DIRECTED-PORTABILITY-FOUND`：返回 current receipt、subject revision 与 scope；或预注册的 unavailable/noncompletion outcome | `episodeClass=directed`、`complexityClass=directed_control`；所有 randomized participants eligible；NTE/analysis binding pending；不进入 Local/Compound sample |
| `OP:E0-DUAL-VISIT` | E0 显示 21/48 双入口访问且动机未知 | 对 aggregate、情境边界、具体 trace、item as-of state 与历史正交语义进行至少一次有根据的连接 | `GOLD:E0-CANDIDATE-COMMIT`：grounded intent 唯一命中 supported exact state；或 `GOLD:E0-SCOPED-REQUEST`：request 能区分当前竞争解释；两者均要求 protected semantics current | 所有人可经历的 common compound anchor；NTE/analysis binding pending |
| `OP:O1-WL-EXCEPTIONS` | `W_L` output 同时显示路径收益、state-legibility exception、scope exception 与 Search-first boundary | 比较至少两个互不等价的结果边，并处理 candidate-specific freshness | `GOLD:O1-REVISE-EXACT`、`GOLD:O1-DISCARD-AND-REQUEST`、`GOLD:O1-KEEP-FOR-PROTOCOL`、`GOLD:O1-SAFE-DEFER` | 只有实际进入 `W_L` 的 participant eligible；secondary/exploratory |
| `OP:O2-R0-REFRAME` | scoped R0 output 显示 checking/reconstruction 混合、57→71 membership 与多次有来源重组 | 把长期 evidence 与先前 candidate residual unknown、R0 history 和 protected modules 联结 | `GOLD:O2-NEW-EXACT-CANDIDATE`、`GOLD:O2-RETAIN-R0`、`GOLD:O2-NEXT-REQUEST`、`GOLD:O2-SAFE-DEFER` | actual request 后 eligible；secondary/exploratory，NTE pending |
| `OP:O3-V-BOUNDARY` | exact `V` output 显示有限 target-set benefit、uptake split、maintenance changes 与 a11y closure | 联合判断 benefit、subgroup、maintenance、guard 与 rejected deltas | `GOLD:O3-PROMOTE-ACCEPT-V`：participant 授权 promote、current pointer 移到 V 且恢复验证 current；`GOLD:O3-REJECT-RETAIN-R0`；`GOLD:O3-SAFE-DEFER` | isolated V evaluation 后 eligible；secondary/exploratory，NTE pending；V 未 adopted 前不允许伪 rollback |

表中的 GoldState 是语义谓词而非点击路径。正式 manifest 必须进一步枚举 required information/action/verification edges、protected fields 与 verifier；不能仅用自然语言标签结束计时。`COMMON-*` 与 E0 也必须等 executable specs、NTE/analysis binding 完成后才能进入 confirmatory mechanism；O1-O3 self-selected state-specific contracts 不能因看起来内容丰富就升级为 confirmatory sample。

“完全相同”只适用于同一 `OpportunitySpec` 在 A/B 两种界面条件下的语义内容、Machine 行为、trigger、Gold predicates、verifier、时限和 schedule。Local 与 Compound 不是同一 opportunity：它们共享软件产品领域、高层目标、matched-task topic、session bound、sandbox reset class 和 A/B parity 规则，但按预注册 semantic burden 使用不同 trigger、information universe、Gold predicates 与 verifier；不能用 A/B parity 等式把复杂度差异抹掉。

每位 randomized participant 都完成四个独立 sandbox anchors，且它们不改变开放主剧本的 `trialCurrentRevision`。与 A/B assignment 独立的四个平衡 sequence 为：`L_STATE→C_STATE→L_PORT→C_PORT`、`C_STATE→L_STATE→C_PORT→L_PORT`、`L_PORT→C_PORT→L_STATE→C_STATE`、`C_PORT→L_PORT→C_STATE→L_STATE`。每个 period 前安装其 sealed replica，并产生 `sandboxResetReceipt`；稳定 trigger 可见后产生 `exposureReceipt`。四个 sequence 在 A/B 内等额分配，period、reset 与 exposure 不合格者按预注册 noncompletion 处理，不能换一个模板顶替。只有四个 common anchors 的 executable specs、独立 NTE、既有 analysis bindings、reset/exposure receipts 与 counterbalance conformance 全部完成后，本场景才可进入既有 Local/Compound confirmatory comparison。

OCFT 从 `OpportunityObservation.triggerVisibilityReceipt` 证明 qualifying trigger 在 monotonic clock 上稳定可见开始，到 executable verifier 首次证明任一 acceptable GoldPredicate 且 protected predicates current 为止。固定 Machine waiting 按 spec 的 exclusion policy 单独记录/排除；participant pause 只按预注册 pause policy 处理，不能在看过 condition 后任意裁剪。Compound 由 spec 中预注册的多对象、关系、依赖和 protected predicates 的协调负担定义，不能用实际点击、turn、epoch 数或事后所选 packet cluster 定义。

以下是信息机会，不是必须依次完成的操作清单：

| ID | Semantic edge | 类型 |
| --- | --- | --- |
| `EDGE:E0-OBS` | Trigger summary -> 某一 aggregate observation | Local reveal |
| `EDGE:OBS-TRACE` | aggregate -> cohort -> concrete trace | Vertical compound |
| `EDGE:TRACE-STATE` | trace -> SavedItem as-of state | Vertical provenance |
| `EDGE:STATE-REL` | item state -> membership/route relation | Local relation |
| `EDGE:SUR-ORG` | route observation <-> membership timeline | Horizontal compound |
| `EDGE:EVIDENCE-BOUNDARY` | observation -> 未测量内容/限制 | Evidence qualification |
| `EDGE:UNKNOWN-HYPOTHESIS` | unknown -> competing explanation | Exploratory framing |
| `EDGE:INTENT-CANDIDATE` | participant intent -> implemented semantic delta | State transition |
| `EDGE:CANDIDATE-GUARD` | candidate -> affected constraints and verification | Compound dependency |
| `EDGE:E1-EXCEPTION` | aggregate result -> subgroup/exception trace | Horizontal/vertical |
| `EDGE:E1-REOPEN` | new result -> historical decision or reopened module | Temporal compound |
| `EDGE:CROSS-COMPOSE` | output + two primitive deltas -> exact pair state | Cross-module compound / fan-in |
| `EDGE:REBASE` | discard/rollback -> verified R0 + retained EpistemicState -> new candidate | Multi-epoch cross-edge |
| `EDGE:REVISIT` | new output -> old evidence/revision -> reinterpret current unknown | Non-DAG temporal loop |
| `EDGE:C1-C2` | prior state + new output -> revision/merge/rollback | Multi-epoch transition |
| `EDGE:E2-CURRENTNESS` | E2 -> current/stale evidence and integration guard | Verification compound |
| `EDGE:FRONTIER-TERMINAL` | current frontier -> condition-neutral disposition | Decision transition |

两个 directed 对照是独立的 `OP:DIRECTED-STATE-DEFINITION` 与 `OP:DIRECTED-PORTABILITY-RECEIPT`，其 target/request 必须在任何 Machine 输出前由同一 condition-neutral task card 明确。它们使用各自的 OpportunityObservation、Gold verifier 与计时，不复用 `COMMON-LOCAL-*` observation，也不进入 Local/Compound complexity sample；仅有低 NTE 还不够，predeclared target/request、A/B parity 和独立 analysis binding 也必须成立。两者按 `D_STATE→D_PORT` / `D_PORT→D_STATE` counterbalance，与四个 common anchors 和开放主剧本分开计时，不改变产品状态，也不是第二领域。

## 19. 与 Claim/RQ 和理论扩展的映射

本节把两种来源严格分开。CHI_v6 已经提出的核心比较是 Chat-only 与同一 Chat 加可选对象通路，并用 output-contingent 与 directed episode、Local/Compound complexity、OCFT、interaction segments 和质量保持回答 RQ1/RQ2。EETF 进一步提出 NTE、Orient–Probe–Commit–Verify 和非 DAG 信息空间，适合用来资格化本场景的探索性，但 NTE 不是 CHI_v6 已经冻结的分析变量。

本文不自行发明 confirmatory 统计模型。它先确保 CHI_v6 Claim/RQ 所需的数据能从剧本产生；EETF 的 NTE 若只用于预试资格化则单独报告，若要进入 confirmatory 模型，必须在论文/SAP 中另行预注册。

| 研究需要 | 本架构提供 |
| --- | --- |
| output-contingent follow-up | E0、O1、O2、O3 后才形成的 opportunity contract 与下一步信息需求 |
| Local/Compound complexity | 所有人共同 eligible 的两个 local 与两个 compound templates：`COMMON-LOCAL-STATE / COMMON-COMPOUND-WL`、`COMMON-LOCAL-PORTABILITY / COMMON-COMPOUND-PORTABILITY`；按四个 assignment-independent sequence counterbalance；complexity 由各 Spec 的对象、关系、依赖和 protected predicates 预先定义，template/matched-task identity 单独保留 |
| EETF 场景资格化 / 可选 NTE | independent pre-study participant 的开放式 primary next transition、双人盲编码、agreement、实际类别分布、NTE 与 top-choice concentration；不由作者 out-degree 或主实验点击反推，也不冒充 CHI_v6 已有 RQ 的 confirmatory moderator |
| edge traversal cost | target access、trace、relation、reopen、commit 和 verify 时间/动作 |
| context reconstruction/repair | 回访历史、错误 referent、backtrack、stale-reference 和 clarification |
| state-delta precision | participant intent、实际 module delta 和 protected state 的一致性 |
| objective quality | condition-blind hard validity + 独立盲评的 evidence coverage、trade-off calibration、scope、coherence 与 traceability |
| directed boundary | 同一产品图中 request/target 在 Machine 输出前已知的 `DIRECTED-STATE-DEFINITION / DIRECTED-PORTABILITY-RECEIPT`；各自 observation 与 Local/Compound sample 分离，低 NTE 仅是必要条件之一 |

该单一样本可以贡献软件开发领域内的 Claim、RQ1/RQ2 和质量保持证据；它不能独立证明跨域泛化。

最小重复测量单位是一个由 `OpportunitySpec + OpportunityObservation` 实例化的 opportunity，不是 Chat turn、单条 edge、整个 session 或作者命名的 family。三或四个 epoch 都可以形成合格轨迹，但每个 scored epoch 必须有自己的 trigger、Gold predicates、NTE pre-study binding 和 A/B 同步 spec；一个 compound opportunity 的 component edges 不能拆成独立样本抬高样本量。

主效应始终按随机 assignment 做 ITT，并使用固定 session horizon。实际 packet cluster、对象 uptake、intent change、经历三个还是四个 epoch、实际 edge 数和 early stop 都是 post-treatment realization，不得作为排除标准或 confirmatory 因果分组。Early stop 作为 observed noncompletion/competing outcome 纳入 ITT，不默认 non-informative censoring；如另做 time-to-event/survival analysis，必须单独声明 estimand 与 censoring assumptions。只有所有随机参与者在 assignment 后都具备资格经历的共同 anchor opportunities 才进入 confirmatory mechanism；self-selected state-specific edges 为 secondary/探索性。

每个 confirmatory OpportunitySpec 必须绑定论文或 SAP 中已经明确存在的 `analysisContractId`。本架构可以同时供给 EpisodeClass/Complexity 与场景资格化 NTE 所需数据，但不得在场景文档中把它们自动揉成新的交互模型；若 NTE 被提升为 confirmatory moderator，必须由论文/SAP 明确新增或更新相应 contract。

信息架构厚度是 A/B 共享的 task substrate 和随机化前的 scenario/NTE moderator，不是独立自变量，也不是新的主 Claim。

## 20. 深厚信息架构的验收门

只有同时满足以下条件，本文才允许进入逐轮剧本和 runtime：

- baseline 必须由至少六组共同项目对话逐步形成；最终 summary 只是索引，不能替代前史，也不能一次包含全部理由、约束与答案；
- participant-visible opportunity graph 在已授权 epoch 中累计覆盖 `L0-L8`，并允许真实纵向下钻；future layer 不得提前注册；
- 至少两个 canonical frontier 经独立 pre-study 确认存在多个合理后继，而不是作者仅画出多个箭头；
- 两个独立 directed OpportunitySpecs 必须证明 pre-output target/request、A/B parity、低 NTE、counterbalance 与 analysis binding；不得复用 `COMMON-LOCAL-*` observation 或只凭低 NTE 改写 episodeClass；
- 两个 common local 与两个 common compound templates 的 executable OpportunitySpecs、matched-task IDs、A/B parity、四序列 counterbalancing、reset/exposure receipts 与 analysis binding 全部完成；否则不能声称本样本已支持既有 complexity moderation；
- 完整代表性 trajectory 至少实例化三个 `OpportunitySpec + OpportunityObservation`；实际完成数量仍是 post-treatment realization，提前停止保留在 ITT；
- 每个候选结果同时包含一致观察、制衡观察和 evidence boundary；
- 至少一个 path 跨 Surface、Organization、Identity/Navigation 与 Accessibility；
- 至少一次回访/reinterpret loop、一次 output-induced cross-module transition，以及一次 fan-in、rebase、partial rollback 或 merge 在共享图中真实可达；
- 至少一个 pair state 具有双亲 fan-in 和独立 pair-interaction packet；未补齐前 architecture 保持 reopened，不能进入正式 runtime；
- 至少两个产品语义不同的合法 terminal；
- future evidence 在候选 commit 前不可存在；
- 当前结果绑定实际 revision，relevant mutation 后只在 read/write-set 相交的新 branch 上正确变为 `stale_for_branch`；
- A 可用自然语言取得 B 任一对象字段、关系和操作；
- Machine policy、condition-blind input、tools、seed、retry/fallback 和 evaluator schedule 在 A/B 相同；
- B 纯 Chat 和零对象使用始终合法；
- 完成不依赖最少 Chat turn、最少点击或 intent change；
- Machine 能一次完成实现和技术验证，不能靠拆分其劳动制造探索；
- hidden evaluator、未选 branch 和 oracle 与 participant workspace/Machine 物理隔离，reveal 前原子重检 freshness；
- participant-facing 内容不出现 packet cluster/family ID、gold endpoint、推荐排序、NTE、隐藏 predicate 或统计条件；
- out-of-manifold 安全停止，不映射到最近的预写剧情。

## 21. 从当前 runtime 迁移时的取舍

### 保留

- Reading List R0 的稳定目标和数据语义；
- Inbox/Unsorted 正交、multi-membership、canonical identity 和全局 Search；
- 当前四日试用 facts 与 EvidenceBoundary；
- A=Full Chat，B=相同 Chat+可选对象；
- candidate-bound evidence、freshness、rollback、defer 和多终态原则。

### 淘汰或降级为测试 witness

- 用 H01-H06 薄问答代替真实开发事件；
- S01 再次汇总全部历史细节；
- T01 一次性摊开所有 aggregate 和 child detail；
- 固定 ordinal 7/8/9；
- 唯一固定 candidate；
- 一个 result 后立刻 accept/rollback/defer 并终止；
- 静态对象目录冒充信息空间；
- card open 或 selection 冒充 semantic transition；
- native/Codex lifecycle 进入产品剧本本体。

## 22. 已实例化的代表性信息链

以下对象冻结了实际可遍历内容，不只是类型。它们用于验证纵深、关系和 reveal prerequisite；其中 `HYP:*` 只在该代表性 path 的 participant/Machine 已先于共同 Chat 表达相应解释后存在，不是预注册提示。完整 48/63/24 trace corpus 仍需在 content freeze 中生成并做 aggregate reconciliation。

### 22.1 E0：aggregate 到原始来源

| Ref | Depth | Participant-safe 内容 | 关键关系 | Reveal prerequisite |
| --- | --- | --- | --- | --- |
| `OBS:R0-REFIND` | L3 | 48/48 成功；E0 自身为 21/48 双入口访问 | `illustrated_by COHORT:R0-PENDING-MEMBER` | E0 headline 后请求行为观察 |
| `COHORT:R0-PENDING-MEMBER` | L4 | 12 个 `pending + membership` targets；首入口 Inbox 5、Unsorted 1、Search 3、Collections 3 | `illustrated_by TRACE:R0-REFIND-017` | 展开该 cohort |
| `TRACE:R0-REFIND-017` | L5 | 从中性起点依次查看 Inbox、Unsorted，随后 Search “offline sync”，打开正确条目；行为不预分类为迷路或核对 | `same_item_at_time ITEM:R0-042@D4T17 + derived_from RAWSET:NAV-017-01-04` | 请求该 cohort 的 concrete case/exception |
| `ITEM:R0-042@D4T17` | L6 | `SavedItemId=R0-042`，Title “Offline-first sync notes”，Inbox=pending，Collection=Project Atlas，Note/Tag/source current | `membership_at_time REL:R0-042:ATLAS@D4T17` | 从 trace 查看 target state |
| `REL:R0-042:ATLAS@D4T17` | L6 | R0-042 与 Collection “Project Atlas”的 current membership；不复制 SavedItem | `derived_from RAW:MEM-042-03` | 查看 item 的 organization relation |
| `RAWSET:NAV-017-01-04` | L7 | 四条有序 route/search/open events，均绑定同一 task instance 和 item identity | `verified_by RECEIPT:R0-PILOT-INTEGRITY` | 请求 trace provenance |
| `RAW:MEM-042-03` | L7 | D2 later session 添加 membership；D4T17 仍 current | `verified_by RECEIPT:R0-PILOT-INTEGRITY` | 请求 relation provenance |
| `RECEIPT:R0-PILOT-INTEGRITY` | L8 | protocol、replica、task manifest、raw event 与 aggregate digest 一致性回执 | `verifies OBS:R0-REFIND + RAWSET:NAV-017-01-04 + RAW:MEM-042-03` | 核对来源/协议 |
| `DECISION:ORTHOGONAL-R0` | L2 | 历史团队决定保留 Inbox pending 与 Collection membership 的正交语义，并在获得长期行为证据前不合并 | `constrained_by GUARD:ORTHOGONAL-STATE + GUARD:GLOBAL-SEARCH` | 查看该历史决定及其 reopen condition |

### 22.2 F1：Linked Hub 的 exception 与修订

| Ref | Depth | Participant-safe 内容 | 关系 |
| --- | --- | --- | --- |
| `CANDIDATE:C1-LINKED-SAVED-A` | L3 | linked surfaces、co-visible state filters、legacy routes 保留、batch selection 无 object-level scope preview | `constrained_by GUARD:ORTHOGONAL-STATE + GUARD:GLOBAL-SEARCH + GUARD:ROUTE-CONTINUITY + GUARD:ACCESSIBILITY + GUARD:REVERSIBILITY` |
| `TRACE:LINKED-E1-NARROW-04` | L5 | 窄屏任务中 participant 把 “No collection” chip 当成未处理状态，随后通过关系说明纠正 | `challenges HYP:UNIFIED-REDUCES-RECONSTRUCTION` |
| `TRACE:LINKED-E1-SCOPE-03` | L5 | count-only confirmation 后跨 filter selection 包含 1 个非预期条目；participant commit 后用 exact undo 修复 | `challenges HYP:BATCH-SCOPE-LEGIBLE` |
| `ITEM:LINKED-042@E1T04` | L6 | 同一 R0-042 同时为 pending 且有 membership；两个状态在 Hub 中并列显示 | `same_item_at_time ITEM:R0-042@D4T17` |
| `RAW:LINKED-FILTER-04` | L7 | filter open、state answer、relation reveal、corrected answer 四个事件 | `derived_from PROTOCOL:LINKED-COMPREHENSION` |
| `REOPEN:STATE-LEGIBILITY-E1` | L4 | 窄屏误读使历史“正交语义可保持可理解”的 boundary 再次成为未决问题；原历史决定不被重写 | `reopens DECISION:ORTHOGONAL-R0 + MOD:SURFACE` |
| `CANDIDATE:C2-LINKED-SAVED-B` | L3 | 保留 linked relation；增加 progressive disclosure、explicit state explanation 与 object-level scope preview | `revises CANDIDATE:C1-LINKED-SAVED-A` |
| `INVALIDATION:LINKED-C1-SCOPE-EVIDENCE` | L4 | C1 的 count-only scope 结果对 C2 scope-confirmation question 标为 `stale_for_branch`；它对 C1 本身仍 current | `invalidates_for_branch TRACE:LINKED-E1-SCOPE-03` |
| `TRACE:LINKED-E2-SCOPE-11` | L5 | 预览显示 6 个 selected items 跨两个 filters，participant 取消 1 个不确定 attempt 后再 commit | `supports OBS:LINKED-E2-SCOPE` |
| `VERIFY:LINKED-C2` | L8 | route、identity、batch、undo 及六项 mobile/keyboard/reader ratio 均 current | `verifies CANDIDATE:C2-LINKED-SAVED-B` |

### 22.3 F2：Focus state 与受保护的找回

| Ref | Depth | Participant-safe 内容 | 关系 |
| --- | --- | --- | --- |
| `CANDIDATE:C1-FOCUS-A` | L3 | 新增可选 `FocusStatus`；Inbox 和 membership 语义不变；通知 default-off | `depends_on MOD:PROCESSING + MOD:DEVICE-DATA` |
| `TRACE:FOCUS-E1-BACKLOG-11` | L5 | R0-077 从 Focus active 被 processed；结果为 Inbox cleared、Focus none、membership 保留；participant 起初询问是否已 archive | `challenges HYP:QUEUE-IS-SELF-EXPLANATORY` |
| `ITEM:FOCUS-077@E1T11` | L6 | canonical item 与 payload current，Collection “Weekend Reading” 仍存在 | `same_item_at_time ITEM:R0-077` |
| `RAW:FOCUS-STATE-11` | L7 | processed command、atomic state delta、clarification、direct Search open | `derived_from PROTOCOL:FOCUS-BACKLOG` |
| `CANDIDATE:C2-FOCUS-B` | L3 | 明确 processed≠archive；增加 conflict choice 和撤销说明 | `revises CANDIDATE:C1-FOCUS-A` |
| `TRACE:FOCUS-E2-OFFLINE-03` | L5 | 两台设备形成 Focus active/deferred 冲突，系统要求显式选择；payload 与 membership 均未丢失 | `concerns GUARD:PAYLOAD + GUARD:REVERSIBILITY` |
| `VERIFY:FOCUS-C2` | L8 | sync matrix、Search、export 和六项 a11y closure current | `verifies CANDIDATE:C2-FOCUS-B` |

### 22.4 F3：Context Workspace 的收益与维护成本

| Ref | Depth | Participant-safe 内容 | 关系 |
| --- | --- | --- | --- |
| `CANDIDATE:C1-CONTEXT-A` | L3 | R0 surfaces 保持；新增 optional saved view、compare 和 explicit relation context | `depends_on MOD:READING-CONTEXT + MOD:ORGANIZATION` |
| `COHORT:CONTEXT-THEME` | L4 | 24 个 precommitted target-set tasks，precision/recall/false-inclusion rules 固定 | `derived_from PROTOCOL:CONTEXT-THEME` |
| `TRACE:CONTEXT-E1-THEME-06` | L5 | 目标组 4 项；saved view 找到 4 项并多含 1 个 false inclusion；participant 用 compare 识别并移除 | `supports HYP:CONTEXT-RESTORES-TARGETSET + challenges HYP:CONTEXT-SCOPE-ACCURATE` |
| `REL:CONTEXT-042:018@E1` | L6 | 两项因同一 Project Atlas relation 相连，各自 Note/Tag 与 identity 保持独立 | `constrained_by GUARD:CANONICAL-IDENTITY` |
| `RAW:CONTEXT-COMPARE-06` | L7 | open saved view、compare、inspect source、remove false inclusion | `derived_from PROTOCOL:CONTEXT-THEME` |
| `CANDIDATE:C2-CONTEXT-B` | L3 | simple-view default、flat structure、命名边界与 relation preview | `revises CANDIDATE:C1-CONTEXT-A` |
| `TRACE:CONTEXT-E2-MAINT-07` | L5 | 30 日回访前发现两个 scope 重叠 view；participant merge 一个、保留一个有意 overlap，并记录理由 | `concerns TENSION:RICHNESS-ACCESS` |
| `VERIFY:CONTEXT-C2` | L8 | provenance round-trip current；六项 mobile/keyboard/reader ratio 均在 guard 内 | `verifies CANDIDATE:C2-CONTEXT-B` |

### 22.5 Scoped Request-evidence：不改产品也具有真实信息代价

| Ref | Depth | Participant-safe 内容 | 关系 |
| --- | --- | --- | --- |
| `REQUEST:R0-LONG-HORIZON-01` | L3 | 请求区分有意核对与额外恢复，并查看 longer-horizon organization | `concerns UNKNOWN:DUAL-VISIT + UNKNOWN:ORG-TIMING` |
| `OBS:R0-ORG-CONTINUATION` | L3 | 第四日已有 membership 的 57 个条目在后续成为 71 个；9 个条目发生至少两次有来源重新组织；该 aggregate 按唯一 SavedItemId 与有序 relation events 计算 | `answers REQUEST:R0-LONG-HORIZON-01 + illustrated_by TRACE:R0-LONGHORIZON-042` |
| `TRACE:R0-CONTEXT-05` | L5 | participant 先看 Inbox 状态，再检查 membership，明确说明两次访问服务不同问题 | `supports HYP:R0-DUAL-VISIT-IS-CHECKING` |
| `TRACE:R0-CONTEXT-09` | L5 | participant 不记得入口含义，跨两页后使用 Search 找回并请求解释 | `supports HYP:R0-DUAL-VISIT-IS-RECONSTRUCTION` |
| `TRACE:R0-LONGHORIZON-042` | L5 | 同一 `SavedItemId=R0-042`：D2 加入 Project Atlas，D11 加入较窄的 Offline Sync，D18 在主题独立后移出 Project Atlas；D30 从 Search 找到后查看 Note 与两次组织变更，恢复“先属 Atlas、后独立”的理由 | `same_item_over_time ITEM:R0-042@D4T17 + derived_from RAWSET:R0-042-ORG-D2-D30` |
| `REL:R0-042:ATLAS@D2-D18` | L6 | Project Atlas membership 在 D2 建立、D18 有来源地移除；移除不改变 SavedItem identity、payload、Note、Tag 或其他 membership | `derived_from RAWSET:R0-042-ORG-D2-D30` |
| `REL:R0-042:OFFLINE-SYNC@D11-D30` | L6 | Offline Sync membership 在 D11 建立并在 D30 回访时仍 current；它与 Atlas 的区间关系共同解释两次有来源重组 | `derived_from RAWSET:R0-042-ORG-D2-D30` |
| `RAW:R0-042-MEM-D11` | L7 | D11 add Offline Sync；记录前后 membership set、较窄主题已经形成的理由与同一 SavedItemId | `verified_by RECEIPT:R0-CONTINUATION-01` |
| `RAW:R0-042-MEM-D18` | L7 | D18 remove Project Atlas；理由为主题已经独立，Note 继续保留 Atlas 比较上下文，payload digest 与 Offline Sync membership 不变 | `verified_by RECEIPT:R0-CONTINUATION-01` |
| `RAWSET:R0-042-RETURN-D30` | L7 | D30 Search/open、查看 Note、展开 relation history 的有序 task events；目标找到成功与理由恢复分别记录 | `verified_by RECEIPT:R0-CONTINUATION-01` |
| `RAWSET:R0-042-ORG-D2-D30` | L7 | 复用 E0 已冻结的 D2 `RAW:MEM-042-03`，再按序绑定 D11、D18 与 D30 raw refs；每条事件绑定理由、同一 SavedItemId、前后 membership set 与不变 payload digest，不复制 D2 event | `derived_from RAW:MEM-042-03 + RAW:R0-042-MEM-D11 + RAW:R0-042-MEM-D18 + RAWSET:R0-042-RETURN-D30 + verified_by RECEIPT:R0-CONTINUATION-01` |
| `RECON:R0-ORG-57-71` | L8 | R0-042 在 item-level aggregate 中只计一次；它是 9 个“至少两次有来源重新组织”的条目之一，不在 57→71 membership aggregate 之外新增条目或事件 | `reconciles TRACE:R0-LONGHORIZON-042 + OBS:R0-ORG-CONTINUATION` |
| `RECEIPT:R0-CONTINUATION-01` | L8 | 同一 12 profiles、0 missingness、72 tasks、D4→D30 continuation protocol、R0 digest、task/raw-event manifest 与 57→71/9-item reconciliation 一致 | `verifies VERIFY:R0 + RAWSET:R0-042-ORG-D2-D30 + RECON:R0-ORG-57-71` |

### 22.6 Candidate discard 与真正 rollback

| Ref | Depth | Participant-safe 内容 | 关系 |
| --- | --- | --- | --- |
| `DISCARD:CONTEXT-CANDIDATE-01` | L4 | `transitionKind=candidate_discard`；participant 查看 E1 后拒绝从未成为 `trialCurrentRevision` 的 Context candidate；R0 指针从未移动 | `rejects CANDIDATE:C1-CONTEXT-A` |
| `REVISION:FOCUS-MANUAL-PARTIAL-D1` | L5 | `transitionKind=revise`；保留 manual Focus、state explanation 与 sync conflict choice，撤回 reminder capability；actual signature 唯一命中预冻结 partial cell | `revises CANDIDATE:C1-FOCUS-A` |
| `VERIFY:FOCUS-MANUAL-PARTIAL` | L8 | partial revision 的 full common core、36/36 preview/inverse、Search/export/sync 与六项 a11y receipt current | `verifies REVISION:FOCUS-MANUAL-PARTIAL-D1` |
| `PROMOTION:LINKED-C1-D1` | L4 | participant 保留 Linked C1 并授权 unchanged-C1 long-horizon protocol；验证后 `trialCurrentRevision: R0 -> C1` | `authorizes E2:C1-LONG-HORIZON` |
| `ROLLBACK:LINKED-C1-R0-E2` | L4 | `transitionKind=rollback`、source=`CANDIDATE:C1-LINKED-SAVED-A`；E2 暴露长期 scope/legibility 代价后，participant 实际把 trial pointer 从 C1 移回 R0；不是删除候选历史 | `rolls_back_to REVISION:R0` |
| `VERIFY:R0-AFTER-LINKED-ROLLBACK` | L8 | R0 semantic/artifact digest、protected guards、Search、import/export 与 current frontier 重新验证 | `verifies REVISION:R0 + ROLLBACK:LINKED-C1-R0-E2` |
| `REVISION:V-DIRECT-R0-O3` | L5 | 从本 trial 经重新验证的 R0 实现 exact `CELL:CONTEXT-P1`：普通页面默认，只增加有来源、可撤销的简单 saved view；compare/relation context/auto-group 均不存在 | `verified_by VERIFY:V-FROM-R0` |
| `VERIFY:V-FROM-R0` | L8 | evaluator 安装 sealed matched-R0 manifest，唯一命中 `CELL:CONTEXT-P1` 与 `PACKET:V-DIRECT-LONGHORIZON-v1`；common core、state pack、lineage、guards 和 O3 publication eligibility current | `verifies REVISION:V-DIRECT-R0-O3` |
| `PROMOTION:V-DIRECT-O3` | L4 | `transitionKind=promote`；participant 在 O3 后授权采用已评价的 V，pointer receipt 证明 `trialCurrentRevision: R0 -> REVISION:V-DIRECT-R0-O3`；不会借用 Linked candidate 的结果 | `authorizes VERIFY:V-AFTER-PROMOTION` |
| `VERIFY:V-AFTER-PROMOTION` | L8 | promotion 后重新读取 current pointer，并验证 capture、identity、orthogonal state、Search、legacy/deep-link、import/export、provenance/undo 与六项 a11y guards current | `verifies PROMOTION:V-DIRECT-O3 + REVISION:V-DIRECT-R0-O3` |
| `TERMINAL:ACCEPT-V-O3` | L4 | endpoint input 为 `typedParticipantDisposition=accept_verified_state`、`proposedFinalRevision=trialCurrentRevision=REVISION:V-DIRECT-R0-O3`；required modules/guards/edges current、无 pending work、`outOfManifold=false` | `verified_by RECEIPT:TERMINAL-V-O3` |
| `RECEIPT:TERMINAL-V-O3` | L8 | condition-blind validator 唯一命中 `ACCEPT_VERIFIED_STATE`，CAS 写入 `finalAcceptedRevision=REVISION:V-DIRECT-R0-O3`；未采用候选与 epistemic history 保留 | `verifies TERMINAL:ACCEPT-V-O3 + VERIFY:V-AFTER-PROMOTION` |

这些实例足以证明从主张到来源的纵向路径、跨 epoch reopen、branch-scoped invalidation，以及 discard 与真实 rollback 的区别；它们不替代完整 raw corpus、aggregate reconciliation 或 participant copy freeze。

### 22.7 v4 连续经历中的 cross-edge 与 epistemic retention

代表性 participant trajectory 不是新的强制路线，而是对共享图可达性的 witness：

```text
E0 dual-visit trigger
  -> Probe Offline-first trace + orthogonal-state history
  -> Commit W_L
  -> O1: route reconstruction benefit
         + narrow-screen state exception
         + batch scope exception
         + Search-first boundary
  -> Probe scope provenance + compare same item across R0/W_L
  -> draft L, but do not spend next output epoch
  -> discard W_L; verified product state remains R0
     while EpistemicState retains W_L evidence
  -> Request R0 long-horizon context evidence
  -> O2: checking / reconstruction mixture
         + membership 57 -> 71
         + repeated sourced reorganization
  -> Probe one long-horizon Project Atlas trace
  -> Commit V from verified R0
  -> O3: limited target-set benefit
         + uptake split
         + maintenance changes
         + a11y/guard closure
  -> PROMOTION:V-DIRECT-O3
  -> VERIFY:V-AFTER-PROMOTION
  -> TERMINAL:ACCEPT-V-O3
  -> RECEIPT:TERMINAL-V-O3 / ACCEPT_VERIFIED_STATE(V)
```

这里的 Context/saved-view 方向在 E0 时不是预设终局；它由 W_L output 的 residual unknown、discard 后保留的 epistemic history 和 O2 长期证据共同变得合理。W_L 结果没有移植到 V；两个候选分别使用自己的 exact-state packet。产品 parent 回到 R0 不会清除已看证据，这正是 semantic graph 非 DAG、revision lineage 仍可审计的最小实例。

### 22.8 v4 participant witness 的注意线审计

下面只编码参与者明确表达的理由和实际 semantic request，不把点击或停留解释为注意。`choice-bearing turn` 指当时至少两个后继仍可辩护，而参与者的语言使其中一个进入 working set；计数用于审阅剧本节奏，不进入主实验分析。

| Witness | 共同 Trigger 后首次显著对象 | participant-stated rationale | 典型 recent-output → next-turn 边 | dormant / reopen | 当前结局 | authoring rhythm |
| --- | --- | --- | --- | --- | --- | --- |
| A | `21/48` dual visit | “两个状态是否被理解，会影响要不要碰现有语义” | Offline-first trace → 历史正交决定；`3/40 undo` → scope receipt；`9/12 Search-first` → R0 long horizon；`4 maintenance` → rename trace | backlog/Focus 暂时 dormant；Search-first 重新打开 Context | 采用 V，丢弃 W_L，保留 reopen 条件 | 保守编码 8/16 live user turns 为 choice-bearing；其余为同一已选边内的追问、范围澄清、build/evaluate authorization 或 final verify |
| B | 三条“先保存、以后处理”说明 | “成功找回不等于产品帮助处理；不要把没动静算失败” | R0 defer-reason reconstruction → manual Focus；Weekend archive misunderstanding → state relation；baseline sync conflict → explicit choice revision | route/Hub dormant；“主题组织未改善”仍可 reopen Context | 采用 revised F，保留状态、冲突和长期意义的 reopen 条件 | 保守编码 6/11 live user turns 为 choice-bearing；其余为同一已选边内的追问、scoped observation、semantic-delta clarification 与 evaluation authorization |
| C | D4 membership `57/144` 与 long-horizon unknown | “四天太短，不直接翻译成功能” | `9` repeated reorganization → changing + stable cases；crosscase classification → second R0 boundary；new 9/7/8 output → retain R0 | Hub/Focus/Context 均未关闭，只因证据不足 dormant | `RETAIN_BASELINE`，明确三类 reopen condition | 保守编码 4/7 live user turns 为 choice-bearing；其余为 request confirmation、protocol authorization 与 terminal verify |

三个 witness 的 latest-output edges 使用同一对象图并存在 cross-edge：Offline-first 同时连接状态、Search、Collection 与长期 lineage；Focus 的 archive 例外回到旧 identity/membership 语义；C 的稳定反例限制 A 的长期结构主张。它们不是三个互斥 family，也不构成参与者可见路线菜单。

## 23. 下一份上游产物

v4 共享图、共同前史与三段 attention-driven 连续对话 witness 已经落稿，但 architecture 仍保持 reopened。正式 content freeze 与 runtime 前还需要：

- H01-H09 共同前史的原始对象、逐轮 revision 与证据 receipt；
- 完整 E0 raw corpus、aggregate reconciliation 与非代表性 exception；
- `PACKET:R0-BACKLOG-DISPOSITION-v1`、`PACKET:R0-LONGHORIZON-CROSSCASE-v1`、`PACKET:R0-STATE-BOUNDARY-CROSSCASE-v1`、`PACKET:F-DIRECT-FIRST-EVAL-v1` 与 `PACKET:F-DIRECT-REVISED-E2-v1` 的 raw manifest、matched-R0 reconciliation、六项 ratio 和 exact eligibility receipts；
- 将既有 F1/F2/F3 与 R0 continuation 内容重索引为 exact-state/request packet，完成 aggregate reconciliation；
- `CELL:L+F`、`CELL:L+V`、`CELL:F+V` 三份独立 pair-interaction packet，不能从单项结果拼接；
- candidate reject/discard、partial rollback、true rollback、merge 与恢复验证 packet；
- 每个 scored frontier 的 immutable OpportunitySpec、per-trial OpportunityObservation、executable Gold predicates/verifier、protected predicates、trigger visibility 与 OCFT clock/pause contract；
- 将第 16 节 A 路径编译成 machine-readable route conformance tests；
- NormalizedProductSemanticStateV3、PacketEligibilityKey、supported manifold、exact-state coverage/OOM、EndpointSet、NoncompletionOrAbortSet 与 trial-status encoding 的 executable manifests；
- sealed evaluator 到 participant-safe publication gateway 的 allowlist、原子发布与 failure-conformance tests；
- 独立 NTE pre-study 材料、开放式 next-transition responses、双人 blind codebook/agreement、实际分布、top-choice concentration、material digest 与 scored opportunity manifest；
- 每个 confirmatory OpportunitySpec 对论文/SAP 既有 `analysisContractId` 的显式绑定，以及 NTE 仅作资格化还是进入新预注册模型的明确边界；
- decision-quality 盲评 rubric 的行为锚点、rater 数量、agreement 与 adjudication protocol；
- 在不接触正式 assignment outcome 的 formative 样本中检查 exact-cell coverage/OOM rate，并只以预注册版本升级扩展 response surface；
- participant-visible allowlist 与 hidden-material negative scan。

在上述内容完成前，不进入 GUI 或 Codex 原生复刻。
