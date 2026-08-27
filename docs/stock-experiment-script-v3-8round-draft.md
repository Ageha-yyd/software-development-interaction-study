# 股票场景实验剧本 V3.3｜8轮冻结候选

> 状态：已完成论文对齐复审；冻结用于V3.3原型实现，尚非正式数据采集版  
> 日期：2026-08-27  
> 上位依据：`stock-benefits-frozen-v1.md`、`stock-information-objects-v1.1.md`（轮次覆盖；对象内容继承V1.0）  
> Metric依据：`stock-benefit-metric-v3-final-candidate.md`  
> 修改边界：本稿不修改冻结Benefit；Metric仅同步Round、日志与状态口径；网页在本稿通过最终复审后实现；论文初稿只做一致性核查，不直接覆盖PDF。

## 1. 研究目标与解释边界

本场景检验：在内容等价的前提下，相比以Chat作为唯一操作通道，Chat + Widget能否降低用户重新访问和使用既有信息、把中度隐式需求转译为Intent、维护共享Intent状态并让Agent消费最新状态的交互与认知成本。

本实验不检验“卡片优于文字”或“图表优于文字”。两组看到相同的卡片、图表、对象、顺序、解释和Agent结论；条件差异只集中在：

- Chat-only：所有对象状态操作必须通过Chat提出、复述和确认；
- Chat + Widget：既可使用Chat，也可直接操作对象、持久查看状态并确认修改。

股票选择没有唯一正确答案。主要可评分对象是信息是否被重新访问并正确使用、需求是否被正确转译、状态是否可恢复，以及这些过程的成本。

### 1.1 目标参与者口径

目标参与者是**非专业但具备基础金融信息阅读经验的个人投资者**：能够理解营收增长、市盈率、价格波动、成交活跃度、经营现金流、客户集中度和资产负债率等常见表述，但不是职业交易员、证券分析师或其他以投资研究为主要职业的人。该口径同时避免把任务误写成面向完全没有金融词汇基础的新手，也不把结论外推到专业交易工作流。

本任务使用虚构公司和冻结数据，仅测量证据复用、Intent转译、共享状态维护及判断理由，不提供真实投资建议，也不测量投资回报。

## 2. 修订后的核心边界

1. 任务固定为Round 00—07，共8个标准化任务节点；轮内自由Chat与Widget操作不另计Round。
2. 19个固定信息对象不删减，分为四个信息补丁：6 / 6 / 4 / 3，避免单轮九对象过载。
3. Round 01—04允许查看详情和Focus；Round 05出现新需求并记录`t0`后，才开放Evidence和Strategy操作。
4. `查看 ≠ Focus ≠ Evidence ≠ Strategy`；任何状态都不得自动向下一层转化。
5. 新需求出现前的Focus只保存对象指针和固定标题，不缓存完整数值、详情或解释。新需求后重新打开Focus对象时，系统从原位置重新渲染完整标准事实。
6. Agent不推荐正确指标、不补全遗漏Intent、不纠正错误Intent、不自动修改Strategy，也不自动把Focus转成Evidence。
7. 最终提交不要求Evidence成功或Intent正确，但要求`t0`后至少确认一次Strategy，并且Agent已消费最新确认的Strategy版本；Evidence消费状态单独显示，不伪装成整体“已同步”。
8. 是否接入真实API模型继续暂缓。无论采用固定回复、Wizard-of-Oz或API，权威状态迁移只能由同一冻结状态机产生。
9. 正式股票任务前设置不进入分析的标准化操作教程；教程不是参与者预测试，不能用于修改假设、阈值或任务难度。
10. 正式实验不设置参与者预测试；冻结前只允许非参与者工程验收、Golden Log回放、内容效度检查和评分员训练。

## 3. 业务对象的操作性定义

信息对象不是任意一句话或一个孤立数字，而是可稳定引用、可恢复上下文并具有固定操作语义的业务事实节点：

- 指标对象以`(stock, metric, period)`唯一确定；数值是对象属性，不是独立对象；
- 事件对象以`(stock, event_id, observation_window)`唯一确定；标题、正文和证据限制是对象属性；
- 每个对象在冻结前必须具有固定`object_id`、类型、属性、来源、与股票/分析维度的关系、允许操作和版本；
- 两个条件必须引用同一对象注册表，不得由界面临时生成不同对象。

