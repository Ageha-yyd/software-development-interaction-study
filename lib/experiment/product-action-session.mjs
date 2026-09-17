/**
 * Pure controller for the six-item executable product sandbox. Callers supply
 * an explicit operation and the participant's original text; this module does
 * not interpret language, run an Agent, or choose an action for a participant.
 *
 * Persist the returned state with compare-and-swap against the latest session.
 * Single use is enforced within that authoritative state, not across replayed
 * copies of old immutable states. Review tokens compare exact public content;
 * they are not cryptographic authentication. Keep state server-side: only the
 * public facts, preparedAction and result projections are client/tool outputs.
 */
import {
  adoptCandidate, createWorkbench, discardCandidate, exportSnapshot, guardFor,
  proposeRevision, queryItems, recordDisposition, rollbackRevision, verifyCandidate,
} from "./product-workbench.mjs";

const SCHEMA = "software-product-action-session-v42.1";
const SOURCE = "executable_product_session";
const KINDS = {
  inspect: ["kind", "target", "revisionId", "view", "query", "collection"],
  propose: ["kind", "candidateKind", "supersedesCandidateId", "verifyAfterProposal"],
  verify: ["kind", "candidateRevisionId"],
  adopt: ["kind", "candidateRevisionId", "receiptId"],
  discard: ["kind", "candidateRevisionId"],
  rollback: ["kind", "revisionId", "restoreRevisionId"],
  retain: ["kind", "revisionId", "reason"],
  defer: ["kind", "revisionId", "pendingCandidateId", "reason", "reopenCondition"],
};
const CHECK_LABELS = {
  identity_and_payload: "条目身份及内容保持",
  membership_pending_orthogonality: "集合归属与待处理状态正交",
  global_search_and_view_identity: "全局搜索及视图身份一致",
  export_import_round_trip: "导出导入往返",
  scope_changes_only_selected_items: "批量修改只影响所选条目",
  preview_matches_execution: "预览与执行范围一致",
  batch_inverse_restores_exact_items: "撤销恢复完整条目",
};
const LABELS = { baseline: "基线", linked: "联动视图", scoped: "显式逐项范围" };

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function same(left, right) { return canonical(left) === canonical(right); }
function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function text(value) { return typeof value === "string" && value.trim().length > 0; }
function extraKeys(value, allowed) { return Object.keys(value).filter((key) => !allowed.includes(key)); }
function requireSession(state) {
  if (state?.schemaVersion !== SCHEMA || !text(state.sessionId) || !Number.isSafeInteger(state.sessionVersion)
    || state.product?.workbenchId !== `${state.sessionId}:product`) throw new Error("product_session:invalid_state");
}
function contentSignature(product, target) {
  const { revisionId, config, items } = JSON.parse(exportSnapshot(product, { target }));
  return canonical({ revisionId, config, items });
}
function candidateReceipt(product, receiptId) {
  return product.receipts.find((receipt) => receipt.receiptId === receiptId && receipt.purpose === "candidate");
}
function activeAdoption(product) {
  return [...product.adoptionHistory].reverse().find((entry) => entry.revisionId === product.currentRevisionId && !entry.rolledBack);
}
function requestProblem(code, clarification, status = "needs_clarification") { return { code, clarification, status }; }
function rejected(code) { return requestProblem(code, null, "rejected"); }

