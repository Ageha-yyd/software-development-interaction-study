# Software Development Interaction Study

白紫色浏览器实验基座，用于在同一软件产品开发信息空间上比较两个随机条件：

- **A · Full Chat**：完整 Chat 始终可用。
- **B · Chat + Optional Objects**：保留相同 Chat，并增加可选的对象展开与选择入口。

对象入口不是完成任务的必要条件。两个条件共享同一场景适配器、信息节点、类型化关系、动态 Frontier、Agent 配置和语义操作；条件不会进入 Agent 请求。

## 当前工程预览

现行设计为 [v4.2 研究协议](docs/software-product-development-v1-research-protocol-v4.2.md)。E0 场景运行 `v4.2-e0`：H01–H07 完整历史、H08 现场接管、H09 明确观察授权，后接可复算的作者构造材料。144 条目、72 任务与 461 事件生成 243 个节点及 817 条关系；普通案例、异常、逐条记录与完整来源均可请求。它是新构造模拟世界，不是恢复的历史原始数据。

新增完整研究者流程预览：共同无对象接管后分配条件，依次完成四个隔离共同任务，再进入独立开放 E0。每项先展示共同目标、再明确揭示结果；参与者可多次记录判断、继续修订，最后显式结束。提交原文与曝光来源保留，理解、处置有效性和质量均待独立核对，不自动生成完成率。另有独立六条目产品内核检查区，验证候选范围、采用与真实回滚。

页面不会展示信息矩阵或预设路线。共同历史与 E0 只提供当前入口；用户问“具体案例”“当时的条目状态”或“这些数字从哪里来”时，Agent 才为当前问题构造局部信息包并生成新的 derived Frontier。固定的是可用信息和阶段边界，不是 Chat turn 数或必经对象。

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 3421
```

打开：

- 研究者预览 A：`http://127.0.0.1:3421/?preview=1&condition=A`
- 研究者预览 B：`http://127.0.0.1:3421/?preview=1&condition=B`
- 确定性 UI 走查：在研究者预览 URL 后增加 `&agent=local`
- v4.2 完整流程：`http://127.0.0.1:3421/study/software-development-v42?preview=1&condition=B&agent=local`
- 产品内核检查：`http://127.0.0.1:3421/study/software-development-v42/workbench`
- 浏览器随机分配预览：`http://127.0.0.1:3421/`

`preview=1` 用于研究者走查，允许固定条件、本地解析器及下载事件。v4.2 受控流程内不允许局部切换条件或重置任务。非 preview URL 不接受条件或 Agent 覆盖，但仍不具有正式采集资格。

## 结构

- `components/experiment/`：通用浏览器实验壳层。
- `lib/experiment/`：场景校验、确定性/远程 Agent 网关和遥测接口。
- `scenarios/`：可替换的软件开发 episode。
- `app/api/software-agent/`：软件场景专用、服务端 OpenAI-compatible 模型代理。
- `app/v5/` 与股票 API：保留的上游参考实现，不进入当前软件场景数据路径。

## 可选的大模型接入

不配置密钥时，网页固定使用本地冻结信息解析器。配置后，新会话固定使用远程模型；远程请求失败会显式报错，不会在同一会话中静默切换回答器。

```powershell
Copy-Item .env.example .env.local
```

在 `.env.local` 中填写：

```dotenv
SOFTWARE_AGENT_API_KEY=服务端密钥
SOFTWARE_AGENT_BASE_URL=https://api.deepseek.com
SOFTWARE_AGENT_MODEL=deepseek-v4-flash
```

接口采用 OpenAI-compatible `/chat/completions` 格式。如使用其他兼容服务，应同时替换 Base URL 和模型名。`SOFTWARE_AGENT_*` 未填写时会兼容读取已有的 `DEEPSEEK_*` 变量。API Key 只在服务端读取，浏览器不会收到密钥。

模型负责自然语言解释，并可在完整流程的开放 E0 中提出受控产品操作或请求匹配版本的模拟评价。产品操作先显示本人原请求、具体变更及实际将记录的理由，明确确认后才由服务端内核执行；不是模型自由编写源代码。A/B 使用相同模型配置、工具和 Frontier，请求不传实验条件或对象选择。DeepSeek 的工具请求明确关闭 thinking，不进行工具后的模型续轮；该政策随响应记录。服务端校验请求容量、输出和对象标记；完整对话超限时报告错误，不删除历史。

## 证据边界

这是工程与内容候选，不是正式数据采集系统。E0、四共同任务与两个候选模拟窗口都有结构化来源。开放 Chat 已接入六条目内核的准备/确认/检查/采用/保留/暂缓/丢弃/回滚；支持直接 scoped 候选，不要求先失败。模拟评价按准确产品内容发布，分页和完整原文下载在两组 Chat 相同。六条目实际检查、144 条 E0 模拟记录、候选窗口模拟评价和研究参与者记录分别标注。D30、Focus、Context 和组合包仍是 authoring library。

分配前保留接管往返及本人理解说明，语义核对仍待独立完成。判断原文、版本和逐次曝光保留；[离线审阅工具](docs/software-development-v4.2-review-workflow.md)按提交时点裁剪资料，不自动给 Gold 或质量评分。浏览器存储失败保留内存并提示下载；执行响应丢失时核对同一产品会话，核对前阻止结束。当前服务端使用有期限的进程内存，尚不支持正式持久化与跨进程恢复。

集中验证：202 项测试、构建与 ESLint 通过；A/B、B 不使用对象的完整浏览器流程通过；真实 UI/API/内核配合工程 mock 的候选评价、采用、回滚和响应丢失恢复通过。真实模型的自然语言稳定性、正式采集与人的效果尚未验证。全仓类型检查仍有既有 Cloudflare/股票模块错误。详细日志见 [实施记录](docs/software-development-v4.2-implementation-status.md)，论文修改见 [25 组 manuscript redline](docs/software-development-v4.2-manuscript-redline.md)，真人形成性准备见 [执行包](docs/software-development-v4.2-formative-package.md)。

派生基线固定于上游提交 `2685cba884c0edee24c6514d69431150d19e62e5`。远端仅命名为 `upstream`，避免误推送。

上游 `.openai/hosting.json` 中的 `project_id` 已移除，避免未来误覆盖股票原型的 Sites 项目；如需部署，应为本项目创建新的独立绑定。
