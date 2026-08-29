export type StockV5ObjectKind = "company" | "fact" | "event" | "uncertainty";
export type StockV5Action = "OPEN_DETAIL";
export type StockV5Stock = "ALFA" | "BETA" | "GAMMA";
export type StockV5Phase =
  | "initial_exploration"
  | "initial_submission"
  | "disclosure_exploration"
  | "final_submission"
  | "complete";

export type StockV5Object = {
  id: string;
  kind: StockV5ObjectKind;
  stock: StockV5Stock;
  title: string;
  summary: string;
  payload: string;
  aliases: string[];
  parentEventId?: string;
};

export type StockV5PublicObject = Omit<StockV5Object, "payload" | "parentEventId">;

const OBJECTS: StockV5Object[] = [
  {
    id: "A-COMPANY", kind: "company", stock: "ALFA", title: "ALFA", summary: "已收录营收增长、估值、历史波动、成交活跃度和客户集中度资料。",
    payload: "公司：ALFA\n资料范围：最近一个完整年度营收、2025-06-30 市场估值、过去 12 个月价格波动、过去 60 个交易日成交活跃度、最近一个完整年度最大客户营收占比\n资料来源：模拟 2024 年报、模拟市场快照、模拟历史行情",
    aliases: ["ALFA", "A公司", "阿尔法"],
  },
  {
    id: "B-COMPANY", kind: "company", stock: "BETA", title: "BETA", summary: "已收录营收增长、估值、历史波动、成交活跃度、经营现金流和行业周期资料。",
    payload: "公司：BETA\n资料范围：最近一个完整年度营收、2025-06-30 市场估值、过去 12 个月价格波动、过去 60 个交易日成交活跃度、最近 8 个季度经营现金流、行业周期敏感性\n资料来源：模拟 2024 年报、模拟市场快照、模拟历史行情、模拟季度财务材料、模拟行业材料",
    aliases: ["BETA", "B公司", "贝塔"],
  },
  {
    id: "G-COMPANY", kind: "company", stock: "GAMMA", title: "GAMMA", summary: "已收录营收增长、估值、历史波动、成交活跃度和资产负债率资料。",
    payload: "公司：GAMMA\n资料范围：最近一个完整年度营收、2025-06-30 市场估值、过去 12 个月价格波动、过去 60 个交易日成交活跃度、最近一个完整年度资产负债率\n资料来源：模拟 2024 年报、模拟市场快照、模拟历史行情",
    aliases: ["GAMMA", "G公司", "伽马"],
  },
  {
    id: "A-GROWTH", kind: "fact", stock: "ALFA", title: "ALFA 营收增长 24%", summary: "最近一个完整年度营收同比增长 24%。",
    payload: "公司：ALFA\n指标：最近一个完整年度营收同比增长\n观察值：24%\n来源：模拟 2024 年报",
    aliases: ["ALFA增长", "A营收增长", "24%", "增长24"],
  },
  {
    id: "A-VALUATION", kind: "fact", stock: "ALFA", title: "ALFA 市盈率 38×", summary: "2025-06-30 市盈率为 38×。",
    payload: "公司：ALFA\n指标：市盈率\n观察值：38×\n观察日：2025-06-30\n来源：模拟市场快照",
    aliases: ["ALFA估值", "A市盈率", "38倍", "38×"],
  },
  {
    id: "A-VOLATILITY", kind: "fact", stock: "ALFA", title: "ALFA 价格波动高", summary: "过去 12 个月价格波动高。",
    payload: "公司：ALFA\n指标：价格波动水平\n观察值：高\n观察期：截至 2025-06-30 的过去 12 个月\n来源：模拟历史行情",
    aliases: ["ALFA波动", "A价格波动", "波动高"],
  },
  {
    id: "A-LIQUIDITY", kind: "fact", stock: "ALFA", title: "ALFA 成交活跃度高", summary: "过去 60 个交易日成交活跃度高。",
    payload: "公司：ALFA\n指标：股票成交活跃度\n观察值：高\n观察期：截至 2025-06-30 的过去 60 个交易日\n来源：模拟历史行情",
    aliases: ["ALFA成交", "A股票流动性", "A成交活跃"],
  },
  {
    id: "A-CONCENTRATION", kind: "fact", stock: "ALFA", title: "ALFA 最大客户营收占比约 42%", summary: "最大客户贡献约 42% 的营收。",
    payload: "公司：ALFA\n指标：最大客户营收占比\n观察值：约 42%\n观察期：最近一个完整年度\n来源：模拟 2024 年报",
    aliases: ["ALFA客户集中", "A最大客户", "42%", "客户集中度"],
  },
  {
    id: "B-GROWTH", kind: "fact", stock: "BETA", title: "BETA 营收增长 9%", summary: "最近一个完整年度营收同比增长 9%。",
    payload: "公司：BETA\n指标：最近一个完整年度营收同比增长\n观察值：9%\n来源：模拟 2024 年报",
    aliases: ["BETA增长", "B营收增长", "9%", "增长9"],
  },
  {
    id: "B-VALUATION", kind: "fact", stock: "BETA", title: "BETA 市盈率 24×", summary: "2025-06-30 市盈率为 24×。",
    payload: "公司：BETA\n指标：市盈率\n观察值：24×\n观察日：2025-06-30\n来源：模拟市场快照",
    aliases: ["BETA估值", "B市盈率", "24倍", "24×"],
  },
  {
    id: "B-VOLATILITY", kind: "fact", stock: "BETA", title: "BETA 价格波动低", summary: "过去 12 个月价格波动低。",
    payload: "公司：BETA\n指标：价格波动水平\n观察值：低\n观察期：截至 2025-06-30 的过去 12 个月\n来源：模拟历史行情",
    aliases: ["BETA波动", "B价格波动", "波动低"],
  },
  {
    id: "B-LIQUIDITY", kind: "fact", stock: "BETA", title: "BETA 成交活跃度中", summary: "过去 60 个交易日成交活跃度中。",
    payload: "公司：BETA\n指标：股票成交活跃度\n观察值：中\n观察期：截至 2025-06-30 的过去 60 个交易日\n来源：模拟历史行情",
    aliases: ["BETA成交", "B股票流动性", "B成交活跃"],
  },
  {
    id: "B-CASHFLOW", kind: "fact", stock: "BETA", title: "BETA 经营现金流连续 8 个季度为正", summary: "经营现金流连续 8 个季度为正。",
    payload: "公司：BETA\n指标：经营现金流\n观察值：连续 8 个季度为正\n观察期：最近 8 个季度\n来源：模拟季度财务材料",
    aliases: ["BETA现金流", "B经营现金流", "8个季度", "8 个季度", "现金流连续"],
  },
  {
    id: "B-CYCLE", kind: "fact", stock: "BETA", title: "BETA 行业周期敏感性较高", summary: "所在行业周期敏感性较高。",
    payload: "公司：BETA\n指标：所在行业周期敏感性\n分类：较高\n资料状态：截至材料冻结日期\n来源：模拟行业材料",
    aliases: ["BETA周期", "B行业敏感性", "周期敏感"],
  },
  {
    id: "G-GROWTH", kind: "fact", stock: "GAMMA", title: "GAMMA 营收增长 15%", summary: "最近一个完整年度营收同比增长 15%。",
    payload: "公司：GAMMA\n指标：最近一个完整年度营收同比增长\n观察值：15%\n来源：模拟 2024 年报",
    aliases: ["GAMMA增长", "G营收增长", "15%", "增长15"],
  },
  {
    id: "G-VALUATION", kind: "fact", stock: "GAMMA", title: "GAMMA 市盈率 29×", summary: "2025-06-30 市盈率为 29×。",
    payload: "公司：GAMMA\n指标：市盈率\n观察值：29×\n观察日：2025-06-30\n来源：模拟市场快照",
    aliases: ["GAMMA估值", "G市盈率", "29倍", "29×"],
  },
  {
    id: "G-VOLATILITY", kind: "fact", stock: "GAMMA", title: "GAMMA 价格波动中", summary: "过去 12 个月价格波动中。",
    payload: "公司：GAMMA\n指标：价格波动水平\n观察值：中\n观察期：截至 2025-06-30 的过去 12 个月\n来源：模拟历史行情",
    aliases: ["GAMMA波动", "G价格波动", "波动中"],
  },
  {
    id: "G-LIQUIDITY", kind: "fact", stock: "GAMMA", title: "GAMMA 成交活跃度低", summary: "过去 60 个交易日成交活跃度低。",
    payload: "公司：GAMMA\n指标：股票成交活跃度\n观察值：低\n观察期：截至 2025-06-30 的过去 60 个交易日\n来源：模拟历史行情",
    aliases: ["GAMMA成交", "G股票流动性", "G成交活跃"],
  },
  {
    id: "G-DEBT", kind: "fact", stock: "GAMMA", title: "GAMMA 资产负债率 68%", summary: "最近一个完整年度资产负债率为 68%。",
    payload: "公司：GAMMA\n指标：资产负债率\n观察值：68%\n观察期：最近一个完整年度\n来源：模拟 2024 年报",
    aliases: ["GAMMA负债", "G资产负债率", "68%", "负债率"],
  },
  {
    id: "A-DISCLOSURE", kind: "event", stock: "ALFA", title: "ALFA 最大客户暂停新增订单，并启动供应商审查", summary: "ALFA 最大客户暂停新增订单，并启动供应商审查。",
    payload: "公司：ALFA\n披露日期：2025-06-18\n事项：最大客户暂停新增订单，并启动供应商审查\n相关数据：该客户贡献约 42% 营收\n当前状态：既有合同尚未终止；审查结果预计约 3 个月后公布\n尚未确认：客户审查结果及新增订单恢复时间\n来源：模拟临时业务更新",
    aliases: ["ALFA最新披露", "A客户审查", "客户审查", "暂停新增订单", "既有合同"],
  },
  {
    id: "B-DISCLOSURE", kind: "event", stock: "BETA", title: "BETA 核心客户出现逾期回款，应收账款账龄发生变化", summary: "BETA 核心客户出现逾期回款，平均回款周期由 58 天延长至 96 天。",
    payload: "公司：BETA\n披露日期：2025-06-21\n事项：核心客户出现逾期回款，应收账款账龄发生变化\n相关数据：平均回款周期由 58 天延长至 96 天\n当前状态：经营现金流仍为正；公司尚未下调指引\n尚未确认：逾期款项最终回收时间\n来源：模拟应收账款更新",
    aliases: ["BETA最新披露", "B逾期回款", "逾期回款", "账龄恶化", "回款周期", "58天", "96天"],
  },
  {
    id: "G-DISCLOSURE", kind: "event", stock: "GAMMA", title: "GAMMA 未来九个月内有 35% 的有息债务集中到期，再融资尚未落实", summary: "GAMMA 未来九个月内有 35% 的有息债务集中到期，再融资尚未落实。",
    payload: "公司：GAMMA\n披露日期：2025-06-24\n事项：未来 9 个月内有 35% 的有息债务到期\n当前状态：现有现金只能覆盖其中一部分；公司尚未发生违约；尚无正式再融资协议\n尚未确认：再融资完成时间与融资条件\n来源：模拟债务到期说明",
    aliases: ["GAMMA最新披露", "G债务到期", "债务集中到期", "再融资", "35%"],
  },
  {
    id: "A-UNCERTAINTY", kind: "uncertainty", stock: "ALFA", title: "客户审查结果及新增订单恢复时间", summary: "客户审查结果及新增订单恢复时间尚未确认。",
    payload: "对象：ALFA 最大客户审查\n待确认项：客户审查最终结果、新增订单恢复时间\n已知时间信息：预计约 3 个月后公布审查结果\n当前材料状态：尚未提供最终审查结果或新增订单恢复安排",
    aliases: ["审查结果", "新增订单恢复", "恢复订单", "三个月后"], parentEventId: "A-DISCLOSURE",
  },
  {
    id: "B-UNCERTAINTY", kind: "uncertainty", stock: "BETA", title: "逾期款项最终回收时间", summary: "逾期款项最终回收时间尚未确认。",
    payload: "对象：BETA 核心客户逾期款项\n待确认项：最终回收时间、最终回收金额\n当前材料状态：尚未提供最终回收时间或是否全部收回的确认信息",
    aliases: ["最终回收时间", "回收时间", "何时回款", "款项收回"], parentEventId: "B-DISCLOSURE",
  },
  {
    id: "G-UNCERTAINTY", kind: "uncertainty", stock: "GAMMA", title: "再融资完成时间与融资条件", summary: "再融资完成时间与融资条件尚未确认。",
    payload: "对象：GAMMA 再融资安排\n待确认项：完成时间、融资成本、最终方案\n当前材料状态：尚无正式再融资协议",
    aliases: ["融资完成时间", "融资条件", "融资成本", "最终方案"], parentEventId: "G-DISCLOSURE",
  },
];

