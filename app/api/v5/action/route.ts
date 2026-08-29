import {
  canAccessStockV5Object,
  getRevealedObjectIds,
  getStockV5Objects,
  isStockV5ObjectDirectedUtterance,
  resolveStockV5Utterance,
  STOCK_V5_OBJECT_IDS,
  type StockV5Action,
  type StockV5Phase,
} from "../../../../lib/stock-v5-registry";

type ActionBody = {
  action?: StockV5Action;
  objectIds?: string[];
  utterance?: string;
  contextObjectIds?: string[];
  phase?: StockV5Phase;
};

const PHASES = new Set<StockV5Phase>(["initial_exploration", "initial_submission", "disclosure_exploration", "final_submission", "complete"]);

async function payloadHash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  let body: ActionBody;
  try {
    body = await request.json() as ActionBody;
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }

  const phase = PHASES.has(body.phase as StockV5Phase) ? body.phase as StockV5Phase : "initial_exploration";
  let action = body.action ?? null;
  const requestedObjectIds = Array.isArray(body.objectIds) ? body.objectIds : [];
  if (requestedObjectIds.some((id) => typeof id !== "string" || !STOCK_V5_OBJECT_IDS.has(id))) {
    return Response.json({ error: "对象请求无效。" }, { status: 400 });
  }
  let objectIds = [...new Set(requestedObjectIds)];

  if (typeof body.utterance === "string") {
    const contextObjectIds = Array.isArray(body.contextObjectIds)
      ? body.contextObjectIds.filter((id): id is string => typeof id === "string" && STOCK_V5_OBJECT_IDS.has(id)).slice(-8)
      : [];
    const resolved = resolveStockV5Utterance(body.utterance.slice(0, 2000), phase, contextObjectIds);
    action = resolved.action;
    objectIds = resolved.objectIds;
  }

  if (!action) {
    const targets = getStockV5Objects(objectIds, phase);
    const directed = typeof body.utterance === "string" && isStockV5ObjectDirectedUtterance(body.utterance);
    return Response.json({
      matched: false,
      targetObjectIds: directed ? targets.map((object) => object.id) : [],
      targetObjectKinds: directed ? targets.map((object) => object.kind) : [],
    });
  }
  if (action !== "OPEN_DETAIL") {
    return Response.json({ error: "不支持的对象操作。" }, { status: 400 });
  }
  if (objectIds.length === 0) {
    return Response.json({ matched: true, needsClarification: true, message: "请说明你想操作的公司、指标或最新披露。" });
  }

  const objects = getStockV5Objects(objectIds);
  if (objects.some((object) => !canAccessStockV5Object(object, phase))) {
    return Response.json({ error: "该信息尚未在当前对话中出现。" }, { status: 403 });
  }

  const revealedObjectIds = getRevealedObjectIds(objects.map((object) => object.id));
  const publicObjects = objects.map((object) => ({
    id: object.id,
    kind: object.kind,
    stock: object.stock,
    title: object.title,
    summary: object.summary,
    payload: object.payload,
  }));
  const evidenceEnvelope = {
    objectIds: objects.map((object) => object.id),
    revealedObjectIds,
    canonicalDetails: publicObjects.map((object) => object.payload),
  };

  return Response.json({
    matched: true,
    action,
    objects: publicObjects,
    evidenceEnvelope,
    payloadHash: await payloadHash(evidenceEnvelope),
  });
}
