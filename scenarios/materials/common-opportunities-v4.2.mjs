/**
 * Authored, isolated software-development opportunities. These are synthetic
 * stimuli and technical decision predicates, not participant observations,
 * executed engineering receipts, or natural-language/decision-quality scoring.
 * The same task, facts, actions and predicates apply to A and B. All scoped facts
 * may be returned together by one Full Chat request; no click/read path is scored.
 */
const EVIDENCE_CLASS = 'authored_synthetic_stimulus';
const VERSION = 'common-opportunities-v4.2';
const STATE_TASK = '保持这个阅读清单的可靠保存与找回，根据接下来的产品结果判断是否需要调整当前产品。请核对涉及的对象、当前状态、适用规则和证据版本，给出与可用证据一致的处置，说明采用或保留的范围及仍未解决的问题。若暂缓，指出实际缺口如何影响下一动作，以及需要补充什么信息或检查。';
const PORTABILITY_TASK = '在产品演进中保护资料身份、内容、组织关系与访问连续性，根据接下来的结果判断本轮可以认可或采用的范围。请把相关记录与其版本对应，区分已获支持和仍未核实的变化，明确采用、保留或暂缓的处置及安全保留状态。若暂缓，指出实际缺口如何影响下一动作，以及需要补充什么信息或检查。';

function fact(id, text, exactRevision, assertions) {
  return {
    id,
    text,
    source: `authored://${VERSION}/${id}`,
    exactRevision,
    assertions,
    evidenceClass: EVIDENCE_CLASS,
  };
}

function outcome(id, action, revision, scope, requiredFacts, evidenceRefs) {
  return { id, action, revision, scope, requiredFacts, evidenceRefs };
}

const stateRevision = 'ANCHOR-STATE-R7';
const stateFacts = [
  fact('AS:ITEM-201', '条目 Release checklist 在该记录时仍待处理，属于 Delivery Collection。', stateRevision, {
    itemId: 'anchor-state-item-201', pending: true, membershipIds: ['anchor-collection-delivery'],
  }),
  fact('AS:VIEW-RULE', 'Inbox 表示待处理；Unsorted 表示没有 Collection 归属。修改归属不会自动更改待处理状态。', stateRevision, {
    unsortedDefinition: 'zero-memberships', stateRelation: 'orthogonal',
  }),
  fact('AS:EVENT', '最近事件只为同一条目添加 Delivery membership，没有清除 Inbox，没有产生副本。', stateRevision, {
    lastMutation: 'add-membership-only', identityPreserved: true, inboxVisible: true, unsortedVisible: false,
  }),
];
const stateRequired = {
  itemId: 'anchor-state-item-201', pending: true, membershipIds: ['anchor-collection-delivery'],
  stateRelation: 'orthogonal', identityPreserved: true, inboxVisible: true, unsortedVisible: false,
};

const wlRevision = 'ANCHOR-WL-C2';
const wlFacts = [
  fact('AW:CHANGE', '候选新增逐项范围预览和取消单条控件。跨筛选显式选择仍保留，提交只改变 membership，Inbox 状态保持独立。', wlRevision, {
    candidateRevision: wlRevision, change: 'per-item-preview-and-cancel',
    mutationScope: 'membership-only', inboxMutation: false,
  }),
  fact('AW:SELECTION', '范围记录中的两个选中对象为 anchor-watch-item-311 与 anchor-watch-item-312。取消后只应提交 311；撤销须恢复该次 membership 差异，不能清除 Inbox。', wlRevision, {
    selectedItemIds: ['anchor-watch-item-311', 'anchor-watch-item-312'],
    remainingItemIds: ['anchor-watch-item-311'], inverseScope: 'committed-membership-delta',
  }),
  fact('AW:OLD-RECEIPT', '旧检查覆盖 C1 的数量/来源预览、确认及整组撤销；当时没有逐项取消控件。它不能覆盖 C2 的取消后焦点与剩余选择。', 'ANCHOR-WL-C1', {
    oldReceiptRevision: 'ANCHOR-WL-C1', oldReceiptCurrentForCancel: false,
  }),
  fact('AW:CURRENT-RECEIPTS', '本候选的身份和导出内容检查记录为通过；取消后的焦点、剩余选择与提交/撤销联合路径没有对应结果。', wlRevision, {
    identityAndPayload: 'current-pass',
    missingCheck: 'cancel-focus-remaining-selection-and-inverse',
    nextCheck: 'cancel-focus-remaining-selection-and-inverse',
  }),
  fact('AW:ACTIVE-STATE', '当前已采用产品仍是 ANCHOR-WL-R0；C2 隔离候选尚未采用，没有后台迁移。可以保留 R0，或明确缺口后暂缓候选。', 'ANCHOR-WL-R0', {
    safeRevision: 'ANCHOR-WL-R0', candidateAdopted: false, pendingBackgroundMutation: false,
  }),
];
const wlRequired = {
  candidateRevision: wlRevision, mutationScope: 'membership-only', inboxMutation: false,
  remainingItemIds: ['anchor-watch-item-311'], inverseScope: 'committed-membership-delta',
  oldReceiptCurrentForCancel: false, missingCheck: 'cancel-focus-remaining-selection-and-inverse',
  safeRevision: 'ANCHOR-WL-R0', candidateAdopted: false,
};
const wlRefs = wlFacts.map(({ id }) => id);

