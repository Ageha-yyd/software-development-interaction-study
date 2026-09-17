# v4.2 组织端离线审阅流程

本文对应 `scripts/review-v42-packet.mjs` 与 `lib/experiment/review-packet.mjs`。它们把真实浏览器预览导出的记录整理为可核对的输入，接受另行提供的人工编码；不把工程走查升级为真人实验，不读取自然语言推断 Gold，不验证评审者身份或独立性。技术 Gold 依赖只在组织端 Node 进程加载，不得导入参与者客户端。

## 1. 从实际导出开始

在研究流程中使用“下载审阅包”。当前包包含 `reviewPacketId`、按 `sessionId` 分组的完整事件、分配记录、逐次 `submissionId`、参与者判断原文、曝光引用和提交时间、`clockTimeOrigin` 与 `exportedAtMonotonicMs`。一次浏览器 document 的 `performance.now()` 构成同一时钟；刷新后的新包不能直接拼接为同一条连续时间轴。

原始 JSON 保持不变。CLI 记录输入文件的绝对路径、字节数和 SHA-256；哈希用于复算时确认具体输入，不证明采集过程真实、不可篡改或已取得同意。浏览器本地备份也不等于正式不可变采集。

本地存储满或不可用时，`BrowserTelemetrySession` 仍保留完整内存事件，记录 `persistenceError`，并让上层继续捕获；随后存储成功才清除错误。这里没有截断较长的 Agent 回复。内存记录仍随页面关闭而丢失，组织者应保留实际下载包，并核对存储告警是否影响包的完整性。

## 2. 运行离线命令

在 `software-development-interaction-study` 目录执行。以下文件名是使用示例，须替换为实际导出路径：

```powershell
node scripts/review-v42-packet.mjs --help
node scripts/review-v42-packet.mjs --input "C:\study-records\packet.json"
node scripts/review-v42-packet.mjs --input "C:\study-records\packet.json" --output "C:\study-records\new-review.json"
node scripts/review-v42-packet.mjs --input "C:\study-records\packet.json" --coding "C:\study-records\codes.json" --output "C:\study-records\new-coded-review.json"
```

默认只读输入，完整报告输出到 stdout。只有显式 `--output` 才创建文件；父目录必须已存在。输出采用独占创建，拒绝覆盖原包、编码文件、已存在报告及已有链接，不提供覆盖开关。UTF-8 BOM 和带空格路径受支持。

| 退出码 | 意义 | 后续动作 |
| --- | --- | --- |
| `0` | 包与所提供编码通过结构核对，仍可能全部待审 | 查看逐次审阅状态，不能据此报告完成率 |
| `1` | JSON 可读，但任务、曝光、版本或编码等对齐失败 | 查看 `validation.errors` 与 `preparation.errors`；原包保持不动 |
| `2` | 参数、读取、JSON 解析或新文件写入失败 | 查看 stderr 中结构化错误；解决路径或输入格式问题 |

可读但验证失败的包仍可显式存为一份新审阅报告，以保留失败原因。CLI 不创建目录，不通过改写输入“修好”错误记录。

## 3. 先查完整性，再组织人工审阅

报告的 `validation` 核对 scenario、分配条件、序列对应的 period、session、事件连续序号、单调时间、曝光事件引用、版本和导出时间边界。`preparation.opportunities` 保留四共同机会和开放模块的位置，以及每次判断原文。

`validation.valid` 仅表示当前可检查字段一致。基线理解、正式分配、评审身份、参与者同意、完整观察窗口、实际产品状态执行与阅读理解仍不是由这个布尔值证明。

在 `preparation.perSubmissionReviewView` 中，每次提交有两个相互分开的对象：

| 对象 | 给谁 | 内容 |
| --- | --- | --- |
| `internalBinding` | 组织者和审计者 | 提交 ID、任务、条件、period、session、曝光与提交时间、纳入事件序号、来源事件序号、材料缺口 |
| `reviewerView` | 独立评审者的材料基础 | 本次判断原文、此前的同任务对话、此前明确记录的来源正文；无条件值、耗时、对象操作事件和审计 ID |

完整 CLI 报告仍包含条件和时间，**不能整份直接作为盲评材料发送**。组织者只导出 `reviewerView` 给评分者，用 `reviewUnitId` 在组织端映射回原记录；不让评分者填写他们不应知道的条件与时间字段。代码尚不负责招募、授权发送、分配评分者或验证盲法。