export const STOCK_V5_OBJECT_LIST = OBJECTS;
export const STOCK_V5_PUBLIC_OBJECTS: StockV5PublicObject[] = OBJECTS.map((object) => ({
  id: object.id,
  kind: object.kind,
  stock: object.stock,
  title: object.title,
  summary: object.summary,
  aliases: object.aliases,
}));
export const STOCK_V5_OBJECTS = new Map(OBJECTS.map((object) => [object.id, object]));
export const STOCK_V5_OBJECT_IDS = new Set(OBJECTS.map((object) => object.id));

const DISCLOSURE_PHASES = new Set<StockV5Phase>(["disclosure_exploration", "final_submission", "complete"]);
const UNCERTAINTY_BY_EVENT = new Map(OBJECTS.filter((object) => object.kind === "uncertainty").map((object) => [object.parentEventId as string, object.id]));

export function isDisclosurePhase(phase: StockV5Phase) {
  return DISCLOSURE_PHASES.has(phase);
}

export function canAccessStockV5Object(object: StockV5Object, phase: StockV5Phase) {
  return object.kind === "company" || object.kind === "fact" || isDisclosurePhase(phase);
}

export function isStockV5ObjectExposed(object: StockV5Object, phase: StockV5Phase, revealedObjectIds: string[] = []) {
  if (object.kind === "company" || object.kind === "fact") return true;
  if (!isDisclosurePhase(phase)) return false;
  if (object.kind === "event") return true;
  return revealedObjectIds.includes(object.id);
}

