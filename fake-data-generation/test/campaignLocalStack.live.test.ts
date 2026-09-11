import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCidV1FromDigest } from '@commonality/sdk/utils';
import { createCampaignIndexerAdapter } from '../campaignIndexerAdapter.js';
import { createLocalCampaignStack, probeLocalCampaignStack } from '../campaignLocalStack.js';
import type { PlannedAction } from '../campaignPlanner.js';
import { createCampaignSdkDerivedCheckProvider } from '../campaignSdkDerivedChecks.js';
import { createEmptyRuntimeBindings } from '../campaignRuntimeBindings.js';
import type { CampaignPlan } from '../campaignPlanner.js';

const TX = `0x${'c'.repeat(64)}` as const;
const ADDRESS = '0x00000000000000000000000000000000000000a1' as const;
const CID = buildCidV1FromDigest(0x70, new Uint8Array(32).fill(3));

async function liveStackAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:42069/status', { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

test('raw indexer adapter and SDK derived checks talk to the live local stack', async (t) => {
  if (!await liveStackAvailable()) {
    t.skip('local indexer is not reachable at http://localhost:42069');
    return;
  }
  const stack = createLocalCampaignStack();
  const heads = await probeLocalCampaignStack(stack);
  assert.ok(heads.chainHead >= 0n);
  assert.ok(heads.indexerHead >= 0n);

  const action: PlannedAction = {
    id: 'action-00001', sequence: 1, type: 'set-belief', actorUserId: 'user-1', statementId: 'statement-1',
    belief: 'believe', dependsOn: [],
  };
  const plan = {
    version: 'commonality-campaign-plan-v1', campaignId: 'live-probe', deterministicSeed: 'seed', manifestFingerprint: 'fp',
    statements: [{ id: 'statement-1', causeId: 'cause-1' }], users: [{ id: 'user-1' }], projects: [],
    actions: [action],
  } as CampaignPlan;
  const bindings = createEmptyRuntimeBindings(plan, new Date('2026-01-01T00:00:00.000Z'));
  bindings.users['user-1'] = ADDRESS;
  bindings.statements['statement-1'] = CID;
  bindings.causes['cause-1'] = { owner: ADDRESS, refName: 'cause/live-probe', rosterCid: CID };

  const adapter = createCampaignIndexerAdapter({
    machinery: stack.machinery,
    publicClient: stack.publicClient,
    derivedChecks: createCampaignSdkDerivedCheckProvider({ machinery: stack.machinery, plan, bindings }),
  });
  assert.deepEqual(await adapter.findIndexedAction(action, TX), []);
  const derived = await adapter.getDerivedChecks(action);
  assert.equal(derived.length, 1);
  assert.equal(derived[0].name, 'SDK final user belief');
  assert.equal(derived[0].expected, 1);
  assert.equal(derived[0].actual, 0);
});
