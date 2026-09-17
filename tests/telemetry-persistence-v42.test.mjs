import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('storage quota failure preserves complete in-memory events and recovery persists all previous entries', () => {
  const source = readFileSync(new URL('../lib/experiment/telemetry.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 }, fileName: 'telemetry.ts' }).outputText;
  let failPersistence = true;
  let stored = null;
  let clock = 0;
  const context = vm.createContext({ exports: {}, crypto: { randomUUID: () => 'synthetic-storage-test-session' },
    performance: { now: () => ++clock }, localStorage: {
      setItem(_key, value) {
        if (failPersistence) { const error = new Error('Synthetic quota failure'); error.name = 'QuotaExceededError'; throw error; }
        stored = value;
      },
    },
  });
  vm.runInContext(compiled, context);
  const session = new context.exports.BrowserTelemetrySession('synthetic-storage-test-scenario');
  const completeText = '合成持久化压力记录；并非真人数据。'.repeat(2000);
  let first;
  assert.doesNotThrow(() => { first = session.append('B', 'baseline', 'agent_response_recorded', { responseText: completeText }); });
  assert.equal(first.sequence, 1);
  assert.equal(first.payload.responseText, completeText);
  assert.equal(session.entries().length, 1);
  assert.match(session.persistenceError, /QuotaExceededError/);
  // A parent capture can still obtain exactly the event that was executed.
  assert.equal(session.entries()[0], first);
  assert.equal(stored, null);

  failPersistence = false;
  session.append('B', 'trigger', 'trigger_stable_visible', { visibilityState: 'visible' });
  assert.equal(session.persistenceError, null);
  const persisted = JSON.parse(stored);
  assert.equal(persisted.length, 2);
  assert.equal(persisted[0].payload.responseText, completeText);
  assert.deepEqual(persisted.map((entry) => entry.sequence), [1, 2]);

  failPersistence = true;
  assert.doesNotThrow(() => session.append('B', 'trigger', 'agent_response_recorded', { responseText: completeText }));
  assert.equal(session.entries().length, 3);
  assert.equal(session.entries()[2].payload.responseText, completeText);
  assert.match(session.persistenceError, /QuotaExceededError/);
  assert.equal(JSON.parse(stored).length, 2);
});
