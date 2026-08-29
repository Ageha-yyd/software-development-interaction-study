import {
  getStockV5EvidenceEnvelope,
  ensureStockV5ObjectMarkup,
  sanitizeStockV5Markup,
  STOCK_V5_OBJECT_IDS,
  type StockV5Phase,
} from "../../../lib/stock-v5-registry";
import { env as cloudflareEnv } from "cloudflare:workers";

type ClientMessage = { role: "user" | "assistant"; content: string };
type ChatBody = {
  messages?: ClientMessage[];
  phase?: StockV5Phase;
  initialCandidate?: string | null;
  visibleDetailIds?: string[];
  revealedObjectIds?: string[];
  referencedObjectIds?: string[];
  referencedObjectComments?: Array<{ objectId?: unknown; comment?: unknown }>;
};

const PHASES = new Set<StockV5Phase>(["initial_exploration", "initial_submission", "disclosure_exploration", "final_submission", "complete"]);

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();

async function payloadHash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function serverEnv(name: "DEEPSEEK_API_KEY" | "DEEPSEEK_BASE_URL" | "DEEPSEEK_MODEL") {
  const workerValue = (cloudflareEnv as unknown as Record<string, unknown>)[name];
  if (typeof workerValue === "string" && workerValue) return workerValue;
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

function requestKey(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const key = requestKey(request);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function cleanMessages(value: unknown): ClientMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 16) return null;
  const cleaned: ClientMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > 2000) return null;
    cleaned.push({ role, content: text });
  }
  return cleaned;
}

function buildSystemPrompt(body: ChatBody) {
  const phase = PHASES.has(body.phase as StockV5Phase) ? body.phase as StockV5Phase : "initial_exploration";
  const visibleDetailIds = Array.isArray(body.visibleDetailIds) ? body.visibleDetailIds.filter((id): id is string => typeof id === "string" && STOCK_V5_OBJECT_IDS.has(id)).slice(0, 25) : [];
  const revealedObjectIds = Array.isArray(body.revealedObjectIds) ? body.revealedObjectIds.filter((id): id is string => typeof id === "string" && STOCK_V5_OBJECT_IDS.has(id)).slice(0, 25) : visibleDetailIds;
  const referencedObjectComments = Array.isArray(body.referencedObjectComments)
    ? body.referencedObjectComments
      .filter((item): item is { objectId: string; comment: string } => Boolean(item) && typeof item.objectId === "string" && typeof item.comment === "string")
      .slice(0, 12)
    : [];
  const envelope = getStockV5EvidenceEnvelope(phase, visibleDetailIds, revealedObjectIds, referencedObjectComments);
  const referenced = Array.isArray(body.referencedObjectIds) ? body.referencedObjectIds.filter((id): id is string => typeof id === "string" && envelope.allowedObjectIds.includes(id)).slice(0, 12) : [];
  return [
    "你是一个中立、简洁的股票研究对话 Agent。本对话只使用三家虚构公司和冻结材料，不构成投资建议。",
    "你不知道用户处于哪一种界面条件，也不要提及 Chat-only、Widget、Object 或实验分组。",
    "下面的 Evidence Envelope 是唯一事实来源。不得补充材料外的公司事实、实时行情、预测收益或确定性结论；材料没有说明时，明确说尚未提供。",
    "A-GROWTH、B-CASHFLOW 等字符串只是系统内部对象 ID；回答时必须改写为自然语言，不得向用户显示任何内部 ID。",
    "只要回答实际使用了当前允许的公司、事实、披露事件或未确认事项，就必须把对应自然短语写成 [[对象ID|用户可读表述]]；例如 [[A-GROWTH|ALFA 营收增长 24%]]。连接词、比较推理、排序和建议不得标记，也不得创造新 ID。界面会隐藏标记本身。",
    "成交活跃度只指股票交易活跃程度；不得把它写成企业现金流、企业流动性或偿债能力。",
    "确定性模块负责对象可见性、详情检索、提交与计时。你不得推进任务阶段、判断提交是否通过、透露评分规则或主动补齐用户尚未提出的评分项。",
    "你不知道 Gold path，也不得推荐唯一的下一步、暗示某个对象必须查看，或告诉用户还缺哪项证据、关系或不确定性。只回答用户实际提出的问题；可以纠正与材料直接冲突的明确事实错误。",
    "维持或改变初步候选都可以。不要暗示换股才是正确答案。回答应自然综合，不要把冻结事实机械改写成指标清单；使用自然中文，通常不超过 220 字。",
    `本轮引用对象数量：${referenced.length}。`,
    "Evidence Envelope · 当前可用摘要：",
    ...envelope.summaries,
    "Evidence Envelope · 用户已经查看或直接请求的详情：",
    ...(envelope.details.length > 0 ? envelope.details : ["无"]),
    "Evidence Envelope · 用户本轮逐对象评论：",
    ...(envelope.referencedObjectComments.length > 0 ? envelope.referencedObjectComments.map(({ objectId, comment }) => `${objectId}: ${comment}`) : ["无"]),
  ].join("\n");
}

