# main.pdf 软件开发部分：v4.2 可直接编辑的论文修订稿

核对日期：2026-09-12。用途：将论文的**软件开发贡献与下一步可检验主张**对齐当前研究候选，不预先替正式结果作结论。本文件是建议改稿；没有修改 PDF。

核对原件：`D:/github repository/CHI/main.pdf`，35 页，SHA-256 `96574CA2E2046AECEB67912C6E5816A9947DA096EA8C6908E0FBB311F6BE76CE`。下文页码均是本次直接读取的 PDF 页码，也与印刷页码一致；不是沿用旧材料的页码。逐页文本检索覆盖全文；视觉核对了含相关图表的第 3、5、24、25、26、28、34、35 页，并放大检查嵌图数字。

现行依据是 [v4.2 研究协议](software-product-development-v1-research-protocol-v4.2.md)、本版共同机会、公开投影、E0 作者构造记录、产品 kernel 与当前研究流程。旧 `software-repair-v1`、旧 browser-IDE S1-S4 和保留 pilot 均不充当新版研究的事实源。

## 编辑原则与本次发现

1. 保留层级意图、输出之后的局部信息访问、稳定对象及版本可追溯性的理论与工程贡献；效果写成待检验假设。
2. 当前四共同机会可以比较同一任务集合中的访问与处置成本。稳定目标先于结果，具体问题由结果引出；它们仍不直接测量内部意图形成，也没有已估计的 NTE。
3. 共同模块先行，随后是独立上下文的开放产品开发。不能继续写成“同一参与者在两个界面各修一个仓库”的旧 within-subject 研究。
4. 作者构造的 12 个画像、144 个条目、72 个计划内任务是**刺激记录**；六条目 kernel 是**独立实现沙箱**。二者都不是本研究已招募的参与者或已收集的人效结果。
5. PDF §4.10（p.17）明写 `36 simulated participants, seed 42`。Study 2 的 72 人、24 人软件组及全部效果，在本次现行材料中没有建立参与者记录与分析证据链；称“未获支持”，不擅自断言它们也一定由同一模拟脚本生成。
6. 不把退回 R0、保留或明确暂缓都叫作接受产品；不把处置原文已提交或 `manual_review_pending` 当作首次有效 Gold。

以下 `Replace` 可直接进入英文稿。跨领域正文只处理它被用来支持软件结论的地方；旅行与投资的独立结果不在本次逐项重写范围。

## A. 标题、摘要与导论

### R01 - p.1 标题；p.1 ACM Reference Format；全文运行页眉

原短语：`Pointable Widgets Reduce Information-Edge Costs`。

**Replace title throughout:**

> Chat as Entry, Objects as Interaction Nodes: Studying Information-Edge Costs in Software Development

中文解释：在正式数据产生前，题名不宣称已证明降低成本；保留论文的问题与设计主张。若最终论文保留其他领域，标题领域范围须随真实研究重新确定。

### R02 - p.1 Abstract，完整替换

原短语：`Two studies (108 participants, 864 timed episodes)`；`without degrading objective task quality`。

**Replace:**

> Software development often requires users to revisit requirements, object states, and verification evidence after intermediate results become available. We describe this follow-up using a hierarchical account of intent and a versioned information graph. Pointable Context adds optional access to stable objects while retaining a full conversational interface. We instantiate this design in a reading-list application scenario with shared task information, condition-independent agent policies, and bounded product operations. Four isolated opportunities support comparisons on common software decisions, followed by an open development module in which participants can investigate, revise, retain, or defer a product state. Product-use records are author-constructed stimuli and are separate from participants' interaction records. A six-item implementation sandbox provides executable checks of identity, state relations, operation scope, undo, and revision-bound acceptance. These engineering mechanisms do not establish human efficiency. The planned evaluation will estimate assignment-level differences in valid disposition and time unresolved, with decision quality reported separately. The design tests an optional interaction layer as a package; whether it reduces follow-up cost, and under which task conditions, remains an empirical question.

中文解释：删除摘要中的 108/864、67%、168→56 秒、48%、26→6 轮、65%、1.73→1.24、44% 及软件跨域复现断言。软件方法与工程可用现时描述，参与者效应使用将来时。此替换用于数据未齐的工作稿，不是承诺最终论文只能写系统设计。

### R03 - §1，pp.1-2，开场与因果解释

原短语：`nearly every deployment`；`trivially learnable`；`Our paper isolates the third explanation`。

**Replace relevant sentences:**

> Many conversational systems organize interaction as a sequence of turns. This organization can require additional reference formulation or navigation when users return to earlier task information. Our comparison targets these costs by adding optional object access while preserving the conversational baseline. It estimates the combined interaction layer, rather than separately identifying the effects of layout, recognition cues, local disclosure, or response latency.

中文解释：没有部署总体调查或学习性数据，不保留普遍断言；A/B 信息一致不等于已分离所有视觉与延迟机制。

### R04 - §1，pp.2-4，与 Fig.1/2 相连的成本推论

原短语：`every newly salient edge`；`one to three rounds`；`the same edge is one expansion`。

**Replace:**