const portRevision = 'ANCHOR-PORT-R3';
const portFacts = [
  fact('AP:RECEIPT', '回执 export-803 绑定当前 R3：导出后重新导入的 canonical ID、URL、Note、Tag 和 membership 集合保持一致。', portRevision, {
    receiptId: 'anchor-export-803', receiptRevision: portRevision,
    roundTripScope: 'id-url-note-tag-membership', roundTripPassed: true,
  }),
  fact('AP:SCOPE-BOUNDARY', '本回执是当前格式的导出/重新导入检查，不覆盖未来 schema 迁移、旧版本恢复或旧深链接路由。', portRevision, {
    coversFutureMigration: false, coversRollback: false, coversLegacyRoutes: false,
  }),
  fact('AP:CURRENT-STATE', '当前产品是 ANCHOR-PORT-R3。没有请求迁移或更换当前格式；该导出可以保留为已核对的当前格式备份。', portRevision, {
    currentRevision: portRevision, requestedMutation: 'none',
  }),
];
const portRequired = {
  receiptId: 'anchor-export-803', receiptRevision: portRevision,
  roundTripScope: 'id-url-note-tag-membership', roundTripPassed: true,
  coversFutureMigration: false, coversRollback: false, coversLegacyRoutes: false,
};

const migrationRevision = 'ANCHOR-MIG-C4';
const migrationFacts = [
  fact('AM:CHANGE', 'C4 候选改变 membership 存储格式和旧链接路由；任务是界定可认可的检查范围，并决定是否可以采用完整迁移。', migrationRevision, {
    candidateRevision: migrationRevision, changesMembershipSchema: true, changesLegacyRoutes: true,
  }),
  fact('AM:ROUNDTRIP', '当前 C4 的 export-904 检查了 C4 导出再导入 C4；ID、内容与多重归属均一致。它没有将数据恢复到 R2。', migrationRevision, {
    exportReceiptRevision: migrationRevision, exportRoundTripPassed: true,
    exportRoundTripScope: 'C4-to-C4', roundTripProvesRollback: false,
  }),
  fact('AM:FORWARD', 'R2→C4 正向迁移记录通过，两个独立条目 anchor-migration-item-411/412 的多重归属保留。正向成功不意味着逆向恢复成功。', migrationRevision, {
    forwardMigrationPassed: true, rollbackVerified: false,
    migratedItemIds: ['anchor-migration-item-411', 'anchor-migration-item-412'],
  }),
  fact('AM:LEGACY', '旧链接回执只对应 R2 的旧路由。C4 修改了路由，当前没有 C4 的旧链接检查。', 'ANCHOR-MIG-R2', {
    legacyReceiptRevision: 'ANCHOR-MIG-R2', legacyReceiptCurrent: false,
  }),
  fact('AM:RECOVERY', '恢复方案列出 C4→R2 的 membership 映射，但尚无执行结果。完整迁移采用前仍缺逆向恢复和当前旧链接两项检查。', migrationRevision, {
    missingChecks: ['C4-to-R2-rollback', 'C4-legacy-links'],
    nextChecks: ['C4-to-R2-rollback', 'C4-legacy-links'],
  }),
  fact('AM:ACTIVE-STATE', '当前产品仍是 ANCHOR-MIG-R2，C4 只在隔离副本。可认可 C4→C4 导出检查而不采用完整迁移，也可保留 R2 或针对实际缺口暂缓。', 'ANCHOR-MIG-R2', {
    safeRevision: 'ANCHOR-MIG-R2', migrationAdopted: false, pendingBackgroundMutation: false,
  }),
];
const migrationRequired = {
  candidateRevision: migrationRevision, exportReceiptRevision: migrationRevision,
  exportRoundTripPassed: true, exportRoundTripScope: 'C4-to-C4', roundTripProvesRollback: false,
  forwardMigrationPassed: true, rollbackVerified: false, legacyReceiptCurrent: false,
  missingChecks: ['C4-to-R2-rollback', 'C4-legacy-links'],
  safeRevision: 'ANCHOR-MIG-R2', migrationAdopted: false,
};
const migrationRefs = migrationFacts.map(({ id }) => id);

