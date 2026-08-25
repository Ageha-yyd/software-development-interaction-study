export type Condition = "chat_only" | "chat_widget";
export type StockId = "ALFA" | "BETA" | "GAMMA";

export type FactId =
  | "A-GROWTH"
  | "A-VALUATION"
  | "A-CONCENTRATION"
  | "A-LIQUIDITY"
  | "A-WEAKSIGNAL"
  | "B-GROWTH"
  | "B-VALUATION"
  | "B-CASHFLOW"
  | "B-VOLATILITY"
  | "B-LIQUIDITY"
  | "B-CYCLE"
  | "B-WEAKSIGNAL"
  | "G-GROWTH"
  | "G-VALUATION"
  | "G-DEBT"
  | "G-LIQUIDITY"
  | "G-WEAKSIGNAL";

export type FactDimension =
  | "增长"
  | "估值/财务弹性"
  | "可变现性"
  | "经营稳定性/下行风险"
  | "弱诊断性进展";

export type TargetDimension = "增长" | "可变现性" | "经营稳定性/下行风险";

export type Fact = {
  id: FactId;
  stock: StockId;
  label: string;
  detail: string;
  dimension: FactDimension;
  targetDimension?: TargetDimension;
  round: "01" | "02" | "03" | "04" | "05";
};

export type StrategyState = {
  horizon: "约 12 个月" | "6 个月";
  shortNeed: "无额外要求" | "30% 资金 / 6 个月";
  downside: "低" | "中" | "高";
  stability: "低" | "中" | "高";
  growth: "高" | "中（保留）" | "不考虑";
};

export type StrategyField = keyof StrategyState;

export const SCENARIO_VERSION = "stock-script-v2.1";
export const PARSER_VERSION = "stock-parser-v2.1";
export const METRIC_CONFIG_VERSION = "stock-metric-v3.0-candidate";
export const APP_BUILD_VERSION = "stock-intent-lab-v2.1";