本原型区分三层，避免把所有界面元素都泛化成“对象”：

| 层级 | 本场景实例 | 是否属于19个早期事实 | 作用 |
|---|---|---:|---|
| 领域信息对象 | Company、Metric、Event | 是（Company为承载实体，不另计事实数） | 被查看、重新访问、Focus并加入Evidence |
| 共享状态对象 | Strategy Object、Confirmed Evidence Set | 否 | 持久表达用户与Agent共同维护的约束和依据 |
| 派生输出对象 | Agent Comparison / Decision Rationale | 否 | 由冻结Strategy与Evidence确定性生成，可检查其来源关系 |

`Focus Set`只是导航/待办状态，不是Evidence，也不作为新的领域对象；数值、日期、风险含义和证据限制仍是相应信息对象的属性。当前原型没有单独建模`EvidenceSource`、`ThesisClaim`或`ValuationAssumption`对象，因此不得把它描述成论文中完整历史投资研究对象图的等价实现。

对象审计最低字段：

```text
object_id
object_type
stock_id
dimension
period_or_window
canonical_title
canonical_value
canonical_detail
provenance
allowed_operations
version
```

## 4. 8轮总体结构

| Round | 阶段 | 固定内容 | 对象数 | 计时 |
|---:|---|---|---:|---|
| 00 | 任务与Initial Intent | 任务说明、Strategy V1 | 0 | 记录但不属于Primary |
| 01 | 增长与估值 | 三只股票的增长、估值 | 6 | 记录前置成本 |
| 02 | 波动与交易活跃度 | 三只股票的波动、交易活跃度 | 6 | 记录前置成本 |
| 03 | 经营稳定性与公司风险 | 现金流、集中度、周期、负债 | 4 | 记录前置成本 |
| 04 | 弱信号与初步判断 | 三条弱诊断事件、初步候选与理由 | 3 | 记录前置成本 |
| 05 | 中度隐式新需求 | 触发B1/B2，解锁Evidence与Strategy | 0 | 统一`t0` |
| 06 | 自由复用、Intent调整与Agent消费 | B1/B2交错；消费—修改—再消费 | 0 | Primary计时中 |
| 07 | 最终判断 | 最终候选、理由、风险 | 0 | 最终事务锁 |

Primary时间仍为`t0`到最终提交锁。另记录从Round 00任务暴露到最终提交锁的`full_task_elapsed`作为敏感性分析，并单独报告`t0`前查看、Focus、Chat、输入和等待成本，避免把Widget组可能提前付出的整理成本排除在解释之外。

## 5. 两个条件的共同呈现与差异

### 5.1 共同呈现

- 相同静态走势图、股票卡片、指标行、标题、数值、详情、顺序和Agent文字；
- 相同的轮次、任务提示、输入框、字数规则和系统等待策略；
- 相同的对象选择视觉反馈；
- 指标操作入口只在用户选中某一行后出现，避免同时暴露大量按钮造成视觉拥挤；
- 不显示“推荐关注”“重要指标”或任何条件特有的相关性提示。

### 5.2 初次暴露与二次访问边界

一个对象只有在新需求出现前满足以下条件，才产生`qualified_initial_exposure(object_id)`：

1. 对象的规范标题与规范值至少50%位于视口；
2. 页面可见且窗口有焦点；
3. 连续可见至少1000ms；
4. 事件发生在`t0`之前。

Round 01—04的“继续”按钮只有在本轮全部对象都至少产生一次合格初次暴露后才开放。该门槛只保证信息真实进入过可见区域，不声称参与者已经理解或记住信息，也不要求点击、Focus或回答理解题。两组使用完全相同的门槛和中性提示。

新需求后，只有同时满足以下条件，才记为`qualified_reaccess(object_id)`：该对象已有`t0`前合格初次暴露；本次由用户主动滚动、Popup或明确Chat请求触发；规范事实至少50%可见、页面可见、窗口有焦点并连续保持1000ms。没有初次暴露的对象在`t0`后打开只能记为`first_access_after_t0`，不得解释为信息二次消费。

### 5.3 条件差异

