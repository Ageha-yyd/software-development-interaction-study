# 股票场景 Benefit–Metric V3.2｜V3.3剧本协调候选稿

> 状态：冻结用于V3.3原型实现；H、L及总体SAP参数待统一裁决，尚非正式数据采集版  
> 日期：2026-08-27  
> 适用条件：Chat-only vs. Chat + Widget  
> 适用任务：多轮虚构股票比较、约束变化后的早期信息复用与Intent调整  
> 上位依据：[Benefit冻结稿 V1.0](stock-benefits-frozen-v1.md)  
> 剧本依据：[8轮实验剧本 V3.3](stock-experiment-script-v3-8round-draft.md)  
> 对象轮次依据：[信息对象轮次覆盖表 V1.1](stock-information-objects-v1.1.md)

## 1. 本方案能支持和不能支持的Claim

### 1.1 可以支持

在固定时限内，相较Chat-only，Chat + Widget是否提高了以下联合任务的质量门控效率：

1. 将约束变化前出现的事实可观察地整合进更新后的最终理由；
2. 将中度隐式的新需求转译并确认为Agent实际消费的Strategy；
3. 更高效地核查任务终止时系统保存的Confirmed Strategy；
4. 降低参与者报告的主观任务负荷。

### 1.2 不能直接支持

- Widget帮助用户“选对股票”；
- 用户投资决策能力普遍提高；
- Graph天然优于Text；
- 用户始终记住所有共享状态；
- Widget在所有任务中降低客观认知负荷；
- Undo或恢复能力更强，除非另设统一的错误注入或二次约束任务；
- 单独由Widget视觉表征产生因果作用。

本实验估计的是完整交互方案包的效果。若Chat-only和Chat + Widget在解析、反馈或等待上不同，结果只能归因于整体交互方案，而不能单独归因于“可视化”这一成分。

### 1.3 与论文初稿OCFT的关系

论文初稿将`OCFT`定义为中间触发器出现后，到满足预注册目标状态迁移为止的主动用户时间，并排除固定模型等待；本方案的唯一Primary `joint_success_time_gain_H`使用从`t0`到终止锁的端到端wall time、固定时限`H`和联合质量门控。二者共享“输出后局部重构效率”的理论方向，但不是同一指标：

| 论文edge-cost量 | V3.3可观测对应项 | 可否直接等同 |
|---|---|---|
| OCFT | `T=tS-t0`、`joint_success_time_gain_H` | 否；主动时间与wall time、终点和截尾规则不同 |
| target/local information access | `T_first_target_reaccess`、`qualified_reaccess` | 部分对应；需保持相同可见性规则 |
| action enactment | 首次Evidence确认、首次Strategy确认时间 | 部分对应；V3.3是复合状态更新 |
| verification | `state_verification_time_gain_L` | 部分对应；发生在主任务后Probe |
| turns/actions per edge | Chat turns、typed characters、widget actions、interaction-path excess | 机制对应；不能把异质动作简单相加 |
| state-delta precision | 应改字段准确率、保留字段准确率、off-target changes | 构念对应 |

因此，论文不能把V3.3的Primary结果标成OCFT，也不能把论文草稿中的OCFT数值填入本实验。若团队决定全论文统一以OCFT为Primary，必须在数据采集前另行改写本Metric、H/终止规则和分析计划；不能在看到数据后改名。

## 2. 测量对象与状态记号

| 记号 | 定义 |
|---|---|
| `t0` | Round 05新约束真实可见的统一计时起点 |
| `H` | 股票主任务最大端到端时限；当前不指定数值，正式数据采集前统一冻结 |
| `tS` | 最终提交请求成功取得终止事务锁的时间；Primary的完成时点 |
| `tF` | 最终答案内容、冻结上下文和接收事件均完成持久化的时间；仅用于完整性审计 |
| `E0` | `t0`时的Confirmed Evidence快照 |
| `EF` | 终止事务锁取得后在唯一冻结上下文中的Confirmed Evidence快照 |
| `SC` | 任务终止时用户最后明确确认的Strategy；若未提交则取H时状态 |
| `SA` | Agent在形成最终说明时实际消费的Strategy |
| `EA` | Agent在形成最终说明时实际消费的Evidence集合 |
| `U` | 盲法编码确认在最终理由中被实际使用的早期事实集合 |
| `SF` | 任务终止时原子冻结的最终Confirmed Strategy；提交和超时均存在 |
| `SB` | 用户在无辅助条件下认为任务终止时系统保存的Strategy |
| `SV0` | 开放核查阶段呈现的待核查Strategy摘要，包含一处标准化差异 |
| `SV` | 用户开放界面核查后提交的Strategy摘要 |

Primary使用系统实际锁定、显示和消费的状态。人工编码只用于分析用户表达和最终理由，不能覆盖实验当时的系统状态。

## 3. 固定测量流程

```text
Round 05约束曝光并记录t0
→ Round 06自由交错复用信息、调整Intent并让Agent消费状态
→ Round 07形成最终理由并提交
→ 最终提交请求或deadline竞争同一终止事务锁
→ 若最终提交请求先成功取得锁，记录tS；否则进入超时
→ 获胜触发器在同一原子区内生成唯一context_id并捕获SF、EF及最近一次SA、EA
→ 持久化唯一task_context_frozen；锁后状态更新不得进入该快照
→ 有效提交或deadline事件引用同一个context_id
→ 立即完成主任务负荷与场景化主观题
→ 无辅助状态理解Probe：隐藏Chat、Widget和Strategy内容
→ 开放界面状态核查Probe：恢复原条件界面但严格只读
→ 结束与Debrief
```