export const FACTS: Record<FactId, Fact> = {
  "A-GROWTH": {
    id: "A-GROWTH", stock: "ALFA", label: "营收增长 24%",
    detail: "ALFA 最近一年模拟营收增长为 24%，三者最高。",
    dimension: "增长", targetDimension: "增长", round: "01",
  },
  "A-VALUATION": {
    id: "A-VALUATION", stock: "ALFA", label: "市盈率 38×",
    detail: "ALFA 的模拟市盈率为 38×，三者最高，估值对增长预期更敏感。",
    dimension: "估值/财务弹性", round: "02",
  },
  "A-CONCENTRATION": {
    id: "A-CONCENTRATION", stock: "ALFA", label: "最大客户收入占比 42%",
    detail: "ALFA 最大客户贡献 42% 的收入，主要客户变化可能影响收入稳定性。",
    dimension: "经营稳定性/下行风险", targetDimension: "经营稳定性/下行风险", round: "03",
  },
  "A-LIQUIDITY": {
    id: "A-LIQUIDITY", stock: "ALFA", label: "成交活跃度高",
    detail: "在固定模拟数据中，ALFA 的日均成交活跃度为高。",
    dimension: "可变现性", targetDimension: "可变现性", round: "04",
  },
  "A-WEAKSIGNAL": {
    id: "A-WEAKSIGNAL", stock: "ALFA", label: "大型平台战略合作意向",
    detail: "ALFA 宣布与一家大型平台签署战略合作意向书，但未披露正式订单、合作金额或预计收入。",
    dimension: "弱诊断性进展", round: "05",
  },
  "B-GROWTH": {
    id: "B-GROWTH", stock: "BETA", label: "营收增长 9%",
    detail: "BETA 最近一年模拟营收增长为 9%，三者最低。",
    dimension: "增长", targetDimension: "增长", round: "01",
  },
  "B-VALUATION": {
    id: "B-VALUATION", stock: "BETA", label: "市盈率 24×",
    detail: "BETA 的模拟市盈率为 24×，三者最低。估值较低不等于风险一定较低。",
    dimension: "估值/财务弹性", round: "02",
  },
  "B-CASHFLOW": {
    id: "B-CASHFLOW", stock: "BETA", label: "经营现金流连续 8 季度为正",
    detail: "BETA 经营现金流连续 8 个季度为正，可作为经营稳定性信息。",
    dimension: "经营稳定性/下行风险", targetDimension: "经营稳定性/下行风险", round: "03",
  },
  "B-VOLATILITY": {
    id: "B-VOLATILITY", stock: "BETA", label: "三者中价格路径最平稳",
    detail: "固定模拟走势中，BETA 的价格路径最平稳、波动最低。",
    dimension: "经营稳定性/下行风险", targetDimension: "经营稳定性/下行风险", round: "01",
  },
  "B-LIQUIDITY": {
    id: "B-LIQUIDITY", stock: "BETA", label: "成交活跃度中等",
    detail: "在固定模拟数据中，BETA 的日均成交活跃度为中等。",
    dimension: "可变现性", targetDimension: "可变现性", round: "04",
  },
  "B-CYCLE": {
    id: "B-CYCLE", stock: "BETA", label: "收入对行业周期较敏感",
    detail: "BETA 的收入对行业周期变化较敏感，现金流稳定性仍需继续核查。",
    dimension: "经营稳定性/下行风险", targetDimension: "经营稳定性/下行风险", round: "03",
  },
  "B-WEAKSIGNAL": {
    id: "B-WEAKSIGNAL", stock: "BETA", label: "新客户试点合作",
    detail: "BETA 宣布与一家新客户启动试点合作，但未说明是否形成付费合同、客户规模或收入贡献。",
    dimension: "弱诊断性进展", round: "05",
  },
  "G-GROWTH": {
    id: "G-GROWTH", stock: "GAMMA", label: "营收增长 15%",
    detail: "GAMMA 最近一年模拟营收增长为 15%，处于三者中间。",
    dimension: "增长", targetDimension: "增长", round: "01",
  },
  "G-VALUATION": {
    id: "G-VALUATION", stock: "GAMMA", label: "市盈率 29×",
    detail: "GAMMA 的模拟市盈率为 29×，处于三者中间。",
    dimension: "估值/财务弹性", round: "02",
  },
  "G-DEBT": {
    id: "G-DEBT", stock: "GAMMA", label: "资产负债率 68%",
    detail: "GAMMA 的资产负债率为 68%，财务弹性相对较弱。",
    dimension: "估值/财务弹性", round: "02",
  },
  "G-LIQUIDITY": {
    id: "G-LIQUIDITY", stock: "GAMMA", label: "成交活跃度较低",
    detail: "在固定模拟数据中，GAMMA 的日均成交活跃度较低。",
    dimension: "可变现性", targetDimension: "可变现性", round: "04",
  },
  "G-WEAKSIGNAL": {
    id: "G-WEAKSIGNAL", stock: "GAMMA", label: "新产品试用反馈好于预期",
    detail: "GAMMA 管理层称新产品试用反馈好于预期，但未披露试用数量、正式订单或实际销售数据。",
    dimension: "弱诊断性进展", round: "05",
  },
};

export const FACT_IDS = Object.keys(FACTS) as FactId[];

export const STRATEGY_V1: StrategyState = {
  horizon: "约 12 个月",
  shortNeed: "无额外要求",
  downside: "中",
  stability: "中",
  growth: "高",
};

export const STRATEGY_V2: StrategyState = {
  horizon: "约 12 个月",
  shortNeed: "30% 资金 / 6 个月",
  downside: "高",
  stability: "高",
  growth: "中（保留）",
};

export const STRATEGY_FIELDS: { key: StrategyField; label: string; values: readonly string[] }[] = [
  { key: "horizon", label: "总体研究视角", values: ["约 12 个月", "6 个月"] },
  { key: "shortNeed", label: "短期资金需求", values: ["无额外要求", "30% 资金 / 6 个月"] },
  { key: "downside", label: "下行风险优先级", values: ["低", "中", "高"] },
  { key: "stability", label: "经营稳定性优先级", values: ["低", "中", "高"] },
  { key: "growth", label: "增长优先级", values: ["高", "中（保留）", "不考虑"] },
];

export function strategySummary(strategy: StrategyState) {
  return `总体研究视角为${strategy.horizon}；短期资金需求为“${strategy.shortNeed}”；下行风险优先级为${strategy.downside}；经营稳定性优先级为${strategy.stability}；增长优先级为${strategy.growth}。`;
}

export function countCharacters(value: string) {
  return Array.from(value.trim()).length;
}

export function deadlineReached(timestampMonotonicMs: number, deadlineAtMonotonicMs: number | null) {
  return deadlineAtMonotonicMs !== null && timestampMonotonicMs >= deadlineAtMonotonicMs;
}

export function exposureEligible(visibleRatio: number, visible: boolean, focused: boolean, threshold: number) {
  return visibleRatio >= threshold && visible && focused;
}