function validateOperation(product, operation) {
  if (!object(operation) || !Object.hasOwn(KINDS, operation.kind)) {
    return requestProblem("explicit_operation_required", "请明确本次要执行的操作及其目标；原始请求尚未被解释为产品动作。");
  }
  if (extraKeys(operation, KINDS[operation.kind]).length) return rejected("unsupported_operation_fields");
  const requireText = (keys) => keys.find((key) => !text(operation[key]));
  const missing = requireText({
    inspect: ["target", "revisionId", "view"], propose: ["candidateKind"],
    verify: ["candidateRevisionId"], adopt: ["candidateRevisionId", "receiptId"], discard: ["candidateRevisionId"],
    rollback: ["revisionId", "restoreRevisionId"], retain: ["revisionId", "reason"], defer: ["revisionId", "reason", "reopenCondition"],
  }[operation.kind]);
  if (missing) return requestProblem(`explicit_${missing}_required`, `本次操作需要明确 ${missing}。`);
  if (operation.kind === "inspect") {
    if (!["current", "candidate"].includes(operation.target)) return requestProblem("explicit_target_required", "请明确检查当前版本还是指定候选版本。");
    if (!["all", "Inbox", "Unsorted", "Collections", "Search"].includes(operation.view)) return requestProblem("explicit_view_required", "需要一个明确存在的产品视图。");
    if (operation.view === "Search" && typeof operation.query !== "string") return requestProblem("explicit_query_required", "请提供本次搜索的原始查询文本。");
    if (operation.view === "Collections" && !text(operation.collection)) return requestProblem("explicit_collection_required", "请明确集合名称。");
    if ((operation.view !== "Search" && Object.hasOwn(operation, "query"))
      || (operation.view !== "Collections" && Object.hasOwn(operation, "collection"))) return rejected("inapplicable_query_fields");
    const revisionId = operation.target === "current" ? product.currentRevisionId : product.candidate?.revisionId;
    if (!revisionId) return rejected("candidate_missing");
    if (operation.revisionId !== revisionId) return rejected("stale_target_revision");
  }
  if (operation.kind === "propose") {
    if (!["linked", "scoped"].includes(operation.candidateKind)) return requestProblem("explicit_candidate_kind_required", "请明确要准备的候选改动。");
    if (Object.hasOwn(operation, "verifyAfterProposal") && typeof operation.verifyAfterProposal !== "boolean") return rejected("verify_after_proposal_must_be_boolean");
    if (product.candidate && operation.supersedesCandidateId !== product.candidate.revisionId) {
      return requestProblem("explicit_candidate_supersession_required", "已有未采用的候选；需要明确是否替换该候选及其版本。");
    }
    if (!product.candidate && Object.hasOwn(operation, "supersedesCandidateId")) return rejected("candidate_to_supersede_missing");
  }
  if (["verify", "adopt", "discard"].includes(operation.kind)) {
    if (!product.candidate) return rejected("candidate_missing");
    if (operation.candidateRevisionId !== product.candidate.revisionId) return rejected("stale_candidate_revision");
    if (operation.kind !== "discard" && product.candidate.baseContentSignature !== contentSignature(product, "current")) return rejected("candidate_base_is_stale");
  }
  if (operation.kind === "adopt") {
    const receipt = candidateReceipt(product, operation.receiptId);
    if (!receipt?.passed) return rejected("passing_candidate_receipt_required");
    if (receipt.revisionId !== product.candidate.revisionId || receipt.contentSignature !== contentSignature(product, "candidate")
      || receipt.baseContentSignature !== contentSignature(product, "current")) return rejected("candidate_receipt_is_stale");
  }
  if (["rollback", "retain", "defer"].includes(operation.kind) && operation.revisionId !== product.currentRevisionId) return rejected("stale_current_revision");
  if (operation.kind === "rollback") {
    if (product.candidate) return rejected("resolve_unadopted_candidate_before_rollback");
    const adoption = activeAdoption(product);
    if (!adoption) return rejected("adopted_revision_required_for_rollback");
    if (operation.restoreRevisionId !== adoption.before.revisionId) return rejected("rollback_target_mismatch");
    if (adoption.afterContentSignature !== contentSignature(product, "current")) return rejected("rollback_requires_exact_adopted_state");
  }
  if (operation.kind === "defer") {
    if (!Object.hasOwn(operation, "pendingCandidateId")) return requestProblem("explicit_pending_candidate_required", "请明确暂缓涉及的候选版本；没有候选时明确为 null。");
    if (operation.pendingCandidateId !== (product.candidate?.revisionId ?? null)) return rejected("stale_candidate_revision");
  }
  return null;
}

