# 软件产品开发实验 v4 试行版快照

快照 ID：`software-product-development-v1-pilot-v4-2026-09-03`

状态：`CONTENT_REVIEW_ONLY`

这是 2026-09-03 对当前 v4 实验体验与信息架构的恢复副本。它保留本轮已经突破的设计，使后续 v4 继续迭代时，即使方向发生偏移，也能回到这一组完整、可校验的上游材料。

## 这版保留的核心

- 项目基线不是一次交接摘要，而是七轮 User-Agent 项目前史加两轮当前参与者现场接管；
- 所有人从同一份中立的最近输出开始，参与者自己的表达与注意方向决定后续推进；
- 最近输出会让新旧对象和关系变得显著，但不会清空更早的证据、决定和版本历史；
- Agent 提供深厚、无推荐排序的信息空间，参与者可以追问、验证、回访、修订、保留或停止；
- 三段接续只是彼此隔离的代表性可达性见证，不是参与者可见菜单，也不是三个预设结局；
- A 是完整 Chat，B 是相同 Chat 加可选对象访问；对象只在方向已经显著后降低重新定位、上下文恢复、操作和核验成本，不替参与者选择方向；
- NTE 仅作为 EETF 场景资格化或探索性描述，不能冒充 CHI_v6 已有的确认性分析变量。

## 冻结范围

本目录只冻结以下四份上游内容材料：

1. 参与者可消费的代表性对话稿；
2. 内部参与者内容库存；
3. 整体剧本信息架构；
4. 用户视角入口。

文件、字节数和 SHA-256 见 `freeze-manifest-v1.json` 与 `SHA256SUMS.txt`。本目录中的冻结副本不得原地修改；后续变化应继续发生在原始工作文件中，并在需要时建立新的 `v4.1`、`v4.2` 或 `v5` 快照。

## 明确没有冻结什么

这个快照不是 runtime、participant release 或正式研究数据。它不包含 `scenarios/`、`lib/experiment/`、`components/`、API、tests 或 scripts，因为当前工程 witness 尚未与 v4 的完整剧本合同对齐。新增 Focus、长期观察、cross-case 和 pair-state packets 仍需 raw manifest、matched-R0 reconciliation、六项 ratio、eligibility receipt 与 runtime 绑定。

因此：

- `releaseEligible=false`
- `runtimeAligned=false`
- `formalStudyReady=false`
- `notParticipantData=true`

## 以后怎样回到这一版

1. 先读取本文件，确认要恢复的是 v4 内容审阅基线，而不是旧 runtime；
2. 按 `SHA256SUMS.txt` 核验冻结副本没有变化；
3. 将当前工作文件与本目录对应文件逐一比较，只恢复明确需要回退的内容；
4. 恢复后重新运行软件开发场景合同测试、完整测试与 lint；
5. 不用后来的结果反向改写这份快照，也不把它升级解释为正式实验已经就绪。

