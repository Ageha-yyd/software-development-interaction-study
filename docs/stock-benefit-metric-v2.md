# 股票场景 Benefit–Metric V2.0（专业修订稿）

> 状态：待用户确认与最终CHI复审；尚未冻结  
> 日期：2026-08-25  
> 上位依据：[Benefit冻结稿 V1.0](stock-benefits-frozen-v1.md)  
> 剧本依据：[实验剧本结构 V2.0](stock-experiment-script-v2-structure.md)  
> 替代对象：[Benefit–Metric V1.0待评审稿](stock-benefit-metric-v1-draft.md)

## 1. 本版解决的问题

本版不修改已冻结的Benefit和股票事实，只重新建立测量体系，解决以下效度问题：

1. 不再用“点击按钮”或“发送消息”等条件特有动作定义任务成功；
2. 将B1证据再利用与B2 Intent调整自由交错视为一个联合工作流；
3. 区分最终是否成功、何时成功，以及成功状态是否维持到最终提交；
4. 将B2b共享状态维护直接操作化为标准化状态核查任务；
5. 将主动操作时间、Agent等待时间和端到端时间分开；
6. 将主动提前提交但未完成定义为失败，而不是普通右删失；
7. 使用直接的任务负荷测量支持“认知成本”相关论述；
8. 明确主指标、确认性指标、过程指标和探索性结果，避免指标泛滥。

## 2. 条件无关的语义状态

所有主要Metric只读取统一的后端语义状态。Chat-only和Chat + Widget可以通过不同交互路径改变状态，但终点定义完全相同。

### 2.1 Confirmed Evidence State

```text
confirmed_evidence = [fact_id, ...]
```

只有用户明确表达“加入依据/作为依据”并使系统状态更新后，事实才进入Confirmed Evidence。以下行为均不计为已确认Evidence：

- 只看到事实；
- 打开Popup或要求Agent复述；
- Focus、Highlight或“记住”；
- Agent自行推荐或补充；
- 用户在最终理由中首次提到、但此前没有确认加入依据。

### 2.2 Confirmed Strategy State

```text
confirmed_strategy = {
  horizon,
  short_term_fund_need,
  downside_risk_priority,
  operating_stability_priority,
  growth_priority
}
```

只有用户明确确认后，Draft才成为新的Confirmed Strategy版本。未确认Draft不属于Agent可消费的共享Intent。

### 2.3 B1合格状态：Evidence State Valid

当前Confirmed Evidence同时满足以下条件时，记为`evidence_state_valid = true`：

1. 至少包含2条Round 01—05已经暴露的目标事实；
2. 目标事实至少覆盖2个目标维度；
3. 事实由用户明确确认进入Evidence；
4. 不将三条弱诊断信息自动计作目标事实。

目标维度为：

- 增长保留；
- 可变现性；
- 经营稳定性/下行风险。

弱诊断信息可以进入Evidence，但其使用质量由盲法编码员另行判断，不自动导致状态成功或失败。

### 2.4 B2a合格状态：Intent State Protocol-Concordant

为避免把研究协议规定的映射表述为普适投资真理，正式分析中使用“符合协议预期”而不是“客观正确”。

| 字段 | 协议预期V2 | 分值 |
|---|---|---:|
| 总体研究视角 | 保持约12个月 | 1 |
| 短期资金需求 | 30%资金可能在6个月内使用 | 1 |
| 下行风险优先级 | 高 | 1 |
| 经营稳定性优先级 | 高 | 1 |
| 增长优先级 | 中，但保留 | 1 |

```text
intent_protocol_accuracy = 符合协议预期的字段数 / 5
intent_state_concordant = (正确字段数 == 5)
```

其中“30%资金/6个月”的短期需求字段承担可变现需求的Intent表达；可变现性事实是否被实际纳入依据由B1测量。

### 2.5 联合状态：Joint State Valid

```text
joint_state_valid = evidence_state_valid AND intent_state_concordant
```

联合状态表示用户已经同时完成：

- 将早期信息重新激活为当前Evidence；
- 将新需求转译并确认为当前Strategy。

## 3. Primary Outcome Family

### 3.1 P1：最终联合完成

| Metric | 定义 | 类型 | 预期方向 |
|---|---|---|---|
| `joint_success_final` | 最终提交时是否同时满足`evidence_state_valid`和`intent_state_concordant` | Binary | Chat + Widget更高 |

该指标是效果性底线，防止把“更快但错误”解释为效率提升。

### 3.2 P2：稳定联合完成时间

