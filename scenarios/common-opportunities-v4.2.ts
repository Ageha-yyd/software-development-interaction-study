import type {
  ExperimentScenario,
  InformationNode,
  InformationRelation,
  ObjectAnchor,
  ScenarioTurn,
} from "../lib/experiment/types";

/**
 * Public-only projection of the authored common opportunity materials.
 * Deliberately no runtime import from the organizer module: browser bundles must
 * not contain technical decision predicates. The projection test compares the
 * retained public fields against the authoring source to catch drift.
 */
interface PublicFact {
  id: string;
  text: string;
  source: string;
  exactRevision: string;
}

interface PublicOpportunity {
  id: string;
  subjectRevision: string;
  task: string;
  trigger: string;
  facts: readonly PublicFact[];
}

const PUBLIC_MATERIALS: readonly PublicOpportunity[] = [
  {
    "id": "OP:COMMON-LOCAL-STATE",
    "subjectRevision": "ANCHOR-STATE-R7",
    "task": "保持这个阅读清单的可靠保存与找回，根据接下来的产品结果判断是否需要调整当前产品。请核对涉及的对象、当前状态、适用规则和证据版本，给出与可用证据一致的处置，说明采用或保留的范围及仍未解决的问题。若暂缓，指出实际缺口如何影响下一动作，以及需要补充什么信息或检查。",
    "trigger": "Release checklist 的新报告已到达：“刚归到 Delivery 后，在 Unsorted 中找不到它。”条目状态、最近操作和现有视图定义均可查询；当前没有修改产品。",
    "facts": [
      {
        "id": "AS:ITEM-201",
        "text": "条目 Release checklist 在该记录时仍待处理，属于 Delivery Collection。",
        "source": "authored://common-opportunities-v4.2/AS:ITEM-201",
        "exactRevision": "ANCHOR-STATE-R7"
      },
      {
        "id": "AS:VIEW-RULE",
        "text": "Inbox 表示待处理；Unsorted 表示没有 Collection 归属。修改归属不会自动更改待处理状态。",
        "source": "authored://common-opportunities-v4.2/AS:VIEW-RULE",
        "exactRevision": "ANCHOR-STATE-R7"
      },
      {
        "id": "AS:EVENT",
        "text": "最近事件只为同一条目添加 Delivery membership，没有清除 Inbox，没有产生副本。",
        "source": "authored://common-opportunities-v4.2/AS:EVENT",
        "exactRevision": "ANCHOR-STATE-R7"
      }
    ]
  },
  {
    "id": "OP:COMMON-COMPOUND-WL",
    "subjectRevision": "ANCHOR-WL-C2",
    "task": "保持这个阅读清单的可靠保存与找回，根据接下来的产品结果判断是否需要调整当前产品。请核对涉及的对象、当前状态、适用规则和证据版本，给出与可用证据一致的处置，说明采用或保留的范围及仍未解决的问题。若暂缓，指出实际缺口如何影响下一动作，以及需要补充什么信息或检查。",
    "trigger": "联动候选的新预览已经返回，范围示例和检查索引可查看。团队准备判断是否采用；当前产品仍未切换。",
    "facts": [
      {
        "id": "AW:CHANGE",
        "text": "候选新增逐项范围预览和取消单条控件。跨筛选显式选择仍保留，提交只改变 membership，Inbox 状态保持独立。",
        "source": "authored://common-opportunities-v4.2/AW:CHANGE",
        "exactRevision": "ANCHOR-WL-C2"
      },
      {
        "id": "AW:SELECTION",
        "text": "范围记录中的两个选中对象为 anchor-watch-item-311 与 anchor-watch-item-312。取消后只应提交 311；撤销须恢复该次 membership 差异，不能清除 Inbox。",
        "source": "authored://common-opportunities-v4.2/AW:SELECTION",
        "exactRevision": "ANCHOR-WL-C2"
      },
      {
        "id": "AW:OLD-RECEIPT",
        "text": "旧检查覆盖 C1 的数量/来源预览、确认及整组撤销；当时没有逐项取消控件。它不能覆盖 C2 的取消后焦点与剩余选择。",
        "source": "authored://common-opportunities-v4.2/AW:OLD-RECEIPT",
        "exactRevision": "ANCHOR-WL-C1"
      },
      {
        "id": "AW:CURRENT-RECEIPTS",
        "text": "本候选的身份和导出内容检查记录为通过；取消后的焦点、剩余选择与提交/撤销联合路径没有对应结果。",
        "source": "authored://common-opportunities-v4.2/AW:CURRENT-RECEIPTS",
        "exactRevision": "ANCHOR-WL-C2"
      },
      {
        "id": "AW:ACTIVE-STATE",
        "text": "当前已采用产品仍是 ANCHOR-WL-R0；C2 隔离候选尚未采用，没有后台迁移。可以保留 R0，或明确缺口后暂缓候选。",
        "source": "authored://common-opportunities-v4.2/AW:ACTIVE-STATE",
        "exactRevision": "ANCHOR-WL-R0"
      }
    ]
  },
  {
    "id": "OP:COMMON-LOCAL-PORTABILITY",
    "subjectRevision": "ANCHOR-PORT-R3",
    "task": "在产品演进中保护资料身份、内容、组织关系与访问连续性，根据接下来的结果判断本轮可以认可或采用的范围。请把相关记录与其版本对应，区分已获支持和仍未核实的变化，明确采用、保留或暂缓的处置及安全保留状态。若暂缓，指出实际缺口如何影响下一动作，以及需要补充什么信息或检查。",
    "trigger": "新的导出文件与检查回执 export-803 已就绪，版本和范围记录可查询。请判断现在可以怎样描述这个备份。",
    "facts": [
      {
        "id": "AP:RECEIPT",
        "text": "回执 export-803 绑定当前 R3：导出后重新导入的 canonical ID、URL、Note、Tag 和 membership 集合保持一致。",
        "source": "authored://common-opportunities-v4.2/AP:RECEIPT",
        "exactRevision": "ANCHOR-PORT-R3"
      },
      {
        "id": "AP:SCOPE-BOUNDARY",
        "text": "本回执是当前格式的导出/重新导入检查，不覆盖未来 schema 迁移、旧版本恢复或旧深链接路由。",
        "source": "authored://common-opportunities-v4.2/AP:SCOPE-BOUNDARY",
        "exactRevision": "ANCHOR-PORT-R3"
      },
      {
        "id": "AP:CURRENT-STATE",
        "text": "当前产品是 ANCHOR-PORT-R3。没有请求迁移或更换当前格式；该导出可以保留为已核对的当前格式备份。",
        "source": "authored://common-opportunities-v4.2/AP:CURRENT-STATE",
        "exactRevision": "ANCHOR-PORT-R3"
      }
    ]
  },
  {
    "id": "OP:COMMON-COMPOUND-PORTABILITY",
    "subjectRevision": "ANCHOR-MIG-C4",
    "task": "在产品演进中保护资料身份、内容、组织关系与访问连续性，根据接下来的结果判断本轮可以认可或采用的范围。请把相关记录与其版本对应，区分已获支持和仍未核实的变化，明确采用、保留或暂缓的处置及安全保留状态。若暂缓，指出实际缺口如何影响下一动作，以及需要补充什么信息或检查。",
    "trigger": "迁移候选返回了一份新的导出结果，同时更新了迁移、恢复和路由检查索引。当前产品仍在原版本；团队需要决定本轮认可和采用的范围。",
    "facts": [
      {
        "id": "AM:CHANGE",
        "text": "C4 候选改变 membership 存储格式和旧链接路由；任务是界定可认可的检查范围，并决定是否可以采用完整迁移。",
        "source": "authored://common-opportunities-v4.2/AM:CHANGE",
        "exactRevision": "ANCHOR-MIG-C4"
      },
      {
        "id": "AM:ROUNDTRIP",
        "text": "当前 C4 的 export-904 检查了 C4 导出再导入 C4；ID、内容与多重归属均一致。它没有将数据恢复到 R2。",
        "source": "authored://common-opportunities-v4.2/AM:ROUNDTRIP",
        "exactRevision": "ANCHOR-MIG-C4"
      },
      {
        "id": "AM:FORWARD",
        "text": "R2→C4 正向迁移记录通过，两个独立条目 anchor-migration-item-411/412 的多重归属保留。正向成功不意味着逆向恢复成功。",
        "source": "authored://common-opportunities-v4.2/AM:FORWARD",
        "exactRevision": "ANCHOR-MIG-C4"
      },
      {
        "id": "AM:LEGACY",
        "text": "旧链接回执只对应 R2 的旧路由。C4 修改了路由，当前没有 C4 的旧链接检查。",
        "source": "authored://common-opportunities-v4.2/AM:LEGACY",
        "exactRevision": "ANCHOR-MIG-R2"
      },
      {
        "id": "AM:RECOVERY",
        "text": "恢复方案列出 C4→R2 的 membership 映射，但尚无执行结果。完整迁移采用前仍缺逆向恢复和当前旧链接两项检查。",
        "source": "authored://common-opportunities-v4.2/AM:RECOVERY",
        "exactRevision": "ANCHOR-MIG-C4"
      },
      {
        "id": "AM:ACTIVE-STATE",
        "text": "当前产品仍是 ANCHOR-MIG-R2，C4 只在隔离副本。可认可 C4→C4 导出检查而不采用完整迁移，也可保留 R2 或针对实际缺口暂缓。",
        "source": "authored://common-opportunities-v4.2/AM:ACTIVE-STATE",
        "exactRevision": "ANCHOR-MIG-R2"
      }
    ]
  }
];