const opportunities = [
  {
    id: 'OP:COMMON-LOCAL-STATE', topic: 'orthogonal-state', complexity: 'local',
    subjectRevision: stateRevision, sandboxId: 'isolated-anchor-state',
    task: STATE_TASK,
    trigger: 'Release checklist 的新报告已到达：“刚归到 Delivery 后，在 Unsorted 中找不到它。”条目状态、最近操作和现有视图定义均可查询；当前没有修改产品。',
    facts: stateFacts,
    allowedActions: [
      { action: 'confirm', text: '确认此处视图变化是否符合现有语义，明确两个视图中的状态。' },
      { action: 'retain', text: '有依据地保留当前状态规则与条目状态，不发起修改。' },
    ],
    gold: [
      outcome('AS:CONFIRM', 'confirm', stateRevision, ['orthogonal-state'], stateRequired, stateFacts.map(({ id }) => id)),
      outcome('AS:RETAIN', 'retain', stateRevision, ['orthogonal-state'], stateRequired, stateFacts.map(({ id }) => id)),
    ],
  },
  {
    id: 'OP:COMMON-COMPOUND-WL', topic: 'scope-and-currentness', complexity: 'compound',
    subjectRevision: wlRevision, sandboxId: 'isolated-anchor-watchlist',
    task: STATE_TASK,
    trigger: '联动候选的新预览已经返回，范围示例和检查索引可查看。团队准备判断是否采用；当前产品仍未切换。',
    facts: wlFacts,
    allowedActions: [
      { action: 'retain', text: '依据现有记录保留当前产品，候选不采用。' },
      { action: 'defer', text: '明确范围与当前检查缺口，保留安全产品并指定所需检查。' },
    ],
    gold: [
      outcome('AW:RETAIN', 'retain', wlRevision, ['cancel-preview-focus', 'membership-inverse'], wlRequired, wlRefs),
      outcome('AW:DEFER', 'defer', wlRevision, ['cancel-preview-focus', 'membership-inverse'], {
        ...wlRequired, nextCheck: 'cancel-focus-remaining-selection-and-inverse',
      }, wlRefs),
    ],
  },
  {
    id: 'OP:COMMON-LOCAL-PORTABILITY', topic: 'portability', complexity: 'local',
    subjectRevision: portRevision, sandboxId: 'isolated-anchor-portability',
    task: PORTABILITY_TASK,
    trigger: '新的导出文件与检查回执 export-803 已就绪，版本和范围记录可查询。请判断现在可以怎样描述这个备份。',
    facts: portFacts,
    allowedActions: [
      { action: 'accept', text: '仅认可当前格式导出/重新导入回执的已验证范围。' },
      { action: 'retain', text: '保留当前格式与已核对备份，不发起迁移。' },
    ],
    gold: [
      outcome('AP:ACCEPT-EXPORT', 'accept', portRevision, ['current-format-roundtrip'], portRequired, portFacts.map(({ id }) => id)),
      outcome('AP:RETAIN', 'retain', portRevision, ['current-format-roundtrip'], portRequired, portFacts.map(({ id }) => id)),
    ],
  },
  {
    id: 'OP:COMMON-COMPOUND-PORTABILITY', topic: 'migration-and-recovery', complexity: 'compound',
    subjectRevision: migrationRevision, sandboxId: 'isolated-anchor-migration',
    task: PORTABILITY_TASK,
    trigger: '迁移候选返回了一份新的导出结果，同时更新了迁移、恢复和路由检查索引。当前产品仍在原版本；团队需要决定本轮认可和采用的范围。',
    facts: migrationFacts,
    allowedActions: [
      { action: 'accept', text: '只认可 C4 的当前格式 roundtrip 检查，明确完整迁移不采用。' },
      { action: 'retain', text: '在有依据的范围判断后保留当前产品，不采用候选。' },
      { action: 'defer', text: '保留安全产品，明确完整迁移缺少的恢复与旧链接检查。' },
    ],
    gold: [
      outcome('AM:ACCEPT-EXPORT-ONLY', 'accept', migrationRevision, ['C4-export-roundtrip-only'], migrationRequired, migrationRefs),
      outcome('AM:RETAIN', 'retain', migrationRevision, ['full-migration'], migrationRequired, migrationRefs),
      outcome('AM:DEFER', 'defer', migrationRevision, ['full-migration'], {
        ...migrationRequired, nextChecks: ['C4-to-R2-rollback', 'C4-legacy-links'],
      }, migrationRefs),
    ],
  },
].map((opportunity) => ({
  ...opportunity,
  version: VERSION,
  evidenceClass: EVIDENCE_CLASS,
  factsAvailableTogether: true,
  conditionInvariant: true,
  observedParticipantData: false,
  engineeringExecutionEvidence: false,
  naturalLanguageDecisionInference: false,
  analysisBoundary: 'Fixed authored task set; not a general complexity law or human-efficiency result.',
}));