| 功能 | Chat-only | Chat + Widget |
|---|---|---|
| 选择卡片/指标行 | 可选择并高亮 | 可选择并高亮 |
| 了解详情 | 在Chat中指明对象并询问 | 选中对象后点击“了解详情” |
| Focus | 在Chat中明确要求关注/取消 | 选中对象后点击“关注/取消关注” |
| Evidence（R05后） | Chat提出、系统复述、用户确认 | “加入依据/移出依据” |
| Strategy（R05后） | Chat描述—复述—确认 | Draft—Diff—确认 |
| 当前状态 | Chat询问后按固定顺序复述 | 持久Strategy / Evidence / Focus对象 |
| Undo | Chat请求并确认 | 点击Undo并确认 |
| Agent消费状态 | Chat请求 | 按钮或Chat请求 |

Chat-only不是故意降级为难读的大段文字；它保留清晰卡片和信息分组，只把状态操作限制在Chat通道。

### 5.4 标准化操作教程（不计入8轮）

正式股票任务开始前，两组分别使用与自身条件一致的界面，完成一个不涉及股票和正式指标的中性练习。练习使用两个虚构出行方案，覆盖：

1. 查看一个对象详情；
2. 将一个对象加入并移出Focus；
3. 在练习约束变化后，将对象加入Evidence；
4. 修改、查看Diff并确认一项练习Strategy；
5. 让Agent消费已确认状态；再次修改Strategy并识别Agent状态已过期；
6. 刷新Agent状态并完成提交。

教程只检查参与者是否完成规定语义动作，不记录完成速度、不给出正式任务正确值，也不进入正式分析。教程结束后清空全部对象、Chat、版本和计时状态，再开始Round 00。两组教程的语义步骤与反馈完全相同，差异仅为正式实验对应的操作通道。

## 6. Round 00｜任务与Initial Intent V1

### 参与者可见任务

> 请在ALFA、BETA、GAMMA三只虚构股票中选择一只值得进一步研究的股票。你当前计划持有约一年，风险偏好适中，希望兼顾增长与稳定。系统不会替你执行任何交易。

### Agent固定回复

> 我会使用固定模拟数据协助你比较三只候选股票。你当前的总体研究视角约为12个月，风险偏好适中，希望兼顾增长与稳定。接下来将分阶段比较增长、估值、价格波动、交易活跃度、经营情况和公司风险。

### Initial Intent V1

| 字段 | V1状态 |
|---|---|
| 总体研究视角 | 约12个月 |
| 短期资金需求 | 无额外要求 |
| 下行风险优先级 | 中 |
| 经营稳定性优先级 | 中 |
| 增长优先级 | 高 |

两组均在主Chat Lane中看到相同摘要。Chat + Widget可持久显示只读Strategy V1；Chat-only可询问并获得相同字段顺序的文字摘要。此轮不能编辑。

## 7. Round 01｜增长与估值（6个对象）

### 固定用户任务

> 先比较三只股票的增长和估值。

### Agent固定回复

> ALFA增长最高、估值也最高；BETA增长较慢、估值最低；GAMMA的增长和估值均处于中间。下面是固定模拟指标，单凭这一组信息还不足以形成最终判断。

### 固定信息对象

| 股票 | 增长 | 估值 |
|---|---|---|
| ALFA | `A-GROWTH` 营收增长24% | `A-VALUATION` 市盈率38× |
| BETA | `B-GROWTH` 营收增长9% | `B-VALUATION` 市盈率24× |
| GAMMA | `G-GROWTH` 营收增长15% | `G-VALUATION` 市盈率29× |

本轮起允许查看详情和Focus。Focus只保存`object_id + canonical_title`，例如“BETA｜营收增长”，不保存“9%”或Agent解释。打开Focus条目时才重新渲染对象的完整标准事实。

## 8. Round 02｜波动与交易活跃度（6个对象）

### 固定用户任务

> 再比较三只股票的价格波动和交易活跃度。

### Agent固定回复

> ALFA价格波动较高、成交活跃度高；BETA价格波动低、成交活跃度中等；GAMMA两项均处于中间偏弱位置。成交更活跃不代表价格不会下跌，波动较低也不代表不存在公司风险。

### 固定信息对象

| 股票 | 波动 | 交易活跃度 |
|---|---|---|
| ALFA | `A-VOLATILITY` 高 | `A-LIQUIDITY` 高 |
| BETA | `B-VOLATILITY` 低 | `B-LIQUIDITY` 中 |
| GAMMA | `G-VOLATILITY` 中 | `G-LIQUIDITY` 低 |

