# V5.1 Canonical Object Registry 与 Reducer 合约（冻结）

> 本文是股票场景对象语义的可审计说明；机器可读单一来源为 `lib/stock-v5-registry.ts`。V5 的 22 对象与 online accepted-state 定义已废止。

## 1. 对象资格与统一动作

一个可指点对象必须具有稳定 ID、独立非重复详情、可独立指代与后续复用能力。普通属性、推断、排序、建议和连接语不进入 registry。

统一对象动作：

- `OPEN_DETAIL(object_id)`：获取规范详情；幂等，不改变候选、证据权重或结论。
- `ANNOTATE_REFERENCE(object_id, comment)`：在下一条问题中携带对象及逐项评论；相同对象再次保存会覆盖草稿，不产生重复引用。
- `REMOVE_REFERENCE(object_id)`：发送前取消该对象引用。

对象点击与语义等价的 Chat 请求必须得到同一 `Evidence Envelope`、同一 `revealedObjectIds` 和同一 payload hash。两条路径只允许表面日志不同。

## 2. 精确对象清单（25 个）

### 2.1 Company（3）

| ID | 标题 | 触发前详情边界 |
|---|---|---|
| A-COMPANY | ALFA | 仅列资料范围、统计期间与来源，不给出风险解释 |
| B-COMPANY | BETA | 仅列资料范围、统计期间与来源，不给出风险解释 |
| G-COMPANY | GAMMA | 仅列资料范围、统计期间与来源，不给出风险解释 |

Company 详情永不在触发前列出最新披露或 OpenUncertainty。所有对象 Popup 统一使用中性事实字段，如公司、指标、观察值、观察期、披露日期、当前状态、待确认项和来源；不使用“不代表”“不等于”“不保证”“意味着风险”等替参与者解释信息的句子。

### 2.2 Fact（16）

| 公司 | ID | 规范事实 |
|---|---|---|
| ALFA | A-GROWTH | 最近一个完整年度营收同比增长 24% |
| ALFA | A-VALUATION | 2025-06-30 市盈率 38× |
| ALFA | A-VOLATILITY | 过去 12 个月价格波动高 |
| ALFA | A-LIQUIDITY | 过去 60 个交易日成交活跃度高 |
| ALFA | A-CONCENTRATION | 最大客户贡献约 42% 营收 |
| BETA | B-GROWTH | 最近一个完整年度营收同比增长 9% |
| BETA | B-VALUATION | 2025-06-30 市盈率 24× |
| BETA | B-VOLATILITY | 过去 12 个月价格波动低 |
| BETA | B-LIQUIDITY | 过去 60 个交易日成交活跃度中 |
| BETA | B-CASHFLOW | 经营现金流连续 8 个季度为正 |
| BETA | B-CYCLE | 行业周期敏感性较高 |
| GAMMA | G-GROWTH | 最近一个完整年度营收同比增长 15% |
| GAMMA | G-VALUATION | 2025-06-30 市盈率 29× |
| GAMMA | G-VOLATILITY | 过去 12 个月价格波动中 |
| GAMMA | G-LIQUIDITY | 过去 60 个交易日成交活跃度低 |
| GAMMA | G-DEBT | 最近一个完整年度资产负债率 68% |

### 2.3 DisclosureEvent（3）

| ID | 规范摘要 | 规范详情中的关键字段 |
|---|---|---|
| A-DISCLOSURE | 最大客户暂停新增订单并启动审查 | 客户约占 42% 营收；既有合同未终止；约 3 个月后公布审查结果 |
| B-DISCLOSURE | 核心客户逾期回款、账龄恶化 | 平均回款周期 58→96 天；现金流仍为正；未下调指引 |
| G-DISCLOSURE | 未来九个月 35% 有息债务集中到期 | 现金只能覆盖一部分；未违约；尚无正式再融资协议 |

### 2.4 OpenUncertainty（3）

| ID | 标题 | parentEventId | 规范详情 |
|---|---|---|---|
| A-UNCERTAINTY | 客户审查结果及新增订单恢复时间 | A-DISCLOSURE | 最终审查结果和恢复时间均未确认；预计约 3 个月后公布审查结果 |
| B-UNCERTAINTY | 逾期款项最终回收时间 | B-DISCLOSURE | 未给出最终回收时间，也未确认是否全部收回 |
| G-UNCERTAINTY | 再融资完成时间与融资条件 | G-DISCLOSURE | 未给出完成时间、融资成本或最终方案；尚无正式协议 |

## 3. 阶段与可见性

权威阶段：

```text
initial_exploration
initial_submission
disclosure_exploration
final_submission
complete
```

| kind | initial_exploration / initial_submission | disclosure_exploration / final_submission |
|---|---|---|
| Company | 可见、可访问 | 可见、可访问 |
| Fact | 可见、可访问 | 可见、可访问 |
| DisclosureEvent | 不可见、不可访问 | 摘要可见，可直接访问详情 |
| OpenUncertainty | 不可见、不可访问 | 仅在父事件详情已访问，或用户直接询问该事项后进入 Envelope |

触发前即使客户端提交 Event/Uncertainty ID，也必须返回阶段拒绝，不得返回对象标题、详情或存在性提示。未知或混合非法 ID 原子失败，不执行部分操作。

历史消息只保留当时已验证的对象标记；阶段变化不能把先前的非法标记追溯变成按钮。

## 4. Evidence Envelope

每次检索或模型请求的权威包至少包括：

```ts
{
  allowedObjectIds: string[];
  summaries: string[];
  details: string[];
  referencedObjectComments?: Array<{
    objectId: string;
    comment: string;
  }>;
}
```

