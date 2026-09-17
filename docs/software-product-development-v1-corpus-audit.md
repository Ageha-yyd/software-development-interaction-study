# 软件产品开发 v4.2：情境数据来源审阅与 E0 可复算材料

更新：2026-09-12。本文记录当前工作树检查、新增 E0 数据层及后续材料的具体闭合条件。本文只讨论软件产品开发领域。

## 1. 当前结论

v4.1 已有共享信息图、自然开发历史和材料规则，但此前可执行 scenario 主要保存作者写出的摘要、一个找回案例和少量来源文字。它没有同时保存可检查的 144 条目、72 任务及关系事件总账。因此，“raw”“receipt”“digest”这些名称本身不能证明汇总可复算。

本轮新增 `scenarios/materials/reading-list-e0-v4.2.mjs`，以明确的作者构造规则生成完整、可重放的 E0 数据：144 个条目、72 个计划任务、每个任务的全部访问事件、关系和处理状态事件、D4 快照、8 条单独保存的画像情境说明。其来源类别为 `author_constructed_simulated_scenario`。

**这是 v4.2 新构造的一组情境数据。保留已有设计总量，不意味着恢复了旧 pilot 的原始日志。** 它不是真实用户试用、不是真实研究参与者表现，也不证明阅读清单应用执行过技术或可访问性检查。模块明确设置 `notParticipantData=true`、`humanEfficiencyEvidence=false`、`engineeringExecutionEvidence=false`、`formalStudyReady=false`。

随后已通过 `reading-list-e0-projection-v4.2.mjs` 接入现行 scenario：默认 E0、按需摘要、全部任务/条目/事件与独立案例均从同一 corpus 生成。现行版本为 `v4.2-e0`，保留旧对象 ID 兼容并增加可寻址案例。此次接线不修改 retained pilot，也不替后续候选生成结果。真实浏览器端到端、远程模型和完整研究流程资格须由集成阶段另行报告。

## 2. 检查过的来源与复用边界

| 来源 | 实际可复用部分 | 不能由此推出的结论 |
| --- | --- | --- |
| `scenarios/software-product-development-v1.ts` | 既有类型化图和历史锚点；本轮改为从新 projection 生成 E0 数据 | 旧文字中的“原始事件”“一致性回执”此前不等于实际事件表；新材料重放也不等于实际软件工程执行 |
| 四份现行 v4.1 文档 | A=Full Chat、B=相同 Chat 加可选对象；exact-state 规则；不预设路线；原始材料清单 | 文档出现数值或“检查完成”不等于存在底层记录或实际软件运行证据 |
| `pointable-context/src/evaluation/software-product-development-v1/contracts.ts`、`episode-kernel.ts` | 候选、版本、状态变更、验证、明确终态与失效边界的类型和工程约束 | 旧协议覆盖范围不能自动充当当前多 epoch v4 的研究资格 |
| 同目录 `organizer-pack.ts` | 对候选谓词、意图、结果范围的绑定与拒绝不支持组合的机制 | `qualificationClass=authoring_contract_fake` 是明确边界；`rawTraceDigest` 对固定 `sealed-joint-arm-authoring-vector` 字符串求摘要，并未存放完整 raw trace |
| 同目录 `participant-pack.ts` | 参与者投影和隐藏内部字段的做法 | 其摘要是另一版本的 authored packet；不能拼接成当前 E0 或未来候选的真实记录 |
| 新增 `reading-list-e0-v4.2.mjs` | 完整 E0 条目、事件、任务、快照；重放与关系一致性检查；明确分母列表 | 仅授予这组构造材料的内容一致性，不授予软件执行、人类形成性或效能结论 |

## 3. E0 数据表与数据接口

| 表 | 主要字段 | 约束 |
| --- | --- | --- |
| `metadata` | corpus/version、revision、protocol、evidenceClass、timeBasis、缺失信息 | 不允许被改标为 participant 或 engineering evidence；场景时钟不是研究时钟 |
| `profiles` | profileId、replicaRef | 12 个虚构使用画像；不是 12 名招募参与者 |
| `collections` | collectionId、profileId、title | 每个隔离账号拥有自己的 Project Atlas；同名不等于同一实体 |
| `items` | itemId、profileId、payload、savedAtScenarioMs、saveSessionId | 144 个稳定 identity；保存输入只需 URL；后续关系变化不修改 payload |
| `events` | eventId、type、profileId、replicaRef、sessionId、taskId、atScenarioMs、sourceRef、before/after | 单一有序总账；保存、关系和处理状态可重放；所有访问必须属于合法账号和当时状态 |
| `tasks` | taskId、kind、targetItemId、protocol/revision、asOfStartState、eventIds、开始/结束场景时刻 | 48 个 delayed return 加 24 个 organization return；任务列表中的事件必须与总账精确对应 |
| `notes` | noteId、profileId、scope、declaredTopic、text、source、limitation | 8 条作者构造说明；未绑定某次找回，不能给 21 次跨入口访问逐一归因 |
| `snapshots` | snapshotId、revision、atScenarioMs、itemStates | D4 状态必须等于重放总账的结果，不能单独手改摘要 |