> A task-relevant request may require reference formulation, clarification, a response, and subsequent checking. A stable object can provide an alternative local entry point to the same information. Neither path has a universal round count: full chat may answer several relevant questions in one request, while object access can require discovery, navigation, or additional clarification. The evaluation therefore measures realized costs instead of assigning an advantage to either path in advance.

中文解释：新版 Full Chat 允许单次多事实，不能用强制一问一字段制造效果。图内固定成本徽标也要同步处理，见 D 部分。

### R05 - §1，p.4，`We evaluate this mechanism...` 至软件 28.4% 总结

**Replace both empirical-summary paragraphs:**

> We develop a software-domain evaluation that combines common task opportunities with a subsequent bounded product-development exercise. The common opportunities hold the authored task requirements and evidence constant across interface assignments. The open module permits different investigations and defensible product dispositions, including retaining the existing version. The current artifacts establish an implementable comparison and its measurement requirements; they do not provide participant effect estimates. Study 1's numerical examples are explicitly simulated, and the draft's cross-domain results are not used as evidence for this software study.

中文解释：删除这里的 108/864、36 人、8 任务、10+ 轮、67%/48%/75%/65%/43.9%，以及 72 人、31.8%/30.4%/28.4%。这些总论不能继续覆盖新版软件研究。

### R06 - Contributions，pp.4-6

原短语：`Empirical. We provide a behaviorally grounded evaluation`；`shows both where the benefit is present and where it is small`。

**Replace third contribution:**

> **Apparatus and evaluation design.** We provide a versioned software-development scenario with common task opportunities, optional object access over full chat, explicit product dispositions, and a bounded executable sandbox. The agent can propose preimplemented state transformations for participant review and confirmation; it does not generate arbitrary source-code patches. We distinguish participant records, synthetic stimuli, executed technical checks, and pending human judgments throughout the evaluation.

**Adjust interaction-theoretic contribution:**

> **Interaction-theoretic.** We model follow-up as traversal among task information and action states, and propose persistent object access as a mechanism that may reduce the cost of realizing a task-relevant request.

中文解释：概念贡献保留；“降低成本”在数据到来前是机制假设。不能把新增单元测试称为行为实验。

## B. 理论与方法合同

### R07 - §2.2，p.7；§3.1-3.2，p.8；§7，p.30

原短语：`every task ... next relevant information need emerges from a live trigger`；`the exact required transition is unavailable`；`tasks occupy the exploratory end`。

**Replace study-specific operationalization:**

> The software opportunities present a stable work goal before a new result. The result introduces the particular state or evidence that must be considered for a defensible disposition. This creates a controlled setting for studying follow-up after an output, but does not establish a latent moment of intent formation or a population distribution of possible next steps. The later open module provides opportunities to observe explicitly expressed changes in investigation or disposition. We do not infer such changes from clicks alone.

中文解释：保留 §3.1 的层级定义、§3.2 图模型和分支分布作为理论；不将 authored branching、四项任务或多张卡直接当作实测探索性。新版也不研究从查找到高探索的整个连续谱。

### R08 - §3.3，pp.8-9，成本向量的完成时态

原短语：`For a scored edge e, we record a cost vector`；`tested consistently across domains`。

**Replace:**

> We propose an edge-cost vector containing observable time, interface actions, conversational exchanges, navigation, and repair events. The software implementation records some underlying events, but a scored semantic edge requires its own frozen source state, destination predicate, event mapping, and observation rule. A retrieved node, displayed anchor, click, and valid semantic transition are distinct units.

中文解释：保留成本向量，无完整 edge 观测规则时不写“已经记录所有边”。

### R09 - §3.4，p.9，Equation (1) 与 OCFT

原短语：`first state satisfying the current gold transition`；随后又写 `participant accepts`。

**Replace definition and Equation (1) for the software study:**

> For opportunity j, time to valid disposition begins when its trigger is verifiably presented and ends at the first explicitly submitted disposition later established as valid under the frozen task rule. A technical state becoming valid, a participant submitting a statement, and independent confirmation of that statement's validity are recorded separately. If validity remains pending, no completed outcome is assigned. Acceptance, retention, and justified deferral are distinct disposition types.
>
> For a prespecified common limit τ_j, we will report the probability of a valid disposition by τ_j and the restricted mean time unresolved, E[min(T_ij, τ_j)]. An episode with no observed valid disposition does not receive a fabricated completion time. Missing observation, withdrawal, technical interruption, and a fully observed unsuccessful opportunity require distinct prespecified handling.

**Replace additive decomposition claim:**

> Target access, relevant information becoming available, operation commitment, technical verification, and explicit disposition are separately timestamped events. They need not form non-overlapping cognitive stages, because participants may revisit information and revise decisions. We will only report additive intervals where a frozen event definition supports that decomposition.

中文解释：主比较含未成功者和 B 不使用对象者；不只比较成功接受产品的耗时。`OCFT_acceptance` 可以保留为明确子类型，不能成为删掉合法 retain/defer 的借口。

### R10 - §3.4，pp.9-10，信息状态与路径推论

原短语：`participant's information state ... units revealed`；`rate of information gain itself`；`design equates breadth`；`condition-blind quality family`。

**Replace:**

