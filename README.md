# Stock Agent Interaction Study · V5.1

当前实现位于 `/v5`。这是一个 Codex 风格的股票探索实验原型，用来比较：

- `Chat-only`：Agent 输出中的领域对象保持同样文字、顺序与可读性，但需要在 Chat 中指明对象并追问；
- `Chat + Object`：同一对象可直接点击打开小型侧边资料卡，并可逐对象“引用并评论”。

V5.1 保留现有侧栏、对话流、输入框、单一 Popup 与注释 UI，不包含 Dashboard、策略、Focus 或 Evidence 看板。

## 当前冻结合同

- Widget 从第一条 Agent 回答开始，并支持每一次自由 API 回答中的合法对象；
- 单一 registry 共 25 个对象：3 Company、16 Fact、3 DisclosureEvent、3 OpenUncertainty；
- 触发前 Company 详情不会泄露后续回款、再融资或最新披露；
- 阶段只由“形成初步判断”和“提交最终判断”两个相同按钮推进，普通文字、轮数、点击或 LLM 均不能推进；
- 两个按钮打开两条件完全相同的固定答题卡，参与者无需猜 Chat 提交格式；答题卡不列事实、不预填答案；
- 第一次正式最终提交立即结束主要计时，只显示中性记录确认；语义质量由任务后条件盲法评分；
- DeepSeek 只将确定性 Evidence Envelope 组织成自然回答，不生成实验事实、不知道条件/Gold、不决定阶段或是否通过；
- Chat 与 Object 对同一语义操作返回同一规范详情和状态差分；资料 Popup 只展示事实、观察期、状态与来源，不加入指向性解释。

## 启动链接

- `/v5`：当前标签页随机分配一次并锁定条件；
- `/v5?condition=chat_only`：固定 Chat-only；
- `/v5?condition=chat_widget`：固定 Chat + Object；
- `/v5?preview=1&condition=chat_widget`：研究者预览，可切换条件、重置和下载本地日志。

普通参与者看不到条件切换器或内部对象 ID。

## DeepSeek 配置

API key 只从服务端环境变量读取：

```bash
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

可复制 `.env.example` 作为本地模板；不要使用 `NEXT_PUBLIC_` 或 `VITE_` 前缀。

## 本地运行与验证

```bash
npm install
npm run dev
npm test
```

当前匿名事件日志只写入浏览器 `localStorage`，研究者预览可下载 JSON；没有研究服务器上传或账户依赖。该网页是实验装置的工程原型，不是已经获得的确认性实验证据。

## V5.1 设计材料

- `docs/stock-scenario-risk-disclosure-v5.md`：场景、剧本、状态机、指标与评分边界；
- `docs/stock-scenario-diagram-v5.md`：场景图、两条件访问图和页面骨架；
- `docs/stock-object-registry-v5.md`：25 对象、可见性、Evidence Envelope 与 reducer 合约。

V3.3、V4 与 V5 文档和旧公开页面仅作历史原型参考；若与上述三份 V5.1 文件冲突，以 V5.1 为准。
