# Stock Intent Lab V3.3 使用说明

状态：公开原型使用说明。站点采用虚构股票和合成数据，仅用于交互研究，不构成投资建议。

## 研究者如何启动

正式分配参与者时，不让参与者自行选择条件；由研究者分别发送下列固定链接：

- Chat-only：`https://stock-intent-lab-v33-public.lyclyc-nsp.chatgpt.site/?condition=chat_only`
- Chat + Widget：`https://stock-intent-lab-v33-public.lyclyc-nsp.chatgpt.site/?condition=chat_widget`
- 研究者预览：`https://stock-intent-lab-v33-public.lyclyc-nsp.chatgpt.site/?preview=1&condition=chat_widget`

直接访问根地址时，系统只在当前浏览器会话中随机分配一次条件。研究者预览页才显示条件切换器，因此不应把预览链接发给参与者。

## 参与者流程

1. 阅读首页的研究说明与数据边界。
2. 完成旅行场景教程，依次体验“了解详情、关注、加入依据、加入策略”等语义；教程操作不会进入正式任务。
3. 进入 8 轮股票辅助决策任务。两组看到相同的 19 条事实、相同顺序和相同 Agent 说明。
4. 在 Round 05 的复合约束出现后，重新检查早期事实并调整当前 Strategy。
5. 提交最终选择和 100–150 字理由。
6. 完成工作负荷、情景理解、无辅助状态回忆和有辅助核验。

## 两个条件的唯一核心差异

- Chat-only：对象信息可读，但关注、依据、策略修改和状态确认必须通过 Chat 完成。
- Chat + Widget：相同对象信息可直接操作，并在侧栏持续维护 Focus、Evidence 与 Strategy 状态。

不得向任一条件额外提供相关性答案，也不得只在 Widget 条件中增加指标、解释或推荐。

## 日志导出

完成任务后，在结束页点击“导出匿名日志”保存 JSON。日志仅保存在当前浏览器的 `localStorage`，原型不会自动上传数据；清除浏览器站点数据会删除尚未导出的日志。

## 使用边界

本版已经通过公开原型实现复审，但不是已完成的正式验证实验。正式采集前仍需冻结 H/L 判定、样本量与 MDE、对象来源审计、Chat 解析验证、编码手册、SAP 与伦理材料；论文草稿中的样本量、效应量和结果不可作为本原型的实证结论。