> The revealed-unit set records information made available through an observed display event; it does not establish reading, comprehension, or use. Equal access to an information universe does not guarantee equal acquired breadth. Additional relevant exploration can be useful, and duplicate access is not automatically an error. Disclosure rate, action counts, revisits, and coded repair should therefore be reported separately unless a validated mapping supports their combination. The verifier is condition-independent; participants' verification behavior may still differ between conditions.

中文解释：不将信息可用率写作理解率；不将同一图自动等同同样阅读广度；不以“不显著”证明等价。删除软件稿中未落地的完整 friction partition 与 shortest-path 已实现断言；Table8 的具体修订见 E。

### R11 - §3.5-3.6，p.10，对象与编码

原短语：`two researchers independently apply the codebook`；`resolved with a third researcher`。

**Replace performed-coding language:**

> The current inventory is authored from the task requirements. Stable identity, a meaningful semantic boundary, independent referability, local follow-up, and traceable state are the proposed eligibility criteria. Independent application of this codebook and adjudication will be completed before the inventory is frozen for formal collection; the current implementation is not evidence that those human coding steps have occurred.

中文解释：五项对象标准可保留；Function/Test/Patch Hunk 可作为理论例子，但不得让读者误以为当前实际实验界面仍是 Figure14 的代码修复器。新版实例应改为条目、状态记录、版本、变更、回执及其关联。

### R12 - §3.7，pp.10-11，A/B 与对象操作

原短语：`selected object ... mapped to the same frozen task-state transition`。

**Replace software instantiation:**

> Both assignments retain the same full chat capability, task information, agent policy, and semantic operations. B adds optional access to objects already available in the shared information space. Object selection is interface state; it is not automatically inserted into the agent's request or treated as participant intent. Where an object action prepares a question, the participant may edit and send it through the same chat path. Product operations use the shared bounded kernel and require their own explicit scope and state checks.

中文解释：区分本地展开、生成可编辑问题和真实执行产品操作；不能沿用“每次选中就是一次提交”。相同策略/相同语义事实不等于不同自由对话逐字相同。

### R13 - §3.8，p.11，RQ1-RQ3 的软件版替换

**Replace software evaluation questions:**

> **RQ-S1: Follow-up outcome and cost.** On four common software-development opportunities, how does adding optional object access to full chat affect the probability and time of reaching a valid disposition?
>
> **RQ-S2: Interaction process.** How do the assignments differ in observed requests, disclosed evidence, navigation, repair, and revision? Does the pattern vary across the fixed local and compound opportunities? These task-level comparisons will not be interpreted as a general law of complexity.
>
> **RQ-S3: Decision and product quality.** How do evidence support, scope, trade-off calibration, consistency, and traceability differ across assignments, alongside bounded technical correctness? Quality preservation will require an independently justified criterion and adequate precision, rather than a nonsignificant difference.

中文解释：删除软件研究的跨领域假设；取消“验证行为必然不变”“首动作应不变”的预设机制结论。NTE、E2、IAR、path excess 只有独立定义与测量完成才进入正式分析。

## C. 用当前软件研究替换 §5

### R14 - §5 标题及引言，pp.21-22；§5.1，p.22

原短语：`We recruited 72 participants, 24 in each domain`；`576 additional timed episodes`；`Interface was within participants`；`at least one year of programming experience`。

**Replace heading:**

> 5 Software Development: Materials and Planned Evaluation

**Replace design and participant paragraphs:**

> We plan a participant-level randomized comparison of full chat and the same chat with optional object access. Participants will receive a common introduction and baseline-understanding review before interface assignment. Four isolated software opportunities will precede a separate open development module. Opportunity order will follow prespecified position-balanced sequences; this arrangement does not eliminate all learning or carryover effects. Final eligibility criteria, recruitment targets, stopping rules, and allocation procedures will be fixed after formative work and before formal collection. No recruited sample or participant episode count is reported in the current manuscript.

中文解释：不继承 72、24、576 或旧一年编程经验标准。当前浏览器预览分配与待人工接管核对不等于正式随机试验已执行。旅行/投资可以移到 prospective extensions，但其结果不能继续为软件组提供“复现”证据。

### R15 - §5.4，pp.22-23，完整替换旧软件任务

原短语：`repaired two matched small repositories in a browser IDE`；`After an initial seeded bug was repaired`；四个 failing-test/dependency/regression/trace 触发。

**Replace:**

> The software materials concern a versioned reading-list product. Participants reason about stable item identity, processing state, organization, operation scope, and the applicability of verification evidence. The common module contains two state-related and two portability-related opportunities in isolated project copies. A stable work goal is available before each result; specific records can then be inspected separately or requested together through full chat. Valid outcomes depend on the evidence and scope of the disposition, not on a required click sequence or a preferred product feature.
>
> The subsequent open module preserves the project's development history and supports investigation within a bounded candidate space. Participants can propose a change, inspect its effects, narrow or reject a candidate, retain the current product, or justify a deferral. The implemented six-item sandbox includes shared views, isolated proposals, batch previews, inverse operations, verification receipts, adoption, and restoration. Its checks exercise the implementation kernel; they do not certify an arbitrary repository, browser accessibility, or human decision quality.
>
> Product-use observations are separately authored synthetic records. They provide task evidence for product decisions and are not observations of the research participants. Candidate-specific or long-term records are not substituted from a different version when the requested evidence is unavailable.