function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') deepFreeze(child);
  });
  return Object.freeze(value);
}
deepFreeze(opportunities);

function plainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function sameValue(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => sameValue(value, right[index]));
  }
  if (plainRecord(left) || plainRecord(right)) {
    return plainRecord(left) && plainRecord(right)
      && Object.keys(left).length === Object.keys(right).length
      && Object.keys(left).every((key) => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
  }
  return left === right;
}

function uniqueStrings(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string' && entry.length > 0)
    && new Set(value).size === value.length;
}

function sameSet(left, right) {
  return uniqueStrings(left) && uniqueStrings(right) && left.length === right.length
    && left.every((value) => right.includes(value));
}

/** Fresh copies prevent consumers from changing the scoring authority. */
export function getCommonOpportunities() {
  return structuredClone(opportunities);
}

/** Structural/material consistency only. Passing does not qualify an experiment. */
export function validateCommonOpportunities(candidate = getCommonOpportunities()) {
  const errors = [];
  if (!Array.isArray(candidate)) return { valid: false, errors: ['opportunities_must_be_array'], opportunityCount: 0 };
  const ids = new Set();
  const allFactIds = new Set();
  const sandboxIds = new Set();
  if (candidate.length !== 4) errors.push('expected_four_common_opportunities');
  for (const op of candidate) {
    if (!plainRecord(op)) { errors.push('opportunity_must_be_record'); continue; }
    const prefix = typeof op.id === 'string' ? op.id : 'unknown';
    if (!op.id || ids.has(op.id)) errors.push(`${prefix}:duplicate_or_missing_id`);
    ids.add(op.id);
    if (!op.sandboxId || sandboxIds.has(op.sandboxId)) errors.push(`${prefix}:sandbox_not_isolated`);
    sandboxIds.add(op.sandboxId);
    if (!op.task?.trim() || !op.trigger?.trim() || !op.subjectRevision) errors.push(`${prefix}:missing_public_contract`);
    if (op.evidenceClass !== EVIDENCE_CLASS || op.observedParticipantData !== false
      || op.engineeringExecutionEvidence !== false || op.naturalLanguageDecisionInference !== false) {
      errors.push(`${prefix}:invalid_evidence_boundary`);
    }
    if (op.factsAvailableTogether !== true || op.conditionInvariant !== true) errors.push(`${prefix}:parity_contract_missing`);
    const facts = Array.isArray(op.facts) ? op.facts : [];
    const gold = Array.isArray(op.gold) ? op.gold : [];
    if (!facts.length || !gold.length) errors.push(`${prefix}:missing_facts_or_gold`);
    const factualAssertions = {};
    const byId = new Map();
    for (const item of facts) {
      if (!plainRecord(item)) { errors.push(`${prefix}:fact_must_be_record`); continue; }
      if (!item.id || allFactIds.has(item.id)) errors.push(`${prefix}:duplicate_or_missing_fact_id`);
      allFactIds.add(item.id);
      byId.set(item.id, item);
      if (!item.text?.trim() || !item.exactRevision || item.source !== `authored://${VERSION}/${item.id}`
        || item.evidenceClass !== EVIDENCE_CLASS || !plainRecord(item.assertions)) errors.push(`${prefix}:invalid_fact`);
      for (const [key, value] of Object.entries(item.assertions ?? {})) {
        if (Object.hasOwn(factualAssertions, key) && !sameValue(factualAssertions[key], value)) errors.push(`${prefix}:conflicting_fact:${key}`);
        factualAssertions[key] = value;
      }
    }
    const allowed = Array.isArray(op.allowedActions) ? op.allowedActions.map((entry) => entry?.action) : [];
    const goldIds = new Set();
    for (const rule of gold) {
      if (!plainRecord(rule)) { errors.push(`${prefix}:gold_must_be_record`); continue; }
      if (!rule.id || goldIds.has(rule.id)) errors.push(`${prefix}:duplicate_or_missing_gold_id`);
      goldIds.add(rule.id);
      if (!allowed.includes(rule.action) || rule.revision !== op.subjectRevision
        || !uniqueStrings(rule.scope) || !rule.scope.length || !plainRecord(rule.requiredFacts)
        || !Object.keys(rule.requiredFacts).length || !uniqueStrings(rule.evidenceRefs) || !rule.evidenceRefs.length) {
        errors.push(`${prefix}:invalid_gold_contract`);
      }
      const supported = {};
      for (const ref of rule.evidenceRefs ?? []) {
        if (!byId.has(ref)) errors.push(`${prefix}:gold_source_missing:${ref}`);
        Object.assign(supported, byId.get(ref)?.assertions ?? {});
      }
      for (const [key, value] of Object.entries(rule.requiredFacts ?? {})) {
        if (!Object.hasOwn(supported, key) || !sameValue(supported[key], value)) errors.push(`${prefix}:gold_not_supported:${key}`);
      }
    }
  }
  return {
    valid: errors.length === 0, errors, opportunityCount: candidate.length,
    evidenceClass: EVIDENCE_CLASS, qualifiesHumanStudy: false,
  };
}