所有主任务负荷和主观题必须在状态Probe之前完成，避免Probe反向污染对主任务的评价。

## 4. 唯一Primary：成功门控的受限时间收益

### 4.1 联合成功的构成

一次最终提交只有同时满足以下条件才是`joint_task_success_final = 1`：

```text
B1 evidence_use_success = 1
AND
B2a strategy_protocol_success(SC) = 1
AND
B2a strategy_protocol_success(SA) = 1
AND
SC == SA
AND
用户在t0后明确确认过Strategy
AND
state_integrity_ok = 1
AND
terminal_trigger = final_submit_lock_acquired，且T_i = tS - t0 < H
```

`state_integrity_ok=1`要求终止时存在唯一可回放的冻结上下文，最终提交、Confirmed Strategy、Confirmed Evidence和最近一次Agent消费事件均可由版本号及事件引用无歧义重建，且不存在损坏或串线。`EF`与`EA`不同本身不使该项为0，而作为Evidence执行保真度与状态变化机制报告。解析器对用户指令的普通误解不属于可豁免技术故障，而是完整交互方案的真实结果。

其中B1和B2a的精确定义见第5、6节。

### 4.2 Primary Metric

对参与者`i`定义：

```text
若在H内联合成功提交：
    joint_success_time_gain_H(i) = (H - T_i) / H
否则：
    joint_success_time_gain_H(i) = 0
```

其中`T_i = tS - t0`且`T_i < H`。Metric范围为0—1：

- 无效提前提交、未提交、超时均为0；
- 成功越早，分数越高；
- 所有进入正式任务的参与者都有定义；
- 不需要删除失败者；
- 不依赖未来回溯确定所谓“稳定事件”；
- 不需要只比较成功者的平均时间。

该Metric等价于固定时限内“有效完成累计发生曲线”的标准化面积，直观含义为：在质量门控后，参与者提前完成任务所获得的受限时间收益。

### 4.3 Primary Estimand

```text
ΔG = mean(G | Chat + Widget) - mean(G | Chat-only)
G = joint_success_time_gain_H
```

必须报告：

- 两条件`mean(G)`；
- `ΔG`及95%置信区间；
- `H × ΔG`，作为便于解释的受限时间收益；
- 与随机分配方式一致的效应估计和检验。

确认性判定：`ΔG`的95%置信区间下界大于0时，支持“固定时限内成功—速度综合表现提高”。

### 4.4 Primary必须同步分解

Primary显著后仍必须透明报告：

| 分解指标 | 目的 |
|---|---|
| `joint_success_by_H` | 固定时限内联合成功率 |
| `invalid_submission_rate` | 无效提前提交率 |
| `timeout_rate` | 超时或无提交率 |
| `valid_completion_cumulative_incidence(t)` | 有效完成随时间的累积发生曲线 |
| 成功者提交时间分布 | 仅作描述，不单独进行条件因果推断 |

解释边界：

- `ΔG > 0`只直接支持“质量门控的综合效率提高”；
- 如果Widget成功率点估计更低，必须明确报告速度—成功率权衡；
- “成功率差异不显著”不能解释为成功率相同；
- 如果论文必须声称“正确完成率不下降”，需另行预注册并充分赋能的非劣效检验，不能用小样本替代。

## 5. B1：早期信息的可观察复用

B1严格区分“重新看到”“加入Evidence”和“在最终理由中可观察地用于判断”。三者不能相互替代。最终理由能够证明参与者公开整合了信息，但不能直接证明该事实在其内部认知过程中具有因果作用。

### 5.1 Qualified Initial Exposure与Qualified Reaccess｜机制

一个早期事实`f`只有在`t0`前满足以下条件，才产生`qualified_initial_exposure(f)`：

1. 事实规范标题和规范值至少50%位于视口；
2. 页面visible且窗口有焦点；
3. 连续可见至少1000ms；
4. 事件发生在Round 01—04且早于`t0`。

Round 01—04中，本轮全部对象均发生合格初次暴露后才开放“继续”。这只证明事实真实进入过可见区域，不等于参与者理解或记住了事实。

一个早期事实`f`在`t0`后满足以下条件时产生一次`qualified_reaccess(f)`：

1. `f`在`t0`前已有`qualified_initial_exposure(f)`；
2. 因用户主动滚动、打开Popup或明确询问而呈现；
3. 事实规范文本或预注册的语义等价文本至少50%位于视口；
4. 页面visible且窗口有焦点；
5. 连续可见至少1000ms；
6. Round 06中Agent按模板自动生成的比较说明不计为用户主动重新访问。

若`t0`前没有合格初次暴露，之后第一次打开只记录`first_access_after_t0(f)`，不得编码为reaccess。

Chat历史中的事实文本与Widget事实内容必须使用相同`fact_id`标记。用户从记忆直接使用事实可以计入实际复用，但不能反向伪造reaccess事件。

### 5.2 Explicit Evidence Activation｜近端机制