export function getRevealedObjectIds(objectIds: string[]) {
  return objectIds.flatMap((id) => {
    const uncertaintyId = UNCERTAINTY_BY_EVENT.get(id);
    return uncertaintyId ? [id, uncertaintyId] : [id];
  });
}

function normalize(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/[\s，。；：、,.!?！？:;()（）]/g, "");
}

function hasRequestIntent(utterance: string) {
  const text = utterance.trim();
  if (!text) return false;
  if (/[？?]/.test(text)) return true;
  if (/^(?:请(?:你)?|麻烦(?:你)?|帮我|能否|可以|可否|能不能)\s*(?:查看|展开|解释|分析|比较|对比|评估|告诉|查询|查一下|看一下|了解)/.test(text)) return true;
  if (/^(?:查看|展开|解释|分析|比较|对比|评估|查询|查一下|看一下|了解一下|告诉我)(?!了|过)/.test(text)) return true;
  if (/(?:我)?(?:想|希望|需要)(?:知道|了解|查看|比较|确认|弄清)/.test(text)) return true;
  return /(怎么看|怎么回事|如何|怎样|为什么|是否|哪些|是什么|有何|多少|多久|何时|什么情况|可以吗|能否|可否)/.test(text);
}

function inferAction(utterance: string): StockV5Action | null {
  if (hasRequestIntent(utterance) && /(详情|具体|展开|查看|了解|来源|状态|多少|多久|什么情况|何时|时间|条件|哪些|是什么)/.test(utterance)) return "OPEN_DETAIL";
  return null;
}

