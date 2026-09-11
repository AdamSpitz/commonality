import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { fakeIpfsCidV1 } from '@commonality/sdk/testing';
import {
  applySubmittedBindings,
  classifyCampaignError,
  createCampaignContractAdapter,
  type CampaignActionWriter,
} from '../campaignActionAdapter.js';
import { executeCampaignPlan } from '../campaignExecutor.js';
import { createEmptyRuntimeBindings, loadRuntimeBindings } from '../campaignRuntimeBindings.js';
import type { CampaignPlan, PlannedAction } from '../campaignPlanner.js';
import type { CampaignWalletBinding } from '../campaignEnvironment.js';
import type { WriteClients } from '@commonality/sdk/utils';

const publisherKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
const userKey = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;
const publisher = privateKeyToAccount(publisherKey);
const user = privateKeyToAccount(userKey);

const actions: PlannedAction[] = [
  { id: 'action-1', sequence: 1, type: 'publish-statement', actorUserId: null, statementId: 'statement-1', causeId: 'open-source', dependsOn: [] },
  { id: 'action-2', sequence: 2, type: 'create-cause', actorUserId: 'user-1', causeId: 'open-source', dependsOn: ['action-1'] },
  { id: 'action-3', sequence: 3, type: 'set-belief', actorUserId: 'user-1', statementId: 'statement-1', belief: 'believe', dependsOn: ['action-1'] },
];

const plan = {
  version: 'commonality-campaign-plan-v1', campaignId: 'test', deterministicSeed: 'seed', manifestFingerprint: 'fingerprint',
  users: [{ id: 'user-1', walletSlot: 'wallet-user-1' }],
  statements: [{ id: 'statement-1', causeId: 'open-source' }],
  projects: [],
  actions,
} as unknown as CampaignPlan;

const wallets: CampaignWalletBinding[] = [
  { walletSlot: 'wallet-user-1', address: user.address, privateKey: userKey, source: 'generated' },
];
const publisherWallet: CampaignWalletBinding = { walletSlot: 'publisher', address: publisher.address, privateKey: publisherKey, source: 'generated' };

function writer(calls: string[]): CampaignActionWriter {
  return {
    async submit(action) {
      calls.push(action.type);
      const hash = `0x${action.sequence.toString(16).padStart(64, '0')}` as Hex;
      if (action.type === 'publish-statement') return { hash, statementCid: fakeIpfsCidV1(action.statementId!) };
      if (action.type === 'create-cause') {
        return { hash, cause: { owner: user.address, refName: 'cause-open-source', rosterCid: fakeIpfsCidV1('roster') } };
      }
      return { hash };
    },
  };
}

test('contract adapter records mined hashes and public runtime bindings', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-adapter-'));
  const calls: string[] = [];
  const bindings = createEmptyRuntimeBindings(plan);
  bindings.users['user-1'] = user.address;
  try {
    const adapter = createCampaignContractAdapter({
      plan,
      contracts: {
        beliefs: user.address, implications: user.address, alignmentAttestations: user.address,
        delegatableNotes: user.address, projectFactory: user.address, paymentToken: user.address,
        publishedData: user.address, mutableRefUpdater: user.address,
      },
      wallets,
      publisher: publisherWallet,
      bindings,
      writer: writer(calls),
      getReceipt: async () => ({ status: 'success', gasUsed: 21_000n, effectiveGasPrice: 1n, blockNumber: 8n }),
      persistBindings: async (value) => {
        const { writeRuntimeBindings } = await import('../campaignRuntimeBindings.js');
        await writeRuntimeBindings(plan, value, path.join(directory, 'bindings.json'));
      },
      clientsFor: (wallet) => ({ account: wallet.address } as WriteClients),
    });
    const summary = await executeCampaignPlan({
      campaignId: plan.campaignId,
      manifestFingerprint: plan.manifestFingerprint,
      actions,
      adapter,
      options: { statePath: path.join(directory, 'execution.json'), concurrency: 1, pacingMs: 0, maxRetries: 0, retryBackoffMs: 0, transactionCap: 10, nativeTokenBudget: 10n ** 18n },
    });
    assert.equal(summary.mined, 3);
    assert.deepEqual(calls, ['publish-statement', 'create-cause', 'set-belief']);
    const stored = await loadRuntimeBindings(plan, path.join(directory, 'bindings.json'));
    assert.equal(stored.statements['statement-1'], fakeIpfsCidV1('statement-1'));
    assert.equal(stored.causes['open-source'].refName, 'cause-open-source');
    assert.equal(stored.users['user-1'], user.address);
    const execution = JSON.parse(await readFile(path.join(directory, 'execution.json'), 'utf8')) as { actions: Array<{ transactionHash: string }> };
    assert.equal(execution.actions[0].transactionHash, `0x${'1'.padStart(64, '0')}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('classifyCampaignError treats rate limits as retryable RPC failures', () => {
  assert.deepEqual(classifyCampaignError(new Error('429 rate limit')), { retryable: true, category: 'rpc', message: '429 rate limit' });
  assert.equal(classifyCampaignError(new Error('execution reverted: nope')).retryable, false);
});

test('applySubmittedBindings never writes private keys', () => {
  const bindings = createEmptyRuntimeBindings(plan);
  applySubmittedBindings(bindings, actions[0], { hash: `0x${'2'.repeat(64)}` as Hex, statementCid: fakeIpfsCidV1('statement-1') }, publisher.address, new Date('2026-01-01T00:00:00.000Z'));
  assert.doesNotMatch(JSON.stringify(bindings), /privateKey|0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a/);
});
