import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseEther, parseUnits, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { LOCAL_HARDHAT_CHAIN_ID, type CampaignEnvironment } from '../campaignEnvironment.js';
import type { CampaignPlan, PlannedAction } from '../campaignPlanner.js';
import { computeCampaignFundingNeeds, provisionCampaignWallets, type CampaignFundingChain } from '../campaignProvisioning.js';

const generatedKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;
const generatedAddress = privateKeyToAccount(generatedKey).address;

function action(partial: Partial<PlannedAction> & Pick<PlannedAction, 'id' | 'type'>): PlannedAction {
  return { sequence: 1, actorUserId: 'user-001', dependsOn: [], ...partial };
}

const plan = {
  campaignId: 'medium-realistic-v1',
  users: [{ id: 'user-001', walletSlot: 'wallet-user-001' }],
  actions: [
    action({ id: 'a1', type: 'set-belief' }),
    action({ id: 'a2', type: 'fund-project', amount: 500 }),
    action({ id: 'a3', type: 'deposit-note', amount: 1000 }),
  ],
} as CampaignPlan;

const wallet = { walletSlot: 'wallet-user-001', address: generatedAddress, privateKey: generatedKey, source: 'generated' as const };

function localEnv(): CampaignEnvironment {
  return {
    mode: 'local', rpcUrl: 'http://127.0.0.1:8545', expectedChainId: LOCAL_HARDHAT_CHAIN_ID,
    contracts: {} as CampaignEnvironment['contracts'],
    deployment: { strategy: 'existing-or-deploy' },
    provisioning: { walletSource: 'generated-or-hardhat', paymentTokenStrategy: 'transfer-or-mint' },
  };
}

test('funding needs include gas, note deposits, and project token buys', () => {
  const [need] = computeCampaignFundingNeeds(plan, [wallet], 1_000_000_000n);
  assert.equal(need.walletSlot, 'wallet-user-001');
  assert.ok(need.nativeWei > parseEther('0.05'));
  assert.equal(need.paymentTokenUnits, parseUnits('0.01', 6));
  assert.ok(need.nativeWei >= parseEther('0.05') + 90_000n * 1_000_000_000n + 180_000n * 1_000_000_000n + 150_000n * 1_000_000_000n + parseEther('0.01'));
});

test('local provisioning mints when transfer fails and skips already-funded wallets', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-provision-'));
  try {
    const nativeTransfers: bigint[] = [];
    const tokenMints: bigint[] = [];
    const chain: CampaignFundingChain = {
      getNativeBalance: async () => 0n,
      getTokenBalance: async () => 0n,
      transferNative: async (_to: Address, amount: bigint) => { nativeTransfers.push(amount); return '0x1' as Hex; },
      transferToken: async () => { throw new Error('insufficient allowance'); },
      mintToken: async (_to, amount) => { tokenMints.push(amount); return '0x2' as Hex; },
    };
    const ledger = await provisionCampaignWallets({
      environment: localEnv(), plan, wallets: [wallet], chain, ledgerPath: path.join(directory, 'ledger.json'),
    });
    assert.equal(ledger.wallets[0].paymentTokenMethod, 'mint');
    assert.equal(nativeTransfers.length, 1);
    assert.equal(tokenMints.length, 1);
    const funded: CampaignFundingChain = {
      getNativeBalance: async () => 10n ** 18n,
      getTokenBalance: async () => 10n ** 18n,
      transferNative: async () => { throw new Error('should skip native'); },
      transferToken: async () => { throw new Error('should skip token'); },
    };
    const skipped = await provisionCampaignWallets({
      environment: localEnv(), plan, wallets: [wallet], chain: funded, ledgerPath: path.join(directory, 'ledger.json'),
    });
    assert.equal(skipped.wallets[0].nativeTransferred, false);
    assert.equal(skipped.wallets[0].paymentTokenMethod, 'skipped');
    JSON.parse(await readFile(path.join(directory, 'ledger.json'), 'utf8'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('remote transfer-only provisioning refuses mint fallback and Hardhat wallets', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-provision-remote-'));
  try {
    const remote: CampaignEnvironment = {
      mode: 'remote', rpcUrl: 'https://sepolia.base.org', expectedChainId: 84_532,
      contracts: {} as CampaignEnvironment['contracts'],
      deployment: { strategy: 'existing-only' },
      provisioning: { walletSource: 'generated-only', paymentTokenStrategy: 'transfer-only' },
      mutationConfirmed: true,
    };
    await assert.rejects(provisionCampaignWallets({
      environment: remote, plan, wallets: [{ ...wallet, source: 'hardhat' }],
      chain: { getNativeBalance: async () => 0n, getTokenBalance: async () => 0n, transferNative: async () => '0x1' as Hex, transferToken: async () => '0x1' as Hex },
      ledgerPath: path.join(directory, 'ledger.json'),
    }), /refuses Hardhat wallets/);
    await assert.rejects(provisionCampaignWallets({
      environment: remote, plan, wallets: [wallet],
      chain: {
        getNativeBalance: async () => 0n, getTokenBalance: async () => 0n,
        transferNative: async () => '0x1' as Hex,
        transferToken: async () => { throw new Error('funder empty'); },
      },
      ledgerPath: path.join(directory, 'ledger.json'),
    }), /funder empty/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