function itemChanges(before, after) {
  const beforeById = new Map(before.map((item) => [item.id, item]));
  const afterById = new Map(after.map((item) => [item.id, item]));
  return [...new Set([...beforeById.keys(), ...afterById.keys()])].filter((id) => !same(beforeById.get(id), afterById.get(id)))
    .map((itemId) => ({ itemId, before: beforeById.get(itemId) ?? null, after: afterById.get(itemId) ?? null }));
}
function reviewFor(product, operation) {
  const review = {
    summary: "", currentProductWillChange: false,
    currentRevisionBefore: product.currentRevisionId, currentRevisionAfter: product.currentRevisionId,
    candidateRevisionBefore: product.candidate?.revisionId ?? null, candidateRevisionAfter: product.candidate?.revisionId ?? null,
    currentItemChanges: [], candidateItemIds: [], configurationChange: null,
    inspectedItemIds: [], requiredReceiptId: operation.kind === "adopt" ? operation.receiptId : null,
    willVerifyCandidate: operation.kind === "verify" || (operation.kind === "propose" && operation.verifyAfterProposal === true),
    checkScope: "six_item_product_kernel",
  };
  if (operation.kind === "inspect") {
    review.inspectedItemIds = queryItems(product, operation).map((item) => item.id);
    review.summary = `读取 ${operation.revisionId} 的 ${operation.view} 视图，本次匹配 ${review.inspectedItemIds.length} 条，保留条目真实身份与内容。`;
  } else if (operation.kind === "propose") {
    review.candidateRevisionAfter = `C${product.nextCandidateNumber}`;
    review.candidateItemIds = product.items.map((item) => item.id);
    review.configurationChange = { target: "candidate", before: null, after: { kind: operation.candidateKind, label: LABELS[operation.candidateKind] } };
    review.summary = `从当前 ${product.currentRevisionId} 创建 ${review.candidateRevisionAfter}（${LABELS[operation.candidateKind]}），复制现有 ${product.items.length} 条数据到隔离候选，当前产品保持原版本。`;
    if (operation.supersedesCandidateId) review.summary += ` 未采用的 ${operation.supersedesCandidateId} 将归档为被替换。`;
    if (review.willVerifyCandidate) review.summary += " 随后执行候选内核检查并保留真实结果；即使通过也不自动采用，失败候选仍保留。";
    else review.summary += " 本动作不产生检查通过结论。";
  } else if (operation.kind === "verify") {
    review.candidateItemIds = product.candidate.items.map((item) => item.id);
    review.summary = `对候选 ${operation.candidateRevisionId} 执行六条数据内核检查，写入绑定确切内容的回执；检查结果待执行，当前产品不变。`;
  } else if (operation.kind === "adopt" || operation.kind === "rollback") {
    const after = operation.kind === "adopt" ? product.candidate : activeAdoption(product).before;
    review.currentProductWillChange = true;
    review.currentRevisionAfter = after.revisionId;
    review.candidateRevisionAfter = null;
    review.currentItemChanges = itemChanges(product.items, after.items);
    review.configurationChange = { target: "current", before: { kind: product.config.kind, label: LABELS[product.config.kind] }, after: { kind: after.config.kind, label: LABELS[after.config.kind] } };
    review.summary = operation.kind === "adopt"
      ? `依据 ${operation.receiptId}，将当前 ${product.currentRevisionId} 切换到已检查的 ${after.revisionId}；实际条目内容变化 ${review.currentItemChanges.length} 条。`
      : `将已采用的 ${product.currentRevisionId} 恢复到 ${after.revisionId} 的保存快照，并执行恢复检查；实际条目内容变化 ${review.currentItemChanges.length} 条。`;
  } else if (operation.kind === "discard") {
    review.candidateRevisionAfter = null;
    review.summary = `归档未采用的 ${operation.candidateRevisionId}，当前 ${product.currentRevisionId} 及其条目不变。`;
  } else {
    review.summary = `${operation.kind === "retain" ? "记录保留" : "记录暂缓"} ${product.currentRevisionId} 的参与者判断，并检查当前六条数据内核；不采用候选，也不评定判断质量。`;
  }
  return clone(review);
}