const PRESENTATION: Readonly<Record<string, { slug: string; title: string; factTitles: readonly string[]; aliases: readonly (readonly string[])[] }>> = {
  "OP:COMMON-LOCAL-STATE": {
    slug: "local-state", title: "条目状态与视图报告",
    factTitles: ["条目当时状态", "现有视图定义", "最近一次归组事件"],
    aliases: [["Release checklist", "条目状态", "Delivery 归属", "pending", "membership"], ["Inbox 定义", "Unsorted 定义", "状态规则", "视图规则"], ["最近操作", "归组事件", "是否复制", "身份变化"]],
  },
  "OP:COMMON-COMPOUND-WL": {
    slug: "compound-state", title: "预览改动与采用范围",
    factTitles: ["候选预览改动", "本次选择与取消范围", "预览历史检查回执", "候选当前检查索引", "项目当前采用状态"],
    aliases: [["逐项预览", "候选改动", "跨筛选选择"], ["取消范围", "选中了谁", "剩余选择", "撤销范围"], ["旧回执", "C1 检查", "历史检查"], ["当前检查", "C2 验证", "焦点检查", "缺少什么检查"], ["当前产品", "是否采用", "安全版本"]],
  },
  "OP:COMMON-LOCAL-PORTABILITY": {
    slug: "local-portability", title: "导出回执与适用范围",
    factTitles: ["导出回执记录", "本次回执覆盖边界", "当前格式与备份状态"],
    aliases: [["export-803", "导出结果", "回执版本", "导入结果"], ["覆盖边界", "是否验证迁移", "回滚覆盖", "旧链接覆盖"], ["当前格式", "当前产品", "备份状态"]],
  },
  "OP:COMMON-COMPOUND-PORTABILITY": {
    slug: "compound-portability", title: "迁移检查与恢复范围",
    factTitles: ["候选存储与路由改动", "候选导出往返回执", "正向迁移记录", "历史旧链接回执", "恢复方案与检查索引", "项目当前迁移状态"],
    aliases: [["schema 改动", "候选改动", "membership 格式"], ["export-904", "导出往返", "C4 roundtrip"], ["正向迁移", "多重归属", "迁移记录"], ["旧链接回执", "R2 路由", "链接检查"], ["恢复方案", "逆向恢复", "回滚检查", "缺少什么检查"], ["当前产品", "是否采用", "安全版本"]],
  },
};