| Metric | 定义 |
|---|---|
| `explicit_target_evidence_count` | `EF`中目标事实数量 |
| `explicit_dimension_coverage` | `EF`覆盖目标维度数，0—3 |
| `explicit_evidence_valid` | `EF`至少含2条目标事实且覆盖至少2个维度 |
| `agent_consumed_target_evidence_count` | `EA`中目标事实数量 |
| `evidence_execution_fidelity` | `card(EF ∩ EA) / card(EF)`；表示终止时已确认Evidence被最近一次Agent上下文消费的比例；`EF`为空时记为`NA`而非1 |
| `confirmed_not_consumed_count` | `card(EF - EA)`；终止时已确认但最近一次Agent上下文未消费的Evidence数量 |
| `consumed_not_confirmed_count` | `card(EA - EF)`；最近一次Agent上下文消费但终止时已不在Confirmed Evidence中的数量 |

这些指标测量共享Evidence状态是否建立和被Agent消费，不等于用户真正理解或使用。`EF == EA`及上述执行保真度只用于系统/机制分析，不作为Primary成功门槛。

### 5.3 Observable Evidence Use｜B1核心结果

两组必须逐字显示相同的最终理由提示：

> 请选择一只最值得进一步研究的股票，并提交100—150个字符的理由，标点计入字符数。理由中请引用至少两条此前出现的具体事实；这些事实应涉及至少两个不同方面，并说明它们如何符合当前Strategy、影响你的选择、比较或权衡。同时指出至少一项仍需核查的风险。

盲法编码员只根据该相同格式、相同字数范围的最终理由识别集合`U`。一个事实只有同时满足以下条件才进入`U`：

1. 该事实在新约束前已经发生`qualified_initial_exposure`；
2. 内容表述准确，不是事实错误或过度推断；
3. 参与者明确说明它如何支持、反对或比较某个候选；
4. 它与更新后的增长、可变现性、稳定性或下行风险目标建立了语义联系。

定义：

```text
evidence_use_success = 1，当且仅当：
  |U中的目标事实| >= 2
  AND U覆盖至少2个目标维度
  AND 至少1条事实直接涉及最终候选，或被用于明确的跨候选比较
```

三条弱诊断信息不能作为满足该门槛的目标事实，但其合理谨慎使用不自动记错。

### 5.4 B1结果与机制Metric

| 层级 | Metric | 方向 |
|---|---|---|
| 关键确认性 | `evidence_use_success` | Widget更高 |
| 支持性 | `used_target_fact_count` | Widget更多，但不假设无限增加更好 |
| 支持性 | `used_dimension_coverage` | Widget覆盖更充分 |
| 收敛效度 | `used_confirmed_count = card(U ∩ EF)` | 描述状态和实际使用对齐 |
| 数据资格/实现检查 | `qualified_initial_exposure_rate` | 由继续门槛保证；用于审计暴露与实现完整性，不作条件比较或Benefit结果 |
| 机制 | `T_first_target_reaccess` | Widget更短 |
| 机制 | `T_first_explicit_evidence` | Widget更短 |
| 机制 | `explicit_evidence_valid` | Widget更高 |
| 机制/系统保真度 | `evidence_execution_fidelity` | 描述性；不进入Primary门控 |
| 机制/系统保真度 | `confirmed_not_consumed_count`、`consumed_not_confirmed_count` | 描述Evidence状态与Agent上下文之间的差异 |
| 机制 | `unused_confirmed_count = card(EF - U)` | 描述“加入但未使用” |
| 机制 | `used_unconfirmed_count = card(U - EF)` | 描述“使用但未显式确认” |

## 6. B2a：中度隐式需求的Intent转译

### 6.1 字段集合

必须改变的字段集合`C`：

| 字段 | 接受值 |
|---|---|
| 短期资金需求 | 30%资金可能在6个月内使用 |
| 下行风险优先级 | 高 |
| 经营稳定性优先级 | 高 |
| 增长优先级 | 中，但保留 |

必须保持的字段集合`P`：

| 字段 | 接受值 |
|---|---|
| 总体研究视角 | 约12个月 |

Strategy状态使用闭合枚举值，不直接用自由文本判分。Chat解析器必须在实验前将表达映射到第6.1节列出的规范枚举；未能唯一映射时进入中性澄清流程。接受值和边界以本节为准，正式数据开始后不得调整。

### 6.2 精确Metric

对任一Strategy状态`S`定义：

```text
required_change_accuracy(S)
  = C中符合接受值的字段数 / 4

preservation_accuracy(S)
  = P中符合接受值的字段数 / 1

strategy_protocol_success(S)
  = 1，当required_change_accuracy(S)=1
      且preservation_accuracy(S)=1
```

主要状态：

| Metric | 定义 | 角色 |
|---|---|---|
| `required_change_accuracy_SC` | 用户最终确认状态中应改变字段的正确比例 | 字段更新分解 |
| `preservation_accuracy_SC` | 用户是否正确保留总体12个月视角 | 安全性/错误分解 |
| `strategy_protocol_success_SC` | 用户最终确认状态是否5/5符合协议 | B2a关键确认性结果与严格成功标准 |
| `strategy_protocol_success_SA` | Agent实际消费状态是否5/5符合协议 | Primary中的端到端成功标准 |
| `intent_execution_fidelity` | `SC`与`SA`相同字段数/5 | 系统完整性/机制 |
| `first_commit_change_accuracy` | 首次确认版本中应改变字段的正确比例 | 首次理解与修正轨迹 |