/** Requires a caller-assigned, unique ID; no random state or hidden A/B input. */
export function createProductActionSession(options) {
  if (!object(options) || extraKeys(options, ["sessionId"]).length || !text(options.sessionId)) throw new Error("product_session:explicit_session_id_required");
  return freeze({
    schemaVersion: SCHEMA, sessionId: options.sessionId, sessionVersion: 0,
    product: createWorkbench({ workbenchId: `${options.sessionId}:product` }),
    nextActionNumber: 1, preparedActions: [], events: [],
  });
}

function finish(state, status, type, detail, update = () => {}, output = {}) {
  const next = clone(state);
  next.sessionVersion += 1;
  for (const prepared of next.preparedActions) {
    if (prepared.status === "pending") {
      prepared.status = "invalidated";
      prepared.invalidatedAtSessionVersion = next.sessionVersion;
    }
  }
  update(next);
  const event = {
    eventId: `${state.sessionId}:action-event:${next.sessionVersion}`,
    type, status, sessionId: state.sessionId, sessionVersion: next.sessionVersion,
    previousProductStateVersion: state.product.stateVersion, productStateVersion: next.product.stateVersion,
    evidenceClass: "authored_implementation_sandbox", ...detail,
  };
  next.events.push(event);
  return freeze({ state: next, status, event, ...output });
}

/**
 * A preparation changes only the controller log/version, never the product.
 * Any subsequent request invalidates prior preparations, including rejections.
 * The participant must review a fresh preparation after a rejected execution.
 */
export function prepareProductAction(state, input) {
  requireSession(state);
  const participantRequest = typeof input?.participantRequest === "string" ? input.participantRequest : null;
  let problem;
  if (!object(input) || extraKeys(input, ["expectedSessionVersion", "participantRequest", "operation"]).length) problem = rejected("unsupported_request_fields");
  else if (input.expectedSessionVersion !== state.sessionVersion) problem = rejected("stale_session_version");
  else if (!text(participantRequest)) problem = requestProblem("participant_request_required", "需要参与者本次请求的完整原文。");
  else problem = validateOperation(state.product, input.operation);
  if (problem) {
    // Unsupported metadata is rejected, not forwarded or retained as tool data.
    const safeOperation = object(input?.operation) && (Object.hasOwn(KINDS, input.operation.kind)
      ? !extraKeys(input.operation, KINDS[input.operation.kind]).length : !extraKeys(input.operation, ["kind"]).length)
      ? clone(input.operation) : null;
    return finish(state, problem.status, "product_action_prepare_rejected", {
      participantRequest, operation: safeOperation, code: problem.code, clarification: problem.clarification,
    }, undefined, { preparedAction: null, code: problem.code, clarification: problem.clarification });
  }
  const operation = clone(input.operation);
  const preparedActionId = `${state.sessionId}:action:${state.nextActionNumber}`;
  const review = reviewFor(state.product, operation);
  const expectedReviewToken = canonical({ sessionId: state.sessionId, sourceSessionVersion: state.sessionVersion,
    participantRequest, operation, review, facts: getPublicProductFacts(state) });
  const requiredConfirmation = {
    preparedActionId, expectedSessionId: state.sessionId, expectedSessionVersion: state.sessionVersion + 1,
    expectedProductStateVersion: state.product.stateVersion, expectedCurrentRevisionId: state.product.currentRevisionId,
    expectedCandidateId: state.product.candidate?.revisionId ?? null,
    expectedReceiptId: review.requiredReceiptId, expectedReviewToken,
  };
  const preparedAction = { preparedActionId, operation, participantRequest, review, requiredConfirmation };
  return finish(state, "prepared", "product_action_prepared", { preparedActionId, participantRequest, operation, review }, (next) => {
    next.nextActionNumber += 1;
    next.preparedActions.push({
      preparedActionId, status: "pending", publicAction: preparedAction,
      productBinding: canonical(state.product),
      receiptBinding: review.requiredReceiptId === null ? null : canonical(candidateReceipt(state.product, review.requiredReceiptId)),
    });
  }, { preparedAction });
}

