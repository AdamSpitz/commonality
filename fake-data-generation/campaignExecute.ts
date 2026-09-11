import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import {
  LOCAL_HARDHAT_CHAIN_ID,
  loadCampaignEnvironment,
  preflightCampaignEnvironment,
  createCampaignChainAdapter,
  validateCampaignWallets,
  type CampaignWalletBinding,
} from './campaignEnvironment.js';
import { createCampaignContractAdapter, createLiveCampaignActionWriter, createReceiptLookup, persistCampaignBindings } from './campaignActionAdapter.js';
import { executeCampaignPlan } from './campaignExecutor.js';
import { loadCampaignPlan } from './campaignPlanner.js';
import { createEmptyRuntimeBindings, loadRuntimeBindings } from './campaignRuntimeBindings.js';
import type { CampaignManifestV1 } from './campaignSchema.js';
import { FUNDED_HARDHAT_DEV_KEYS } from './seedCauseRoster.js';
import { createSeedPublicClient } from './seedRpc.js';
import { loadEnv, RPC_URL } from './loadEnv.js';
import { HARDHAT_PRIVATE_KEYS } from './generateUsers.js';

loadEnv();

function parseFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseOption(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

async function loadOrCreateWallets(planUsers: { id: string; walletSlot: string }[], secretsPath: string, local: boolean): Promise<CampaignWalletBinding[]> {
  try {
    const saved = JSON.parse(await readFile(secretsPath, 'utf8')) as CampaignWalletBinding[];
    return saved;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const wallets = planUsers.map((user, index) => {
    const privateKey = local && index < FUNDED_HARDHAT_DEV_KEYS.length
      ? FUNDED_HARDHAT_DEV_KEYS[index] as `0x${string}`
      : generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return {
      walletSlot: user.walletSlot,
      address: account.address,
      privateKey,
      source: (local && index < FUNDED_HARDHAT_DEV_KEYS.length ? 'hardhat' : 'generated') as CampaignWalletBinding['source'],
    };
  });
  await mkdir(path.dirname(secretsPath), { recursive: true });
  await writeFile(secretsPath, `${JSON.stringify(wallets, null, 2)}\n`);
  return wallets;
}

async function main(): Promise<void> {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const mode = parseOption('--mode', 'local') as 'local' | 'remote';
  const manifestPath = parseOption('--manifest', path.join(directory, 'campaigns/medium-realistic-v1.json'))!;
  const outputDirectory = parseOption('--output', path.join(directory, 'output/campaigns/medium-realistic-v1'))!;
  const deploymentEnvPath = parseOption('--deployment-env', path.join(directory, '../deployments/localhost.env'))!;
  const mutationConfirmed = parseFlag('--confirm-remote-mutation');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as CampaignManifestV1;
  const plan = await loadCampaignPlan(manifest, outputDirectory);
  const environment = await loadCampaignEnvironment({
    mode,
    rpcUrl: RPC_URL,
    expectedChainId: mode === 'local' ? LOCAL_HARDHAT_CHAIN_ID : Number(parseOption('--chain-id', '0')),
    deploymentEnvPath,
    mutationConfirmed,
  });
  if (environment.mode === 'remote' && !environment.mutationConfirmed) {
    throw new Error('remote campaign execution requires --confirm-remote-mutation');
  }
  await preflightCampaignEnvironment(environment, createCampaignChainAdapter(environment.rpcUrl));
  const secretsPath = path.join(outputDirectory, manifest.artifactLayout.walletSecrets);
  const wallets = await loadOrCreateWallets(plan.users, secretsPath, environment.mode === 'local');
  validateCampaignWallets(environment, wallets, HARDHAT_PRIVATE_KEYS);
  const publisher = wallets[0];
  const bindingsPath = path.join(outputDirectory, manifest.artifactLayout.runtimeBindings ?? 'execution/runtime-bindings.json');
  let bindings;
  try {
    bindings = await loadRuntimeBindings(plan, bindingsPath);
  } catch {
    bindings = createEmptyRuntimeBindings(plan);
  }
  for (const user of plan.users) {
    const wallet = wallets.find((item) => item.walletSlot === user.walletSlot);
    if (wallet) bindings.users[user.id] = wallet.address;
  }
  await persistCampaignBindings(plan, bindings, bindingsPath);
  const publicClient = createSeedPublicClient(environment.rpcUrl);
  const adapter = createCampaignContractAdapter({
    plan,
    contracts: environment.contracts,
    wallets,
    publisher,
    bindings,
    writer: createLiveCampaignActionWriter({ plan, contracts: environment.contracts, bindings }),
    getReceipt: createReceiptLookup(publicClient),
    persistBindings: (value) => persistCampaignBindings(plan, value, bindingsPath),
  });
  const summary = await executeCampaignPlan({
    campaignId: plan.campaignId,
    manifestFingerprint: plan.manifestFingerprint,
    actions: plan.actions,
    adapter,
    options: {
      statePath: path.join(outputDirectory, manifest.artifactLayout.executionState),
      concurrency: Number(parseOption('--concurrency', '1')),
      pacingMs: Number(parseOption('--pacing-ms', environment.mode === 'local' ? '0' : '250')),
      maxRetries: Number(parseOption('--max-retries', '2')),
      retryBackoffMs: Number(parseOption('--retry-backoff-ms', '500')),
      transactionCap: Number(parseOption('--transaction-cap', String(plan.actions.length))),
      nativeTokenBudget: BigInt(parseOption('--native-budget-wei', '10000000000000000000')!),
    },
  });
  console.log(`Campaign ${plan.campaignId}: mined ${summary.mined}, failed ${summary.failed}, submitted ${summary.submitted}, planned ${summary.planned}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