操作规则与Round 01相同，只允许详情与Focus。

## 9. Round 03｜经营稳定性与公司风险（4个对象）

### 固定用户任务

> 继续了解三只股票的经营稳定性和公司特定风险。

### Agent固定回复

> ALFA最大客户贡献42%的收入，存在客户集中风险；BETA经营现金流连续8个季度为正，但对行业周期较敏感；GAMMA资产负债率为68%。单项稳定性优势不能消除其他风险，单项风险也不能独立决定最终选择。

### 固定信息对象

| 股票 | 对象 |
|---|---|
| ALFA | `A-CONCENTRATION` 最大客户收入占比42% |
| BETA | `B-CASHFLOW` 经营现金流连续8季度为正；`B-CYCLE` 行业周期敏感性较高 |
| GAMMA | `G-DEBT` 资产负债率68% |

对象数量不为视觉对称而人为补齐。操作规则仍只允许详情与Focus。

## 10. Round 04｜弱诊断性信息与初步判断（3个对象）

### 固定用户任务

> 最近还有哪些公司进展？看完后，请先形成一个初步判断。

### Agent固定回复

> 系统还记录了三条近期进展：ALFA与一家大型平台签署战略合作意向书；BETA与一家新客户启动试点合作；GAMMA管理层表示新产品试用反馈好于预期。下面同时给出这些信息尚未披露的内容，请结合当前判断目标自行决定其证据价值。

### 固定信息对象

| 对象 | 固定标题 | 固定详情中的证据限制 |
|---|---|---|
| `A-WEAKSIGNAL` | 战略合作意向 | 未披露正式订单、金额或预计收入 |
| `B-WEAKSIGNAL` | 新客户试点 | 未说明是否付费、客户规模或收入贡献 |
| `G-WEAKSIGNAL` | 新产品试用反馈 | 未披露试用数量、正式订单或实际销售 |

三条信息保持相近的正向语气和诊断强度；系统不标记相关、无关、可靠或不可靠。仍只开放详情与Focus。

### 同轮初步判断

> 请根据当前“一年左右、风险适中、兼顾增长与稳定”的目标，暂时选择一只最值得进一步研究的股票，并用至少8个字符说明理由。这个选择不是最终答案。

两组使用相同的单选、理由输入框、实时字数和错误提示。提交后Agent只回复：

> 已记录你的初步候选和理由。这是当前判断锚点；请继续完成后续任务。

该回复不得暗示即将出现目标变化，也不复述股票事实或评价选择。

## 11. Round 05｜中度隐式新需求与统一`t0`

Round 05是一个预先冻结的**中间任务触发器**：它只在参与者完成Round 04初步判断后出现，使原先不显著的短期可变现性、经营稳定性和下行风险需求变得显著。高层目标仍是“从三只虚构股票中选择一只值得进一步研究的候选”，变化的是完成该目标所需的下层约束、证据关系和比较重点。

该设计测量“中间状态出现后，用户如何完成后续局部重构”，不声称系统识别了参与者内隐意图，也不声称该触发器由Agent自主发现。它是一个复合受控episode，而不是论文初稿中四个独立投资触发器的替代数据。

### 参与者可见任务更新

> 情况发生变化：你半年内可能需要使用这笔资金中的30%。你希望需要时不至于因为难以成交而无法顺利取出这部分钱，也更担心公司经营突然恶化后造成较大损失。其余资金仍计划从约一年的角度考虑，并不希望完全放弃增长机会。请据此重新确认你当前采用的判断策略，并完成最终判断。

文案不直接使用“下行风险优先级”“经营稳定性优先级”等Strategy字段名，参与者需要自行完成需求到字段的转译。

### 统一计时起点

当任务更新至少80%位于可见视口、页面可见、窗口有焦点并连续保持500ms后，只记录一次`constraint_exposure_qualified`并设为`t0`。

### 同时解锁

- 两组同时开放Evidence、Strategy确认、状态查看和Undo；
- 历史对象和此前Focus仍可访问，但Focus不自动转为Evidence；
- 重新打开Focus时显示该对象完整标准事实，并产生新的事实访问事件；
- 系统不自动重复早期事实，不自动修改Strategy，不提示应该修改哪些字段；
- 两组以相同显著程度告知：最终提交前需要让Agent使用最新确认的Strategy，但不要求Strategy正确。