预注册严重错误：

- `horizon_overwritten_to_6m`：把总体研究视角错误改成6个月；
- `growth_deleted`：将增长目标完全删除；
- `short_term_need_omitted`：遗漏30%/6个月短期需求；
- `stability_or_risk_omitted`：遗漏稳定性或下行风险提高。

`strategy_protocol_success_SC`是B2a关键确认性结果；`required_change_accuracy_SC`和`preservation_accuracy_SC`用于解释成功或失败来自字段更新还是错误覆盖。

若参与者在`t0`后从未重新确认Strategy，则`strategy_protocol_success_SC=0`。字段分解仍按任务终止时实际Confirmed Strategy计算，不能将该参与者从分析中删除。

若冻结上下文中`SA=null`，则`strategy_protocol_success_SA=0`且`intent_execution_fidelity=NA`；只要日志能够确认“终止前没有Agent消费事件”，这就是合法可回放的任务失败，而不是logger缺失。

### 6.3 协议映射的非参与者内容效度检查

正式数据采集前，由至少3名未参与界面实现的独立审阅者分别阅读Initial Intent字段结构和Round 05的中度隐式需求，但不查看第6.1节预设答案；审阅者独立写出其认为应改变、应保持的字段及规范值。建议至少覆盖HCI方法、金融/任务领域和面向非专业用户的任务设计三种视角。

研究团队在查看正式数据前比较独立映射、记录分歧理由并完成一次性裁决，然后冻结任务文本、接受值、同义表达和Codebook。若关键字段不能形成可辩护的一致映射，正式Claim只能表述为“符合预注册协议的Intent映射”，不得扩大为一般性的“正确理解自然语言需求”。该检查不招募实验参与者，不用于选择`H`、`L`或根据表现调参。

## 7. B2b：共享Intent理解与可检查性

B2b分成两个不同构念。无辅助重建测内部理解；带一处标准化差异的开放核查测外部共享状态的可检查性与纠错效率。Widget并不要求用户记住所有字段，因此无辅助重建不设为Widget必须更优的主假设。

### 7.1 无辅助状态理解｜诊断性

主任务问卷完成后，隐藏Chat、Widget和所有Strategy内容，参与者回答：

> 任务结束时，你认为系统保存的已确认Strategy是什么？

真值为任务终止时冻结的`SF`。即使参与者超时或没有生成最终说明，`SF`也必须存在；如果用户从未在`t0`后重新确认，`SF`为终止时系统实际保留的Confirmed Strategy。

| Metric | 定义 |
|---|---|
| `unaided_state_accuracy` | `SB`与`SF`相同字段数/5 |
| `unaided_state_exact` | 是否5/5完全一致 |
| `state_confidence` | 提交`SB`前的总体信心 |
| `confidence_calibration` | 正确率与信心的对应关系；高信心错误单独报告 |

这些结果测量内部共享状态模型，只作诊断或探索；外部化界面可能降低记忆需求，因此不预设Widget必然更高。

### 7.2 开放状态核查｜B2b核心结果

提交无辅助答案后，系统生成待核查摘要`SV0`：其中4个字段与`SF`一致，1个字段被替换为预注册的合理错误值。错误字段在参与者间平衡分配，并记录`probe_variant_id`。随后恢复参与者原条件界面并锁定为只读：

- Chat-only可以查看历史或询问Agent当前状态；该只读回复必须由冻结的`SF`通过固定模板生成；
- Chat + Widget可以查看冻结的Strategy Object，也可使用Chat；
- 两组不能修改真实Strategy；
- 两组看到相同格式的`SV0`，并被告知“摘要可能存在一处不一致，请使用当前界面核查并按实际状态修正”；
- 提交前必须发生一次可审计的状态查看：Chat历史/Agent状态回复或Strategy Object的冻结内容至少50%位于视口、页面可见且有焦点，并连续保持至少500ms；此前提交按钮保持不可用；
- 系统不反馈回答是否正确；
- 使用统一核查时限`L`；当前不指定数值，正式数据采集前统一冻结。

定义：

```text
aided_verification_success = 1
当且仅当SV与SF五字段完全一致，且在L内提交

state_verification_time_gain_L =
  (L - T_verify) / L，若核查成功
  0，若错误提交、未提交或超时
```

| 层级 | Metric | 方向 |
|---|---|---|
| 关键确认性 | `state_verification_time_gain_L` | Widget更高 |
| 必须分解 | `aided_state_accuracy` | Widget更高 |
| 必须分解 | `aided_verification_success` | Widget更高 |
| 机制 | `state_lookup_count` | 描述性 |
| 机制 | `T_first_state_lookup` | 描述性 |
| 机制 | `seeded_error_corrected` | 是否修正`SV0`中的标准化差异 |
| 机制 | `verification_gain = aided - unaided accuracy` | 仅作描述；两阶段起始摘要不同，不解释为纯粹学习增益 |

若冻结快照、Agent实际消费版本或用户可查看状态之间出现不可解释的不一致，产生`state_integrity_failure`。Primary全系统分析中记为系统失败，并另做预注册敏感性分析，不能静默修正。

## 8. 主观任务负荷与场景化体验