function validatedOutput(content: string, body: ChatBody) {
  const phase = PHASES.has(body.phase as StockV5Phase) ? body.phase as StockV5Phase : "initial_exploration";
  const visibleDetailIds = Array.isArray(body.visibleDetailIds) ? body.visibleDetailIds.filter((id): id is string => typeof id === "string" && STOCK_V5_OBJECT_IDS.has(id)).slice(0, 25) : [];
  const revealedObjectIds = Array.isArray(body.revealedObjectIds) ? body.revealedObjectIds.filter((id): id is string => typeof id === "string" && STOCK_V5_OBJECT_IDS.has(id)).slice(0, 25) : visibleDetailIds;
  const referencedObjectComments = Array.isArray(body.referencedObjectComments)
    ? body.referencedObjectComments
      .filter((item): item is { objectId: string; comment: string } => Boolean(item) && typeof item.objectId === "string" && typeof item.comment === "string")
      .slice(0, 12)
    : [];
  const rawIds = [...content.matchAll(/\[\[([A-Z0-9-]+)\|[^\]]+\]\]/g)].map((match) => match[1]);
  const sanitized = sanitizeStockV5Markup(content, phase, revealedObjectIds);
  const validExplicitIds = [...sanitized.matchAll(/\[\[([A-Z0-9-]+)\|[^\]]+\]\]/g)].map((match) => match[1]);
  const ensured = ensureStockV5ObjectMarkup(sanitized, phase, revealedObjectIds);
  const outputObjectIds = [...ensured.text.matchAll(/\[\[([A-Z0-9-]+)\|[^\]]+\]\]/g)].map((match) => match[1]);
  return {
    content: ensured.text,
    outputObjectIds: [...new Set(outputObjectIds)],
    autoMarkedObjectIds: ensured.autoMarkedObjectIds,
    invalidMarkerCount: rawIds.length - validExplicitIds.length,
    evidenceEnvelope: getStockV5EvidenceEnvelope(phase, visibleDetailIds, revealedObjectIds, referencedObjectComments),
  };
}

export async function GET() {
  return Response.json({
    configured: Boolean(serverEnv("DEEPSEEK_API_KEY")),
    model: serverEnv("DEEPSEEK_MODEL") ?? "deepseek-v4-flash",
  });
}

export async function POST(request: Request) {
  if (isRateLimited(request)) return Response.json({ error: "请求过于频繁，请稍后再试。" }, { status: 429 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_000) return Response.json({ error: "请求内容过长。" }, { status: 413 });

  const apiKey = serverEnv("DEEPSEEK_API_KEY");
  if (!apiKey) return Response.json({ error: "服务端尚未配置 DEEPSEEK_API_KEY。" }, { status: 503 });

  let body: ChatBody;
  try {
    body = await request.json() as ChatBody;
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }
  const messages = cleanMessages(body.messages);
  if (!messages) return Response.json({ error: "messages 必须包含 1–16 条有效消息。" }, { status: 400 });

  const model = serverEnv("DEEPSEEK_MODEL") ?? "deepseek-v4-flash";
  const baseUrl = (serverEnv("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com").replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  const startedAt = Date.now();

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: buildSystemPrompt(body) }, ...messages],
        thinking: { type: "disabled" },
        temperature: 0.2,
        max_tokens: 500,
        stream: false,
      }),
      signal: controller.signal,
    });

    const requestId = upstream.headers.get("x-request-id") ?? crypto.randomUUID();
    if (!upstream.ok) {
      const retryable = upstream.status === 429 || upstream.status === 500 || upstream.status === 503;
      return Response.json({ error: retryable ? "模型服务暂时繁忙，请稍后重试。" : "模型请求未完成。", requestId }, { status: retryable ? 503 : 502 });
    }

    const payload = await upstream.json() as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return Response.json({ error: "模型没有返回可用内容。", requestId }, { status: 502 });
    const validated = validatedOutput(content, body);

    return Response.json({
      ...validated,
      evidenceEnvelopeHash: await payloadHash(validated.evidenceEnvelope),
      requestId,
      model,
      latencyMs: Date.now() - startedAt,
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      usage: payload.usage ?? null,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return Response.json({ error: timedOut ? "模型响应超时，请重试。" : "模型服务暂时不可用。" }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