export function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function isStrategyState(value: unknown): value is StrategyState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return STRATEGY_FIELDS.every((field) => field.values.includes(candidate[field.key] as never));
}

type TraceEvent = {
  event_id: string;
  sequence_no: number;
  event_type: string;
  payload: Record<string, unknown>;
};

export function validateFrozenContextTrace(input: {
  events: TraceEvent[];
  contextId: string;
  terminalTrigger: "final_submit_lock_acquired" | "deadline_triggered";
  terminalLockEventId: string;
  terminalLockSequenceNo: number;
  strategyVersion: number;
  strategy: StrategyState;
  evidenceVersion: number;
  evidence: FactId[];
  lastAgentContext: null | {
    eventId: string;
    strategyVersion: number;
    strategy: StrategyState;
    evidenceVersion: number;
    evidence: FactId[];
  };
}) {
  const errors: string[] = [];
  const beforeLock = input.events.filter((event) => event.sequence_no <= input.terminalLockSequenceNo);
  const strictlyBeforeLock = beforeLock.filter((event) => event.sequence_no < input.terminalLockSequenceNo);
  const lock = beforeLock.find((event) => event.event_id === input.terminalLockEventId);
  if (!lock || lock.sequence_no !== input.terminalLockSequenceNo) errors.push("terminal_lock_reference_invalid");
  if (lock?.event_type !== input.terminalTrigger) errors.push("terminal_trigger_mismatch");
  if (lock?.payload.context_id !== input.contextId) errors.push("context_id_mismatch");
  if (!isStrategyState(input.strategy)) errors.push("strategy_schema_invalid");
  const strategySnapshots = strictlyBeforeLock.filter((event) => event.event_type === "strategy_confirmed_snapshot");
  const latestStrategy = strategySnapshots.at(-1);
  const strategyIsLatest = latestStrategy
    ? latestStrategy.payload.strategy_version === input.strategyVersion
      && canonicalJson(latestStrategy.payload.fields) === canonicalJson(input.strategy)
    : input.strategyVersion === 1 && canonicalJson(input.strategy) === canonicalJson(STRATEGY_V1);
  if (!strategyIsLatest) errors.push("strategy_not_latest_before_lock");
  if (!input.evidence.every((id) => FACT_IDS.includes(id))) errors.push("evidence_schema_invalid");
  const evidenceSnapshots = strictlyBeforeLock.filter((event) => event.event_type === "evidence_confirmed_snapshot");
  const latestEvidence = evidenceSnapshots.at(-1);
  const evidenceIsLatest = latestEvidence
    ? latestEvidence.payload.evidence_version === input.evidenceVersion
      && canonicalJson(latestEvidence.payload.fact_ids) === canonicalJson(input.evidence)
    : input.evidenceVersion === 0 && input.evidence.length === 0;
  if (!evidenceIsLatest) errors.push("evidence_not_latest_before_lock");
  const consumedEvents = strictlyBeforeLock.filter((event) => event.event_type === "agent_context_consumed");
  const latestConsumed = consumedEvents.at(-1);
  if (!latestConsumed && input.lastAgentContext !== null) {
    errors.push("last_agent_context_reference_invalid");
  } else if (latestConsumed && input.lastAgentContext === null) {
    errors.push("last_agent_context_missing");
  } else if (latestConsumed && input.lastAgentContext !== null) {
    if (latestConsumed.event_id !== input.lastAgentContext.eventId) {
      errors.push("last_agent_context_reference_invalid");
    } else if (
      latestConsumed.payload.strategy_version !== input.lastAgentContext.strategyVersion
      || canonicalJson(latestConsumed.payload.strategy_fields) !== canonicalJson(input.lastAgentContext.strategy)
      || latestConsumed.payload.evidence_version !== input.lastAgentContext.evidenceVersion
      || canonicalJson(latestConsumed.payload.evidence_fact_ids) !== canonicalJson(input.lastAgentContext.evidence)
    ) {
      errors.push("last_agent_context_payload_mismatch");
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateFinalSubmission(input: {
  stock: StockId | "";
  rationale: string;
  postT0StrategyConfirmCount: number;
}) {
  const reasons: string[] = [];
  const length = countCharacters(input.rationale);
  if (!input.stock) reasons.push("stock_missing");
  if (length < 100) reasons.push("rationale_too_short");
  if (length > 150) reasons.push("rationale_too_long");
  if (input.postT0StrategyConfirmCount < 1) reasons.push("strategy_not_confirmed_after_t0");
  return { valid: reasons.length === 0, reasons, length };
}

const FACT_NEEDLES: Record<FactId, string[]> = {
  "A-GROWTH": ["24%", "24％", "增长"],
  "A-VALUATION": ["38", "市盈率", "估值"],
  "A-CONCENTRATION": ["42%", "42％", "客户", "集中"],
  "A-LIQUIDITY": ["活跃", "流动", "变现"],
  "A-WEAKSIGNAL": ["平台", "意向", "合作"],
  "B-GROWTH": ["9%", "9％", "增长"],
  "B-VALUATION": ["24", "市盈率", "估值"],
  "B-CASHFLOW": ["8季度", "8 个季度", "现金流"],
  "B-VOLATILITY": ["波动", "平稳", "价格路径"],
  "B-LIQUIDITY": ["活跃", "流动", "变现"],
  "B-CYCLE": ["周期"],
  "B-WEAKSIGNAL": ["客户", "试点", "合作"],
  "G-GROWTH": ["15%", "15％", "增长"],
  "G-VALUATION": ["29", "市盈率", "估值"],
  "G-DEBT": ["68%", "68％", "负债", "债务"],
  "G-LIQUIDITY": ["活跃", "流动", "变现"],
  "G-WEAKSIGNAL": ["产品", "试用", "反馈"],
};

function splitClauses(text: string) {
  const normalized = text
    .replace(/(?:并且|同时|以及|并)(?=(?:把|将)?(?:总体研究视角|总体视角|研究期限|整体期限|期限|短期资金|资金需求|下行风险|风险|经营稳定性|稳定性|增长))/g, "；")
    .replace(/并且(?=更加?(?:重视|看重)(?:下行)?风险)/g, "；")
    .replace(/(?:并且|同时|以及|并)(?=(?:把|将)?(?:ALFA|BETA|GAMMA))/gi, "；")
    .replace(/(?:但|并且|同时|并)(?=(?:把|将)?(?:不要|移除|删除|移出|不再))/g, "；");
  return normalized.split(/[，,；;。！？!?\n]+/).map((clause) => clause.trim()).filter(Boolean);
}

function matchFactClauses(text: string) {
  let lastStocks: StockId[] = [];
  return splitClauses(text).map((clause) => {
    const upper = clause.toUpperCase();
    const mentions = [...upper.matchAll(/ALFA|BETA|GAMMA/g)].map((match) => ({
      stock: match[0] as StockId,
      index: match.index,
    }));
    if (mentions.length > 0) lastStocks = [mentions[mentions.length - 1].stock];
    const ids = mentions.length > 0
      ? [...new Set(mentions.flatMap((mention, index) => {
        const segment = clause.slice(mention.index, mentions[index + 1]?.index ?? clause.length);
        return FACT_IDS.filter((id) => FACTS[id].stock === mention.stock
          && FACT_NEEDLES[id].some((needle) => segment.includes(needle)));
      }))]
      : /(它|该股|这只股票|这个股票)/.test(clause)
        ? FACT_IDS.filter((id) => lastStocks.includes(FACTS[id].stock)
          && FACT_NEEDLES[id].some((needle) => clause.includes(needle)))
        : [];
    return { clause, ids };
  });
}

export function matchFacts(text: string) {
  const matches = new Set<FactId>();
  for (const { ids } of matchFactClauses(text)) {
    ids.forEach((id) => matches.add(id));
  }
  return [...matches];
}

export type FactOperations = {
  add: FactId[];
  remove: FactId[];
  focus: FactId[];
  query: FactId[];
  ambiguousClauses: string[];
};

export function parseFactOperations(text: string): FactOperations {
  const sets = { add: new Set<FactId>(), remove: new Set<FactId>(), focus: new Set<FactId>(), query: new Set<FactId>() };
  const ambiguousClauses: string[] = [];
  for (const { clause, ids } of matchFactClauses(text)) {
    if (ids.length === 0) continue;
    const remove = /(移除|删除|移出|不再|不要).{0,8}(依据|判断|考虑)/.test(clause);
    const add = !remove && /((作为|加入|纳入|记录为|用作).{0,8}(依据|判断|考虑)|^(?:把|将)?(?:加入|纳入|记录为)|重点考虑|决策依据)/.test(clause);
    const focus = /(关注|记住|留意|highlight)/i.test(clause);
    if (remove && add) {
      ambiguousClauses.push(clause);
      continue;
    }
    const target = remove ? sets.remove : add ? sets.add : focus ? sets.focus : sets.query;
    ids.forEach((id) => target.add(id));
  }
  return {
    add: [...sets.add],
    remove: [...sets.remove],
    focus: [...sets.focus],
    query: [...sets.query],
    ambiguousClauses,
  };
}

export function deriveExplicitStrategy(text: string, current: StrategyState) {
  const next = { ...current };
  const changedFields: StrategyField[] = [];
  const set = <K extends StrategyField>(key: K, value: StrategyState[K]) => {
    if (next[key] !== value) {
      next[key] = value;
      changedFields.push(key);
    }
  };

  for (const clause of splitClauses(text)) {
    if (/(短期资金|资金需求|这部分资金|这笔资金)/.test(clause)) {
      if (/(无额外|没有|取消|不需要)/.test(clause)) set("shortNeed", "无额外要求");
      else if (/(30%|30％|百分之三十)/.test(clause) && /(半年|6\s*个月)/.test(clause)) set("shortNeed", "30% 资金 / 6 个月");
    }
    if (/(总体研究视角|总体视角|研究期限|整体期限|期限|其余资金|剩余资金)/.test(clause)) {
      if (/(一年|12\s*个月)/.test(clause)) set("horizon", "约 12 个月");
      else if (/(半年|6\s*个月)/.test(clause)) set("horizon", "6 个月");
    }
    if (/(下行风险|风险|本金回撤|本金损失)/.test(clause)) {
      if (/(降低|低优先|不重视|(设为|调为|改成|优先级为).{0,3}低)/.test(clause)) set("downside", "低");
      else if (/(中等|适中|保持中|(设为|调为|改成|优先级为).{0,3}中)/.test(clause)) set("downside", "中");
      else if (/(提高|更(?:加)?重视|优先考虑|难接受|(设为|调为|改成|优先级为).{0,3}高)/.test(clause)) set("downside", "高");
    }
    if (/(经营稳定|稳定性|经营持续|经营.{0,10}(持续|稳定)|持续保持稳定|现金流)/.test(clause)) {
      if (/(降低|低优先|不重视|(设为|调为|改成|优先级为).{0,3}低)/.test(clause)) set("stability", "低");
      else if (/(中等|适中|保持中|(设为|调为|改成|优先级为).{0,3}中)/.test(clause)) set("stability", "中");
      else if (/(提高|更(?:加)?看重|更(?:加)?重视|优先考虑|(设为|调为|改成|优先级为).{0,3}高)/.test(clause)) set("stability", "高");
    }
    if (/增长/.test(clause)) {
      if (/(不希望|不想|不愿).{0,6}(完全)?放弃|仍.{0,8}(保留|增长)|保留|兼顾|中等|降低|次要|(设为|调为|改成|优先级为).{0,4}中/.test(clause)) set("growth", "中（保留）");
      else if (/不考虑|删除|完全放弃|放弃增长|完全不要/.test(clause)) set("growth", "不考虑");
      else if (/更看重|优先考虑|(设为|调为|改成|优先级为).{0,3}高/.test(clause)) set("growth", "高");
    }
  }

  return { next, changedFields };
}

export function isExplicitDraftConfirmation(text: string) {
  const normalized = text.trim();
  return /^(确认|同意|可以|就这样)[。！!]?$/.test(normalized)
    || /^(确认|同意)(?:这个|上述|当前)?(?:策略|修改|草案)[。！!]?$/.test(normalized)
    || /^(?:这个|上述|当前)?(?:策略|修改|草案).{0,4}(确认|同意)[。！!]?$/.test(normalized);
}

export function makeSeededProbe(strategy: StrategyState, seed: string, forcedIndex?: number | null) {
  const index = forcedIndex !== null && forcedIndex !== undefined
    ? Math.abs(Math.trunc(forcedIndex)) % STRATEGY_FIELDS.length
    : Number.parseInt(stableHash(seed).slice(-2), 16) % STRATEGY_FIELDS.length;
  const field = STRATEGY_FIELDS[index];
  const alternatives = field.values.filter((value) => value !== strategy[field.key]);
  const replacement = alternatives[0] as StrategyState[typeof field.key];
  return {
    variantId: `probe-${index}-${stableHash(`${seed}:${field.key}`).slice(-4)}`,
    seededField: field.key,
    summary: { ...strategy, [field.key]: replacement } as StrategyState,
  };
}