中文解释：如新 kernel 的 C1 人为缺陷是范围解析而非旧剧本的心理误判，应直接报告人工设置的实现缺陷，不改写成真实使用者造成的错误，也不冒称修复了两套实际仓库。

### R16 - §5.5，pp.23-25，过程与测量

原短语：`two counterbalanced interface blocks`；`Model responses ... identical`；`The same edge-cost mechanism family ... was recorded`；`A short comparative interview concluded each session`。

**Replace:**

> Both assignments will use the same model configuration, task materials, retrieval semantics, and error policy. Semantically equivalent requests have access to equivalent facts, including multi-part and full-scope requests. We do not require different freely chosen requests to produce identical response text. System waiting is recorded rather than artificially added to the chat condition.
>
> The common opportunities use isolated states. The open module follows them with distinct items and context; its observations are interpreted under that fixed training order. The review interface retains original chat, explicit disposition statements, and the timing and state context of their submission. A statement may remain pending independent validity review and can be revised before the participant ends an opportunity. Submission or ending a preview stage does not by itself establish valid completion.
>
> Technical events, independent disposition coding, and blinded decision-quality judgments are separate evidence sources. Questionnaire instruments and any interview procedure will be specified and administered during the future study; the current implementation does not establish that participants have completed them.

中文解释：保留完整对话和实际失败；不得将节点进检索包、Agent 提及和对象详情显示都算同一次“理解”。独立样本开放形成性与受共同任务训练的正式开放模块需分别报告。

### R17 - §5.6，pp.25-26，完整替换分析

原短语：`pooled model predicted log OCFT`；`Interface × Domain`；`Domain-specific contrasts were Holm-corrected`。

**Replace:**

> The primary estimand is the effect of interface assignment over the fixed set of four common opportunities, with participants as the independent randomized units. B participants remain in the assigned group whether or not they use objects. We will report valid disposition and restricted time unresolved, with uncertainty, and report decision-quality dimensions separately. Deadline values, sample-size justification, missing-data handling, inferential methods, multiplicity decisions, and any noninferiority criterion remain to be frozen before formal collection. Open trajectories and optional-object uptake will not be used to select a favorable primary sample. No cross-domain pooled model or completed statistical analysis is reported here.

### R18 - §5.7.1-5.7.2，p.26；§5.7.5，pp.27-28；§5.7.6，p.28

**Replace software and software-supporting pooled results with:**

> **Current evidence status.** The available v4.2 artifacts provide authored stimuli, interface and state-management mechanisms, technical decision predicates, and engineering checks. They do not provide a qualified participant cohort, independently coded dispositions, blinded quality ratings, or an executed confirmatory analysis. Accordingly, this manuscript reports no software-domain effect size, significance test, preference proportion, or claim of quality preservation. Engineering outcomes and remaining qualification requirements are reported in the evidence-status table.

中文解释：完整数值删除清单如下；不能只移除 p 值而保留均值、比例或“更快”标题。

### C1. 软件 Table7 全部十二行：p.28；同步 §5.7.5，pp.27-28

| 原指标 | Chat | Object | 原 p_adj | 修订 |
| --- | ---: | ---: | ---: | --- |
| OCFT (s) | 93.5 | 66.9 | <.001 | 删除估计与显著性；不转成新版预期效果。 |
| Hidden-test success | 83.0% | 88.0% | .10 | 删除；kernel checks 不是参与者隐藏测试成功率。 |
| Protected-test pass rate | 92.0% | 97.0% | .04 | 删除；另报有范围的工程检查。 |
| Protected regressions | 1.04 | .39 | .004 | 删除；同步 Figure15 的软件柱与 -62%。 |
| Edit-run cycles | 3.09 | 2.54 | .002 | 删除；保留候选/验证事件为未来过程数据。 |
| Time to first all-green (s) | 179.5 | 130.2 | <.001 | 删除；与接受时间分别定义。 |
| Edit locality | .76 | .90 | .006 | 删除；新开放产品不存在唯一 gold patch。 |
| Off-scope changed LOC | 18.6 | 7.4 | .003 | 删除；不能由六条目状态变化替代 LOC。 |
| Patch-size / gold-size ratio | 1.43 | 1.17 | .02 | 删除；无对应 gold-code reference。 |
| Files touched | 2.80 | 2.10 | .03 | 删除；新任务不是仓库文件修复计数。 |
| State-delta precision | .84 | .95 | .004 | 删除结果；有明确范围时可定义未来状态指标。 |
| Transition F1 | .91 | .94 | .11 | 删除；没有独立人工/技术 transition ground truth 的现行结果。 |

正文另删除：软件 OCFT **28.4%**（p.26）及 `Participants often selected a failing Test, Requirement, or Patch Hunk`（p.28）。后者是参与者使用模式主张，不能改成新版已观察行为。

还有一个内部定义问题：Table7 的 first-all-green 两组时间都大于 OCFT。如果同一 Trigger、同一时钟、同一分母、且接受要求先全绿，这个顺序不成立。未来真实数据需要明确起点/统计口径；不能保留旧数字再猜测解释。