逐次视图使用本次提交之前的同 session 事件，不借用其他共同任务或开放阶段的后续记录。对于事件与提交时间完全相等、又没有提交时事件序列上界的情形，代码保守排除该事件，并在组织端标为顺序不明，避免把可能较晚的材料提前使用。

视图保留参与者原始措辞，区分自行书写的请求、先前判断、对界面已呈现操作的确认、Agent 回复、作者构造的结果与产品执行结果。Agent 文字只去掉 `[[对象ID|可见文字]]` 的界面标记，保留实际可见文字；未经变换的事件仍在原始包中。点击确认的文字不会冒充参与者自行撰写的理由。

来源只能来自此前 `evidence_text_presented` / `evidence_text_visible` 明确记录的 `text`、`source`、`exactRevision`。Agent 回复中的完整材料也保留在对话正文里，但代码不做自然语言来源抽取。仅有 node ID、整个当前产品 snapshot 或 `publicFacts` 数组，不足以证明全部正文已向参与者展示；不会从当前库或未来回复补齐。产品操作只有实际被记录的显示文本进入视图。

历史任务说明未被完整记录、来源正文缺失、同时间排序不明等留在 `internalBinding.missing`。每份视图的 `materialCompleteness` 都保持 `manual_review_pending`，`qualityAssessment` 保持空值。视图删除元数据不能保证措辞本身不透露界面，故 `contentMayRevealInterface=true`；正式盲评仍需统一排版与泄露检查。呈现记录也不证明参与者读完或理解了材料。

## 4. 人工编码与技术判定分开

编码文件使用独立 JSON，最小可接受内容为：

```json
{
  "schemaVersion": "software-development-v4.2-review-codings",
  "reviewPacketId": "替换为原包实际 ID",
  "validityCodings": [],
  "qualityCodings": []
}
```

空数组表示尚未提供编码。`reviewPacketId` 与 `schemaVersion` 可省略；一旦提供，就必须匹配。其他未支持的顶层字段拒绝处理。

每条有效性或质量编码都须包含以下组织端绑定。评审者只提交其 `reviewUnitId`、判断/评分和理由；组织者使用 `internalBinding` 添加任务与条件等审计字段，保留原始评审文件。

| 字段 | 要求 |
| --- | --- |
| `submissionId` 或 `submissionIndex` | 指向原包的一次提交；index 从 0 开始；同时提供时必须一致 |
| `reviewerId` | 外部实际评审者的研究内编号，非空；字段存在不验证真实身份 |
| `rationale` | 明确人工判定理由，不能用占位语替代实际审阅 |
| `scenarioId`、`period`、`condition`、`sessionId` | 与原提交完全对应 |
| `exposureSequence` | 对应原提交的曝光事件序号 |
| `revision` | 与记录的 subject revision 对应；它本身不证明开放候选的最新执行状态 |

有效性编码另含 `validity: "valid" | "invalid" | "uncertain"`。可选 `technicalDisposition` 是既有共同任务技术判定输入：`facts`、`revision`、`scope`、`action`、`explicitParticipantDecision`、`evidenceRefs`。组织者必须从已审阅的参与者表达和当时证据明确编码；CLI 不生成这些值，不把 Gold 规则复制成参与者答案。

技术谓词只覆盖四共同机会。开放任务不能套用共同任务 Gold；其状态、证据、采用范围与处置之间的联系需要真实运行绑定及人工审阅。当前 CLI 也不把初始场景 revision 当作 C1/C2 的执行回执。

质量编码另含 `scores`，必须逐项提供 `evidenceSupport`、`scopeAppropriateness`、`tradeoffCalibration`、`internalConsistency`、`traceability` 五个整数，范围各为 0–2。分数由外部人工审阅给出，不与技术通过或时间混为一个总分；这里不自动平均多位评分者的分数。

每位评审者对同一提交、同一编码类型只能有一条输入。意见冲突标为 `disputed`，不由多数票或第一条编码自动解决。若人工标为 valid 而提供的技术谓词输入失败，标为 `technical_conflict`。真实分歧处理、校准和可靠性需要外部协议与实际证据。

## 5. 如何解读时间和空值

| 状态 | 当前输出 |
| --- | --- |
| 没有外部有效性编码 | `pending`，有效处置时间为空；即使文字听起来正确或参与者结束了任务也如此 |
| 最早经审阅 valid 之前的提交都已判 invalid | `timeToFirstValidDisposition` 为该提交时间减曝光时间，单位毫秒 |
| 后续提交经审阅 valid，但更早提交未审、uncertain 或有分歧 | 仅给 `timeToFirstReviewedValidDisposition`；严格的首次有效时间仍为空 |
| 有质量评分、没有有效性判定 | 只保留质量编码，不生成有效处置时间 |
| 缺失、撤回标签、部分 session 或未观察到有效判断 | 不填造截止时间，不当作在截止时完成 |