### 8.1 唯一确认性负荷指标

在主任务终止后、任何状态Probe前施测Raw NASA-TLX六维，使用冻结的中文版和0—100量尺。所有题干明确要求参与者只评价`t0`至最终提交或H到达之间的调整阶段，而不是前面的共同阅读阶段或后续Probe：

```text
RTLX_total = 六个维度未加权平均
```

`RTLX_total`是唯一确认性主观负荷结果。Mental Demand和Effort预注册为解释性分项，其余维度完整报告，不能根据显著性选择分项。

该结果支持“主观任务负荷降低”，不等同于一般客观认知负荷降低。

### 8.2 场景化机制题

使用1—7分量表，在状态Probe之前完成：

| ID | 题目 | 角色 |
|---|---|---|
| `Q_RETRIEVAL_EFFORT` | 为了重新找到前面出现的有用信息，我投入了很多精力。 | B1机制 |
| `Q_TRANSLATION_EFFORT` | 将新的资金需求转化为具体判断策略让我感到费力。 | B2a机制 |
| `Q_STATE_CERTAINTY` | 在提交最终判断时，我确信任务结束时系统保存的是我确认过的Strategy。 | B2b主观机制 |
| `Q_CONTROL` | 在调整判断依据和Strategy时，我感到自己能够控制整个过程。 | 整体机制 |

这些单题不组成新量表，也不单独承担总Claim。

## 9. Metric层级与多重性

### 9.1 唯一Primary

```text
joint_success_time_gain_H
```

只设一个Primary，不进行Primary内部多重校正。

### 9.2 四个关键确认性次级结果

| Metric | 对应Benefit |
|---|---|
| `evidence_use_success` | B1可观察的信息复用 |
| `strategy_protocol_success_SC` | B2a需求转译与字段保留 |
| `state_verification_time_gain_L` | B2b状态可检查性 |
| `RTLX_total` | 主观任务负荷 |

检验规则固定为：首先以双侧`alpha=.05`和双侧95%置信区间检验唯一Primary。只有Primary通过后，四项才进入确认性检验，并在同一个Family内使用Holm方法控制双侧`FWER=.05`；Primary未通过时仍报告四项效应量和置信区间，但只能作支持性结果，不能形成确认性Benefit Claim。不得在结果出来后切换为其他门控或校正方法。

所有关键结果必须对完整分析集有唯一规则：

- 无最终理由或超时：`evidence_use_success=0`；
- `t0`后从未确认Strategy：`strategy_protocol_success_SC=0`；
- 开放核查错误提交、未提交或达到`L`：`state_verification_time_gain_L=0`；
- 普通任务失败不能作为缺失删除；
- `RTLX_total`只有六个维度全部作答时计算。漏答不作单值填补，报告各条件缺失率，并在预注册中固定多重插补或完整案例主分析及相反方法的敏感性分析；不得依据正式数据选择方法。

### 9.3 支持性与探索性

- B1/B2a/B2b所有分解、错误类型、reaccess、Evidence状态和交互日志为支持性或机制性；
- B3最终理由各序数子项、B4风险遗漏、弱信号使用为探索性；
- B3只报告三个序数子项，不合成0—6总分；
- B4必须按最终候选分层或在模型中控制候选，避免条件改变选股构成造成偏差。

## 10. 时间、终止和技术故障

### 10.1 Primary时钟

Primary使用实验控制器的单调端到端wall time：

- 从`t0`开始连续运行；
- 不因Agent等待、页面隐藏、窗口失焦、阅读或思考暂停；
- 在`t0 + H`自动锁定任务；
- 最终提交请求与deadline必须由同一实验控制器竞争同一个终止事务锁；
- 控制器必须在锁的原子区内读取单调时钟：仅当`now < t0 + H`且尚无终止事件时，才写入`final_submit_lock_acquired`；若`now >= t0 + H`，不得写入该事件，而应由`deadline_triggered`取得终止锁，并将该请求记录为`final_submit_rejected(reason=deadline)`；`deadline_triggered`专指成功取得终止锁的deadline获胜事件，不是普通定时器回调；
- 最终提交只有在任务仍开放且其`final_submit_lock_acquired`时间严格早于绝对截止点`t0+H`时才能成为成功事件；Primary时间固定为该锁事件的单调时钟，即`T=tS-t0`；`T=H`不计成功；
- `task_context_frozen`和`final_submission_received`用于确认锁后持久化完整性，不延后Primary完成时点；若只记录到`final_submit_requested`而未成功取得锁，不视为时限内提交；
- 页面隐藏、失焦和Agent等待只作数据质量与机制分解。

`t0`在新约束至少80%位于视口、页面可见且有焦点并连续保持500ms后记录一次。两条件的任务更新组件尺寸和位置必须一致。

### 10.2 终止状态