| Metric | 起点 | 终点 | 时间口径 | 预期方向 |
|---|---|---|---|---|
| `T_stable_joint_complete_active` | `constraint_exposed` | 最早一次进入`joint_state_valid`、且此后直到最终提交始终保持联合有效的时刻 | 扣除页面隐藏与Agent等待；保留阅读、思考和操作 | Chat + Widget更短 |

如果最终提交时联合状态无效，则不存在稳定联合完成事件。

同时报告：

- `T_first_joint_valid_active`：第一次短暂达到联合有效的时间；
- `joint_state_regression`：达到联合有效后是否又变为无效；
- `T_stable_joint_complete_wall`：只扣除页面隐藏、不扣除Agent等待的端到端时间。

其中主动时间是主要时间口径，避免Mock Agent的固定延迟人为决定结果；端到端时间用于呈现用户真实等待收益。若只有端到端时间改善而主动时间不改善，应解释为“减少等待轮次”，不能单独声称降低认知成本。

### 3.3 Primary结果的联合解释

不能用“完成率差异不显著”证明Widget没有损害正确性。

正式结论必须联合解释P1与P2：

- P1更高且P2更短：同时提高效果和效率；
- P1相近且P2更短：可能提高效率，但若要声称“完成率不降低”，必须预注册非劣效界值并具备相应样本量；
- P1更低但P2更短：属于速度—正确性权衡，不能直接支持主Claim；
- P1更高但P2更长：提高效果但未证明效率提升。

## 4. B1确认性与诊断性Metrics

### 4.1 B1确认性Metrics

| Metric | 精确定义 | 角色 | 预期方向 |
|---|---|---|---|
| `evidence_success_final` | 最终提交时`evidence_state_valid=true` | 确认性效果指标 | Widget更高 |
| `T_stable_evidence_valid_active` | 最早一次进入Evidence合格状态、且此后直到最终提交始终保持合格的主动时间 | 确认性效率指标 | Widget更短 |
| `target_dimension_coverage` | 最终Confirmed Evidence覆盖目标维度数，0—3 | 确认性完整度指标 | Widget更高，但不假设3一定优于2 |
| `Q_RETRIEVAL_EFFORT` | “为了重新找到前面出现的有用信息，我投入了很多精力”，1—7 | 场景化主观指标 | Widget更低 |

### 4.2 B1过程Metrics

| Metric | 定义 | 解释限制 |
|---|---|---|
| `T_first_target_reaccess` | 新约束可见至目标事实内容首次重新呈现给用户；Widget以Popup内容呈现计时，Chat以Agent返回对应事实计时 | 不是Evidence确认 |
| `T_first_target_reference` | 用户首次正确指明一项目标事实的时间 | 只测定位/识别 |
| `T_first_target_evidence` | 首条目标事实进入Confirmed Evidence的时间 | 测量首次激活 |
| `target_evidence_count` | 最终确认的目标事实数 | 不假设越多越好 |
| `non_target_evidence_count` | 最终确认的非目标事实数 | 不能自动视为错误 |
| `weak_signal_evidence_count` | 三条弱诊断信息进入Evidence的数量 | 必须结合使用方式编码 |
| `evidence_revision_count` | 已确认Evidence的加入、移除或替换次数 | 描述修正过程，不设单向优劣 |
| `evidence_state_regression` | 达到合格后是否又失去合格状态 | 测量维护失败 |

### 4.3 弱诊断信息编码

| 编码 | 判定标准 |
|---|---|
| `uncertainty_recognized` | 明确指出缺少订单、合同、规模或收入证据 |
| `background_only` | 作为背景使用，主要判断仍依赖核心事实 |
| `overclaim` | 将意向、试点或主观反馈解释为已实现收入或确定增长 |
| `unsupported_primary_evidence` | 将其作为主要依据且不说明证据限制 |

弱诊断信息数量只作过程描述；`overclaim`和`unsupported_primary_evidence`进入质量分析。

## 5. B2a确认性与诊断性Metrics

