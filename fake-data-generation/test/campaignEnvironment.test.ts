import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { privateKeyToAccount } from 'viem/accounts';
import {
  BASE_SEPOLIA_CHAIN_ID, CAMPAIGN_CONTRACT_ENV_KEYS, LOCAL_HARDHAT_CHAIN_ID,
  loadCampaignEnvironment, preflightCampaignEnvironment, validateCampaignAdapters, validateCampaignWallets,
  type CampaignDeploymentAdapter, type CampaignProvisioningAdapter,
} from '../campaignEnvironment.js';

const hardhatKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
const generatedKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;

async function withManifest(run: (manifestPath: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-environment-'));
  const manifestPath = path.join(directory, 'deployment.env');
  const lines = Object.values(CAMPAIGN_CONTRACT_ENV_KEYS).map((key, index) => `${key}=0x${String(index + 1).padStart(40, '0')}`);
  await writeFile(manifestPath, `${lines.join('\n')}\n`);
  try { await run(manifestPath); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('local environment makes legacy-only assumptions explicit', async () => withManifest(async (deploymentEnvPath) => {
  const environment = await loadCampaignEnvironment({ mode: 'local', rpcUrl: 'http://127.0.0.1:8545', expectedChainId: LOCAL_HARDHAT_CHAIN_ID, deploymentEnvPath });
  assert.deepEqual(environment.deployment, { strategy: 'existing-or-deploy' });
  assert.deepEqual(environment.provisioning, { walletSource: 'generated-or-hardhat', paymentTokenStrategy: 'transfer-or-mint' });
}));

test('remote environment is existing-deployment, generated-wallet, transfer-only', async () => withManifest(async (deploymentEnvPath) => {
  const environment = await loadCampaignEnvironment({ mode: 'remote', rpcUrl: 'https://sepolia.base.org', expectedChainId: BASE_SEPOLIA_CHAIN_ID, deploymentEnvPath });
  assert.equal(environment.mutationConfirmed, false);
  assert.deepEqual(environment.deployment, { strategy: 'existing-only' });
  assert.deepEqual(environment.provisioning, { walletSource: 'generated-only', paymentTokenStrategy: 'transfer-only' });
}));

test('remote mode refuses local chain IDs, implicit deployment, minting, and Hardhat wallets', async () => withManifest(async (deploymentEnvPath) => {
  await assert.rejects(loadCampaignEnvironment({ mode: 'remote', rpcUrl: 'http://127.0.0.1:8545', expectedChainId: LOCAL_HARDHAT_CHAIN_ID, deploymentEnvPath }), /refuses the local Hardhat chain ID/);
  const environment = await loadCampaignEnvironment({ mode: 'remote', rpcUrl: 'https://sepolia.base.org', expectedChainId: BASE_SEPOLIA_CHAIN_ID, deploymentEnvPath });
  const deployment = { strategy: 'existing-or-deploy', prepare: async () => environment.contracts } as CampaignDeploymentAdapter;
  const safeProvisioning = { walletSource: 'generated-only', paymentTokenStrategy: 'transfer-only', provision: async () => undefined } as CampaignProvisioningAdapter;
  assert.throws(() => validateCampaignAdapters(environment, deployment, safeProvisioning), /deployment adapter strategy/);
  const safeDeployment = { strategy: 'existing-only', prepare: async () => environment.contracts } as CampaignDeploymentAdapter;
  const mintingProvisioning = { walletSource: 'generated-only', paymentTokenStrategy: 'transfer-or-mint', provision: async () => undefined } as CampaignProvisioningAdapter;
  assert.throws(() => validateCampaignAdapters(environment, safeDeployment, mintingProvisioning), /payment-token strategy/);
  const address = privateKeyToAccount(hardhatKey).address;
  assert.throws(() => validateCampaignWallets(environment, [{ walletSlot: 'wallet-user-001', address, privateKey: hardhatKey, source: 'hardhat' }], [hardhatKey]), /refuses Hardhat wallet/);
}));

test('preflight rejects a wrong chain and missing bytecode', async () => withManifest(async (deploymentEnvPath) => {
  const environment = await loadCampaignEnvironment({ mode: 'remote', rpcUrl: 'https://sepolia.base.org', expectedChainId: BASE_SEPOLIA_CHAIN_ID, deploymentEnvPath });
  await assert.rejects(preflightCampaignEnvironment(environment, { getChainId: async () => 1, getBytecode: async () => '0x01' }), /wrong chain ID/);
  await assert.rejects(preflightCampaignEnvironment(environment, { getChainId: async () => BASE_SEPOLIA_CHAIN_ID, getBytecode: async () => '0x' }), /missing contract bytecode/);
  const result = await preflightCampaignEnvironment(environment, { getChainId: async () => BASE_SEPOLIA_CHAIN_ID, getBytecode: async () => '0x01' });
  assert.equal(result.checkedContracts.length, Object.keys(CAMPAIGN_CONTRACT_ENV_KEYS).length);
}));

test('wallet validation checks key ownership and permits generated remote wallets', async () => withManifest(async (deploymentEnvPath) => {
  const environment = await loadCampaignEnvironment({ mode: 'remote', rpcUrl: 'https://sepolia.base.org', expectedChainId: BASE_SEPOLIA_CHAIN_ID, deploymentEnvPath });
  const address = privateKeyToAccount(generatedKey).address;
  validateCampaignWallets(environment, [{ walletSlot: 'wallet-user-001', address, privateKey: generatedKey, source: 'generated' }], [hardhatKey]);
  assert.throws(() => validateCampaignWallets(environment, [{ walletSlot: 'wallet-user-001', address, privateKey: hardhatKey, source: 'generated' }], [hardhatKey]), /does not match address/);
}));