function publicReceipt(receipt) {
  return receipt ? {
    receiptId: receipt.receiptId, purpose: receipt.purpose, revisionId: receipt.revisionId,
    passed: receipt.passed, checks: receipt.checks.map(({ name, passed }) => ({ name, passed })),
    evidenceClass: "executed_engineering_checks", scope: "six_item_product_kernel", limitations: [...receipt.limitations],
  } : null;
}
function runOperation(product, operation) {
  if (operation.kind === "inspect") return {
    product, kernelEventIds: [], result: { kind: "inspect", target: operation.target, revisionId: operation.revisionId,
      view: operation.view, query: operation.query ?? null, collection: operation.collection ?? null,
      items: clone(queryItems(product, operation)), evidenceClass: "authored_implementation_sandbox" },
  };
  let outcome;
  const options = guardFor(product);
  if (operation.kind === "propose") outcome = proposeRevision(product, { ...options, kind: operation.candidateKind, supersedesCandidateId: operation.supersedesCandidateId });
  else if (operation.kind === "verify") outcome = verifyCandidate(product, options);
  else if (operation.kind === "adopt") outcome = adoptCandidate(product, { ...options, receiptId: operation.receiptId });
  else if (operation.kind === "discard") outcome = discardCandidate(product, options);
  else if (operation.kind === "rollback") outcome = rollbackRevision(product, options);
  else outcome = recordDisposition(product, { ...options, kind: operation.kind, reason: operation.reason, reopenCondition: operation.reopenCondition });
  const kernelEventIds = [outcome.event.eventId];
  if (operation.kind === "propose" && operation.verifyAfterProposal === true) {
    outcome = verifyCandidate(outcome.state, guardFor(outcome.state));
    kernelEventIds.push(outcome.event.eventId);
  }
  return { product: outcome.state, kernelEventIds, result: {
    kind: operation.kind, currentRevisionId: outcome.state.currentRevisionId,
    candidateRevisionId: outcome.state.candidate?.revisionId ?? null,
    receipt: publicReceipt(outcome.state.receipts.find((entry) => entry.receiptId === outcome.event.receiptId)),
    disposition: outcome.event.type === "disposition_recorded" ? clone(outcome.state.disposition) : null,
  } };
}