### 目标Intent V2真值（参与者不可见）

| 字段 | V1 | V2目标 |
|---|---|---|
| 总体研究视角 | 约12个月 | 保持约12个月 |
| 短期资金需求 | 无额外要求 | 30%资金可能在6个月内使用 |
| 下行风险优先级 | 中 | 高 |
| 经营稳定性优先级 | 中 | 高 |
| 增长优先级 | 高 | 中，但保留 |

## 12. Round 06｜自由复用、Intent调整与Agent消费

Round 06是一个统一工作区，不把B1、B2或Agent消费拆成先后闸门：

```text
重新访问早期对象
↔ Focus或取消Focus
↔ 加入或移出Evidence
↔ 编辑Strategy Draft
↔ 查看Diff并确认Strategy
↔ Undo最近一次确认
↔ 让Agent使用当前确认状态生成说明
↔ 继续修改并再次让Agent消费
```

### 12.1 B1：既有信息复用

可观察的合格Evidence状态为：至少两条新需求前出现的目标事实被明确加入Evidence，且至少覆盖两个目标维度。该标准只用于事后评分，不是界面闸门：Evidence为空、错误或不足时仍允许继续。

Chat-only示例：

> 把BETA经营现金流连续8个季度为正作为经营稳定性的依据，也把BETA成交活跃度中等作为短期取用方面的依据。

Chat + Widget通过选中历史对象后执行“加入依据”。两种路径都产生相同的`evidence_confirmed_snapshot`。

### 12.2 B2：需求转译与Strategy维护

Chat-only中，Agent只复述用户明确提出的字段和值，未提及字段保持当前状态；用户确认后才生成新版本。Chat + Widget中，“影响策略”只定位相关字段，不预选正确值；修改进入Draft，查看Diff并确认后才生成新版本。

两组均允许不修改、部分修改、错误修改或完整修改被确认；系统不得用目标Intent真值纠错。Undo只回到最近一个确认版本。

若用户只说：

> 半年后可能用钱，所以把期限改成6个月，并且更加重视风险。

Chat-only只能复述：

> 我理解你提出的修改是：总体研究视角改为6个月；下行风险优先级提高。其他字段保持当前状态。是否确认？

系统不能擅自补充30%短期资金需求、经营稳定性或增长保留，也不能纠正“总体视角改为6个月”。

### 12.3 Agent消费、过期与刷新

参与者可随时让Agent使用当前已确认状态生成一份确定性的比较说明。它不是单纯复述状态，也不推荐唯一股票，而是把最新确认的Strategy作为比较维度，只使用已确认Evidence形成可审计的“对象—目标—含义”关系。每个`agent_context_consumed`必须保存：

```text
consumed_strategy_version
consumed_evidence_version
consumed_at
surface
output_plan
output_hash
```

系统先按冻结规则生成`output_plan`：

1. 按固定字段顺序列出当前Strategy；
2. 按对象注册表顺序读取Confirmed Evidence，而不是按用户点击顺序排序；
3. 对每条Evidence输出其股票、规范事实、关联维度，以及它对该维度提供的支持、限制或风险含义；
4. 按ALFA、BETA、GAMMA固定顺序形成比较，不足以比较时明确指出缺口；
5. 不补充Evidence之外的事实，不给出唯一股票推荐，也不输出“尚缺维度”或其他面向最终理由评分规则的检查清单。

两组在Strategy字段内容、Evidence对象集合和对象注册表版本完全相同时，必须得到相同的`output_plan`和语义内容；参与者本地版本号或操作历史不同不得改变输出。允许固定模板进行表面措辞连接，但不能增删事实、维度关系或比较结论。Agent输出模板为：

> 当前已确认的Strategy为：{固定字段顺序的最新确认状态}。基于你已确认的Evidence：{按对象注册表顺序逐条给出“股票—事实—关联目标—支持/限制含义”}。在当前证据范围内，三只候选可形成以下比较：{仅基于已确认Evidence的确定性比较；证据不足以比较时只说明“当前已确认依据不足以形成该项比较”}。未加入Evidence的信息不会被自动补充，这不是股票推荐。

Evidence为空时：