function mentionedStocks(normalized: string) {
  return OBJECTS
    .filter((object) => object.kind === "company")
    .map((object) => ({
      stock: object.stock,
      position: Math.min(...object.aliases.map((alias) => normalized.indexOf(normalize(alias))).filter((position) => position >= 0)),
    }))
    .filter(({ position }) => Number.isFinite(position))
    .sort((a, b) => a.position - b.position)
    .map(({ stock }) => stock);
}

const STOCK_PREFIX: Record<StockV5Stock, "A" | "B" | "G"> = { ALFA: "A", BETA: "B", GAMMA: "G" };
const CONCEPT_SUFFIXES: Array<{ pattern: RegExp; suffix: string }> = [
  { pattern: /(估值|市盈率)/, suffix: "VALUATION" },
  { pattern: /(营收|增长)/, suffix: "GROWTH" },
  { pattern: /(价格波动|波动)/, suffix: "VOLATILITY" },
  { pattern: /(成交|活跃度|股票流动性)/, suffix: "LIQUIDITY" },
  { pattern: /(现金流)/, suffix: "CASHFLOW" },
  { pattern: /(行业周期|周期敏感)/, suffix: "CYCLE" },
  { pattern: /(客户集中|最大客户|集中度)/, suffix: "CONCENTRATION" },
  { pattern: /(资产负债率|负债率|负债)/, suffix: "DEBT" },
];

