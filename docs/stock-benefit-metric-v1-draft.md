# 股票场景 Benefit–Metric 与日志定义 V1.0

> 状态：待CHI评审与用户裁决；尚未冻结  
> 日期：2026-08-25  
> 上位依据：[Benefit冻结稿 V1.0](stock-benefits-frozen-v1.md)  
> 剧本依据：[实验剧本结构 V2.0](stock-experiment-script-v2-structure.md)

## 1. 测量原则

1. 主Claim由B1和B2承担；B3、B4只作为下游和场景性结果；
2. 效率不能只用总时间表示，必须同时考虑是否达到正确状态；
3. 未完成B1或未形成正确Intent的参与者不能从时间分析中直接删除；
4. 认知效率不能只从点击或时间推断，需要结合错误模式和针对性主观题；
5. Chat轮数、输入字符数、Widget点击数是不同交互方式的描述指标，不解释为等价动作数量；
6. Agent等待时间固定并完整记录，同时报告端到端时间和扣除等待后的主动任务时间；
7. 股票选择本身没有唯一正确答案；最终质量只评价Strategy、Evidence、权衡和风险的一致性；
8. Metric只能操作化已冻结Benefit和剧本，不能反向增加新任务或改变真值。

## 2. Primary Metrics候选

建议只冻结两个共同Primary Endpoints，分别对应两个主Benefit。

| Primary Metric | 对应Benefit | 起点 | 终点 | 未完成处理 | 预期方向 |
|---|---|---|---|---|---|
| `T_L2_complete` | B1早期证据再利用 | `constraint_exposed` | 首次满足“两条早期Evidence且跨至少两个目标维度”并记录`l2_completed` | 在`final_decision_submitted`处右删失，同时报告完成率 | Widget更短，完成率不低于Chat-only |
| `T_first_correct_intent` | B2a/B2b需求转译与共享状态维护 | `constraint_exposed` | 首次提交5/5正确Strategy并记录相应`intent_committed` | 在`final_decision_submitted`处右删失，同时报告正确完成率 | Widget更短，正确完成率不低于Chat-only |

### 为什么不只比较成功者时间

如果只保留最终成功的参与者，无法区分：

- 快速且正确；
- 快速但错误；
- 多次修正后正确；
- 到任务结束仍未正确。

因此两个Primary Metrics都应作为time-to-event结果保存，并同时报告对应完成率。具体统计模型和多重比较方式待样本量与跨场景设计确定后冻结。

## 3. B1：早期证据再利用

### 3.1 核心操作定义

早期Evidence必须满足：

1. 对应事实在Round 01—05中已经暴露；
2. 参与者在Round 08新需求真实可见后重新指明或操作该事实；
3. 参与者明确执行“加入依据/作为依据”，仅查看或Focus不计入Evidence；
4. 至少两条Evidence来自至少两个目标维度。

目标维度仍为：

| 维度 | 合格事实示例 |
|---|---|
| 增长保留 | `A-GROWTH`、`B-GROWTH`、`G-GROWTH` |
| 可变现性 | `A-LIQUIDITY`、`B-LIQUIDITY`、`G-LIQUIDITY` |
| 稳定性/下行风险 | `A-CONCENTRATION`、`A-VALUATION`、`B-CASHFLOW`、`B-VOLATILITY`、`B-CYCLE`、`G-DEBT` |

`B-VALUATION`和`G-VALUATION`可以被使用，但不自动判定为完成核心维度的强Evidence；其合理性结合参与者解释编码。

### 3.2 B1 Secondary Metrics

| Metric | 定义 | 用途 |
|---|---|---|
| `T_first_target_reference` | 新需求可见至首次正确重新指明一项目标事实 | 测量重新定位和识别速度 |
| `T_first_evidence` | 新需求可见至首次目标事实进入Evidence | 测量从找到信息到确认使用的速度 |
| `L2_completion` | 最终提交前是否达到L2交互完成标准 | 与时间结果共同报告 |
| `target_evidence_count` | 最终确认的目标Evidence数量 | 描述选择范围，不假设越多越好 |
| `target_dimension_coverage` | 已确认Evidence覆盖的目标维度数，0—3 | 判断是否只围绕单一目标 |
| `weak_signal_evidence_count` | 三条弱诊断性信息进入Evidence的数量 | 分析信息筛选行为 |
| `evidence_revisions` | Evidence被重复加入、移除或替换的次数 | 描述修正过程 |