> 当前Strategy已应用，但你还没有确认任何决策依据，因此我不能基于已确认Evidence形成股票比较。我不会自动把前文信息加入判断。你可以返回补充依据，也可以继续完成最终判断。

Agent分别维护两个状态：`agent_strategy_state`和`agent_evidence_state`。消费完成时两者均为`fresh`；之后Strategy确认新版本只使前者变为`stale`，Evidence版本变化只使后者变为`stale`。

Strategy过期时，两组均在主Chat Lane中以同等显著的系统反馈提示：

> 当前Strategy已更新，Agent尚未使用这一版本。提交前请更新Agent状态。

Evidence过期时，两组均显示：

> 当前Evidence已更新，Agent说明尚未使用这一版本。你可以刷新说明；这不会阻止最终提交。

最终提交闸门只检查`agent_strategy_state=fresh`，不检查Evidence是否正确、完整或已被最新说明消费。界面不得使用不加限定的整体“Agent已同步”；必须分别展示Strategy与Evidence状态。重新消费后两个状态恢复为`fresh`。Agent不评价Strategy是否达到V2，也不推荐唯一股票。

## 13. Round 07｜最终判断

### 两组逐字相同的最终提示

> 请选择一只最值得进一步研究的股票，并提交100—150个字符的理由，标点计入字符数。理由中请引用至少两条此前出现的具体事实；这些事实应涉及至少两个不同方面，并说明它们如何符合当前Strategy、影响你的选择、比较或权衡。同时指出至少一项仍需核查的风险。

### 相同输入组件

- ALFA、BETA、GAMMA单选；
- 100—150字符理由输入框；
- 实时字数与明确的不足/超出提示；
- 相同提交按钮和终止事务锁。

进入Round 07时记录`final_rationale_started`；第一次产生非空输入时记录`final_rationale_first_input`；理由首次达到合法字符范围时记录`final_rationale_valid_length_reached`。由此派生最终写作时长，仅作机制分解与敏感性分析，Primary端到端计时不变。

字符计数统一为：文本NFC规范化并去除首尾空白后，按Unicode code point计数；内部空格与标点计入，CR/LF不计。前端提示、后端校验和导出脚本必须调用同一实现。

### 最终提交前置条件

1. 已选择股票且字符数合格；
2. `t0`后至少产生一次`strategy_confirmed_snapshot`；
3. 至少存在一次`agent_context_consumed`，其`consumed_strategy_version`等于最新确认Strategy版本，即`agent_strategy_state=fresh`。

不要求Strategy达到V2真值，不要求Evidence达到两条或两个维度，也不要求`agent_evidence_state=fresh`，不阻止理由质量较低的任务结果。若Strategy状态过期，系统只提示刷新，不暗示应该如何修改Strategy。股票没有唯一正确答案，最终理由由不知道实验条件的评分者编码。

## 14. 主任务结束后的量表与B2b状态核查（不计入8轮）

Round 07终止事务锁取得后，严格按以下顺序执行；这些是测量步骤，不是新的任务Round：

### 14.1 主任务负荷与场景化主观题

先完成冻结中文版Raw NASA-TLX六维及场景化主观题。题干只要求评价`t0`到最终提交或时限到达之间的调整阶段。量表完成前不得展示任何状态Probe，避免核查任务反向影响负荷评分。

### 14.2 无辅助状态理解Probe

隐藏Chat、Widget和全部Strategy内容，参与者回答：

> 任务结束时，你认为系统保存的已确认Strategy是什么？

同时记录五字段回答和信心。系统不反馈正确性；该结果用于诊断内部状态理解，不预设Widget必须更高。

### 14.3 开放状态核查Probe

提交无辅助回答后，系统基于终止时冻结Strategy生成待核查摘要：五个字段中四个与冻结状态相同，一个字段替换为预注册的合理错误值；错误字段在参与者间平衡分配。两组看到相同格式的摘要和提示：

> 下面的Strategy摘要可能存在一处不一致。请使用当前界面核查，并按照任务结束时系统实际保存的Strategy进行修正。

- Chat-only恢复冻结Chat历史，并可请求由冻结Strategy生成的只读状态回复；
- Chat + Widget恢复冻结的只读Strategy Object，也可使用Chat；
- 两组均不能修改真实Strategy；
- 提交前必须发生一次合格状态查看：相关状态内容至少50%位于视口、页面可见、有焦点且连续保持500ms；
- 使用统一核查时限`L`，不反馈回答是否正确；
- 完整保存`probe_variant_id`、原摘要、最终回答、查看事件和时间。

