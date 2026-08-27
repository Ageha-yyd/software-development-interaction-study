# 股票场景信息对象轮次覆盖表 V1.1

> 状态：V3.3原型实现冻结；正式采集前仍需完成对象注册表审计  
> 日期：2026-08-27  
> 内容来源：`stock-information-objects-v1.md`（V1.0冻结对象内容）  
> 适用剧本：`stock-experiment-script-v3-8round-draft.md` V3.3  
> 覆盖规则：本文件只覆盖对象操作定义、Round分布和暴露规则；对象ID、数值、规范详情、关联Strategy字段和B1角色继续继承V1.0。

## 1. 为什么需要V1.1

V1.0按旧剧本记录9 / 7 / 3的对象分布；V3.3将相同19个对象重排为6 / 6 / 4 / 3，以降低单轮信息过载。V1.0仍保留为对象内容的冻结来源，开发与实验执行中的轮次位置以本覆盖表为准。

## 2. 对象资格

对象是能够被稳定引用和重新呈现的业务事实节点，而不是孤立数字：

- 指标对象键：`(stock_id, metric, period)`；
- 事件对象键：`(stock_id, event_id, observation_window)`；
- 数值、标题、详情和证据限制属于对象属性；
- 每个对象具有唯一`object_id`、类型、维度、来源、版本、关系和允许操作；
- 两个实验条件必须读取同一对象注册表。

### 2.1 对象层级与边界

| 层级 | 对象 | 注册/版本要求 | 是否计入19个事实 |
|---|---|---|---:|
| 领域实体 | `Company(ALFA/BETA/GAMMA)` | 稳定实体ID；作为Metric/Event的归属节点 | 否 |
| 领域信息对象 | `Metric`、`Event` | 使用下表19个唯一ID和冻结属性 | 是 |
| 共享状态对象 | `Strategy Object`、`Confirmed Evidence Set` | 每次确认生成不可变版本和完整快照 | 否 |
| 派生输出对象 | `Agent Comparison / Decision Rationale` | 保存输入状态快照、`output_plan`和hash | 否 |

`Focus Set`是导航状态，不是Evidence或独立业务对象。数值、周期、详情、风险含义和证据限制都是Metric/Event的属性，不得拆成额外节点来夸大对象数量。本场景没有单独实现论文初稿中的`EvidenceSource`、`ThesisClaim`和`ValuationAssumption`对象；论文若保留这些对象，必须明确其来自其他实验材料，而非本V3.3原型。

## 3. V3.3轮次分布

### Round 01｜增长与估值（6）

| object_id | 股票 | 规范卡片值 | 维度 |
|---|---|---|---|
| `A-GROWTH` | ALFA | 营收增长24% | 增长 |
| `B-GROWTH` | BETA | 营收增长9% | 增长 |
| `G-GROWTH` | GAMMA | 营收增长15% | 增长 |
| `A-VALUATION` | ALFA | 市盈率38× | 估值/下行风险 |
| `B-VALUATION` | BETA | 市盈率24× | 估值/下行风险 |
| `G-VALUATION` | GAMMA | 市盈率29× | 估值/下行风险 |

### Round 02｜波动与交易活跃度（6）

| object_id | 股票 | 规范卡片值 | 维度 |
|---|---|---|---|
| `A-VOLATILITY` | ALFA | 价格路径波动高 | 下行风险 |
| `B-VOLATILITY` | BETA | 价格路径波动低 | 下行风险 |
| `G-VOLATILITY` | GAMMA | 价格路径波动中 | 下行风险 |
| `A-LIQUIDITY` | ALFA | 日均成交活跃度高 | 短期可变现性 |
| `B-LIQUIDITY` | BETA | 日均成交活跃度中 | 短期可变现性 |
| `G-LIQUIDITY` | GAMMA | 日均成交活跃度低 | 短期可变现性 |

### Round 03｜经营稳定性与公司风险（4）

| object_id | 股票 | 规范卡片值 | 维度 |
|---|---|---|---|
| `A-CONCENTRATION` | ALFA | 最大客户收入占比42% | 经营稳定性/下行风险 |
| `B-CASHFLOW` | BETA | 经营现金流连续8季度为正 | 经营稳定性 |
| `B-CYCLE` | BETA | 行业周期敏感性较高 | 经营稳定性/下行风险 |
| `G-DEBT` | GAMMA | 资产负债率68% | 经营稳定性/下行风险 |

### Round 04｜弱诊断性事件（3）

| object_id | 股票 | 规范标题 | 证据限制 |
|---|---|---|---|
| `A-WEAKSIGNAL` | ALFA | 战略合作意向 | 未披露正式订单、金额或预计收入 |
| `B-WEAKSIGNAL` | BETA | 新客户试点 | 未说明付费状态、客户规模或收入贡献 |
| `G-WEAKSIGNAL` | GAMMA | 新产品试用反馈 | 未披露数量、订单或实际销售 |

合计19个唯一对象；对象值和完整详情以V1.0对应行的规范文本为准。

## 4. 分阶段操作

| 阶段 | 了解详情 | Focus | Evidence | 影响Strategy |
|---|---|---|---|---|
| 教程 | 练习对象可用 | 练习对象可用 | 约束变化后可用 | 约束变化后可用 |
| Round 01—04 | 可用 | 可用，仅存指针/标题 | 不可用 | 不可用 |
| Round 05—07 | 可用 | 可用 | 可用 | 可用，必须经Draft/Diff/确认 |
| 任务后Probe | 只读核查 | 不可修改 | 不可修改 | 不可修改 |

状态边界：

```text
查看 ≠ Focus ≠ Evidence ≠ Strategy
```

Focus只保存`object_id`和`canonical_title`。完整值与详情不进入Focus快照；用户重新打开Focus条目时从对象注册表渲染规范事实。

## 5. 初次暴露与二次访问

`qualified_initial_exposure`要求对象规范标题和值至少50%可见、页面可见、窗口有焦点且连续1000ms，并发生在`t0`前。Round 01—04的每个对象都达到该门槛后，本轮才能继续。

`qualified_reaccess`要求同一对象已经发生合格初次暴露，并在`t0`后由用户主动重新呈现且再次达到相同可见时间门槛。否则只记录`first_access_after_t0`，不得作为二次消费机制证据。

## 6. 条件等价

| 项目 | Chat-only | Chat + Widget |
|---|---|---|
| 对象、值、顺序、详情、Agent基础结论 | 相同 | 相同 |
| 初次暴露门槛 | 相同 | 相同 |
| 选择与高亮 | 相同 | 相同 |
| 对象状态操作 | Chat提出、复述、确认 | 直接操作或Chat |
| 权威状态迁移 | 冻结状态机 | 同一冻结状态机 |
| Agent比较说明 | 同一状态产生同一`output_plan` | 同一状态产生同一`output_plan` |

不得为Widget条件增加对象、解释、重要性排序或正确值提示。不得把Chat-only降级成难以扫描的大段文字。

## 7. 冻结前审计

1. 19个ID唯一且均可从V1.0追溯完整规范内容；
2. Round对象数严格为6 / 6 / 4 / 3；
3. 所有对象包含类型、股票、维度、时间范围、来源、详情、关系、操作与版本；
4. 两条件卡片快照逐像素或逐字段核对内容等价；
5. 每个对象均可在Golden Log中完成初次暴露、重访、Focus、Evidence和Strategy关系重建；
6. 弱诊断性对象不得进入B1目标事实门槛。