| Metric | 精确定义 | 角色 | 预期方向 |
|---|---|---|---|
| `first_commit_accuracy` | 第一次`intent_committed`符合协议预期的字段数，0—5 | 关键确认性指标 | Widget更高 |
| `final_intent_accuracy` | 最终提交时最新Confirmed Strategy符合协议预期的字段数，0—5 | 关键确认性指标 | Widget更高 |
| `intent_success_final` | 最终Intent是否5/5符合协议预期 | 与联合完成配套 | Widget更高 |
| `T_stable_intent_concordant_active` | 最早一次达到5/5且保持至最终提交的主动时间 | 确认性效率指标 | Widget更短 |
| `field_omission_count` | 应改变但仍停留在V1值的字段数 | 错误模式 | Widget更低 |
| `wrong_overwrite_count` | 本应保持但被错误修改的字段数 | 错误模式 | Widget更低 |
| `growth_deleted` | 是否将增长改成“不考虑” | 关键误解 | Widget更低 |
| `intent_commit_count` | 最终提交前确认的Strategy版本数 | 过程指标 | 不设单向优劣 |
| `Q_TRANSLATION_EFFORT` | “将新的资金需求转化为具体判断策略让我感到费力”，1—7 | 场景化主观指标 | Widget更低 |

第一次确认完全未修改的V1 Strategy仍正常进入`first_commit_accuracy`计算，系统不得提示其遗漏或错误。

## 6. B2b标准化状态核查

B2b不能只依赖自然发生的Undo或错误。正式实验在最终判断提交后增加一个测量环节，不改变股票任务本身：

> 你的最终判断已经记录，接下来不能再修改Strategy。请核对并填写：系统在形成最终说明时实际采用的Strategy是什么？

测量阶段保持原界面可访问：

- Chat-only可以查看历史或询问当前Strategy；
- Chat + Widget可以查看Strategy Object，也可以使用Chat；
- 两组均不能继续修改Strategy；
- 系统不反馈回答是否正确；
- 参与者使用相同的五字段表单提交一次答案。

### 6.1 B2b确认性Metrics

| Metric | 精确定义 | 预期方向 |
|---|---|---|
| `state_verification_accuracy` | 状态核查答案与系统最终实际Confirmed Strategy一致的字段数，0—5 | Widget更高 |
| `confirmed_state_mismatch` | 状态核查未达到5/5时为1 | Widget更低 |
| `T_state_verification_active` | `state_probe_exposed`至`state_probe_submitted`的主动时间 | Widget更短 |
| `state_lookup_interactions` | 核查阶段为查看当前状态发生的Chat请求或Widget查看次数 | 描述性，不直接设优劣 |
| `Q_STATE_CLARITY` | “我清楚知道系统在最终判断时采用了什么策略”，1—7 | Widget更高 |
| `Q_CHANGE_CERTAINTY` | “我能确定自己对策略的修改是否已经生效”，1—7 | Widget更高 |

### 6.2 B2b自然过程Metrics

| Metric | 定义 | 解释限制 |
|---|---|---|
| `intent_revision_count` | 第一次确认后再次提交Strategy的次数 | 多不一定差 |
| `intent_undo_count` | 恢复最近一个已确认版本的次数 | 只有发生错误时才有机会出现 |
| `strategy_view_count` | Round 08—11主动查看当前Confirmed Strategy的次数 | 查看可能代表困难，也可能代表有效核查 |
| `clarification_count` | Agent因无法确定对象、Evidence或Intent操作而要求澄清的次数 | 可作为语言歧义成本 |
| `confirmed_state_consumption_mismatch` | Agent实际消费版本与最新Confirmed Strategy是否不一致 | 系统完整性检查，理应始终为0 |

在不增加统一的错误注入或二次约束条件时，本实验可以确认“查看和理解共享状态”，但Undo/恢复能力只能作为探索性过程证据，不能形成强因果结论。

## 7. 交互成本与时间分解

### 7.1 时间定义

| Metric | 定义 | 用途 |
|---|---|---|
| `wall_visible_time` | 起点至终点的端到端时间，扣除页面隐藏区间 | 用户实际经历的可见总时间 |
| `agent_wait_time` | 所有`agent_reply_started`至`agent_reply_received`区间之和 | 分离模型等待成本 |
| `active_task_time` | `wall_visible_time - agent_wait_time` | 主要效率口径，保留阅读、思考和操作 |
| `page_hidden_time` | 页面处于hidden或失焦超过预设宽限期的时间 | 数据质量与时间扣除 |

`constraint_exposed`仅在以下条件同时满足后记录一次：

1. Round 08任务更新至少80%位于视口；
2. 页面处于visible且窗口获得焦点；
3. 上述状态连续保持至少500ms；
4. 两组任务更新组件尺寸和位置一致。

### 7.2 交互成本

| Metric | 定义 | 是否跨条件直接比较 |
|---|---|---|
| `chat_turn_count` | Round 08后用户发送消息数 | 是 |
| `chat_character_count` | Round 08后用户输入字符总数 | 是 |
| `clarification_count` | Agent要求澄清的次数 | 是 |
| `semantic_commit_count` | Evidence或Intent确认状态发生语义更新的次数 | 是 |
| `widget_raw_action_count` | 点击、展开、编辑等原始Widget动作数 | 否，只描述Widget使用 |
| `fact_popup_count` | Widget打开事实Popup次数 | 否 |