模块导出：

```js
createReadingListE0Corpus();
// 返回一个独立、可序列化的 corpus 副本。

validateReadingListE0Corpus(corpus);
// 返回 { valid, errors: [{ code, ref }], evidenceClass, summary }。
// 无效记录不能因为总数恰好相符而通过。

summarizeReadingListE0Corpus(corpus);
// 先验证再返回 summary；不一致时抛错，禁止静默发布“已复算”汇总。
```

`summary.denominatorIds` 给出每个主要分母及分组实际包含的条目/任务 ID。请求“全部案例”可直接返回相应集合；A/B 不需要被强迫逐层展开。

## 4. E0 的明确构造与复算

这些分配由作者为内容检查而新建，不能用它们估计真实使用分布。

| E0 设计值 | 新数据中的构造及推导 |
| --- | --- |
| 144 次保存 | 每个条目有一次且仅一次 URL-only `save_item`；12 画像各 12 条目 |
| 72 次计划找回 | 48 个 delayed return、24 个 organization return；24 是 72 的子集，不是额外再加 24 |
| 48 个延迟找回 | 每个画像 4 个任务；每个任务最终打开正确 identity |
| 21 个双入口、27 个非双入口 | 从目标打开前的实际 `open_surface`/`search` 序列复算；不是预填 `dual=true` 标签 |
| 12 个 pending+member 双入口目标 | 从各任务开始时的状态与双入口集合求交；并不包含动机判断 |
| 63 个 ever-members | 条目 `1..11, 22..63, 87..96` 至少有一次关系添加；这是公开的构造规则 |
| 10 个当次、53 个稍后首次归类 | 首次 `add_membership` 的 sessionId 与各条目的 saveSessionId 比较；42 的关系源位于 D2 |
| D4 仍有 membership 57 | 91..96 的 6 个条目有明确移除事件；重放产生 57 个 member、87 个 zero-member |
| D4 pending 86 | 87..144 有明确处理状态变更，剩余 1..86 为 pending；归类不会自动清除 pending |
| pending 中重新打开 52、未打开 34 | 延迟任务打开 1..48；组织后回访只复用已打开目标；另有 49..52 四次非计划 Search/open。4 次不计入 72 个计划任务 |
| 24 次组织后回访 | 8 个画像各 3 个不同、此前已有组织历史的目标；任务 identity 可以与延迟任务重叠，但任务 ID 不重叠 |
| 8 段说明 | 3 稍后处理、2 有意核对、2 入口不确定、1 主题上下文；这些是作者构造说明的主题，不是从日志推导心理状态 |

**“首次访问入口”与“最终打开目标的入口”必须分开。** 新数据保留延迟任务首次访问 Inbox/Unsorted/Search/Collections = 12/11/14/11，组织后回访首次访问 Search/Collections/Inbox/Unsorted = 10/9/3/2。成员条目可以先访问 Unsorted 再通过 Search 打开；不能声称它在仍有 membership 时直接从 Unsorted 打开。

旧 scenario 使用的“首次目标入口”存在语义混淆：其中 pending+member cohort 的 Unsorted 一例，如果表示最终打开入口，会违反产品规则。接线时应统一为“首次访问入口”，从事件另算实际打开入口；不要仅改一个计数掩盖状态矛盾。

## 5. 代表性案例与普通案例

`R0-REFIND-017` 明确绑定 `R0-042 / Offline-first sync notes`：D4 仍 pending，属于所属画像的 Project Atlas。`RAW:MEM-042-03` 是 D2 的关系添加来源，前后 payload 不变。四个路由事件分别是 0 秒 Inbox、6 秒 Unsorted、14 秒搜索 `offline sync`、18 秒打开 R0-042。

另外 71 个任务均有完整事件；普通 Search-first、直接 Collection、先查看不含目标的入口再改用 Search、有组织和无组织的双入口任务都可选择。资料不再只允许作者最醒目的那个实例。

这些查询应当使用相同资料及选择规则：