export function resolveStockV5Utterance(utterance: string, phase: StockV5Phase, contextObjectIds: string[] = []): { action: StockV5Action | null; objectIds: string[] } {
  const action = inferAction(utterance);
  const normalized = normalize(utterance);
  const stocks = mentionedStocks(normalized);

  const conceptIds = CONCEPT_SUFFIXES
    .filter(({ pattern }) => pattern.test(normalized))
    .flatMap(({ suffix }) => stocks.map((stock) => `${STOCK_PREFIX[stock]}-${suffix}`))
    .filter((id) => {
      const object = STOCK_V5_OBJECTS.get(id);
      return Boolean(object && canAccessStockV5Object(object, phase));
    });
  if (conceptIds.length > 0) return { action, objectIds: [...new Set(conceptIds)] };

  let specific = OBJECTS.filter((object) => object.kind !== "company" && canAccessStockV5Object(object, phase) && object.aliases.some((alias) => normalized.includes(normalize(alias))));
  if (stocks.length === 1) specific = specific.filter((object) => stocks.includes(object.stock));
  if (specific.length > 0) return { action, objectIds: [...new Set(specific.map((object) => object.id))] };

  const companies = stocks
    .map((stock) => OBJECTS.find((object) => object.kind === "company" && object.stock === stock))
    .filter((object): object is StockV5Object => Boolean(object));
  if (companies.length > 0) return { action, objectIds: [...new Set(companies.map((object) => object.id))] };

  if (action && /(它|这个|这条|刚才|上述|前面)/.test(utterance)) {
    const contextual = getStockV5Objects(contextObjectIds.slice(-4), phase);
    return { action, objectIds: contextual.length === 1 ? [contextual[0].id] : [] };
  }
  return { action, objectIds: [] };
}

export function isStockV5ObjectDirectedUtterance(utterance: string) {
  return hasRequestIntent(utterance);
}

export function getStockV5Objects(ids: string[], phase?: StockV5Phase) {
  return ids
    .map((id) => STOCK_V5_OBJECTS.get(id))
    .filter((object): object is StockV5Object => Boolean(object) && (!phase || canAccessStockV5Object(object, phase)));
}