### C2. 用于支持软件“跨域复现”的 Table4 全部十五行：p.27；同步 §5.7.2

| 原指标 | Chat | Object | 原 p_adj |
| --- | ---: | ---: | ---: |
| OCFT (s) | 75.0 | 52.5 | <.001 |
| Mean edge traversal (s) | 13.4 | 7.1 | <.001 |
| Turns / scored edge | .74 | .22 | <.001 |
| Traversal actions / edge | 4.36 | 2.48 | .002 |
| Context-reconstruction events | 3.28 | 1.31 | .002 |
| Trigger → first action (s) | 8.1 | 7.8 | .29 |
| First-target accuracy | 83.1% | 97.0% | <.001 |
| Navigation events | 3.92 | 1.87 | .003 |
| NL submissions | 1.34 | .75 | <.001 |
| Typed characters | 109.6 | 53.7 | <.001 |
| Reference-repair turns | .20 | .06 | .002 |
| Interaction-path excess | 2.90 | 1.50 | <.001 |
| Backtrack / undo | .29 | .10 | .004 |
| State-delta precision | .89 | .96 | .006 |
| Protected-state violations | .10 | .04 | .03 |

以上整表不能作为软件证据保留；删除数值后改为测量规格或本文件的证据状态表。若其他领域以后有独立真实证据，也必须重算其实际样本，不能留下包含未获支持软件样本的 pooled 表。

同步删除 §5.7.1（p.26）的 `β = -.467, SE = .045, p < .001`、domain interaction `all p > .60`、complexity `p < .001`，以及“方向稳定”“complexity again moderated”“replicated across domains”。无显著交互不等于证明跨域一致。

同步删除 §5.7.6（p.28）的 SEQ **5.00→6.01**、TLX **45.5→35.0**、UMUX-LITE **5.36→5.98**、各 **p<.001**，以及偏好 **59/72、9、4**。若保留问卷，把它们列为待实施而非已获得响应。

## D. 软件相关图表的逐项处置

| 图表与页 | 本次直接核对的超证据内容 | 具体编辑 |
| --- | --- | --- |
| Fig.1，p.3 | caption 的每边 1-3 轮 vs 单次展开；图内 **16.8 rounds / 160.2s** vs **2.4 rounds / 42.2s**；`one tap · 0.2s`，若干 response-latency 徽标。 | 保留概念示意，但移除全部量化效果/延迟徽标和必然步数标签；保留相同数据及可选访问路径。场景里的 `17-unit task` 只能标为该图的 authored example，非软件测量单位。 |
| Fig.2，p.5 | 图内 `edge cost = 4-5 turns` vs `one selection`，**2.6s**；caption `reducing the interaction cost`；下方把本论文直接等同高分支探索。 | 保留层级目标与候选关系示意；删除固定成本数字；把确定性效果改为 hypothesis；分支宽度不是实测 NTE。 |
| Fig.14，p.25 | shipping_patch#2 / checkout.py、Test/Error/Function/Patch，Revert hunk / Diff vs main；图内 `one tap · 0.2s`、`1 round + 2 taps`、`hidden tests tracked`。 | 不能当当前 software apparatus 截图。替换为本版实际场景的目标→结果→按需记录→版本核对→明确处置截图/示意；先不画效果数字。若暂留，明确旧概念插图而非使用记录。 |
| Fig.15，p.26，全图 | A：三域 OCFT 及软件 **-28.4%**；B：归一化成本约 **.53/.30/.57/.40/.49/.30** 倍并写 all Holm-adjusted p<.01；C：软件回归 **1.04→.39 / -62%**，总标题 `Quality preserved`。 | 从软件实证叙述移除全图；不保留一部分 pooled 柱。可用 evidence-status 或计划流程图替代，不能把工程通过率画成参与者效应。 |
| Table3，p.24，S1-S4 | S1-S4旧触发，state burden **4/2/4、3/2/5、3/2/6、4/2/5**；Min Chat/Object **8/4、10/5、11/6、10/5**；caption `fixed before data collection`。 | 全部软件行替换为下方新四机会表；不保留旧路径/分母，也不改填另一个旧版本的 5/5 等计数。 |
| Table4，p.27 | pooled 软件支持数据，见 C2 十五行。 | 整体撤出软件效果论证；不得只删显著性。 |
| Table7，p.28 | 全十二行，见 C1。 | 用本文件 F 的软件证据状态表替代。 |
| Table8，p.34 | 二十项被称为已经从 logs 导出的共同指标。 | 按 E 改成候选 measurement dictionary，明确实现/编码/未定义状态。 |
| Table9，p.35；Appendix B，p.31 | 所列问卷被写为已经 administered；单个 contingency check 用于 confirm。 | 留题目与量表来源，改成 proposed instruments；自编机制/contingency 题不能当已验证量表或操纵成功证据。 |
| Table11，p.35，软件三行；Appendix D，p.32 | Hidden-test success、Repair efficiency、Edit locality，被称为已经使用的客观 outcome/rubric。 | 三行改为 technical validity、valid disposition and cost、blinded decision quality；替代文本如下。 |