| 状态 | 精确规则 | Primary分数 |
|---|---|---:|
| `valid_final_submission` | `terminal_trigger=final_submit_lock_acquired`且`T<H`，离线编码后满足第4.1节全部门控 | `(H-T)/H` |
| `invalid_final_submission` | `terminal_trigger=final_submit_lock_acquired`且`T<H`，但离线编码后至少一项门控不满足 | 0 |
| `timeout_no_submission` | `deadline_triggered`先取得事务锁；终止时仍生成`task_context_frozen`和`deadline_reached`供问卷和Probe使用 | 0 |
| `technical_failure_internal` | App内部UI、状态或解析链路发生不可恢复故障 | 全系统Primary分析记0，并报告原因 |
| `technical_failure_external` | 与条件无关的外部基础设施中断，无法获得完整结果 | 记缺失，报告最坏/最好界限敏感性分析 |
| `logger_integrity_failure` | 关键事件缺失或乱序，无法唯一重建状态 | 记缺失并做界限敏感性分析；不得静默删除 |
| `withdrawal` | 参与者主动撤回同意 | 不计算结果，透明报告流程 |

普通解析失败、澄清、误解或慢操作不能编码为技术故障。

`technical_abort`必须记录`failure_code`、`failure_class`、`recoverable`、`occurred_before_terminal`和关联事件。若终止事件冲突，以严格递增的`sequence_no`和事务锁结果决定唯一终止状态。

终止分类必须按以下互斥优先级执行，并由冻结派生脚本自动判定：

1. `withdrawal`：按伦理规则退出，不计算结果；
2. 与条件无关的外部故障在终止前使结果无法取得：`technical_failure_external`，记缺失并作界限敏感性分析；
3. 关键原始日志缺失或乱序，导致真实终止状态或门控状态无法唯一重建：`logger_integrity_failure`，记缺失并作界限敏感性分析；
4. 日志足以确认App内部发生状态版本串线、错误对象绑定或冻结上下文损坏：`technical_failure_internal`且`state_integrity_ok=0`，作为完整交互方案失败记0；
5. 其余会话再按`valid_final_submission`、`invalid_final_submission`或`timeout_no_submission`分类。

因此，“已观察到内部状态损坏”与“因日志损坏而无法判断真实状态”不得使用同一故障代码；普通语义解析错误仍属于第5类任务结果。

### 10.3 时间分解

| Metric | 定义 | 角色 |
|---|---|---|
| `agent_wait_wall` | 请求提交至回复完整渲染区间的并集 | 机制 |
| `time_to_first_token` | 请求提交至首token/首段模板可见 | 机制 |
| `stream_render_time` | 首token至完整回复渲染 | 机制 |
| `pre_t0_elapsed` | `task_started`至`t0` | 前置交互成本 |
| `full_task_elapsed` | `task_started`至`tS`或deadline终止锁 | 敏感性，不作Primary |
| `final_composition_elapsed` | `final_rationale_started`至`tS` | 最终写作成本分解 |
| `time_first_input_to_valid_length` | 首次非空输入至首次达到合法字符范围 | 写作机制 |
| `page_hidden_wall` | 页面隐藏区间的并集 | 数据质量 |
| `window_blur_wall` | 页面失焦区间的并集 | 数据质量 |
| `counterfactual_no_wait_time` | Primary wall time减去真正阻塞且无法执行任务的等待区间 | 敏感性，不作Primary |

## 11. 原始日志与派生数据

### 11.1 最小文件

```text
events.jsonl
metric_config.yaml
semantic_annotations.csv
rationale_annotations.csv
derived_metrics.csv
```

### 11.2 原始事件统一外壳

```json
{
  "schema_version": "stock-v3.2",
  "session_id": "...",
  "participant_id_hash": "...",
  "condition": "chat_only | chat_widget",
  "sequence_no": 37,
  "event_id": "...",
  "timestamp_monotonic_ms": 183422,
  "timestamp_utc": "2026-08-25T10:32:11.021Z",
  "round_id": "R06",
  "actor": "participant | agent | system",
  "surface": "task | chat | widget | probe | questionnaire | browser",
  "event_type": "...",
  "payload": {}
}
```

`session_started`必须记录：

```text
app_build_hash
scenario_version
parser_version
metric_config_version
H_ms
L_ms
assignment_id
```

### 11.3 最小原始事件

```text
session_started
task_started
round_exposed
qualified_initial_exposure
constraint_exposure_qualified
page_visibility_changed
window_focus_changed
agent_request_started
agent_first_content_rendered
agent_response_fully_rendered

chat_message_submitted
chat_parse_result
widget_action
fact_view_started
fact_view_ended
qualified_reaccess
first_access_after_t0
state_lookup_started
state_lookup_content_visible

evidence_confirmed_snapshot
strategy_draft_snapshot
strategy_confirmed_snapshot
agent_strategy_stale
agent_strategy_fresh
agent_evidence_stale
agent_evidence_fresh
agent_context_consumed
final_rationale_started
final_rationale_first_input
final_rationale_valid_length_reached
final_submit_requested
final_submit_lock_acquired
final_submit_rejected
task_context_frozen
final_submission_received

questionnaire_submitted
unaided_probe_exposed
unaided_probe_submitted
aided_probe_exposed
aided_probe_submitted
aided_probe_deadline_reached

deadline_triggered
deadline_reached
technical_abort
study_withdrawn
session_completed
```

状态事件必须保存完整快照及版本号，不能只记录差异。终止快照必须保存唯一的`strategy_version`与`evidence_version`；获胜锁事件和最终接收事件必须引用唯一的`context_id`。

`final_submit_requested`必须在不可变地复制当前输入并通过客户端与实验控制器的统一校验后写入，至少携带：

```text
submission_id
final_stock
rationale
payload_hash
validation_version
validation_passed = true
```