### 3.3 弱诊断性信息编码

`A-WEAKSIGNAL`、`B-WEAKSIGNAL`、`G-WEAKSIGNAL`不自动记为错误。

| 使用方式 | 编码 |
|---|---|
| 明确指出缺少订单、合同或收入数据，因此暂不作为主要依据 | 合理的不确定性判断 |
| 作为补充背景，同时主要依赖核心事实 | 弱相关但可接受 |
| 直接将其解释为已实现的收入或确定增长 | 事实过度推断 |
| 作为主要依据且不说明证据限制 | 低质量Evidence |

## 4. B2a：中度隐式需求的Intent转译

### 4.1 Intent五字段真值

| 字段 | V2目标 | 得分 |
|---|---|---:|
| 总体研究视角 | 保持约12个月 | 1 |
| 短期资金需求 | 30%资金可能在6个月内使用 | 1 |
| 下行风险优先级 | 高 | 1 |
| 经营稳定性优先级 | 高 | 1 |
| 增长优先级 | 中，但保留 | 1 |

`Intent accuracy = 正确字段数 ÷ 5`。

### 4.2 B2a Secondary Metrics

| Metric | 定义 | 用途 |
|---|---|---|
| `first_commit_accuracy` | 第一次`intent_committed`的正确字段数，0—5 | 避免最终修正掩盖首次理解差异 |
| `final_intent_accuracy` | 最终提交时最新Strategy的正确字段数，0—5 | 判断最终状态质量 |
| `field_omission_count` | 应改变但仍停留在V1值的字段数 | 测量需求转译遗漏 |
| `wrong_overwrite_count` | 本应保持但被错误修改的字段数 | 重点识别“全部期限改为6个月” |
| `growth_deleted` | 是否把增长改为“不考虑” | 识别对“不完全放弃增长”的误解 |
| `intent_commit_count` | 最终提交前确认过的Strategy版本数 | 描述修正成本 |

### 4.3 首次未修改确认

参与者可以确认完全未修改的Initial Intent V1。该行为：

- 正常记录`intent_committed`；
- `changed_field_count = 0`；
- 作为first commit参与准确率计算；
- 不触发纠错或遗漏提示；
- 不阻止参与者继续修改或最终提交。

## 5. B2b：共享Intent状态维护

### 5.1 B2b Secondary Metrics

| Metric | 定义 | 用途 |
|---|---|---|
| `T_first_intent_commit` | 新需求可见至第一次Strategy确认，无论正确性 | 区分快速确认和最终正确 |
| `intent_revision_count` | 第一次确认后再次提交Strategy的次数 | 测量状态修复成本 |
| `intent_undo_count` | 已确认Strategy被撤销的次数 | 描述恢复行为，不预设多或少更好 |
| `strategy_view_count` | 主动查看当前已确认Strategy的次数 | 描述状态核查行为 |
| `clarification_count` | Agent无法判断查看、Evidence或Intent操作而要求澄清的次数 | 测量语言指令歧义成本 |
| `confirmed_state_mismatch` | 最终状态理解题与系统最新Strategy不一致 | 检验用户—Agent共享状态是否一致 |

### 5.2 状态理解题

主任务完成后、不再允许返回修改时，参与者回答：

> 在你提交最终判断时，系统实际采用的策略是什么？

使用与Strategy相同的五字段，但不显示系统答案。计算参与者回答与最新确认Strategy之间的一致字段数，0—5。

该题测量的是用户是否知道系统实际采用什么状态，不与目标Intent V2比较。两种正确性必须分开：

- `Intent accuracy`：系统状态是否符合V2真值；
- `State understanding`：用户理解是否符合系统实际状态。