/**
 * Input is an explicit structured technical assertion, not an NLP classification.
 * {facts, revision, scope: string[], action, explicitParticipantDecision: true,
 * evidenceRefs: string[]}. Evidence refs show asserted provenance, not witnessed
 * reading, comprehension, or a required interaction sequence. Gold is organizer-only.
 */
export function evaluateCommonDisposition(opportunityId, disposition) {
  const result = {
    opportunityId, valid: false, reasons: [], matchedDisposition: null,
    evidenceClass: EVIDENCE_CLASS, humanQualityAssessed: false,
    participantDecisionIndependentlyObserved: false,
  };
  const op = opportunities.find(({ id }) => id === opportunityId);
  if (!op) return { ...result, reasons: ['unknown_opportunity'] };
  const permittedKeys = ['facts', 'revision', 'scope', 'action', 'explicitParticipantDecision', 'evidenceRefs'];
  if (!plainRecord(disposition)) return { ...result, reasons: ['disposition_must_be_record'] };
  if (Object.keys(disposition).some((key) => !permittedKeys.includes(key))) result.reasons.push('unknown_disposition_field');
  if (disposition.explicitParticipantDecision !== true) result.reasons.push('explicit_participant_decision_required');
  if (!plainRecord(disposition.facts)) result.reasons.push('facts_must_be_record');
  if (!uniqueStrings(disposition.scope) || !disposition.scope.length) result.reasons.push('scope_must_be_unique_nonempty_strings');
  if (!uniqueStrings(disposition.evidenceRefs) || !disposition.evidenceRefs.length) result.reasons.push('evidence_refs_required');
  if (disposition.revision !== op.subjectRevision) result.reasons.push('wrong_subject_revision');
  if (!op.allowedActions.some(({ action }) => action === disposition.action)) result.reasons.push('action_not_allowed_for_this_evidence');
  if (result.reasons.length) return result;

  const byId = new Map(op.facts.map((entry) => [entry.id, entry]));
  const citedAssertions = {};
  for (const ref of disposition.evidenceRefs) {
    if (!byId.has(ref)) result.reasons.push(`unknown_evidence:${ref}`);
    Object.assign(citedAssertions, byId.get(ref)?.assertions ?? {});
  }
  for (const [key, value] of Object.entries(disposition.facts)) {
    if (!Object.hasOwn(citedAssertions, key)) result.reasons.push(`unsupported_fact:${key}`);
    else if (!sameValue(value, citedAssertions[key])) result.reasons.push(`contradicted_fact:${key}`);
  }
  if (result.reasons.length) return result;

  const rules = op.gold.filter((rule) => rule.action === disposition.action);
  for (const rule of rules) {
    if (!sameSet(disposition.scope, rule.scope)) continue;
    const factsSatisfied = Object.entries(rule.requiredFacts).every(([key, value]) =>
      Object.hasOwn(disposition.facts, key) && sameValue(disposition.facts[key], value));
    const sourcesSatisfied = rule.evidenceRefs.every((ref) => disposition.evidenceRefs.includes(ref));
    if (factsSatisfied && sourcesSatisfied) {
      return { ...result, valid: true, matchedDisposition: rule.id };
    }
  }
  return { ...result, reasons: ['no_matching_gold_scope_facts_and_sources'] };
}