这是首次**记录并经人工核对的显式判断**的时间，不是内部意图形成时间或理解时刻，也不是自动判断的 `timeToVerifiedGold`。采集时应以两组相同说明鼓励在形成当前判断时记录，允许后续修订；不能把第一条或最后一条提交无条件当作成功。

当前没有冻结的共同截止或经过确认的完整观察窗口，故 `deadlinePolicy`、`restrictedTime`、`validByDeadline`、`completionRate` 均不计算。不同窗口、技术中断、撤回和缺失规则确定前，不把空值替成 τ，不只分析成功者。

## 6. 对形成性阶段的设计建议

分配前的共同接管用于产品语义，不能声称一次 Agent 回复证明理解。分配后增加与研究材料独立的界面熟悉化：两组同目标和同规则，练习各自可用功能；B 的对象入口保持可选，不用对象者仍按 B 分配分析。当前预览没有完成这样的熟悉化，其可解释对象是共同 Chat 接管之后首次提供对象访问的整体效果。

四条预设序列在频数相同时平衡位置，但当前逐次随机抽签只产生期望平衡。正式分配应在 A/B 内对序列做已冻结的分块安排，并报告实际频数；不能称完整的一阶反携带平衡。四共同机会之后的开放模块受前面经历影响，只能解释为该训练与任务经历之后的探索，不能作为独立复制或未经训练的开放轨迹。

开放任务的判断应绑定提交时的真实产品 session/version、current/candidate revision 与已执行回执。允许的动作应区分“保留当前产品”“归档未采用候选”与“回滚已采用版本”，不能为了技术控制器方便给合理保留增加未公开的必做动作。六条产品内核检查与 144 条作者构造观察/评价材料仍是不同证据层，不合并成用户效果。

正式主分析仍以随机分配为准，包含 B 不使用对象的人，固定四共同机会等权。首次记录有效时间、有效率、质量和开放过程分别解释；具体截止、缺失处理、样本量与区间方法须在真实形成性之后冻结。

## 7. 本阶段检查范围

CLI 的首次集中测试为 10/10，通过真实 Node 子进程验证只读默认行为、新文件独占创建、输入/已有硬链接保护、编码绑定、UTF-8 BOM、错误退出码及无隐式目录创建。全部输入与评审代码均明确为 synthetic。

本轮同时加入逐提交的未来材料隔离、视图元数据隔离与缺失处理测试，以及浏览器存储失败后完整内存日志与恢复持久化测试。集中执行 `node --test tests/review-packet-v42.test.mjs tests/review-packet-cli-v42.test.mjs tests/telemetry-persistence-v42.test.mjs`，结果 **32/32 PASS**。这是离线整理和存储容错的工程验证，不是实际盲评、真人效率、数据完整采集或发表资格。初次 CLI 实现时，`artifacts/v4.2-checks` 只有浏览器日志和截图，没有下载包 JSON；不能把那些摘要当作真实包运行结果。后续浏览器实际导出的工程走查包可用同一 CLI 复算，但仍不是真人实验。

### 实际浏览器工程导出包复算（2026-09-12）

本阶段随后取得以下三份浏览器实际导出的 JSON，均通过上述 CLI 实际运行，并以显式 `--output` 创建新的报告文件。输入文件未改写；报告记录了对应原包的 SHA-256。三次命令均退出 `0`，`validation` 和 `preparation` 的 errors、warnings 均为空。

| 工程走查路径 | 原始导出包 | 新审阅报告 | 每包记录 |
| --- | --- | --- | --- |
| A，完整 Chat | [A-chat-only-review-packet.json](../artifacts/v4.2-checks/phase2/browser/A-chat-only-review-packet.json) | [A-chat-only-review-report.json](../artifacts/v4.2-checks/phase2/browser/A-chat-only-review-report.json) | 6 sessions、9 次提交、5 个机会、9 份逐提交视图 |
| B，使用可选对象 | [B-objects-review-packet.json](../artifacts/v4.2-checks/phase2/browser/B-objects-review-packet.json) | [B-objects-review-report.json](../artifacts/v4.2-checks/phase2/browser/B-objects-review-report.json) | 6 sessions、9 次提交、5 个机会、9 份逐提交视图 |
| B，不使用对象 | [B-chat-only-review-packet.json](../artifacts/v4.2-checks/phase2/browser/B-chat-only-review-packet.json) | [B-chat-only-review-report.json](../artifacts/v4.2-checks/phase2/browser/B-chat-only-review-report.json) | 6 sessions、9 次提交、5 个机会、9 份逐提交视图 |