export function getStockV5EvidenceEnvelope(
  phase: StockV5Phase,
  viewedDetailIds: string[],
  revealedObjectIds: string[] = viewedDetailIds,
  referencedObjectComments: Array<{ objectId: string; comment: string }> = [],
) {
  const exposed = OBJECTS.filter((object) => isStockV5ObjectExposed(object, phase, revealedObjectIds));
  const allowedObjectIds = exposed.map((object) => object.id);
  const details = getStockV5Objects(viewedDetailIds, phase).filter((object) => isStockV5ObjectExposed(object, phase, revealedObjectIds));
  return {
    allowedObjectIds,
    summaries: exposed.map((object) => `${object.id}: ${object.summary}`),
    details: details.map((object) => `${object.id}: ${object.payload}`),
    referencedObjectComments: referencedObjectComments
      .filter(({ objectId, comment }) => allowedObjectIds.includes(objectId) && typeof comment === "string" && comment.trim())
      .map(({ objectId, comment }) => ({ objectId, comment: comment.trim().slice(0, 300) })),
  };
}

export function sanitizeStockV5Markup(content: string, phase: StockV5Phase, revealedObjectIds: string[]) {
  return content.replace(/\[\[([A-Z0-9-]+)\|([^\]]+)\]\]/g, (_marker, id: string, label: string) => {
    const object = STOCK_V5_OBJECTS.get(id);
    if (!object || !isStockV5ObjectExposed(object, phase, revealedObjectIds)) return label;
    return `[[${id}|${label}]]`;
  });
}

function markerPhrases(object: StockV5Object) {
  const phrases = [object.title, object.summary.replace(/[。；]$/g, ""), ...object.aliases]
    .map((phrase) => phrase.trim())
    .filter((phrase) => (
      object.kind === "company" || phrase.length >= 4 || /\d\s*(?:%|×|倍)/.test(phrase)
    ) && (object.kind === "company" || !/^[ABG][\u4e00-\u9fff]/.test(phrase)));
  return [...new Set(phrases)];
}

function markPlainSegment(segment: string, exposed: StockV5Object[]) {
  const lower = segment.toLocaleLowerCase("zh-CN");
  const candidates: Array<{ start: number; end: number; objectId: string; label: string }> = [];
  for (const object of exposed) {
    for (const phrase of markerPhrases(object)) {
      const needle = phrase.toLocaleLowerCase("zh-CN");
      let cursor = 0;
      while (cursor < lower.length) {
        const start = lower.indexOf(needle, cursor);
        if (start < 0) break;
        candidates.push({ start, end: start + phrase.length, objectId: object.id, label: segment.slice(start, start + phrase.length) });
        cursor = start + Math.max(phrase.length, 1);
      }
    }
  }
  candidates.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const selected: typeof candidates = [];
  let occupiedUntil = -1;
  for (const candidate of candidates) {
    if (candidate.start < occupiedUntil) continue;
    selected.push(candidate);
    occupiedUntil = candidate.end;
  }
  if (selected.length === 0) return { text: segment, objectIds: [] as string[] };
  let output = "";
  let cursor = 0;
  for (const candidate of selected) {
    output += segment.slice(cursor, candidate.start);
    output += `[[${candidate.objectId}|${candidate.label}]]`;
    cursor = candidate.end;
  }
  output += segment.slice(cursor);
  return { text: output, objectIds: selected.map((candidate) => candidate.objectId) };
}

export function ensureStockV5ObjectMarkup(content: string, phase: StockV5Phase, revealedObjectIds: string[]) {
  const sanitized = sanitizeStockV5Markup(content, phase, revealedObjectIds);
  const exposed = OBJECTS.filter((object) => isStockV5ObjectExposed(object, phase, revealedObjectIds));
  const pieces = sanitized.split(/(\[\[[A-Z0-9-]+\|[^\]]+\]\])/g);
  const autoMarkedObjectIds: string[] = [];
  const text = pieces.map((piece) => {
    if (/^\[\[[A-Z0-9-]+\|[^\]]+\]\]$/.test(piece)) return piece;
    const marked = markPlainSegment(piece, exposed);
    autoMarkedObjectIds.push(...marked.objectIds);
    return marked.text;
  }).join("");
  return { text, autoMarkedObjectIds: [...new Set(autoMarkedObjectIds)] };
}