### 14.4 结束

完成开放核查后进入结束说明与Debrief。任何Probe回答不得回写主任务状态或改变终止快照。

## 15. Chat执行与权威状态机

### 15.1 原则

自然语言叙述与权威状态迁移必须分离。真实API或自由文本生成可以负责表述，但不得直接写入Focus、Evidence、Strategy或Agent消费状态。

### 15.2 统一迁移路径

两组所有状态操作最终调用同一冻结命令和校验器：

```text
focus_add(object_id)
focus_remove(object_id)
evidence_add(object_id)
evidence_remove(object_id)
strategy_draft_set(field, value)
strategy_confirm(draft_version)
strategy_undo(confirmed_version)
agent_consume(strategy_version, evidence_version)
```

Widget直接形成结构化命令；Chat先通过确定性语法/经验证解析器或实时Wizard-of-Oz形成候选命令，再向参与者显示结构化复述，只有明确确认后才提交同一命令。无法唯一解析时只能澄清，不得猜测。

### 15.3 必存记录

```text
raw_user_utterance
normalized_human_semantics
parse_result_or_operator_code
confirmation_prompt
confirmation_response
authoritative_command
confirmed_state_snapshot
consumed_state_snapshot
agent_output_plan
agent_output_hash
latency_components
```

如后续接入真实API，必须先通过冻结指令集的等价性测试；API本身仍不能成为权威状态源。两组使用相同系统等待时长或相同等待模拟政策，并分别记录系统等待与用户活动时间。

## 16. 与Metric V3的事件映射

Metric文件已同步V3.3的机械Round映射、初次暴露资格、日志和时间分解；Benefit构念、Primary公式与尚未冻结的H/L数值保持不变：

| V2.1位置 | V3.3位置 | 含义 |
|---|---|---|
| Round 01—05早期事实 | Round 01—04 | 新需求前19个固定对象 |
| Round 07初步判断 | Round 04 | 初步判断锚点 |
| Round 08新需求与`t0` | Round 05 | `constraint_exposure_qualified` |
| Round 09—10自由交互与Agent消费 | Round 06 | B1/B2交错、消费—修改—再消费 |
| Round 11最终提交 | Round 07 | 最终事务锁与最终理由 |

保持不变：

- B1事后评分仍要求最终理由准确使用至少两条早期目标事实并覆盖至少两个维度；
- B2a严格成功仍要求五字段符合目标协议且`t0`后明确确认；
- Primary仍使用`t0`到最终提交锁的端到端时间，并受既有质量门控；
- H、L、样本量/MDE、评分codebook和统计分析协议仍须在正式采集前冻结；
- 另报告`full_task_elapsed`及`t0`前成本，检查Primary结论是否依赖计时起点；
- 正式实验无参与者预测试，只有工程验收与Golden Log验证。

## 17. 日志最低要求

```text
round_exposed(R00—R07)
task_started
fact_row_selected
qualified_initial_exposure
fact_view_started / fact_view_ended
qualified_reaccess / first_access_after_t0
focus_add / focus_remove
focus_set_snapshot
constraint_exposure_qualified
evidence_add / evidence_remove
evidence_confirmed_snapshot
strategy_draft_snapshot
strategy_confirmed_snapshot
strategy_undo
agent_strategy_stale / agent_strategy_fresh
agent_evidence_stale / agent_evidence_fresh
agent_context_consumed
final_rationale_started
final_rationale_first_input
final_rationale_valid_length_reached
final_submit_requested
final_submit_blocked(reason)
final_submit_lock_acquired
task_context_frozen
final_submission_received
questionnaire_submitted
unaided_probe_exposed / unaided_probe_submitted
aided_probe_exposed / aided_probe_submitted
aided_probe_deadline_reached
```

每个事件保存`participant_id_hash`、`condition`、`round_id`、单调时钟、墙钟、`object_id`或版本号、`surface=chat|widget|system`及会话版本。必须能从事件流唯一重建Focus、Evidence、Strategy和Agent fresh/stale状态。

前置成本至少派生：