/** Pass the exact preparedAction.requiredConfirmation and explicit true. */
export function executeProductAction(state, input) {
  requireSession(state);
  const prepared = state.preparedActions.find((entry) => entry.preparedActionId === input?.preparedActionId);
  const confirmation = prepared?.publicAction.requiredConfirmation;
  let problem;
  if (!prepared || prepared.status !== "pending") problem = rejected("prepared_action_unavailable");
  else if (!object(input) || extraKeys(input, [...Object.keys(confirmation), "participantConfirmed"]).length) problem = rejected("unsupported_confirmation_fields");
  else if (input.participantConfirmed !== true) problem = rejected("explicit_participant_confirmation_required");
  else {
    const mismatched = Object.keys(confirmation).find((key) => input[key] !== confirmation[key]);
    if (mismatched) problem = rejected(`confirmation_mismatch:${mismatched}`);
    else if (state.sessionVersion !== confirmation.expectedSessionVersion) problem = rejected("stale_session_version");
    else if (confirmation.expectedReceiptId !== null && canonical(candidateReceipt(state.product, confirmation.expectedReceiptId)) !== prepared.receiptBinding) problem = rejected("prepared_receipt_changed");
    else if (canonical(state.product) !== prepared.productBinding) problem = rejected("prepared_product_state_changed");
    else problem = validateOperation(state.product, prepared.publicAction.operation);
  }
  const detail = {
    preparedActionId: typeof input?.preparedActionId === "string" ? input.preparedActionId : null,
    participantRequest: prepared?.publicAction.participantRequest ?? null,
    operation: prepared?.publicAction.operation ?? null,
    participantConfirmed: input?.participantConfirmed === true,
  };
  let execution;
  if (!problem) {
    try { execution = runOperation(state.product, prepared.publicAction.operation); }
    catch (error) { problem = rejected(error instanceof Error && error.message.startsWith("workbench:") ? error.message : "product_action_execution_failed"); }
  }
  if (problem) return finish(state, "rejected", "product_action_execute_rejected", { ...detail, code: problem.code }, (next) => {
    const record = next.preparedActions.find((entry) => entry.preparedActionId === detail.preparedActionId);
    if (record && record.status === "invalidated" && prepared?.status === "pending") record.status = "rejected";
  }, { result: null, code: problem.code });
  return finish(state, "executed", "product_action_executed", { ...detail, kernelEventIds: execution.kernelEventIds, result: execution.result }, (next) => {
    next.product = execution.product;
    const record = next.preparedActions.find((entry) => entry.preparedActionId === prepared.preparedActionId);
    record.status = "consumed";
    record.consumedAtSessionVersion = next.sessionVersion;
  }, { result: execution.result });
}

