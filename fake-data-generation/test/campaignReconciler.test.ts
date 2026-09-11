import assert from 'node:assert/strict';
import test from 'node:test';
import type { Hex } from 'viem';
import { formatReconciliationReport, reconcileCampaign, type CampaignReconciliationAdapter } from '../campaignReconciler.js';
import { CAMPAIGN_EXECUTION_VERSION, type CampaignExecutionState } from '../campaignExecutor.js';
import type { PlannedAction } from '../campaignPlanner.js';

const hash = (value: number): Hex => `0x${value.toString(16).padStart(64, '0')}` as Hex;
const actions: PlannedAction[] = [
  { id: 'a1', sequence: 1, type: 'publish-statement', actorUserId: null, statementId: 's1', dependsOn: [] },
  { id: 'a2', sequence: 2, type: 'set-belief', actorUserId: 'u1', statementId: 's1', belief: 'believe', dependsOn: ['a1'] },
  { id: 'a3', sequence: 3, type: 'fund-project', actorUserId: 'u1', projectId: 'p1', amount: 10, dependsOn: [] },
  { id: 'a4', sequence: 4, type: 'deposit-note', actorUserId: 'u1', noteId: 'n1', amount: 10, dependsOn: [] },
];
const execution: CampaignExecutionState = { version: CAMPAIGN_EXECUTION_VERSION, campaignId: 'campaign', manifestFingerprint: 'fp', updatedAt: '2026-01-01T00:00:00.000Z', actions: actions.map((action, index) => ({ actionId: action.id, status: index === 3 ? 'failed' : 'mined', attempts: 1, transactionHash: index === 3 ? undefined : hash(index + 1), minedAt: '2026-01-01T00:00:00.000Z' })) };

test('classifies indexed, duplicate, derived mismatch, and unmined actions', async () => {
  const adapter: CampaignReconciliationAdapter = {
    getChainHead: async () => 105n, getIndexerHead: async () => 103n,
    findIndexedAction: async (action, transactionHash) => action.id === 'a2' ? [{ entityId: 'one', eventId: '1', transactionHash }, { entityId: 'two', eventId: '2', transactionHash }] : [{ entityId: action.id, eventId: action.id, transactionHash, indexedAt: '2026-01-01T00:00:01.000Z' }],
    getDerivedChecks: async (action) => action.id === 'a3' ? [{ name: 'project funding', expected: 10, actual: 9 }] : [{ name: 'visible', expected: true, actual: true }],
  };
  const report = await reconcileCampaign({ actions, execution, adapter, options: { settlingWindowMs: 0, pollIntervalMs: 0 } });
  assert.deepEqual(report.actions.map((item) => item.status), ['verified', 'duplicate', 'derived-mismatch', 'not-mined']);
  assert.equal(report.actions[0].indexLatencyMs, 1000); assert.equal(report.chainHeadLag, '2');
  assert.match(formatReconciliationReport(report), /a2 \(duplicate\), a3 \(derived-mismatch\)/);
});

test('polls through lag and marks omissions missing after the settling window', async () => {
  let time = 0; let reads = 0;
  const adapter: CampaignReconciliationAdapter = {
    getChainHead: async () => 10n, getIndexerHead: async () => 9n,
    findIndexedAction: async (action, transactionHash) => { reads += 1; return action.id === 'a1' && reads >= 4 ? [{ entityId: 's1', eventId: 'e1', transactionHash }] : []; },
    getDerivedChecks: async () => [],
  };
  const report = await reconcileCampaign({ actions: actions.slice(0, 2), execution: { ...execution, actions: execution.actions.slice(0, 2) }, adapter, options: { settlingWindowMs: 20, pollIntervalMs: 10, now: () => new Date(time), sleep: async (ms) => { time += ms; } } });
  assert.equal(report.actions[0].status, 'verified'); assert.equal(report.actions[1].status, 'missing'); assert.equal(report.settled, true);
});