Fig.3-11 与 Table1/2/10 属于投稿维护场景，不是新软件证据。其模拟结果不得通过摘要/导论/讨论被重新包装为软件机制验证；本次不把这些图逐项重做成软件实验。Fig.12/13 与 Table5/6 属于其他领域，不能作为新软件组的复现或等价质量证据。

**Replacement Fig.1 caption:**

> Illustrative access paths over the same task information. Full chat can retrieve individual or multiple facts through a conversational request. Optional object access offers a local alternative. The diagram does not estimate time or impose a fixed number of actions on either path.

**Replacement Fig.2 caption:**

> Conceptual account of follow-up after an intermediate output. A stable high-level goal can coexist with several possible lower-level investigations. Persistent objects provide candidate entry points to related information and action states. Branch probabilities and efficiency effects are not estimated by this figure.

**Replacement Fig.14 caption, for a newly captured current figure:**

> Software-development apparatus: a shared goal and intermediate result, optional access to versioned task records, and an explicit disposition. The illustrated records are authored stimuli. Interface events, bounded product checks, and independent validity review are distinct evidence sources; this figure is not a participant performance result.

在新截图存在且实际 UI 与说明匹配前，不能直接把新 caption 贴到旧 shipping_patch 图上。

**Replacement Table3 software block:**

| Opportunity | Result-specific information | Decision requirement | Evidence status |
| --- | --- | --- | --- |
| Local state | A report about a changed item's visibility | Relate the current item state to the applicable view semantics | Authored isolated materials and technical predicates |
| Compound state | A candidate preview and associated scope/check records | Bound the operation and determine which evidence applies to the candidate | Authored isolated materials and technical predicates |
| Local portability | A new export and its receipt | Identify the supported version and claim scope | Authored isolated materials and technical predicates |
| Compound portability | Candidate export, migration, recovery and route records | Separate supported checks from an unsupported adoption scope | Authored isolated materials and technical predicates |

**Replacement caption:**

> Four common software opportunities. The task goal precedes the result, and relevant records are available individually or together in both conditions. No condition-specific minimum action count, empirical difficulty, or participant outcome is claimed.

**Replacement Table11 software block:**

| Outcome | Proposed rule | Interpretation |
| --- | --- | --- |
| Technical validity | For the bounded kernel, check identity/payload, state orthogonality, view identity, roundtrip, scope, preview/execution agreement, inverse behavior and revision applicability | Validity within the stated implementation scope; not arbitrary repository correctness or browser accessibility |
| Valid disposition and follow-up cost | Independently establish whether an explicit disposition matches the opportunity's evidence and scope; record time and incomplete observation separately | Task-valid acceptance, retention and justified deferral remain distinct; no completion is inferred from submission alone |
| Decision quality | Independently rate evidence support, scope, trade-off calibration, consistency and traceability, with conditions and timing masked | Candidate human rubric requiring calibration; does not reward adopting a specific feature or producing more text |

## E. Table8 与 Appendix A 的逐项替换

Table8 caption（p.34）替换为：

> Proposed software measurement dictionary. Event availability does not establish that a measure has been validated or computed on participant data. Measures requiring semantic coding, sufficient-information sets, reference paths, or independent quality judgments remain unavailable until those dependencies are frozen and observed.

| 原行 | 可直接替换的英文定义/状态 |
| --- | --- |
| OCFT | Time from verified trigger presentation to an explicitly submitted disposition established as valid under the task rule. Technical readiness, submission, review and acceptance are separate events. |
| IAR | Distinct versioned units actually disclosed per declared observation interval. This is information availability, not understanding; unit boundaries, deduplication and clock exclusions must be fixed before reporting. |
| Cost per transition | A proposed ratio requiring independently defined semantic transitions. Node count or click count is not substituted for semantic transition count. |
| Path excess | A proposed trajectory measure requiring valid alternative reference paths and a justified distinction between useful exploration and repair. It is not currently derived from the authored graph alone. |
| Friction decomposition | Observed request, disclosure, navigation, repair and action events are reported separately until a validated non-overlapping coding scheme is available. Verifier independence does not imply equal verification behavior. |
| Directed Retrieval Time | A prospective boundary measure for a separately specified known-target task; directed tasks are outside the initial four-opportunity primary analysis. |
| Target-access time | Time to an observed access of a task-relevant target, requiring an independent target definition; it does not measure when a target became mentally salient. |
| Local-information-access time | Time to the availability of an opportunity-specific sufficient evidence set, if that set and its display events have been validated. Otherwise unavailable. |
| Action-enactment time | Interval to an explicit operation commitment with recorded scope and revision; repeated proposals and revisions remain visible. |
| Verification time | Interval to relevant technical verification, reported separately from the participant's disposition and any later independent validity review. |
| Mean scored-edge traversal time | Unavailable until source/destination predicates and event mapping define scored semantic edges. A UI graph relation alone is not a measured traversal. |
| Conversational turns per scored edge | Request/response exchanges are observable; normalization by scored edges requires a separately validated denominator. |
| Traversal actions per edge | Observable actions with an independently defined semantic-edge denominator; bundled chat requests are valid and not decomposed into artificial mandatory actions. |
| Context-reconstruction events | Coded navigation and explicit referential reconstruction, with instrumented coverage stated. Missing scroll/search instrumentation is not a zero observation. |
| Trigger-to-first-targeted-action latency | Time to the first observable task-directed action under a frozen coding rule; not an estimate of internal intent-formation time. |
| First-target accuracy | Whether the first coded target supports at least one valid disposition, with independent coding of legitimate alternatives. |
| Linguistic burden | Observed natural-language submissions and user-authored characters, with generated questions and copied material identified separately. |
| Repair cost | Explicit corrections, invalid-state recovery and reversals under a frozen coding rule. Useful backtracking or deliberate comparison is not automatically an error. |
| Interaction-path excess | Proposed observed-action comparison against valid interface paths. No shortest-path values are assumed from the obsolete repair benchmark. |
| State-delta precision | Proportion of actual changed fields within the explicitly accepted scope, when scope and denominator exist. No-change dispositions require separate treatment rather than an undefined ratio. |