## 6. B3：最终判断与更新后目标的一致性

B3不作为Primary Endpoint。最终理由由不知道实验条件的评分者编码。

| 子项 | 0分 | 1分 | 2分 |
|---|---|---|---|
| Intent一致性 | 仍按V1或与最新Strategy冲突 | 体现部分最新要求 | 同时处理短期需求、稳定/下行和增长保留 |
| Evidence复用 | 未使用早期目标事实 | 使用1条目标事实 | 使用至少2条且跨两个目标维度 |
| 权衡表达 | 只有单向优点或结论 | 简单提及利弊 | 明确解释冲突条件下为何仍选择该股票 |

`B3 quality score = 0—6`。

另行记录：

- 最终理由使用了多少条已确认Evidence；
- 是否引用未加入Evidence的事实；
- 相关维度覆盖数，0—3；
- 事实错误数量；
- 弱诊断信息过度推断数量。

## 7. B4：关键风险遗漏

B4独立于B3的0—6分报告。

| 最终股票 | 合格关键风险 |
|---|---|
| ALFA | 最大客户收入占比42%；或高估值下行敏感性 |
| BETA | 行业周期变化可能削弱现金流稳定性 |
| GAMMA | 资产负债率68%；或低成交活跃度影响可变现性 |

| Metric | 定义 |
|---|---|
| `critical_risk_mentioned` | 是否命中所选股票至少一项关键风险 |
| `risk_omission` | 未命中时为1，命中时为0 |
| `risk_specificity` | 0=无风险，1=一般风险，2=候选特定且可核查 |

B4结果不显著不能单独否定B1、B2或总Claim。

## 8. 交互成本和时间分解

### 8.1 时间口径

| 时间 | 定义 |
|---|---|
| 端到端时间 | `constraint_exposed`至目标事件的连续可见任务时间 |
| Agent等待时间 | 所有`agent_reply_started`至对应`agent_reply_received`区间之和 |
| 页面隐藏时间 | 浏览器页面处于hidden状态的区间之和 |
| 主动任务时间 | 端到端时间减去Agent等待和页面隐藏时间；保留用户阅读、思考和操作时间 |

### 8.2 条件内描述指标

| Metric | Chat-only | Chat + Widget |
|---|---|---|
| Chat轮数 | 用户发送的`chat_sent`数量 | 用户发送的`chat_sent`数量 |
| 输入字符数 | 新需求后用户输入的总字符数 | 新需求后用户输入的总字符数 |
| Widget操作数 | 不适用 | fact、Evidence、Strategy相关操作数 |
| Agent澄清数 | 无法解析语言操作的次数 | 无法解析Chat操作的次数 |

Chat轮数和输入字符数可以跨条件比较；Widget点击数不能与Chat字符数相加形成“总动作数”。

## 9. 针对性主观题

主任务和状态理解题结束后，使用1—7分量表：1=非常不同意，7=非常同意。

| ID | 题目 | 对应Benefit | 方向 |
|---|---|---|---|
| `Q_RETRIEVAL_EFFORT` | 为了重新找到前面出现的有用信息，我投入了很多精力。 | B1 | 越低越好 |
| `Q_TRANSLATION_EFFORT` | 将新的资金需求转化为具体判断策略让我感到费力。 | B2a | 越低越好 |
| `Q_STATE_CLARITY` | 我清楚知道系统在最终判断时采用了什么策略。 | B2b | 越高越好 |
| `Q_CHANGE_CERTAINTY` | 我能确定自己对策略的修改是否已经生效。 | B2b | 越高越好 |
| `Q_CONTROL` | 在调整判断依据和策略时，我感到自己能够控制整个过程。 | B1/B2 | 越高越好 |

这些题项是场景化体验指标，不能单独作为经过验证的“整体认知负荷”量表。若整篇论文需要NASA-TLX或统一可用性量表，应在跨场景实验设计阶段另行决定。

## 10. 日志事件冻结候选

### 10.1 公共字段

每条事件至少包含：