未通过校验的尝试只记录`final_submit_rejected(reason=validation)`，不得竞争终止锁。`final_submit_lock_acquired`引用`submission_id`与`payload_hash`；`final_submission_received`再次保存同一`submission_id`、`payload_hash`和`context_id`。锁取得后界面不得再改变该提交内容。

`task_context_frozen`是每个终止会话唯一的权威快照，至少包含：

```text
context_id
terminal_trigger = final_submit_lock_acquired | deadline_triggered
terminal_lock_event_id
terminal_lock_sequence_no
snapshot_validation_passed
confirmed_strategy_version及完整字段（SF/SC）
confirmed_evidence_version及完整fact_ids（EF）
last_agent_context_event_id（可为空）
last_consumed_strategy_version及完整字段（SA，可为空）
last_consumed_evidence_version及完整fact_ids（EA，可为空）
agent_strategy_state = fresh | stale
agent_evidence_state = fresh | stale
```

获胜的`final_submit_lock_acquired`或`deadline_triggered`必须在锁的同一原子区内生成`context_id`并捕获快照内容。快照只能引用`sequence_no < terminal_lock_sequence_no`的状态事件；从取得终止锁开始，系统拒绝所有Evidence、Strategy及`agent_context_consumed`更新。在途Agent请求应被取消，或将其后续事件标记为`post_terminal=true`，不得进入`SA`或`EA`。若存在多个终止前`agent_context_consumed`，只使用快照明确引用的最后一次；分析脚本不得自行猜测。

`final_submit_requested`只引用`submission_id`，因为请求时尚不存在终止上下文。获胜的锁事件、`task_context_frozen`以及后续`final_submission_received`或`deadline_reached`引用同一`context_id`。失败的晚提交通过`final_submit_rejected`引用其`submission_id`及已经获胜的`terminal_lock_event_id`，不得伪造新的提交上下文。`tS`固定取`final_submit_lock_acquired.timestamp_monotonic_ms`；请求发生在deadline之前但锁内检查已到截止点时，仍按超时处理；`final_submission_received`仅用于完整性审计。

`snapshot_validation_passed`只表示锁时局部快照结构通过校验。最终`state_integrity_ok`不得作为冻结瞬间的原始真值写入快照，而由冻结派生脚本根据完整事件链、版本引用、payload hash和持久化结果离线计算。

`fact_view_started/ended`必须以`view_instance_id`配对，并记录：

```text
fact_id
content_hash
surface = history | widget_popup | requested_agent_reply | automatic_echo
initiation = scroll | popup | explicit_chat_request | automatic_echo
interaction_id（如适用）
end_reason
```

`qualified_initial_exposure`与`qualified_reaccess`必须引用同一`fact_id`和对应`view_instance_id`。`first_access_after_t0`明确表示该事实缺少`t0`前合格暴露；派生脚本不得把它升级为reaccess。

`agent_context_consumed`除完整Strategy和Evidence快照及版本号外，还必须保存冻结规则生成的`output_plan`和`output_hash`。在相同对象注册表版本下，相同Strategy字段内容与Evidence对象集合必须得到相同`output_plan`，不依赖参与者本地版本号或操作历史；自然语言表面实现不能改变事实、维度关系或比较含义，也不得输出面向最终理由评分规则的“缺失维度”清单。

`aided_probe_exposed`必须记录`probe_variant_id`、被置换字段、`L_ms`和`SV0`完整字段；`aided_probe_submitted`记录`SV`完整字段并引用同一variant。`T_verify`固定为两事件的单调时钟差；错误提交和`aided_probe_deadline_reached`均使核查收益为0。

### 11.4 原始与派生严格分离

原始日志只记录行为、状态快照和原始回答。以下字段必须由冻结脚本离线派生，不能作为唯一分析来源写死在前端：

```text
correct_field_count
required_change_accuracy
evidence_use_success
joint_task_success_final
joint_success_time_gain_H
terminal_status
state_integrity_ok
confirmed_state_mismatch
B3/B4编码结果
```

## 12. Chat语义解析与条件公平性

必须保留三层状态：

```text
用户实际表达的语义 → 离线人工编码
系统实际记录的状态 → parse result + Confirmed snapshots
Agent实际消费的状态 → agent_context_consumed
```

规则：

1. Primary只使用系统实际状态和Agent实际消费状态；
2. 人工编码不能覆盖实验当时系统状态；
3. Chat允许一个消息包含多个Evidence和多个字段修改；
4. 未明确确认时不得产生Strategy Confirmed版本；
5. 解析器只在真实歧义时澄清；
6. 保存全部Round 05以后Chat原文和解析结果；
7. 报告关键动作的precision、recall和exact match；
8. 如果研究目标是排除解析器能力影响，应在实验中采用实时Wizard-of-Oz或等价高保真解析，不能事后修复。

正式上线前的非参与者工程验收门槛：关键Evidence/Intent动作precision与recall均不低于95%，未经用户确认的Strategy commit必须为0。该验收只使用研究团队编写的合成表达和Golden Logs，不使用实验参与者，也不据此调整研究假设或Metric。

## 13. 盲法编码与复现

### 13.1 必须冻结的Codebook