禁止将Widget点击数与Chat字符数相加形成“总动作数”。

## 8. 认知与主观体验Metrics

由于总Claim包含认知成本，正式实验不能只用完成时间或错误率间接推断认知负荷。

### 8.1 统一任务负荷

建议在四个实验场景中统一使用Raw NASA-TLX六个维度，并预先指定：

- `RTLX_total`：总体任务负荷确认性次级指标；
- `mental_demand`与`effort`：与本Claim最相关的分项结果；
- 其余维度完整收集并透明报告，避免只选择显著分项。

### 8.2 场景化题项

以下题项使用1—7分量表，作为机制解释而非经过验证的独立量表：

| ID | 题目 | 对应构念 |
|---|---|---|
| `Q_RETRIEVAL_EFFORT` | 为了重新找到前面出现的有用信息，我投入了很多精力。 | B1信息找回努力 |
| `Q_TRANSLATION_EFFORT` | 将新的资金需求转化为具体判断策略让我感到费力。 | B2a需求转译努力 |
| `Q_STATE_CLARITY` | 我清楚知道系统在最终判断时采用了什么策略。 | B2b共享状态清晰度 |
| `Q_CHANGE_CERTAINTY` | 我能确定自己对策略的修改是否已经生效。 | B2b修改确定性 |
| `Q_CONTROL` | 在调整判断依据和策略时，我感到自己能够控制整个过程。 | 整体控制感 |

若不采用统一任务负荷量表，论文只能声称降低“场景化主观努力”，不能将单题结果扩大解释为一般认知负荷下降。

## 9. B3与B4下游结果

### 9.1 B3最终理由质量

最终理由由不知道实验条件的两名评分者独立编码。

| 子项 | 0分 | 1分 | 2分 |
|---|---|---|---|
| Intent一致性 | 仍按V1或与最终Strategy冲突 | 体现部分新要求 | 同时处理短期需求、稳定/下行与增长保留 |
| Evidence复用 | 未使用早期目标事实 | 使用1条目标事实 | 使用至少2条且跨2个目标维度 |
| 权衡表达 | 只有单向优点或结论 | 简单提及利弊 | 明确解释冲突条件下为何仍选择该股票 |

保留`B3_quality_score = 0—6`，但三个子项必须分别报告。另行编码事实错误、未确认事实使用和弱诊断信息过度推断。

评分者应先在独立训练样本上校准，再对正式数据盲法双重编码；报告适合变量类型的评分者一致性并预设分歧裁决程序。

### 9.2 B4风险遗漏

| Metric | 定义 |
|---|---|
| `critical_risk_mentioned` | 是否命中最终候选至少一项预定义关键风险 |
| `risk_omission` | 未命中为1，命中为0 |
| `risk_specificity` | 0=无风险；1=一般风险；2=候选特定且可核查 |

B4只作股票场景下游结果。预测试必须检查三只股票关键风险的显著性、文本长度和识别难度是否大致平衡。

## 10. 终止状态、失败与超时

正式实验应在预测试后冻结统一的最大调整时间`H`，两组相同且页面预先告知。

| 终止方式 | 编码 |
|---|---|
| 最终提交且联合状态有效 | `terminal_status = joint_success` |
| 最终提交但联合状态无效 | `terminal_status = incomplete_submission`，属于失败而非右删失 |
| 达到固定时间上限且未联合完成 | `terminal_status = timeout`，属于行政性时间上限 |
| 技术故障或浏览器意外中断 | `terminal_status = technical_censor`，单独记录和报告 |

不得将主动提前提交但未成功的参与者从时间分析中删除，也不得将其当作随机失访。

具体统计模型应在总体实验设计、条件分配方式和样本量确定后预注册。若使用时间到事件分析，必须将`incomplete_submission`作为竞争性终止而不是普通右删失；若样本不足以支持该模型，则以固定时限联合完成率为主要推断，成功用时只作条件性描述。

## 11. 核心日志事件

### 11.1 公共字段

```text
session_id
participant_id_hash
condition
timestamp_wall
timestamp_monotonic_ms
round_id
event_name
source = chat | widget | system
fact_id
strategy_version
payload
```

### 11.2 事件列表