```text
session_id
condition
timestamp_wall
timestamp_monotonic_ms
round_id
event_name
source = chat | widget | system
fact_id（如适用）
strategy_version（如适用）
payload（去除个人身份信息）
```

### 10.2 核心事件

```text
session_started
condition_assigned
round_exposed
provisional_decision_submitted
interaction_condition_activated
constraint_exposed
page_visibility_changed

chat_sent
agent_reply_started
agent_reply_received
clarification_requested

fact_viewed
fact_focused
fact_promoted_to_evidence
fact_removed_from_evidence
l2_completed

strategy_viewed
intent_edit_started
intent_draft_changed
intent_reviewed
intent_committed
intent_undone

confirmed_state_consumed
final_decision_submitted
state_understanding_submitted
questionnaire_submitted
session_completed
```

### 10.3 关键事件Payload

#### `constraint_exposed`

```text
visible_ratio
exposed_at_monotonic_ms
```

该事件在Round 08任务更新至少80%进入可见视口后记录一次。仅渲染到DOM但参与者尚未看到时不得开始主任务计时。

#### `fact_promoted_to_evidence`

```text
fact_id
dimension
is_target_fact
is_weak_signal
evidence_order
```

#### `intent_committed`

```text
strategy_version
strategy_fields
changed_fields
changed_field_count
correct_field_count
is_fully_correct
confirmed_unchanged
```

#### `final_decision_submitted`

```text
final_stock
rationale
rationale_character_count
latest_strategy_version
confirmed_evidence_ids
```

## 11. Metric事件映射

| Metric | 起点事件 | 终点或派生事件 |
|---|---|---|
| `T_first_target_reference` | `constraint_exposed` | 首个目标`fact_viewed`或正确Chat事实引用 |
| `T_first_evidence` | `constraint_exposed` | 首个目标`fact_promoted_to_evidence` |
| `T_L2_complete` | `constraint_exposed` | `l2_completed` |
| `T_first_intent_commit` | `constraint_exposed` | 首个`intent_committed` |
| `T_first_correct_intent` | `constraint_exposed` | 首个`is_fully_correct=true`的`intent_committed` |
| 主任务完成时间 | `constraint_exposed` | `final_decision_submitted` |
| Agent等待时间 | `agent_reply_started` | 对应`agent_reply_received`区间求和 |
| 页面隐藏时间 | `page_visibility_changed:hidden` | 对应`visible`区间求和 |

## 12. 建议的假设层级

### Primary Hypotheses

- **H1：**Chat + Widget相较Chat-only缩短`T_L2_complete`，且不降低L2完成率；
- **H2：**Chat + Widget相较Chat-only缩短`T_first_correct_intent`，且不降低正确Intent完成率。

### Secondary Hypotheses

- Widget条件的`first_commit_accuracy`更高、字段遗漏和错误覆盖更少；
- Widget条件的Chat轮数、输入字符数和澄清次数更少；
- Widget条件具有更低的主观信息找回与需求转译努力；
- Widget条件具有更高的共享状态清晰度和修改生效确定性。

### Exploratory / Downstream Outcomes

- B3最终理由质量；
- B4风险遗漏；
- 弱诊断信息使用方式；
- Widget条件中Chat与Widget的实际使用比例；
- 初步候选与最终候选是否发生修订。

## 13. 本轮需要裁决

1. 是否接受`T_L2_complete`和`T_first_correct_intent`作为两个Primary Endpoints；
2. 是否接受未完成者采用右删失并同时报告完成率；
3. 是否接受B2以first commit、first correct和final state三个层次报告；
4. 是否接受主任务后增加五字段状态理解题；
5. 是否接受五个场景化主观题；
6. 是否接受B3使用0—6分、B4风险单独报告；
7. 是否接受`constraint_exposed`以80%进入可见视口作为统一计时起点；
8. 是否接受本版日志事件和关键Payload作为后续Demo实现依据；
9. 是否在完成CHI复审后冻结本表，再修改Demo。

统计检验、效应量、样本量、跨场景模型和多重比较控制在实验总体设计确定后另行冻结。