共同补充：主要报告 wall time；system wait 和可验证 pause 另列。只有冻结规则允许时，扣除区间并集形成 secondary active time；不简单累加可能重叠的等待。未建立时间端点时保持 unavailable。

## F. 软件证据状态表：可代替旧 Table7

建议 caption：

> Evidence available for the software study. Authored stimuli, implemented mechanisms, executed checks, preview interaction records and participant research are reported separately. None of the engineering rows is a human-efficiency estimate.

| Claim / artifact | 当前可核对材料 | 可支持的表述 | 仍不能支持 |
| --- | --- | --- | --- |
| 层级意图与输出后信息访问 | PDF §3.1-3.5；v4.2 协议 | Conceptual account and testable mechanism | 内部意图产生时间、已证明的通用机制 |
| 四个共同机会 | `scenarios/materials/common-opportunities-v4.2.mjs` | Authored goals, neutral triggers, versioned records and explicit technical predicates | 正式任务资格、真实完成率、自然语言判定可靠性 |
| 公共对象投影 | `scenarios/common-opportunities-v4.2.ts`；投影测试 | Public text and source/revision metadata can be projected without organizer Gold; all scoped facts can be requested together | 所有模型措辞或浏览器展示均已独立 qualification |
| Full Chat 对等 | `lib/experiment/runtime.ts`、`agent-gateway.ts`；parity 测试 | Shared request/packet semantics and optional object state separation | 完整模型系统永不出错；对象层的每个组成因素已被单独识别 |
| E0 D4 corpus | `reading-list-e0-v4.2.mjs` 与公开 projection | New author-constructed ledger and recomputable design totals: 12 profiles, 144 items, 72 planned tasks, 48 delayed tasks, 21 dual-entry cases, 63 ever-memberships and 57 at D4 | 12 名研究参与者、144 次真实产品试用、行为动机推断 |
| 六条目实现 | `lib/experiment/product-workbench.mjs` | Executable implementation sandbox with stable objects, views, isolated candidates and explicit operations | 144-item observational execution、完整实际仓库、人效结果 |
| Kernel checks | `runChecks` 和 candidate/adoption/rollback/disposition receipts | Scope-bound executed checks when actually invoked: identity/payload, orthogonality, shared view identity, roundtrip, selected scope, preview agreement and exact inverse | 浏览器键盘、读屏、手机可用性或生产正确性认证 |
| C1/C2 区别 | Kernel configuration and scope-resolution behavior | Authored candidate difference, including a bounded scope defect and its correction | 真实参与者错误率降低、旧使用包能覆盖新版效果 |
| 候选模拟评价 W1/W2 | `linked-candidate-evaluation-v4.2.mjs` 与按确切内容发布的 packet | Independently constructed matched windows; complete scoped records with explicit pagination and download; logical/actual revision binding | 将 20/48→7/48、3/40→0/40 或 56 个额外检查动作当成真实 A/B 效果；声称 scoped 必须先经历 linked |
| Chat 产品操作 | `product-action-session.mjs`、`product-service.ts`、软件 API 与确认卡 | Preimplemented transformations executed only after explicit confirmation; same-session reconciliation after an uncertain response | 自由代码生成、真实模型理解已获验证、确认点击自动证明理由正确 |
| 连续研究预览 | `ResearchSession.tsx`、`ExperimentShell.tsx` | Original submissions and interaction context retained; validity can remain manual-review-pending | 原文提交=Gold、页面结束=成功、浏览器预览分配=正式研究完成 |
| 决定质量 | v4.2 五维 0/1/2 rubric | Candidate rubric for independent blinded rating | 已验证量表、既有盲评分数或质量保持 |
| 软件统计结果 | 尚无本版 qualified cohort + independent coding + frozen/executed analysis chain | Planned assignment-level comparison | 93.5→66.9 秒、28.4%、隐藏测试/回归/编辑改善、显著性或偏好结论 |
| 新版检查记录 | [当前实施与阶段日志](software-development-v4.2-implementation-status.md) | 202 tests passed; build/lint passed; A/B UI and kernel workflows exercised with an engineering mock; actual preview exports prepared for review | 全仓 TypeScript 通过、真实模型稳定性、人工质量评定、人效、正式采集或发表资格 |