- `fact_id → 规范文本、候选、目标/非目标、目标维度、弱信号类型`；
- 每个Strategy字段的接受值和同义表达；
- 最终理由中“准确使用”“明确语义联系”“跨候选比较”的正反例；
- 弱信号谨慎使用、过度推断和事实错误的边界案例；
- 每个候选的关键风险和可接受同义表达；
- B3各子项的边界案例。

### 13.2 编码流程

1. 评分者不知道实验条件、Primary结果和参与者其他问卷；
2. 两名评分者先在独立训练材料上校准；
3. 正式最终理由全部双重编码；
4. Primary相关二元编码报告Cohen's kappa或Krippendorff's alpha；
5. 序数编码报告加权一致性；
6. 分歧按冻结规则由第三人裁决；
7. 保存`coder_id_hash`、`codebook_version`、原始标签和裁决标签。

### 13.3 可复现产物

至少保存四条不含参与者隐私的合成Golden Logs及预期派生结果：

1. Chat-only有效提交；
2. Chat + Widget有效提交；
3. 时限内无效提交；
4. 未提交超时。

相同原始日志使用冻结脚本重复运行，必须产生逐字段一致的`derived_metrics.csv`。

## 14. 无参与者预测试下的参数冻结与工程验收

本研究不设置参与者预测试，因此不能用正式样本的前几人调整任务、时限、成功门槛或Codebook。本轮不指定`H`和`L`的具体数值；二者必须结合四场景的总体实验时长与条件分配，在任何正式数据采集之前一次性统一冻结。

```text
H = TBD（正式数据采集前冻结）
L = TBD（正式数据采集前冻结）
qualified_initial_exposure = 50%可见且连续1000ms，必须发生在t0前
qualified_reaccess = 50%可见且连续1000ms
constraint_exposure = 80%可见且连续500ms
state_lookup_qualified = 50%可见且连续500ms
B1门槛 = 至少2条目标事实、覆盖至少2个目标维度
B2a严格成功 = 5/5字段符合协议且t0后明确确认
B2b核查 = 1处平衡分配的标准化差异
```

### 14.1 正式数据开始前必须冻结

- `H`、`L`及其在四场景间是否统一；
- 所有计时边界和时限到达处理；
- Primary公式、estimand、检验和置信区间方法；
- 四个确认性次级指标及Holm策略；
- 既定可招募样本量、条件分配方式及在该样本量下的最小可检测效应；
- 所有fact、Intent、B1、B3、B4 Codebook；
- 技术故障、撤回、缺失和协议违背处理；
- Chat解析审计阈值；
- 日志schema、派生代码版本和Golden Log测试；
- 若四场景合并，场景权重、参与者聚类和交互分析规则。

### 14.2 必须保留的非参与者工程验收

- 验证标准化教程在两条件中覆盖相同语义动作，教程状态在Round 00前被完全清空且不进入正式Metric；
- 使用合成Chat表达验证解析器多动作、否定、保持不变、撤销和纠错；
- 使用Golden Logs验证有效提交、无效提交、超时和技术故障；
- 回放同一日志必须逐字段重建相同Metric；
- 检查两条件事实视口日志、终止事务锁、Probe只读状态和问卷顺序；
- 研究团队只允许修复实现Bug，不允许修改H、L、成功门槛、事实维度或Intent真值。

没有参与者预测试会增加地板/天花板效应、任务时限不合适和字段解释歧义的风险。正式论文必须将其作为设计限制透明报告，不能用正式数据事后重定阈值。

正式数据开始后不得根据结果修改H、成功门槛、事实维度、Intent接受值、Primary或检验层级。

## 15. 一页版Benefit–Metric表

| 层级 | 完整Benefit | 最终Metric | 结论边界 |
|---|---|---|---|
| Primary | 当用户在多轮信息后遭遇中度隐式的新约束时，Chat + Widget能否帮助其更快完成早期信息的可观察复用和Intent调整，同时达到预定义的任务质量 | `joint_success_time_gain_H` | 支持固定时限内成功—速度综合效率，不自动证明成功率非劣 |
| B1确认性 | 用户能否把约束变化前出现的事实准确连接到更新后的目标和最终理由，而不只是重新打开或加入一张卡片 | `evidence_use_success` | 测可观察的信息复用；reaccess和Evidence State只解释机制 |
| B2a确认性 | 用户能否按预注册协议更新应该改变的Intent字段，同时保留不应被覆盖的长期视角 | `strategy_protocol_success_SC`；字段更新和保留准确率作分解 | 测协议内需求转译，不等同于普适投资正确性 |
| B2b确认性 | 用户能否借助当前交互环境快速、正确核查任务终止时系统保存的Confirmed Strategy | `state_verification_time_gain_L` | 测可检查性；无辅助准确率另测内部理解，不预设Widget更好 |
| 认知确认性次级 | 用户完成主要信息复用和Intent调整任务时报告的总体任务负荷是否降低 | `RTLX_total` | 支持主观任务负荷，不等同于一般客观认知负荷 |
| 机制 | Widget通过哪些路径产生差异 | reaccess、Evidence激活/消费、SC—SA保真度、解析、澄清、等待、Chat和Widget行为 | 不单独承担Benefit |
| 探索性下游 | 更高效的过程是否进一步影响理由权衡、风险遗漏和弱信号处理 | B3子项、B4、弱信号编码 | 不进入总Claim，也不用于补救Primary不显著 |