// Hex encoding is injective for the UTF-8 session ID and satisfies the existing
// uppercase fact-marker grammar even when a session uses a lowercase UUID.
function idPart(value) { return [...new TextEncoder().encode(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase(); }
function itemBody(item) {
  return `${item.id}：${item.title}\nURL：${item.url}\n备注：${item.note}\n标签：${JSON.stringify(item.tags)}\n集合归属：${JSON.stringify(item.memberships)}\n待处理：${item.pending ? "是" : "否"}。`;
}

/** Selective projection only: never spread product, config, receipts or logs. */
export function getPublicProductFacts(state) {
  requireSession(state);
  const product = state.product;
  const prefix = `PRODUCT:${idPart(state.sessionId)}:STATE:${product.stateVersion}`;
  const facts = [];
  const add = (suffix, kind, title, body, revisionId = null, evidenceClass = "authored_implementation_sandbox") => facts.push({
    id: `${prefix}:${suffix}`, kind, title, body, revisionId, evidenceClass, source: SOURCE,
    asOfProductStateVersion: product.stateVersion,
  });
  const currentSignature = contentSignature(product, "current");
  const candidateSignature = product.candidate ? contentSignature(product, "candidate") : null;
  const snapshots = [{ role: "CURRENT", kind: "current_revision", title: "当前产品", revisionId: product.currentRevisionId, config: product.config, items: product.items }];
  if (product.candidate) snapshots.push({ role: "CANDIDATE", kind: "candidate_revision", title: "未采用候选",
    revisionId: product.candidate.revisionId, config: product.candidate.config,
    items: product.candidate.items, baseRevisionId: product.candidate.baseRevisionId });
  for (const snapshot of snapshots) {
    const signature = snapshot.role === "CURRENT" ? currentSignature : candidateSignature;
    const matching = product.receipts.filter((receipt) => receipt.revisionId === snapshot.revisionId && receipt.contentSignature === signature);
    const latest = matching.at(-1);
    const status = latest ? `${latest.receiptId}：${latest.passed ? "内核检查通过" : "内核检查未全部通过"}` : "尚无绑定当前内容的检查回执";
    const boundary = snapshot.role === "CANDIDATE" ? `来自 ${snapshot.baseRevisionId}，尚未采用；当前产品仍为 ${product.currentRevisionId}。` : "这是当前实际产品状态。";
    add(`${snapshot.role}:${snapshot.revisionId}`, snapshot.kind, `${snapshot.title} ${snapshot.revisionId}`,
      `${snapshot.revisionId}（${LABELS[snapshot.config.kind]}），${snapshot.items.length} 条实现沙盒数据。${boundary}\n待处理 ${snapshot.items.filter((item) => item.pending).length} 条；未归入集合 ${snapshot.items.filter((item) => item.memberships.length === 0).length} 条。\n${status}。`, snapshot.revisionId);
    for (const item of snapshot.items) add(`REVISION:${snapshot.revisionId}:ITEM:${item.id}`, "product_item", `${snapshot.revisionId} / ${item.id}`, itemBody(item), snapshot.revisionId);
  }
  for (const receipt of product.receipts) {
    const matchesCurrent = receipt.revisionId === product.currentRevisionId && receipt.contentSignature === currentSignature;
    const matchesCandidate = receipt.revisionId === product.candidate?.revisionId && receipt.contentSignature === candidateSignature;
    const purpose = { candidate: "候选检查", rollback_restoration: "回退后恢复检查", disposition_current_state: "处置时当前状态检查" }[receipt.purpose];
    const checks = receipt.checks.map((check) => `${CHECK_LABELS[check.name] ?? "未命名内核检查"}：${check.passed ? "通过" : "未通过"}`).join("；");
    const relation = matchesCurrent ? "内容与当前产品一致" : matchesCandidate ? "内容与当前未采用候选一致" : "历史版本回执，不授权当前内容";
    add(`RECEIPT:${idPart(receipt.receiptId)}`, "verification_receipt", `${receipt.revisionId} ${purpose}`,
      `回执 ${receipt.receiptId}；${purpose}；${receipt.passed ? "全部内核检查通过" : "存在未通过的内核检查"}。${relation}。\n${checks}。\n仅覆盖六条数据内核的实际操作检查；其中范围性质检查使用受控探针条目，不是参与者操作或用户效果。`, receipt.revisionId, "executed_engineering_checks");
  }
  if (product.disposition) {
    const disposition = product.disposition;
    const receipt = product.receipts.find((entry) => entry.receiptId === disposition.receiptId);
    const current = disposition.currentRevisionId === product.currentRevisionId
      && disposition.pendingCandidateId === (product.candidate?.revisionId ?? null) && receipt?.contentSignature === currentSignature;
    add(`DISPOSITION:${disposition.currentRevisionId}`, current ? "participant_disposition" : "historical_participant_disposition",
      `${disposition.currentRevisionId} ${current ? "已记录处置" : "历史处置"}`,
      `${current ? "参与者记录" : "历史记录，参与者当时记录"}${disposition.kind === "retain" ? "保留" : "暂缓"}：${disposition.reason}\n${current ? "待定候选" : "记录当时的待定候选"}：${disposition.pendingCandidateId ?? "无"}。${current && disposition.pendingCandidateId !== null ? "候选仍未采用，也未被丢弃。" : ""}${disposition.reopenCondition === null ? "" : `\n重开条件：${disposition.reopenCondition}`}\n${current ? "" : "该记录不表示候选目前仍待定。"}该记录不评定判断质量。`, disposition.currentRevisionId);
  }
  add("EVIDENCE-BOUNDARY", "evidence_boundary", "实现及检查的证据边界",
    "本会话操作 6 条固定作者构造数据，独立于 144 条观察材料及其候选评价。检查回执来自本内核实际执行，不将模拟评价当作运行结果。尚未验证浏览器键盘路径、屏幕阅读器、移动端可用性、人的沟通效率或全部 144 条材料的产品执行。本层只接受明确操作和参与者确认；准备操作本身不会产生检查通过结论。",
    null);
  return freeze(facts);
}