- `pre_t0_elapsed`；
- `pre_t0_fact_view_time`；
- `pre_t0_focus_actions`；
- `pre_t0_chat_turns`与输入字符数；
- `pre_t0_system_wait_time`与用户活动时间。
- `final_composition_elapsed`及从首次输入到合法长度的时间。

点击数与输入字符数不相加成缺乏单位意义的“总动作数”。

## 18. 实现验收标准

1. 页面只有Round 00—07八个标准化任务节点；
2. Round 01—04对象数依次为6、6、4、3，合计19个且ID唯一；
3. 两组的对象、数值、详情、顺序、Agent结论和基础卡片逐项一致；
4. 指标行选中后才出现条件对应的操作入口；
5. Round 01—04只开放详情和Focus，Focus只存指针/标题；每个对象达到合格初次暴露后本轮才可继续；
6. 从Focus重开对象会重新显示完整标准事实；只有存在`t0`前合格初次暴露时才可记录为reaccess；
7. Round 05才解锁Evidence与Strategy，并正确记录唯一`t0`；
8. Round 06允许复用、Strategy修改和Agent消费自由交错，无伪线性闸门；
9. Strategy或Evidence确认新版本后，两个条件分别显示同等显著且语义准确的过期状态；
10. 只有最新Strategy已被Agent消费时才能提交；该闸门不检查Strategy正确性、Evidence质量或Evidence新鲜度；
11. Chat和Widget的权威状态迁移调用同一冻结状态机，Chat解析失败时澄清而非猜测；
12. Round 04回复不预告后续需求变化；Round 05文案不直接泄露Strategy字段名；
13. 前端、后端和导出脚本使用相同Unicode字符计数规则；
14. 条件切换器不向参与者显示，会话开始后条件锁定；
15. Agent消费输出由冻结的状态—对象规则生成；相同Strategy字段内容、Evidence对象集合和对象注册表版本产生相同`output_plan`和语义内容；
16. Round 07后依序完成负荷量表、无辅助状态Probe和开放核查Probe，且不得回写主任务状态；
17. 日志可以通过Golden Log重建所有状态和版本，并区分前置成本、最终写作、系统等待与用户活动；
18. 页面不提供真实交易建议、正确指标提示或唯一股票答案。

## 19. 论文协调项与冻结状态

论文示意图中的`77c`、`21c`、`3.7×`和“0 turn”等固定成本，以及初稿中Study 2的样本量、效应值、显著性和结果表，目前都不能由本尚未运行的实验支持。它们只能视为占位或概念性示例；提交或对外传播前必须删除、明确标为假设性示意，或由真实数据和可复现计算替换。本稿不直接修改论文PDF。

论文初稿的历史投资研究arm包含四个独立output-contingent triggers，并建模Source、Risk、Claim和Assumption等对象；V3.3股票原型包含一个复合的中间约束触发器，并以19个信息对象、Strategy Object和Evidence Set为主要对象层。两者可支持相同的“Chat作为入口、对象作为交互节点”机制，但不是同一实验材料。论文若将V3.3写成正式投资arm，必须同步改写方法、对象清单、触发器表、指标和结果，不能沿用初稿中的四触发器与虚构结果。

论文以OCFT和局部信息/动作edge cost作为跨场景指标；V3.3当前唯一Primary是`joint_success_time_gain_H`。二者都关注质量门控后的效率，但起止点、截尾和效用定义不同，不得互换名称或混用结果。对应关系及稿件修改清单见`stock-paper-alignment-v1.md`。

V3.3已处理三轮CHI评审指出的单轮信息过载、Focus前置成本、初次暴露缺失、隐藏Agent状态失败、Agent仅复述状态、Agent输出过度辅导、B2b流程缺失、Chat解析混淆、新需求字段泄露和最终写作时间未分解等问题，并完成论文对齐复审。正式数据采集前仍至少需要：

1. 至少三名独立审阅者完成中度隐式需求到五字段Intent的内容效度映射；
2. 对象注册表审计；
3. Chat命令等价性与Golden Log验证；
4. H、L、样本量/MDE、评分codebook和统计分析协议冻结；
5. 网站按本稿实现后的工程验收。

本轮只同步Metric文件中的机械Round映射、初次暴露和日志口径，不修改Benefit、Primary公式或统计结论边界。V3.3现冻结为原型实现规范；在上述正式采集条件全部完成前，不得把公开网页称为已验证系统或把其日志用于确认性分析。
