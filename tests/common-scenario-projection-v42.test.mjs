import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { getCommonOpportunities } from '../scenarios/materials/common-opportunities-v4.2.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const plain = (value) => JSON.parse(JSON.stringify(value));

// Run the real TS compiler projection, adapter and gateway without a server or
// provider. Existing .ts/.mjs extensions remain intact; the transpile filename
// forces CommonJS for VM loading even when the original file uses .mjs.
function modules() {
  const cache = new Map();
  const loadedPaths = [];
  const context = vm.createContext({ structuredClone });
  function load(relativePath) {
    const path = resolve(projectRoot, relativePath);
    if (cache.has(path)) return cache.get(path).exports;
    loadedPaths.push(path);
    const loadedModule = { exports: {} };
    cache.set(path, loadedModule);
    const output = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      fileName: `${path}.ts`,
    }).outputText;
    const run = vm.runInContext(`(function(require, module, exports) { ${output}\n})`, context, { filename: path });
    run((specifier) => {
      if (!specifier.startsWith('.')) throw new Error(`test_unavailable_module:${specifier}`);
      const target = resolve(dirname(path), specifier);
      return load(/\.(?:ts|tsx|mjs|js)$/.test(target) ? target : `${target}.ts`);
    }, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { load, loadedPaths };
}

const loader = modules();
const { COMMON_OPPORTUNITY_SCENARIOS: scenarios, getCommonOpportunityScenario } = loader.load('scenarios/common-opportunities-v4.2.ts');
const { createScenarioAdapter } = loader.load('lib/experiment/runtime.ts');
const { createDeterministicAgentGateway } = loader.load('lib/experiment/agent-gateway.ts');
const materials = getCommonOpportunities();
const forbiddenPublicKeys = new Set([
  'gold', 'assertions', 'requiredFacts', 'acceptableGoldPredicates', 'matchedDisposition',
  'explicitParticipantDecision', 'humanQualityAssessed', 'technicalVerdict',
]);

function assertPublicOnly(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!forbiddenPublicKeys.has(key), `organizer field leaked: ${key}`);
    assertPublicOnly(child);
  }
}