```text
constraint_exposed
page_visibility_changed

chat_sent
agent_reply_started
agent_reply_received
clarification_requested

fact_content_reaccessed
fact_focused
evidence_state_changed
evidence_state_became_valid
evidence_state_became_invalid

intent_edit_started
intent_draft_changed
intent_reviewed
intent_committed
intent_undone
intent_state_became_concordant
intent_state_became_nonconcordant

joint_state_became_valid
joint_state_became_invalid
confirmed_state_consumed

final_decision_submitted
state_probe_exposed
state_probe_lookup
state_probe_submitted
questionnaire_submitted
session_completed
```

### 11.3 关键Payload

#### `evidence_state_changed`

```text
previous_evidence_ids
current_evidence_ids
change_type = add | remove | replace
target_evidence_count
target_dimension_coverage
evidence_state_valid
```

#### `intent_committed`

```text
strategy_version
strategy_fields
changed_fields
correct_field_count
is_protocol_concordant
confirmed_unchanged
```

#### `joint_state_became_valid`

```text
strategy_version
confirmed_evidence_ids
active_elapsed_ms
wall_visible_elapsed_ms
```

#### `final_decision_submitted`

```text
final_stock
rationale
latest_strategy_version
confirmed_evidence_ids
evidence_state_valid
intent_state_concordant
joint_state_valid
terminal_status
```

#### `state_probe_submitted`

```text
reported_strategy_fields
actual_strategy_fields
matching_field_count
confirmed_state_mismatch
active_elapsed_ms
lookup_interactions
```

## 12. Chat语义识别的公平性与审计

Chat-only的自然语言解析不能成为隐藏的第三个实验变量。

1. 两组所有语义状态更新都写入相同的数据结构；
2. Chat-only允许一个消息同时表达多条Evidence或多个字段修改，不人为拆成多轮；
3. Agent只在真实歧义时澄清，不能因未使用预设关键词而拒绝明显指令；
4. 保存去标识化的原始Chat文本和解析结果；
5. 由不知道条件假设的编码员离线核查Chat语义动作；
6. 在正式分析前报告解析正确率和分歧处理规则；
7. 若自动解析与人工编码不一致达到预设阈值，应使用预注册的人工裁决语义事件重新派生Metric，而不是静默修正个别样本。

## 13. 预测试校准与正式冻结条件

### 13.1 必须预测试的项目

1. 五字段协议预期是否存在合理的替代解释；
2. `evidence_state_valid`门槛是否出现明显地板或天花板效应；
3. Chat-only语义解析是否能覆盖参与者自然表达；
4. 两组Round 08真实曝光时点是否一致；
5. 状态核查题是否测量界面核查，而不是题意误解；
6. 三只股票的风险识别难度是否大致平衡；
7. 固定最大调整时间`H`是否足以让多数参与者完成，但不会导致无上限拖延；
8. Agent等待时长是否让端到端差异完全由Mock延迟机械决定。

### 13.2 正式实验前必须冻结

- 最大调整时间`H`；
- Primary outcome family和多重检验策略；
- 若使用非劣效解释，相应界值和样本量；
- Chat语义解析审计阈值；
- 评分者训练、盲法和分歧裁决规则；
- 技术故障、注意力失败和异常时间的排除规则；
- 统计模型、效应量与置信区间；
- 四场景共同量表和跨场景模型。

## 14. Metric层级定稿建议

| 层级 | Metric | 支撑的结论 |
|---|---|---|
| Primary效果性 | `joint_success_final` | 是否完成Evidence复用和Intent转译的联合正确状态 |
| Primary效率性 | `T_stable_joint_complete_active` | 达到并保持联合状态需要多少主动任务时间 |
| 关键端到端结果 | `T_stable_joint_complete_wall` | 用户实际经历的总时间收益及Agent等待影响 |
| B1确认性 | `evidence_success_final`、`T_stable_evidence_valid_active`、维度覆盖 | 是否高效完成早期证据再利用 |
| B2a确认性 | 首次/最终Intent准确率、`T_stable_intent_concordant_active` | 是否高效完成中度隐式需求转译 |
| B2b确认性 | 状态核查准确率、核查时间、状态不一致率 | 是否高效检查人机共享Intent |
| 认知确认性次级 | `RTLX_total`，重点解释Mental Demand与Effort | 是否降低主观任务负荷 |
| 机制与过程 | Chat轮数、字符数、澄清、语义提交、查看与修订日志 | 为什么产生差异 |
| 下游探索性 | B3理由质量、B4风险遗漏、弱信号使用 | 效率收益是否进入最终判断 |

本版不以股票选择是否符合某个唯一答案作为Metric，也不把Widget点击少、Graph阅读快或系统推荐正确值作为Benefit证据。
