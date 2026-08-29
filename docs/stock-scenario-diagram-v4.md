# 股票探索实验场景示意图 V4

> 状态：历史图示，已被 [V5 风险披露触发版图示](./stock-scenario-diagram-v5.md) 替代  
> 对应文档：[股票探索场景与实验剧本 V4](./stock-scenario-math-aligned-v4.md)  
> 核心原则：两个条件共享同一信息图 `G=(V,E)`、同一事实池和同一可接受终点，只改变语义边的交互实现与遍历成本。

## 图 1｜整个股票探索场景

```mermaid
flowchart TB
    S0["S0 稳定高层目标<br/>从三只虚构股票中选择一只优先研究候选<br/>约12个月 · 风险适中 · 兼顾增长与稳定"]
    S1["S1 共同的 Agent 初始概览<br/>两条件的文字、顺序与信息完全相同"]

    S0 --> S1

    subgraph POOL["共同冻结信息图：19个领域对象"]
        direction LR

        subgraph ALFA["ALFA · 6个对象"]
            direction TB
            A0["Company: ALFA"]
            A1["A-GROWTH<br/>营收增长24%"]
            A2["A-VALUATION<br/>市盈率38×"]
            A3["A-VOLATILITY<br/>价格波动高"]
            A4["A-LIQUIDITY<br/>成交活跃度高"]
            A5["A-CONCENTRATION<br/>最大客户收入占比42%"]
            A6["A-WEAKSIGNAL<br/>战略合作意向<br/>未披露订单或收入"]
            A0 --> A1
            A0 --> A2
            A0 --> A3
            A0 --> A4
            A0 --> A5
            A0 --> A6
        end

        subgraph BETA["BETA · 7个对象"]
            direction TB
            B0["Company: BETA"]
            B1["B-GROWTH<br/>营收增长9%"]
            B2["B-VALUATION<br/>市盈率24×"]
            B3["B-VOLATILITY<br/>价格波动低"]
            B4["B-LIQUIDITY<br/>成交活跃度中"]
            B5["B-CASHFLOW<br/>经营现金流连续8季度为正"]
            B6["B-CYCLE<br/>行业周期敏感性较高"]
            B7["B-WEAKSIGNAL<br/>新客户试点<br/>未说明付费或收入贡献"]
            B0 --> B1
            B0 --> B2
            B0 --> B3
            B0 --> B4
            B0 --> B5
            B0 --> B6
            B0 --> B7
        end

        subgraph GAMMA["GAMMA · 6个对象"]
            direction TB
            C0["Company: GAMMA"]
            C1["G-GROWTH<br/>营收增长15%"]
            C2["G-VALUATION<br/>市盈率29×"]
            C3["G-VOLATILITY<br/>价格波动中"]
            C4["G-LIQUIDITY<br/>成交活跃度低"]
            C5["G-DEBT<br/>资产负债率68%"]
            C6["G-WEAKSIGNAL<br/>新产品试用反馈较好<br/>未披露订单或实际销售"]
            C0 --> C1
            C0 --> C2
            C0 --> C3
            C0 --> C4
            C0 --> C5
            C0 --> C6
        end
    end

    S1 --> A0
    S1 --> B0
    S1 --> C0

    A0 --> S2
    B0 --> S2
    C0 --> S2

    S2["S2 第一次自由探索<br/>用户自行决定检查哪个公司、指标、风险或事件"]
    S3["S3 初步判断锚点<br/>初步候选 + 当前最重要的两项信息"]
    T0["S4 输出依赖触发器 t0<br/>半年内可能使用30%资金<br/>更重视可变现性、经营稳定和下行风险<br/>其余资金仍保留约12个月视角与增长考虑"]

    S2 --> S3
    S3 --> T0

    T0 --> I1["下层方向1<br/>可变现性<br/>A/B/G-LIQUIDITY"]
    T0 --> I2["下层方向2<br/>下行风险<br/>估值 · 波动 · 负债"]
    T0 --> I3["下层方向3<br/>经营稳定<br/>现金流 · 集中度 · 周期"]
    T0 --> I4["下层方向4<br/>增长与证据边界<br/>增长 · 弱信号限制"]

    I1 --> S5
    I2 --> S5
    I3 --> S5
    I4 --> S5

    S5["S5 第二次自由探索与意图调整<br/>重新访问旧对象 · 查看详情 · 形成新的比较关系"]
    S6["S6 Agent 路径条件化回答<br/>只使用共同冻结信息池<br/>回答组织可随实际交互历史变化"]
    S7["S7 可接受终点集合<br/>最终候选 + 短期资金适配<br/>早期证据复用 + 一项待核查风险<br/>无唯一正确股票"]

    S5 --> S6
    S6 --> S5
    S5 --> S7
    S6 --> S7

    classDef goal fill:#e8eef8,stroke:#6b83a6,color:#17202b;
    classDef trigger fill:#fff0d8,stroke:#b87518,color:#33210b;
    classDef state fill:#e5f3ea,stroke:#438560,color:#14281c;
    classDef object fill:#f5f6f5,stroke:#9ba49e,color:#1c2420;

    class S0,S1,S2,S3 goal;
    class T0 trigger;
    class S5,S6,S7 state;
    class A0,A1,A2,A3,A4,A5,A6,B0,B1,B2,B3,B4,B5,B6,B7,C0,C1,C2,C3,C4,C5,C6,I1,I2,I3,I4 object;
```