const COMMON_SEMANTICS = "这是一个独立的阅读清单项目副本。条目有稳定身份；处理状态、Collection 关系、视图和候选版本分别记录。变更必须明确范围，并核对相应版本的记录。本模块的资料是预先构造的模拟场景内容，不是本实验参与者结果或刚刚执行的真实产品检查。";

function publicNode(options: {
  nodeId: string;
  title: string;
  body: string;
  stage: "history" | "e0";
  source: string;
  related?: readonly string[];
  aliases?: readonly string[];
  responseLead?: string;
  responseIds?: readonly string[];
}): InformationNode {
  const body = `${options.title}\n\n${options.body}`;
  return Object.freeze({
    schemaVersion: 1,
    nodeId: options.nodeId,
    title: options.title,
    body,
    chatAnchorText: options.title,
    groundingPhrases: Object.freeze([options.title]),
    sourceLabel: options.source,
    relatedNodeIds: Object.freeze([...(options.related ?? [])]),
    queryAliases: Object.freeze([...(options.aliases ?? [])]),
    queryResponseLead: options.responseLead ?? `${body}\n\n来源：${options.source}`,
    queryResponseNodeIds: Object.freeze([...(options.responseIds ?? [options.nodeId])]),
    epistemicDepth: options.stage === "history" ? "L1" : "L3",
    kind: options.stage === "history" ? "constraint" : "observation",
    temporalStage: options.stage === "history" ? "product_history" : "e0_observation",
    // "observed" is an existing schema category for scene records, not an
    // assertion that a real participant or an engineering check was observed.
    epistemicStatus: options.stage === "history" ? "stable" : "observed",
    availableFromStage: options.stage,
    scopeTags: Object.freeze(["common-opportunity", "authored-synthetic"]),
    availableOperations: Object.freeze(["inspect", "trace_source", "compare_history"]),
  } satisfies InformationNode);
}

