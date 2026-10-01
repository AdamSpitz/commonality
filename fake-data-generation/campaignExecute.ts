import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sliceCampaignPlanForCanary } from './campaignCanary.js';
import {
  LOCAL_HARDHAT_CHAIN_ID,
  loadCampaignEnvironment,
  preflightCampaignEnvironment,
  createCampaignChainAdapter,
  validateCampaignWallets,
  type CampaignWalletBinding,
} from './campaignEnvironment.js';
import { campaignRunPublications, createCampaignContractAdapter, createLiveCampaignActionWriter, createReceiptLookup, persistCampaignBindings } from './campaignActionAdapter.js';
import { executeCampaignPlan } from './campaignExecutor.js';
import { loadCampaignPlan } from './campaignPlanner.js';
import { createLiveCampaignFundingChain, provisionCampaignWallets } from './campaignProvisioning.js';
import { createEmptyRuntimeBindings, loadRuntimeBindings } from './campaignRuntimeBindings.js';
import type { CampaignManifestV1 } from './campaignSchema.js';
import { FUNDED_HARDHAT_DEV_KEYS } from './seedCauseRoster.js';
import { createSeedPublicClient } from './seedRpc.js';
import { loadEnv, RPC_URL } from './loadEnv.js';
import { PUBLISH_DATA_BATCH_SELECTOR } from '@commonality/sdk/published-data';
import { HARDHAT_PRIVATE_KEYS } from './generateUsers.js';
import { writeTestDataRun } from './testDataArtifacts.js';

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
  let saved: CampaignWalletBinding[] = [];
  try {
    saved = JSON.parse(await readFile(secretsPath, 'utf8')) as CampaignWalletBinding[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const existingSlots = new Set(saved.map((wallet) => wallet.walletSlot));
  const added = planUsers.flatMap((user, index) => {
    if (existingSlots.has(user.walletSlot)) return [];
    const privateKey = local && index < FUNDED_HARDHAT_DEV_KEYS.length
      ? FUNDED_HARDHAT_DEV_KEYS[index] as `0x${string}`
      : generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return [{
      walletSlot: user.walletSlot,
      address: account.address,
      privateKey,
      source: (local && index < FUNDED_HARDHAT_DEV_KEYS.length ? 'hardhat' : 'generated') as CampaignWalletBinding['source'],
    }];
  });
  if (added.length === 0) return saved;
  const wallets = [...saved, ...added];
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
  const loadedPlan = await loadCampaignPlan(manifest, outputDirectory);
  const userCount = parseOption('--user-count');
  const slice = userCount ? sliceCampaignPlanForCanary(loadedPlan, Number(userCount)) : null;
  const plan = slice
    ? { ...loadedPlan, users: [...slice.users, ...slice.extraActors], actions: slice.actions, projects: slice.projects }
    : loadedPlan;
  const stageDirectory = slice ? `stage-${slice.userCount}` : '';
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
  const secretsPath = environment.mode === 'remote'
    ? path.join(outputDirectory, '../secrets/medium-realistic-v1.remote.wallets.json')
    : path.join(outputDirectory, manifest.artifactLayout.walletSecrets);
  const wallets = await loadOrCreateWallets(plan.users, secretsPath, environment.mode === 'local');
  validateCampaignWallets(environment, wallets, HARDHAT_PRIVATE_KEYS);
  await writeFile(path.join(outputDirectory, manifest.artifactLayout.walletAddresses), `${JSON.stringify({
    version: plan.version, campaignId: plan.campaignId,
    wallets: plan.users.map((user) => {
      const wallet = wallets.find((item) => item.walletSlot === user.walletSlot);
      return { userId: user.id, walletSlot: user.walletSlot, address: wallet?.address ?? null, status: wallet ? 'provisioned' : 'unprovisioned' };
    }),
  }, null, 2)}\n`);
  const funder = wallets.find((wallet) => wallet.source === 'hardhat') ?? wallets[0];
  if (!funder) throw new Error('campaign has no funder wallet');
  const funderPrivateKey = environment.mode === 'remote' ? remoteFunderPrivateKey() : funder.privateKey;
  const publicClient = createSeedPublicClient(environment.rpcUrl);
  const gasPrice = await publicClient.getGasPrice();
  if (gasPrice <= 0n) throw new Error('RPC returned a non-positive gas price');
  console.log(`Campaign gas-price quote: ${gasPrice} wei`);
  const publishedCode = await publicClient.getBytecode({ address: environment.contracts.publishedData });
  const batchPublishes = (publishedCode ?? '0x').toLowerCase().includes(PUBLISH_DATA_BATCH_SELECTOR.slice(2).toLowerCase());
  if (!batchPublishes) console.log('PublishedData has no publishDataBatch; statement publishes stay one transaction each until that contract is redeployed.');
  const skipProvision = parseFlag('--skip-provision');
  if (!skipProvision) {
    await provisionCampaignWallets({
      environment,
      plan,
      wallets,
      batchPublishes,
      gasPrice,
      chain: createLiveCampaignFundingChain({ funderPrivateKey, contracts: environment.contracts }),
      ledgerPath: path.join(outputDirectory, stageDirectory, manifest.artifactLayout.fundingLedger),
    });
  }
  const publisher = wallets[0];
  const bindingsPath = path.join(outputDirectory, stageDirectory, manifest.artifactLayout.runtimeBindings ?? 'execution/runtime-bindings.json');
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
  const adapter = createCampaignContractAdapter({
    plan,
    contracts: environment.contracts,
    wallets,
    publisher,
    bindings,
    writer: createLiveCampaignActionWriter({ plan, contracts: environment.contracts, bindings }),
    getReceipt: createReceiptLookup(publicClient),
    gasPrice,
    persistBindings: (value) => persistCampaignBindings(plan, value, bindingsPath),
  });
  const summary = await executeCampaignPlan({
    campaignId: plan.campaignId,
    manifestFingerprint: plan.manifestFingerprint,
    actions: plan.actions,
    adapter,
    options: {
      statePath: path.join(outputDirectory, stageDirectory, manifest.artifactLayout.executionState),
      concurrency: Number(parseOption('--concurrency', '1')),
      pacingMs: Number(parseOption('--pacing-ms', environment.mode === 'local' ? '0' : '250')),
      maxRetries: Number(parseOption('--max-retries', '2')),
      retryBackoffMs: Number(parseOption('--retry-backoff-ms', '500')),
      transactionCap: Number(parseOption('--transaction-cap', String(plan.actions.length))),
      batchPublishes,
      nativeTokenBudget: BigInt(parseOption('--native-budget-wei', '10000000000000000000')!),
    },
  });
  console.log(`Campaign ${plan.campaignId}: mined ${summary.mined}, failed ${summary.failed}, submitted ${summary.submitted}, planned ${summary.planned}.`);
  const chainId = environment.expectedChainId;
  const network = chainId === LOCAL_HARDHAT_CHAIN_ID ? 'local' : chainId === 84532 ? 'testnet' : undefined;
  if (network) {
    const publications = campaignRunPublications(plan, bindings);
    await writeTestDataRun({
      network,
      chainId,
      parameters: { campaignId: plan.campaignId, kind: 'campaign', mined: summary.mined, failed: summary.failed },
      entities: publications,
      users: [],
      actions: plan.actions
        .filter((action) => action.type === 'create-cause' || action.type === 'create-bridge-board' || action.type === 'create-bridge')
        .map((action) => ({ ...action })),
      metrics: { errors: [] },
    });
  }
}

function remoteFunderPrivateKey(): `0x${string}` {
  const secretsFile = process.env.COMMONALITY_OPERATOR_SECRETS_FILE
    || path.join(process.env.HOME || '', '.secrets', 'commonality', 'operator.env');
  dotenv.config({ path: secretsFile });
  const key = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('remote campaign provisioning needs DEPLOYER_PRIVATE_KEY in the operator secrets file');
  }
  return key as `0x${string}`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
