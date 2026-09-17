import { createProductSession, executeSessionAction, productSessionSnapshot } from "../../../lib/experiment/product-service";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 64_000) return Response.json({ error: "product_request_too_large" }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || Array.isArray(body) || typeof body !== "object") throw new Error("invalid_body");
  } catch { return Response.json({ error: "product_request_invalid" }, { status: 400 }); }
  const allowed = new Set(["action", "sessionId", "confirmation"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) return Response.json({ error: "product_request_fields_invalid" }, { status: 400 });
  try {
    if (body.action === "create" && Object.keys(body).length === 1) return Response.json(createProductSession());
    if (typeof body.sessionId !== "string") return Response.json({ error: "product_session_required" }, { status: 400 });
    if (body.action === "status" && !body.confirmation) return Response.json(productSessionSnapshot(body.sessionId));
    if (body.action !== "execute" || !body.confirmation || typeof body.confirmation !== "object" || Array.isArray(body.confirmation)) {
      return Response.json({ error: "product_confirmation_required" }, { status: 400 });
    }
    const result = executeSessionAction(body.sessionId, body.confirmation as Record<string, unknown>);
    return Response.json({
      status: result.status, event: result.event, result: result.result,
      snapshot: result.snapshot,
    }, { status: result.status === "executed" ? 200 : 409 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "product_operation_unavailable" }, { status: 409 });
  }
}