function compileOpportunity(material: PublicOpportunity): ExperimentScenario {
  const presentation = PRESENTATION[material.id];
  if (!presentation || presentation.factTitles.length !== material.facts.length) {
    throw new Error(`common_public_projection_metadata_missing:${material.id}`);
  }
  const prefix = `COMMON:${presentation.slug.toUpperCase()}`;
  const historyId = `INFO:${prefix}:HISTORY`;
  const taskId = `INFO:${prefix}:TASK`;
  const triggerId = `INFO:${prefix}:TRIGGER`;
  const indexId = `INFO:${prefix}:INDEX`;
  const bundleId = `INFO:${prefix}:ALL`;
  const factIds = material.facts.map((item) => `EVIDENCE:${item.id}`);
  const facts = material.facts.map((item, index) => publicNode({
    nodeId: factIds[index], title: presentation.factTitles[index], body: item.text, stage: "e0",
    source: `${item.source} · 对应版本：${item.exactRevision} · 模拟场景记录`,
    related: [indexId], aliases: [item.id, ...presentation.aliases[index]],
  }));
  const history = publicNode({
    nodeId: historyId, title: "共同项目语义", body: `${COMMON_SEMANTICS}\n\n共同工作目标\n${material.task}`, stage: "history",
    source: "共同机会 · 背景说明", aliases: ["项目语义", "这个任务怎么做", "共同背景", "模拟材料"],
  });
  const task = publicNode({
    nodeId: taskId, title: "本次团队任务", body: material.task, stage: "e0",
    source: "共同机会 · 公开任务", aliases: ["任务要求", "要判断什么", "本次要求"],
  });
  const trigger = publicNode({
    nodeId: triggerId, title: "新到的项目结果", body: material.trigger, stage: "e0",
    source: "共同机会 · 中立触发", aliases: ["刚才的结果", "发生了什么", "最新报告"], related: [indexId],
  });
  const index = publicNode({
    nodeId: indexId, title: "本机会材料索引",
    body: `${presentation.factTitles.join("；")}。可以按名称查询，也可以一次请求“全部本机会材料”；两种方式取得相同来源内容。`,
    stage: "e0", source: "共同机会 · 按需材料目录",
    aliases: ["材料索引", "有哪些资料", "可查资料"], related: [bundleId, ...factIds],
  });
  const bundle = publicNode({
    nodeId: bundleId, title: "全部本机会材料",
    body: "一次返回本任务范围内所有按需记录及其版本与来源，不要求先逐条查看。",
    stage: "e0", source: "共同机会 · 范围内完整材料请求",
    aliases: ["全部材料", "所有材料", "全部本机会材料", "完整材料", "全部事实", "全部来源", "所有事实"],
    related: [indexId, ...factIds], responseIds: [bundleId, ...factIds],
    responseLead: `全部本机会材料\n\n以下均为预先构造的模拟场景记录。\n\n${facts.map((node) => node.queryResponseLead).join("\n\n")}`,
  });
  const nodes = Object.freeze([history, task, trigger, index, bundle, ...facts]);
  const relations: readonly InformationRelation[] = Object.freeze([
    ...[bundleId, ...factIds].map((nodeId, index) => Object.freeze({
      schemaVersion: 1 as const, relationId: `EDGE:${prefix}:INDEX-${index}`,
      sourceNodeId: indexId, targetNodeId: nodeId, kind: "derived_from" as const,
    })),
    Object.freeze({ schemaVersion: 1 as const, relationId: `EDGE:${prefix}:TRIGGER-INDEX`, sourceNodeId: triggerId, targetNodeId: indexId, kind: "derived_from" as const }),
  ]);
  const turns: readonly ScenarioTurn[] = Object.freeze([
    Object.freeze({ schemaVersion: 1 as const, turnId: `${prefix}:H01`, phase: "project_history" as const,
      user: "先说明这个独立项目的基本语义和工作目标。", assistantLead: `[[${historyId}|共同项目语义]]\n\n${COMMON_SEMANTICS}\n\n共同工作目标\n${material.task}`,
      informationNodeIds: Object.freeze([historyId]), presentedNodeIds: Object.freeze([]), logicalRevealOrdinal: 1 }),
    Object.freeze({ schemaVersion: 1 as const, turnId: `${prefix}:S01`, phase: "baseline_summary" as const,
      user: "接下来由我提问和判断。", assistantLead: "你可以询问不清楚的术语。新结果尚未发布；任务内的具体对象、状态与回执将在发布后按需查看。",
      informationNodeIds: Object.freeze([historyId]), presentedNodeIds: Object.freeze([]), logicalRevealOrdinal: 2 }),
    Object.freeze({ schemaVersion: 1 as const, turnId: `${prefix}:T01`, phase: "trigger" as const,
      user: "查看这次团队任务和新结果。",
      assistantLead: `[[${taskId}|本次团队任务]]\n${material.task}\n\n[[${triggerId}|新到的项目结果]]\n${material.trigger}\n\n[[${indexId}|本机会材料索引]]\n${presentation.factTitles.join("；")}。可按问题查询，也可一次请求全部本机会材料。`,
      informationNodeIds: Object.freeze([taskId, triggerId, indexId]), presentedNodeIds: Object.freeze([]), logicalRevealOrdinal: 3 }),
  ]);
  const anchors: readonly ObjectAnchor[] = Object.freeze(nodes.map((node) => Object.freeze({
    schemaVersion: 1 as const, objectRef: `OBJECT:${node.nodeId}`, nodeId: node.nodeId,
    label: node.title, role: node.availableFromStage === "history" ? "constraint" as const : "evidence" as const,
    logicalRevealOrdinal: node.availableFromStage === "history" ? 1 : 3,
  })));
  return Object.freeze({
    schemaVersion: 1,
    scenarioId: `software-common-v42-${presentation.slug}`,
    episodeId: material.id,
    informationSpaceVersion: "v4.2-e0",
    subjectRevisionRef: material.subjectRevision,
    title: presentation.title,
    shortTitle: "软件开发 · 共同任务",
    description: "这是独立的项目副本。请先确认基本语义，随后查看团队任务和新结果；资料可以用完整 Chat 按需查询。",
    baselineOrdinal: 2,
    triggerOrdinal: 3,
    baselineActionLabel: "查看团队任务和新结果",
    intentPrompt: "你想先核对哪些材料，或准备作出什么处置？",
    intentPlaceholder: "可以一次查询多个问题，例如：给我全部本机会材料以及每份资料的版本与来源。",
    completionMessage: "你的原始问题和处置已保留。自然语言回复本身不代表产品已经修改或通过验证。",
    informationNodes: nodes,
    informationRelations: relations,
    frontierRoots: Object.freeze({ history: Object.freeze([historyId]), e0: Object.freeze([taskId, triggerId, indexId]) }),
    turns,
    objectAnchors: anchors,
  } satisfies ExperimentScenario);
}

export const COMMON_OPPORTUNITY_SCENARIOS: readonly ExperimentScenario[] = Object.freeze(PUBLIC_MATERIALS.map(compileOpportunity));

export function getCommonOpportunityScenario(id: string): ExperimentScenario | undefined {
  return COMMON_OPPORTUNITY_SCENARIOS.find((scenario) => scenario.scenarioId === id);
}