- `summaries` 只含当前阶段可见对象。
- `details` 只含用户已经查看或直接请求的对象。
- Event 详情会把其 Uncertainty ID 加入 `revealedObjectIds`。
- 同一 Envelope 生成稳定 hash，随日志保存。
- 模型只能组织该包，不能修改它或据此推进阶段。

## 5. Resolver 规则

1. 优先匹配当前阶段可访问的具体 Fact/Event/Uncertainty，再匹配 Company。
2. 公司名与具体别名同时出现时，用公司限定具体对象。
3. 多对象明确请求可按文本中出现顺序返回。
4. 无法唯一解析时返回中性澄清，不猜测对象。
5. 指代、否定和组合请求可由 LLM 语义层解释，但最终 ID 必须由 registry 校验。
6. 模型输出中的 ID 必须属于当前 Envelope；未知或越权 marker 去掉标记并保留可读文字。

等价表达示例：

| 对象操作 | Widget | Chat-only |
|---|---|---|
| 打开 BETA 回款事件 | 点击披露对象 | “展开 BETA 逾期回款的详情” |
| 查询回收时间 | 点击后续出现的未确认事项 | “逾期款最终什么时候能收回？” |
| 引用并评论 | 卡片旁保存评论 | 在 Chat 中复述对象并说明其与问题的关系 |

## 6. 确定性提交 Reducer

### `REQUEST_INITIAL_SUBMISSION`

- 只允许从 `initial_exploration` 进入 `initial_submission`。
- 由参与者点击“形成初步判断”触发；打开两条件相同的紧凑答题卡，不产生 Chat turn。
- 可返回 `initial_exploration`，并保留未提交草稿。
- 答题卡打开时普通 Composer 暂时禁用。

### `SUBMIT_INITIAL`

- 只允许在 `initial_submission`。
- 固定字段：一只候选；一项由参与者声明为“与候选直接相关”的自由文本依据；另一项自由文本依据。
- 第二项允许同公司或跨公司比较；答题卡不列出 registry、不预填对象。
- 在线只检查候选和两个文本字段非空、两项依据不完全相同；不解析其语义正确性。
- 成功后冻结原始字段，生成一条结构化只读用户消息，释放三条 DisclosureEvent 并进入 `disclosure_exploration`。

### `REQUEST_FINAL_SUBMISSION`

- 只允许从 `disclosure_exploration` 进入 `final_submission`。
- 由参与者点击“提交最终判断”触发；打开两条件相同的紧凑答题卡，可返回探索。

### `SUBMIT_FINAL`

- 固定字段：最终候选、最新披露如何影响判断、目前仍有什么不确定性；三个字段均必填，无默认候选。
- 不要求参与者逐项列出旧 Fact、新旧关系或 Disclosure，避免泄露离线评分路径。
- 第一次提交原子锁定、立即停止主计时并进入 `complete`。
- 只显示“已记录你的最终判断”。
- 不在线检查 Gold、不返回缺项、不允许第二次提交改变主要终点。

普通 Chat、对象操作、注释、关键词、消息数量和 LLM 输出均不能调用以上 reducer 转换。

## 7. 条件等价与测试矩阵

对 25 个 ID 参数化执行：

| 测试 | Chat + Object | Chat-only | 断言 |
|---|---|---|---|
| 合法详情 | 点击对象 | 语义等价追问 | 同一对象、Envelope、revealed IDs 与 hash |
| 重复详情 | 再次点击 | 再次追问 | 幂等，无重复状态 |
| 触发前 Event | 伪造点击请求 | 直接追问 | 不返回详情，状态不变 |
| 触发前 Uncertainty | 伪造点击请求 | 直接追问 | 不泄露存在或内容，状态不变 |
| 父 Event 揭示 | 打开 Event | 查询 Event 详情 | 对应 Uncertainty 同时进入 revealed IDs |
| 直接查询 Uncertainty | 点击已出现对象 | 明确询问 | 同一规范详情和状态差分 |
| 未知 marker | 模型输出伪 ID | 同左 | 只保留普通可读文字 |
| 引用评论 | 逐对象保存 | 自然语言复述 | 语义上下文可比，不改变判断状态 |
| 普通消息含“初步/最终” | 发送 | 发送 | 阶段不变 |
| 显式初步提交 | 按钮 + 相同答题卡 | 同左 | 三个字段完整且两项依据不重复才原子提交 |
| 跨公司依据 | 第二文本字段可写跨公司比较 | 同左 | 不在线语义裁决；原文进入离线编码 |
| 第一次最终提交 | 按钮 + 相同答题卡 | 同左 | 三个字段完整；只锁定一次并立即终止主计时 |
| protected assertion | 最终理由含受保护错误 | 同左 | 在线仍记录；离线打错误标签，无 tutoring |

核心不变量：

```text
semanticProjection(run_chat) === semanticProjection(run_widget)
```

允许不同的只有点击/输入等表面动作与其日志。

## 8. 单一来源与版本纪律

- `lib/stock-v5-registry.ts` 是对象 ID、类型、标题、摘要、详情、别名和父事件关系的唯一机器可读来源。
- 前端从该 registry 派生可指点对象，不手写第二份清单。
- 文档、测试、图和论文引用对象总数时统一写 25。
- 内部 ID、kind、Envelope 与 reducer 事件不出现在普通参与者 UI；研究者日志可保留。
- 任何对象内容或阶段规则变更都必须同步版本与测试，不允许只改页面文案。