本表通过数来自当前整合检查。软件运行与检查的具体边界、最初失败及复验均保留在实施记录中；文档存在、模拟使用记录和模型 mock 都不能替代人的实验结果。

## G. 讨论、限制与结论的逐段替换

### R19 - §6.1，pp.28-29

原短语：`The studies support`；`condition-blind verification results are ... informative`；`Their advantage concentrates in acquisition`。

**Replace:**

> The conceptual distinction between a stable work goal and lower-level follow-up motivates the software design. A new result can make an object state, scope issue, or evidence boundary relevant without changing the overall product goal. The current artifacts operationalize observable requests and dispositions, but do not establish a human acquisition advantage or directly locate the formation of an internal intention.

### R20 - §6.2，p.29

原短语：`The mechanism results locate where object anchoring helps`；`Our results extend that logic`。

**Replace:**

> Persistent objects provide an engineering mechanism for returning to versioned information and preparing bounded requests. Whether this reduces interaction after a direction becomes relevant depends on discoverability, the completeness of chat access, the evidence structure and response costs. Separate event records make these possibilities inspectable; they do not yet localize a participant performance effect.

### R21 - §6.3，p.29

原短语：`all favored object anchoring`；`faster software repair did not trade hidden-test success for speed`。

**Replace:**

> A software efficiency claim should be evaluated together with valid disposition and decision quality. The bounded kernel can reject specified technical failures, while independent review must determine whether the participant's evidence use and scope are justified. A passing technical receipt is not evidence that the chosen product direction is preferable, and a nonsignificant quality contrast would not by itself establish preservation.

### R22 - §6.4，p.30

原短语：`Participants repeatedly combined the two modalities`；`selected a failing test before an open-ended debugging request`。

**Replace:**

> The apparatus supports a hybrid workflow in which local object access coexists with full chat. Users can inspect a record or prepare a reference without surrendering the ability to ask a broader question. The frequency, sequence and usefulness of these practices remain questions for participant observation; example authoring trajectories are not evidence of actual adoption.

### R23 - §6.5，p.30

原短语：`advantage ... was absent in the shared verification stage`；`benefit scales with the number of distinct objects`。

**Replace:**

> Object granularity, evidence depth and the need to coordinate several records are candidate boundary conditions. The present local and compound materials cover a limited task set. They permit a bounded comparison but do not establish a monotonic relationship between complexity and benefit. Directed lookup, long-term use and alternative disclosure policies remain separate evaluation questions.

### R24 - §7，pp.30-31，软件与总体证据限制

**Replace software-relevant limitations:**

> The current study is a software-development research candidate. Its use records are authored stimuli, its product implementation is bounded, and its engineering checks do not replace participant evidence. The draft's simulated Study 1 values and unsubstantiated cross-domain results are not evidence for this software evaluation.
>
> Common opportunities provide controlled information requirements; the following open module permits more varied investigation, but occurs after structured practice and within a limited supported candidate space. Neither module establishes a population distribution of next-step uncertainty or a latent time of intent formation. Generalization to arbitrary repositories, automatic object discovery, unrestricted model behavior and longitudinal product work remains unresolved.
>
> Before formal collection, eligibility, consent and governance requirements, task timing rules, independent disposition review, blinded quality procedures, missing-data handling and the analysis plan must be finalized. Preview interactions, automatic assignment in the browser and authored successful dialogues do not establish that recruitment, consent, qualified collection or analysis has occurred.

中文解释：保持真实能力边界，不自行断言已经获得或不需要伦理批准；不把已有 code 注释/模板当实际研究活动。

### R25 - §8，p.31，完整替换结论

**Replace:**

> We propose a hierarchical account of follow-up in which intermediate outputs can make new information, objects, operations or constraints relevant under a stable high-level goal. Pointable Context provides optional local access over full chat, and the software-development materials connect that access to versioned evidence, bounded operations and explicit dispositions. Four common opportunities and a subsequent open module make the proposed comparison concrete. The current engineering evidence supports the apparatus and its stated scope; whether optional object access improves human follow-up cost and preserves decision quality remains to be established through qualified participant research.

中文解释：删除“Across two studies”以及本页全部软件复现、67%/65%/43.9%/1.73→1.24/质量保留总结。理论可以保留，结果必须由新研究实际产生。

## H. 原稿实施顺序与停用清单

建议一次完成正文层修改，再统一更新图表与引用：

1. 先应用 R01-R18 和 R19-R25，使标题、摘要、问题、方法、结果状态与结论一致。
2. 更新 Fig.1/2，替换 Fig.14，撤下 Fig.15；更新 Table3/4/7/8/9/11 的软件相关内容。不要仅改 caption 而保留图内效果数字。
3. 对最终论文做一次全文检查，确认旧软件字符串 `two matched small repositories`、`24 participants`、`93.5`、`66.9`、`28.4%`、`179.5`、`130.2`、`hidden-test success`、`replicated across domains` 均没有残留为新版结果。
4. 将正式 Results 预留为真实数据的写作位置，不以 synthetic ledger 数字或工程通过率填补。更新后的方法必须区分“实现存在”“检查执行”“真实形成性”“正式参与者研究”四个层次。

上述顺序是 edit-ready 提案；本文件写入完成不代表这些论文改动已经应用。
