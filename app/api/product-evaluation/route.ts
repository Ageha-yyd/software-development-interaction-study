import { downloadSessionEvaluation } from "../../../lib/experiment/product-service";

/** Same-session complete material download; it never publishes a new window. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const keys = [...url.searchParams.keys()];
  if (keys.length !== 2 || new Set(keys).size !== 2 || keys.some((key) => !["sessionId", "publicationId"].includes(key))) {
    return Response.json({ error: "需要本会话及已发布窗口的准确标识。" }, { status: 400 });
  }
  const sessionId = url.searchParams.get("sessionId");
  const publicationId = url.searchParams.get("publicationId");
  if (!sessionId || !publicationId || sessionId.length > 128 || publicationId.length > 256) {
    return Response.json({ error: "需要本会话及已发布窗口的准确标识。" }, { status: 400 });
  }
  try {
    const result = downloadSessionEvaluation(sessionId, publicationId);
    return new Response(result.body, {
      status: 200,
      headers: { "Content-Type": result.contentType, "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return Response.json({ error: "此会话没有可读取的已发布窗口，或会话已失效；未发布任何新材料。" }, { status: 404 });
  }
}
