/** Loopback-only engineering fixture. Exact test phrases are not NL detection. */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PRODUCT_MOCK_PORT ?? 3423);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("invalid_product_mock_port");
const commands = {
  propose: "[ENGINEERING MOCK] PROPOSE_SCOPED_VERIFY",
  adopt: "[ENGINEERING MOCK] ADOPT_CHECKED_CANDIDATE",
  rollback: "[ENGINEERING MOCK] ROLLBACK_CURRENT",
  evaluate: "[ENGINEERING MOCK] EVALUATE_FULL_PAGE",
};
function completion(body) {
  const system = body.messages?.find((message) => message.role === "system")?.content ?? "";
  const query = body.messages?.at(-1)?.content ?? "";
  const match = /当前产品的最小权威元数据[^：]*：(\{.*\})。只有/u.exec(system);
  const authority = match ? JSON.parse(match[1]) : null;
  const available = new Set((body.tools ?? []).map((tool) => tool.function?.name));
  let operation;
  let evaluation;
  if (query === commands.propose && authority) operation = { kind: "propose", candidateKind: "scoped", verifyAfterProposal: true,
    ...(authority.candidateRevisionId ? { supersedesCandidateId: authority.candidateRevisionId } : {}) };
  if (query === commands.adopt && authority?.candidateRevisionId) {
    const receipt = [...authority.receipts].reverse().find((item) => item.purpose === "candidate" && item.passed && item.revisionId === authority.candidateRevisionId);
    if (receipt) operation = { kind: "adopt", candidateRevisionId: authority.candidateRevisionId, receiptId: receipt.receiptId };
  }
  if (query === commands.rollback && authority?.rollbackTargetRevisionId) operation = {
    kind: "rollback", revisionId: authority.currentRevisionId, restoreRevisionId: authority.rollbackTargetRevisionId,
  };
  if (query === commands.evaluate && authority) {
    const capability = authority.evaluationCapabilities.find((item) => item.target === "candidate") ?? authority.evaluationCapabilities[0];
    if (capability) {
      const { target, candidateRevisionId, windowId, protocolId, scope } = capability;
      evaluation = { action: "publish", target, candidateRevisionId, windowId, protocolId, scope, query: { kind: "full", maxRecords: 2 } };
    }
  }
  const name = operation ? "prepare_product_action" : evaluation ? "request_candidate_evaluation" : null;
  if (name && available.has(name)) return { message: { role: "assistant", content: null, tool_calls: [{
    id: `engineering-mock-${randomUUID()}`, type: "function", function: { name, arguments: JSON.stringify(operation ? { operation } : evaluation) },
  }] }, finish_reason: "tool_calls" };
  const node = /\[([A-Z0-9:@._+-]+)\] ([^\n]+)\n([\s\S]*?)\n允许锚点短语：([^\n]+)/u.exec(system);
  const content = node && node[3].length < 20_000
    ? `工程模拟回复，仅用于接口连通测试，不代表模型自然语言能力。\n[[${node[1]}|${node[4].split(" | ")[0]}]]\n${node[3]}`
    : "工程模拟回复，仅用于接口连通测试。当前请求未触发一个具有有效版本依据的固定测试动作，产品没有被修改。";
  return { message: { role: "assistant", content }, finish_reason: "stop" };
}
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/chat/completions") {
    response.writeHead(404).end("engineering_mock_route_not_found");
    return;
  }
  try {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 8_388_608) { response.writeHead(413).end("engineering_mock_request_limit"); return; }
      chunks.push(chunk);
    }
    const choice = completion(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    response.writeHead(200, { "Content-Type": "application/json", "x-request-id": `engineering-mock-${randomUUID()}` });
    response.end(JSON.stringify({ choices: [choice], usage: null, engineeringMock: true }));
  } catch {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "engineering_mock_request_invalid" }));
  }
});
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`${JSON.stringify({ status: "listening", baseUrl: `http://127.0.0.1:${port}`, evidenceClass: "automated_engineering_mock", commands })}\n`);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