- “全部 21 次”返回 `denominatorIds.dualEntry` 对应任务及事件，不挑选支持改版的子集。
- “来一个普通例子”根据预先公开的事件谓词筛选，例如一次 Search 后正确打开；记录选择规则和最终 taskId。
- “同样 pending+member，但路径不同的例子”以开始状态筛选，再按实际路由比较。
- “当时条目为什么不在 Unsorted”返回当时状态和添加关系事件；不代替参与者形成产品改版建议。
- “这条的动机是什么”返回没有 task-specific 说明的事实，不能套用同画像的一段泛化说明。

## 6. 旧数值的具体处理

| 旧主张/数值 | 当前处理 | 完成后才可以发布的条件 |
| --- | --- | --- |
| E0 核心 144/72/48/21/57/63、86/52/34 | 新 v4.2 构造记录与复算已接入现行投影 | 摘要、案例、来源同源已由 adapter 合同检查；浏览器集成资格另行验证 |
| E0 16 个支持/恢复事件及 6/5/3/2 分类 | 新 E0 模块未构造，不能借其他事件代替 | 各事件单列问题、解决操作、版本、前后状态、来源与未知；否则隐藏数字并说明资料未包含 |
| E0 8/12 新建额外 Collection | 新 E0 集合是窗口前初始化，未构造这项新建历史 | 新建事件总账支持后才恢复；不能把初始化误算为新建 |
| R0 “所有技术/可访问性检查已完成”及六项比例 | 本模块不含真实软件执行回执 | 对实际原型和精确 revision 执行；情境中的虚构保护项也须明确标为 authored stimulus |
| Linked O1 20/48→7/48、3/40 撤销、8→6 活跃步骤 | 仍是 authoring library 数字 | 独立 matched-R0 与 candidate 的同任务清单、完整动作、40 个批量前后/预览/目标/撤销记录；不能拿 E0 21/48 充当 matched baseline |
| R0 D30 57→71、9 个重复重组、6/5/4 因子 | 仍缺完整纵向数据 | 复用 E0 identity 与 D2 关系源；完整 D11/D18 等事件和 9 行因子表；允许重叠，但每项来自明确可观察字段 |
| R0 24-task boundary 9/7/8、状态理解 10/12 | 仍缺每任务观察与回答记录 | 明确任务分类依据和首次/澄清后回答；从跨页行为不能直接标 deliberate checking 或 repair |
| V 4 次维护、5/12 使用、16/18 等 | 一条代表性维护不能支持四条的平均或整包资格 | 全部维护与采用记录、matched任务、版本、成本口径；不得用唯一案例复制补齐 |
| Focus 首次/修订、36-task/12-conflict/采用人数 | 多个不同 exact state 的作者数据尚未闭合 | 每个版本自己的任务、冲突来源、选择、前后状态、分母；不借带提醒版本或另一路线的结果 |
| pair state、缩小版本、部分接受 | 不能拼接两个单功能结果 | 新 exact state 自己的交互与回归证据，否则保留明确 unsupported/incomplete 状态 |

不能把“补齐原始记录”理解为给既有结果伪造出处。后续可以公开新构造场景、重新计算设计值并改写文案；不能声称重新找到了过去并不存在的事件。

## 7. 后续 packet 的最小具体表结构

| 表 | 必须保存的字段与一致性规则 |
| --- | --- |
| CandidateRevision | revisionId、parents、participantIntentRef、实际 capabilities、patch/artifactRef、protectedScope；接受的是实际状态，不能由文案跳转 |
| EvaluationProtocol | protocolId、taskManifest、matched arm 的共用起始状态、评价窗口、分母/缺失规则；E0 与候选对照不得共用身份冒充同一批评价 |
| PairedTask | pairId、taskId、profileId、R0 revision、candidate revision、各 arm 实际事件和终态；“两边都成功”不能从单边填充 |
| BatchCase | selectedIds、selection source、previewedIds、intendedIds 的明确情境来源、before/after relations、commitRef、undoRef/inverse；撤销本身不意味着错误选择 |
| LongitudinalItem | 稳定 itemId、D4 snapshotRef、后续 relation events、理由来源、D30 task/events；已有 D2 event 复用引用，不复制成新事件 |
| CrosscaseCoding | item/taskRef、可观察字段、因子定义、sourceRefs、unknown；6/5/4 边际数须从行复算，不回填心理原因 |
| ViewMaintenance | viewId、revision、旧名称/范围、变化、来源、预览、inverse、场景用时缺失状态；缺用时不能补均值 |
| TechnicalReceipt | actual artifact revision、testId、execution source、结果、范围；修改依赖后旧回执失效或明确继续适用的理由 |
| ParticipantOutcome | 另一个数据域：分配条件、真实任务时钟、事件、明确理由、接受/保留/暂缓/未完成；绝不由 scenario 的虚构用户时间填充 |