另逐条对照原包核验了全部 27 份 `reviewerView`：本次判断原文完全保留，前序消息与来源均可在本次提交前的同 session 原记录中找到；视图不含条件值、单调时刻、session/submission 审计 ID 或对象操作事件。所有提交仍为 `pending`，视图材料完整性仍为 `manual_review_pending`，有效处置时间、质量和完成率均为空。没有导入任何人工有效性或质量编码。

这些工程走查在每次判断提交后没有新增同 session 日志事件，因此实际的 `laterEventsExcluded` 均为 0。这一复核证明已输出内容没有超出各自提交前记录，不能单独证明遭遇后续资料时的拦截行为；包含后续事件和同时间歧义的隔离反例来自前述明确标注 synthetic 的测试。

实际包也暴露了尚待处理的盲评材料边界：A 与 B 不使用对象的视图没有单独的 `disclosedSources` 条目，完整材料仍保留在 Agent 正文；B 的 4 次对象打开产生了单独来源正文，在初稿/终稿两份视图中合计出现 8 次。不能把这种格式差异当作完全盲法。静态任务历史未完整采集、单独来源正文缺失和“呈现不代表阅读”仍明确保留在内部缺口中；正式评分前须统一材料排版并核对完整性，不补入未来资料。

这三份包的来源类别均为 `engineering_preview_interaction_record`，`formalStudyData=false`。它们来自自动化浏览器工程走查，不是实际参与者实验；命令通过仅支持导出、离线绑定和审阅准备流程可工作，不提供真人效率、判断质量或论文效果数据。

随后对两份产品操作链的浏览器实际导出包执行了相同 CLI，分别创建新报告，未重复运行前述三个原包。两次同样退出 `0`，校验 errors、warnings 均为空。

| 产品操作工程路径 | 原始导出包 | 新审阅报告 | 每包记录 |
| --- | --- | --- | --- |
| A，提出并检查候选、采用、回滚 | [A-product-review-packet.json](../artifacts/v4.2-checks/phase2/product-browser/A-product-review-packet.json) | [A-product-review-report.json](../artifacts/v4.2-checks/phase2/product-browser/A-product-review-report.json) | 6 sessions、5 次提交、5 个机会、5 份逐提交视图 |
| B，采用响应丢失、核对恢复、回滚 | [B-product-review-packet.json](../artifacts/v4.2-checks/phase2/product-browser/B-product-review-packet.json) | [B-product-review-report.json](../artifacts/v4.2-checks/phase2/product-browser/B-product-review-report.json) | 6 sessions、5 次提交、5 个机会、5 份逐提交视图 |

两包使用 `engineering-mock` 服务通过真实浏览器与产品 API 的消息链，不能据此声称真实模型已可靠理解自然语言。对原包另行进行了只读逐事件核对：每包都有 3 次唯一的参与者操作确认；A 的 3 个执行返回、B 的 2 个执行返回及随后显示的结果文字，均在对应确认之后。两包最终判断都绑定同一产品 session 的 version `6`，`currentProductRevisionId=R0`、`candidateProductRevisionId=null`，与其最后一次回滚返回一致。

B 包明确保留采用响应丢失的工程注入记录、首次状态核对失败及 `dispositionBlocked=true`。随后同一产品 session 核对为已采用的 C1、version `4`，记录 `originalExecutionResponseMissing=true`、`actionReplayed=false`，之后才准备并确认回滚。该包没有核对恢复前的开放判断提交，也没有伪造缺失的 version `4` 执行回复。这是对已记录操作顺序、状态绑定和恢复标志的核验；按钮禁用行为与服务端执行次数仍应结合相应浏览器工程检查评估。

这两包中，较早四个共同任务的审阅视图均未混入后来开放 session 的产品操作、结果与来源；所有视图中的判断原文保持一致。每包开放模块只有一次最终判断，因此这里实际检验了跨 session 的后续材料隔离，仍不能称作开放模块内部多次判断后的未来资料挑战。

五份实际工程导出包现共形成 37 份逐提交审阅视图，所有提交仍待审；没有新增人工有效性编码或质量分数。标准 CLI 的 `productStateExecutionVerified` 仍为 `false`，上面的产品字段核对是本次额外对原包的只读审查，不表示模块已实现通用运行状态证明。五包均保持非真人工程证据边界，不构成论文样本、有效处置率或条件效果。
