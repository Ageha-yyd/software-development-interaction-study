# Software Development Interaction Study

白紫色浏览器实验基座，用于在冻结的软件产品开发材料上比较两个随机条件：

- **A · Full Chat**：完整 Chat 始终可用。
- **B · Chat + Optional Objects**：保留相同 Chat，并增加可选的对象展开与选择入口。

对象入口不是完成任务的必要条件。两个条件共享同一场景适配器、信息节点、查询网关、提交终点和可接受状态。

## 当前工程预览

当前场景是 `software-product-development-v1 / EPISODE-01-SUR-ORG`：参与者接手一个个人阅读清单产品，在共同 R0 历史和同一份冻结四日试用记录上形成下一步产品意图。

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 3421
```

打开：

- 研究者预览 A：`http://127.0.0.1:3421/?preview=1&condition=A`
- 研究者预览 B：`http://127.0.0.1:3421/?preview=1&condition=B`
- 参与者式随机分配：`http://127.0.0.1:3421/`

`preview=1` 只用于研究者走查，允许切换条件和下载本地事件。正式参与者 URL 不接受条件覆盖。

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

模型只负责自然语言解释。可见信息节点、阶段推进、对象访问和提交终点仍由同一确定性场景内核控制；A/B 使用相同模型配置和信息包，请求中不传实验条件。

## 证据边界

这是第一阶段工程预览，不是正式数据采集系统。当前事件只写入浏览器 `localStorage`；查询网关可选择确定性本地解析或服务端模型代理，但尚未完成真实模型冻结、输出人工审计、服务器分配、不可变上传、候选改版、验证结果、盲评或统计分析。

派生基线固定于上游提交 `2685cba884c0edee24c6514d69431150d19e62e5`。远端仅命名为 `upstream`，避免误推送。

上游 `.openai/hosting.json` 中的 `project_id` 已移除，避免未来误覆盖股票原型的 Sites 项目；如需部署，应为本项目创建新的独立绑定。