四次保存视图维护可以在新 authoring 版本中分别构造为：范围变化后的改名、明确移除不再相关成员、明确增加新的相关成员、停用重叠视图并保留可恢复来源。每条必须有真实独立的构造事件和不同取舍；这只是待编制的内容方案，不是已发生的四次观察。

## 8. 完整开放任务的最小实现顺序

1. **E0 材料与浏览器投影**：数据与 projection 接线已完成，真实 adapter 合同已覆盖阶段隔离、全集/比较/单条请求及对象锚点；真实浏览器和远程模型的集成检查仍需由主任务完成。保留完整 H01–H09，实际接管之后才发布 E0。
2. **一个可修改候选及它的例外**：建立 Linked 的完整 O1、全部 batch 例外，以及一个范围预览修订的精确检查失效/重验过程。保留接受当前候选、修改、放弃、继续取证四类实际选择。
3. **不改产品的完整竞争路径**：R0 scoped long-horizon → 逐案查看 → 保留 R0 或安全暂缓；不要求每个人先实现候选。
4. **跨问题重开**：在 R0 纵向资料齐备后再加入可选保存视图与全量维护。前一 Linked 结果作为历史保留，不能成为 V 的效果依据。

每个阶段完成再整体检查该阶段的分母、所有案例可达、A/B 信息与操作语义、版本失效和合法终态。数据未完成的未来组合明确留作研究范围外；不要为了呈现“开放”而返回最接近的固定成功剧情。

## 9. 本轮集中验证

新增 `tests/reading-list-e0-corpus.test.mjs`。数据层完成后的阶段检查为 12/12；projection 与现行 scenario 接线完成后的集中检查扩展至 17/17，通过对应四个新增/修改代码文件的 ESLint。没有在每处微调后重跑全仓。

检查覆盖事件重放、全部任务分母、账号与 Collection 隔离、状态与入口合法性、内容不被关系变化改写、任务事件缺失、stale snapshot、Search 匹配、Offline-first 来源链、普通案例、禁止改标真实研究证据，以及真实 `createScenarioAdapter` 对现行 scenario 的阶段隔离、完整集合、单任务/条目寻址、对象锚点和 Chat/Object 同源正文。

常用查询：`全部72任务和全部144条目`、`全部21次`、`全部延迟找回`、`全部组织后回访`、`普通Search例子`、`普通Collection例子`、`R0-REFIND-024`、`R0-049`、`全部事件来源`、`情境说明`、`待处理汇总`。全集不会进入默认 E0；明确请求才返回完整材料。

执行命令：

```powershell
& 'C:/Users/UIA/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' --test tests/reading-list-e0-corpus.test.mjs
```

工作目录为 `software-development-interaction-study`。这是材料层与实际 adapter 的阶段验证；未据此声称整个浏览器研究、候选执行器、正式实验或论文结果已经通过。

## 10. 完整材料的交付与后续 Chat 历史

全集不再依赖生成模型逐行重写。`app/api/software-agent/route.ts` 与 `lib/experiment/agent-gateway.ts` 在相同语义请求下提供正常的 canonical material 读取通路：只有当前 E0 的明确全集或单记录原文请求可以直达。请求体、场景注册、阶段与完整历史先完成验证；一般综合、比较、建议或带有其他问题的复合请求继续使用配置的 Agent。模型失败保持失败，不切换成资料回复。

完整资料响应带有 `deliveryKind=canonical_material`、`provider=local-canonical-material`、`providerInvoked=false` 与 `configuredAgentMode`。会话 Agent mode 与实际是否调用生成模型分开记录；`nodeIds` 只列出正文中实际有有效锚点的节点，不能把上下文或未返回节点当成披露。

容量为单条 256,000 字符、完整历史 1,000,000 字符、256 条消息、请求体 8 MiB，单次 canonical 交付上限也是 256,000 字符。超限明确返回失败，不剪掉开头历史或尾部资料。当前最大单资料节点“全部 E0 事件来源”约 10.3 万字符，可以完整保存，并在下一轮 Chat 中继续传入。多个重叠全集叠加超过容量时，要求明确缩小本次请求范围；不假装已经返回全部。

`tests/canonical-material-delivery-v42.test.mjs` 最终 9/9 通过，相关 API/网关/测试文件 ESLint 通过。测试直接执行实际 POST handler 和真实 scenario/adapter，仅替换 provider 网络边界，验证：完整事件正文逐字相等、provider 零调用、复合读取、单记录、一般讨论不绕过模型、无 key 时仍执行场景/阶段验证、共同机会 registry 保留、完整资料进入下一轮历史、容量拒绝不截断、模型错误不 fallback、local/remote gateway 正文一致。该测试不代表真实外部模型已接受相同长度的输入，也不代表浏览器或人类研究资格完成。