### 读图要点

- `S0—S7` 是七个固定语义节点，不是强制七轮 Chat；自然语言往返数量允许因条件和参与者路径而变化。
- 19 个领域对象及其详情在两条件中完全一致，数值只是相应 Metric 对象的属性。
- `S4` 之后存在多个合理的下一步，用户不必按照固定次序探索。
- 最终没有唯一正确股票；评分关注事实准确性、更新后约束的一致性和风险覆盖。

## 图 2｜同一语义边的两种交互实现

```mermaid
flowchart TB
    E0["语义目标<br/>查看一个已出现对象的局部详情<br/>并把它用于当前提问或判断"]

    E0 --> C1
    E0 --> O1

    subgraph CHAT["条件 A：Chat-only"]
        direction LR
        C1["回找旧输出"] --> C2["重新输入对象名称<br/>或描述上下文"]
        C2 --> C3["组织自然语言问题"]
        C3 --> C4["Agent 解析指代"]
        C4 --> C5["等待 Agent 回答"]
        C5 --> C6["核对返回事实"]
        C6 --> C7["在后续消息中<br/>重新组织该事实"]
    end

    subgraph OBJECT["条件 B：Chat + Object"]
        direction LR
        O1["点击旧输出中的对象"] --> O2["Popup 查看<br/>规范详情与限制"]
        O2 --> O3["引用到当前提问<br/>或添加对象注释"]
        O3 --> O4["直接继续提问<br/>或形成判断"]
    end

    C7 --> F["相同的语义终点<br/>对象详情进入当前推理"]
    O4 --> F

    classDef start fill:#e8eef8,stroke:#6b83a6,color:#17202b;
    classDef chat fill:#fff0d8,stroke:#b87518,color:#33210b;
    classDef object fill:#e5f3ea,stroke:#438560,color:#14281c;
    classDef finish fill:#eee9f7,stroke:#8065a5,color:#21192c;

    class E0 start;
    class C1,C2,C3,C4,C5,C6,C7 chat;
    class O1,O2,O3,O4 object;
    class F finish;
```

## 图 3｜实验条件边界

```text
共同保持不变
├─ 高层任务目标
├─ 19个对象与全部规范事实
├─ 初始Agent概览与中途触发器
├─ 模型版本、系统提示和生成参数
├─ 可接受最终状态与评分规则
└─ Chat本身始终可用

唯一核心操纵
├─ Chat-only：对象是普通文本，局部详情和对象指代通过Chat完成
└─ Chat + Object：对象具有点击目标，可Popup展开、引用和添加对象注释
```

这三张图共同表达的 Claim 边界是：

> 两个条件在相同信息图上到达相同语义终点；Chat + Object 的潜在优势来自局部信息边的遍历成本降低，而不是额外信息、特殊推荐、看板式状态管理或更优的底层模型。