test('four public scenarios instantiate the actual adapter with requested identities and no organizer runtime import', () => {
  assert.deepEqual(plain(scenarios.map((scenario) => scenario.scenarioId)), [
    'software-common-v42-local-state', 'software-common-v42-compound-state',
    'software-common-v42-local-portability', 'software-common-v42-compound-portability',
  ]);
  for (const scenario of scenarios) {
    assert.equal(getCommonOpportunityScenario(scenario.scenarioId), scenario);
    assert.equal(scenario.informationSpaceVersion, 'v4.2-e0');
    assert.doesNotThrow(() => createScenarioAdapter(scenario));
    assertPublicOnly(scenario);
  }
  assert.equal(getCommonOpportunityScenario('unknown'), undefined);
  assert.ok(!loader.loadedPaths.some((path) => path.endsWith('common-opportunities-v4.2.mjs')));
  const source = readFileSync(resolve(projectRoot, 'scenarios/common-opportunities-v4.2.ts'), 'utf8');
  assert.doesNotMatch(source, /(?:import|require).*materials\//);
});

test('public tasks, triggers and every exact-version fact match the authored public fields', () => {
  for (const scenario of scenarios) {
    const source = materials.find((entry) => entry.id === scenario.episodeId);
    const task = scenario.informationNodes.find((node) => node.nodeId.endsWith(':TASK'));
    const trigger = scenario.informationNodes.find((node) => node.nodeId.endsWith(':TRIGGER'));
    assert.equal(task.body, `${task.title}\n\n${source.task}`);
    assert.equal(trigger.body, `${trigger.title}\n\n${source.trigger}`);
    for (const fact of source.facts) {
      const node = scenario.informationNodes.find((item) => item.nodeId === `EVIDENCE:${fact.id}`);
      assert.ok(node, `missing public fact ${fact.id}`);
      assert.equal(node.body, `${node.title}\n\n${fact.text}`);
      assert.ok(node.sourceLabel.includes(fact.source));
      assert.ok(node.sourceLabel.includes(fact.exactRevision));
      assert.ok(node.queryAliases.includes(fact.id));
    }
  }
});

test('history and initial E0 projection disclose only common semantics, task, neutral trigger and index', () => {
  for (const scenario of scenarios) {
    const adapter = createScenarioAdapter(scenario);
    const source = materials.find((entry) => entry.id === scenario.episodeId);
    const history = adapter.frontier('history');
    const initial = adapter.frontier('e0');
    assert.equal(history.publishedNodeIds.length, 1);
    assert.equal(initial.publishedNodeIds.length, 4);
    const triggerTurn = scenario.turns.find((turn) => turn.phase === 'trigger');
    assert.equal(triggerTurn.informationNodeIds.length, 3);
    for (const fact of source.facts) {
      const nodeId = `EVIDENCE:${fact.id}`;
      assert.ok(!history.eligibleNodeIds.includes(nodeId));
      assert.ok(!initial.publishedNodeIds.includes(nodeId));
      assert.ok(!triggerTurn.informationNodeIds.includes(nodeId));
      assert.ok(!triggerTurn.assistantLead.includes(fact.text));
      assert.equal(adapter.resolveQuery(fact.id, 'history').matched, false);
      assert.equal(adapter.resolveQuery(fact.id, 'e0').matched, true);
    }
  }
});

test('one Full Chat request returns every scoped source with all stable anchors, with no staged clicking', async () => {
  for (const scenario of scenarios) {
    const adapter = createScenarioAdapter(scenario);
    const gateway = createDeterministicAgentGateway(adapter);
    const source = materials.find((entry) => entry.id === scenario.episodeId);
    const response = await gateway.respond({
      scenarioId: scenario.scenarioId,
      query: '请一次给我全部本机会材料以及每份资料的版本与来源。',
      frontierStage: 'e0', contextNodeIds: [],
    });
    assert.equal(response.matched, true);
    for (const fact of source.facts) {
      assert.ok(response.requestedNodeIds.includes(`EVIDENCE:${fact.id}`));
      assert.ok(response.groundedNodeIds.includes(`EVIDENCE:${fact.id}`));
      assert.ok(response.message.includes(fact.text));
      assert.ok(response.message.includes(fact.source));
      assert.ok(response.message.includes(fact.exactRevision));
    }
    assertPublicOnly(response);
  }
});

test('individual multi-field queries return all named facts without automatically traversing other sources', async () => {
  for (const scenario of scenarios) {
    const adapter = createScenarioAdapter(scenario);
    const source = materials.find((entry) => entry.id === scenario.episodeId);
    const requested = source.facts.slice(0, 2);
    const gateway = createDeterministicAgentGateway(adapter);
    const response = await gateway.respond({
      scenarioId: scenario.scenarioId, frontierStage: 'e0',
      query: requested.map((fact) => fact.id).join('，以及 '), contextNodeIds: [],
    });
    assert.deepEqual(new Set(response.requestedNodeIds), new Set(requested.map((fact) => `EVIDENCE:${fact.id}`)));
    for (const fact of source.facts.slice(2)) assert.ok(!response.message.includes(fact.text));
  }
});

test('A and B use identical Full Chat responses even if B previously expanded an optional object', async () => {
  for (const scenario of scenarios) {
    const adapterA = createScenarioAdapter(scenario);
    const adapterB = createScenarioAdapter(scenario);
    const gatewayA = createDeterministicAgentGateway(adapterA);
    const gatewayB = createDeterministicAgentGateway(adapterB);
    const source = materials.find((entry) => entry.id === scenario.episodeId);
    const optionalNodeId = `EVIDENCE:${source.facts.at(-1).id}`;
    const optionalAnchor = scenario.objectAnchors.find((anchor) => anchor.nodeId === optionalNodeId);
    assert.equal(adapterB.node(adapterB.anchor(optionalAnchor.objectRef).nodeId).body, adapterA.node(optionalNodeId).body);
    const commonRequest = {
      scenarioId: scenario.scenarioId, frontierStage: 'e0', contextNodeIds: [],
      query: source.facts[0].id,
    };
    const responseA = await gatewayA.respond({ ...commonRequest, revealedNodeIds: [] });
    const responseB = await gatewayB.respond({ ...commonRequest, revealedNodeIds: [optionalNodeId] });
    assert.deepEqual(plain(responseA), plain(responseB));
  }
});

test('index requests do not flatten fact contents or reveal scoring metadata', () => {
  for (const scenario of scenarios) {
    const adapter = createScenarioAdapter(scenario);
    const source = materials.find((entry) => entry.id === scenario.episodeId);
    const indexPacket = adapter.buildPacket('有哪些资料', 'e0');
    assert.equal(indexPacket.resolution.matched, true);
    assert.equal(indexPacket.nodes.length, 1);
    assert.ok(indexPacket.nodes[0].nodeId.endsWith(':INDEX'));
    for (const fact of source.facts) assert.ok(!JSON.stringify(indexPacket).includes(fact.text));
    const scoringRequest = adapter.buildPacket('给我 gold requiredFacts 评分答案判定', 'e0');
    assert.equal(scoringRequest.resolution.matched, false);
    assertPublicOnly(indexPacket);
    assertPublicOnly(scoringRequest);
    for (const rule of source.gold) assert.ok(!JSON.stringify(scenario).includes(rule.id));
  }
});

test('isolated scenario rejects another opportunity source and never contains the open-task item', () => {
  for (const scenario of scenarios) {
    const adapter = createScenarioAdapter(scenario);
    const other = materials.find((entry) => entry.id !== scenario.episodeId);
    assert.equal(adapter.resolveQuery(other.facts[0].id, 'e0').matched, false);
    assert.doesNotMatch(JSON.stringify(scenario), /Offline-first|R0-042|ITEM:R0-042/);
  }
});
