import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatEther, type Address } from 'viem';
import {
  BASE_SEPOLIA_CHAIN_ID,
  createCampaignChainAdapter,
  loadCampaignEnvironment,
  preflightCampaignEnvironment,
  type CampaignChainAdapter,
  type CampaignEnvironment,
  type CampaignPreflightResult,
} from './campaignEnvironment.js';
import { createLocalCampaignStack, probeLocalCampaignStack } from './campaignLocalStack.js';
import { loadCampaignPlan, type CampaignPlan, type PlannedAction } from './campaignPlanner.js';
import { computeCampaignFundingNeeds } from './campaignProvisioning.js';
import type { CampaignManifestV1 } from './campaignSchema.js';
import { loadEnv, RPC_URL } from './loadEnv.js';

export const REMOTE_CANARY_USER_COUNT = 10;
export const DEFAULT_REMOTE_PACING_MS = 250;
export const DEFAULT_REMOTE_CONCURRENCY = 1;
export const DEFAULT_MAX_INDEXER_LAG_BLOCKS = 300n;
export const DEFAULT_TESTNET_INDEXER_URL = 'https://commonality-indexer.onrender.com';
export const DEFAULT_TESTNET_DEPLOYMENT_ENV = '../deployments/base-sepolia.env';

export const CANARY_SECRETS_POLICY = {
  storage: 'output/campaigns/secrets/ (gitignored; never under the public campaign directory)',
  walletSource: 'generated-only',
  hardhatKeys: 'forbidden on remote',
  retention: 'delete after the campaign report unless Adam explicitly retains them',
  identification: 'SYNTHETIC TESTNET CAMPAIGN — NOT REAL USERS OR ADOPTION',
} as const;

export interface CampaignCanarySlice {
  userCount: number;
  users: CampaignPlan['users'];
  extraActors: CampaignPlan['users'];
  actions: PlannedAction[];
  projects: CampaignPlan['projects'];
  writesByType: Record<string, number>;
}

export interface CampaignCanaryGate {
  id: string;
  status: 'pass' | 'fail' | 'needs-adam';
  detail: string;
}

export interface CampaignCanaryProposal {
  campaignId: string;
  phase: 'remote-canary-10';
  mutatesChain: false;
  userCount: number;
  writeCount: number;
  writesByType: Record<string, number>;
  nativeWeiNeeded: string;
  nativeEthNeeded: string;
  paymentTokenUnitsNeeded: string;
  pacingMs: number;
  concurrency: number;
  estimatedDurationMs: number;
  estimatedDurationMinutes: number;
  nativeTokenBudgetWei: string;
  transactionCap: number;
  secrets: typeof CANARY_SECRETS_POLICY;
  syntheticDataLabel: string;
  chainId: number;
  contracts: CampaignEnvironment['contracts'];
  indexerUrl: string;
  indexerLagBlocks: string | null;
  gates: CampaignCanaryGate[];
  readyForAdamApproval: boolean;
}

export function sliceCampaignPlanForCanary(plan: CampaignPlan, userCount = REMOTE_CANARY_USER_COUNT): CampaignCanarySlice {
  if (!Number.isSafeInteger(userCount) || userCount < 1) throw new Error('canary user count must be a positive integer');
  if (userCount > plan.users.length) throw new Error(`canary needs ${userCount} users but the plan has ${plan.users.length}`);
  const users = plan.users.slice(0, userCount);
  const userIds = new Set(users.map((user) => user.id));
  const byId = new Map(plan.actions.map((action) => [action.id, action]));
  const selected = new Set<string>();
  const addWithDeps = (actionId: string): void => {
    if (selected.has(actionId)) return;
    const action = byId.get(actionId);
    if (!action) throw new Error(`canary slice is missing action ${actionId}`);
    for (const dependencyId of action.dependsOn) addWithDeps(dependencyId);
    selected.add(actionId);
  };
  for (const action of plan.actions) {
    if (action.actorUserId === null || (action.actorUserId !== null && userIds.has(action.actorUserId))) addWithDeps(action.id);
    if (action.delegateUserId && userIds.has(action.delegateUserId)) addWithDeps(action.id);
  }
  const actions = plan.actions.filter((action) => selected.has(action.id));
  const actorIds = new Set(actions.flatMap((action) => (action.actorUserId ? [action.actorUserId] : [])));
  const extraActors = plan.users.filter((user) => actorIds.has(user.id) && !userIds.has(user.id));
  const projectIds = new Set(actions.flatMap((action) => (action.projectId ? [action.projectId] : [])));
  const projects = plan.projects.filter((project) => projectIds.has(project.id) || userIds.has(project.founderUserId));
  const writesByType: Record<string, number> = {};
  for (const action of actions) writesByType[action.type] = (writesByType[action.type] ?? 0) + 1;
  return { userCount, users, extraActors, actions, projects, writesByType };
}

function placeholderWallets(users: CampaignPlan['users']) {
  return users.map((user, index) => ({
    walletSlot: user.walletSlot,
    address: `0x${String(index + 1).padStart(40, '0')}` as Address,
    privateKey: `0x${String(index + 1).padStart(64, '0')}` as `0x${string}`,
    source: 'generated' as const,
  }));
}

export function estimateCanaryDurationMs(writeCount: number, pacingMs: number, concurrency: number): number {
  const safeConcurrency = Math.max(1, concurrency);
  const batches = Math.ceil(writeCount / safeConcurrency);
  return batches * Math.max(0, pacingMs);
}

function passFail(ok: boolean): CampaignCanaryGate['status'] {
  return ok ? 'pass' : 'fail';
}

function remoteCanaryGates(input: {
  environment: CampaignEnvironment;
  chainPreflight: CampaignPreflightResult;
  slice: CampaignCanarySlice;
  secretsPath: string;
  indexerLagBlocks: bigint | null;
  maxLag: bigint;
}): CampaignCanaryGate[] {
  const lagOk = input.indexerLagBlocks !== null && input.indexerLagBlocks <= input.maxLag;
  return [
    { id: 'remote-mode', status: 'pass', detail: `mode ${input.environment.mode}; chain ${input.chainPreflight.chainId}` },
    { id: 'existing-deployment', status: passFail(input.environment.deployment.strategy === 'existing-only'), detail: input.environment.deployment.strategy },
    { id: 'transfer-only-tokens', status: passFail(input.environment.provisioning.paymentTokenStrategy === 'transfer-only'), detail: input.environment.provisioning.paymentTokenStrategy },
    { id: 'generated-wallets', status: passFail(input.environment.provisioning.walletSource === 'generated-only'), detail: input.environment.provisioning.walletSource },
    { id: 'bytecode', status: passFail(input.chainPreflight.checkedContracts.length > 0), detail: input.chainPreflight.checkedContracts.join(',') },
    { id: 'no-mutation-in-preflight', status: passFail(input.environment.mode === 'remote' && !input.environment.mutationConfirmed), detail: 'preflight must not set --confirm-remote-mutation' },
    { id: 'canary-size', status: passFail(input.slice.userCount === REMOTE_CANARY_USER_COUNT), detail: `${input.slice.userCount} users, ${input.slice.actions.length} writes` },
    { id: 'secrets-layout', status: passFail(input.secretsPath.startsWith('../secrets/')), detail: input.secretsPath },
    {
      id: 'indexer-lag',
      status: passFail(lagOk),
      detail: input.indexerLagBlocks === null ? 'indexer head unavailable' : `${input.indexerLagBlocks} blocks (max ${input.maxLag})`,
    },
    { id: 'shared-lab-readiness', status: 'needs-adam', detail: 'Confirm workflow/testnet-working-plan.md shared-lab milestone is boring before mutating' },
    { id: 'official-implication-path', status: 'needs-adam', detail: 'Confirm the official implication/trust path for the chosen statements is intentionally populated' },
    { id: 'read-only-verifier', status: 'needs-adam', detail: 'Run ./scripts/verifier-testnet.sh (read-only leaves) immediately before the mutating canary' },
    { id: 'budget-and-window', status: 'needs-adam', detail: 'Adam must approve this proposal, native budget, pacing, and testnet window' },
  ];
}

export function buildRemoteCanaryProposal(input: {
  plan: CampaignPlan;
  manifest: CampaignManifestV1;
  environment: CampaignEnvironment;
  chainPreflight: CampaignPreflightResult;
  slice?: CampaignCanarySlice;
  pacingMs?: number;
  concurrency?: number;
  indexerUrl: string;
  indexerLagBlocks: bigint | null;
  maxIndexerLagBlocks?: bigint;
}): CampaignCanaryProposal {
  if (input.environment.mode !== 'remote') throw new Error('remote canary preflight refuses local mode');
  const slice = input.slice ?? sliceCampaignPlanForCanary(input.plan);
  const pacingMs = input.pacingMs ?? DEFAULT_REMOTE_PACING_MS;
  const concurrency = input.concurrency ?? DEFAULT_REMOTE_CONCURRENCY;
  const fundedUsers = [...slice.users, ...slice.extraActors];
  const slicedPlan = { ...input.plan, users: fundedUsers, actions: slice.actions, projects: slice.projects };
  const needs = computeCampaignFundingNeeds(slicedPlan, placeholderWallets(fundedUsers));
  const nativeWei = needs.reduce((sum, need) => sum + need.nativeWei, 0n);
  const paymentTokenUnits = needs.reduce((sum, need) => sum + need.paymentTokenUnits, 0n);
  const estimatedDurationMs = estimateCanaryDurationMs(slice.actions.length, pacingMs, concurrency);
  const maxLag = input.maxIndexerLagBlocks ?? DEFAULT_MAX_INDEXER_LAG_BLOCKS;
  const gates = remoteCanaryGates({
    environment: input.environment,
    chainPreflight: input.chainPreflight,
    slice,
    secretsPath: input.manifest.artifactLayout.walletSecrets,
    indexerLagBlocks: input.indexerLagBlocks,
    maxLag,
  });
  const readyForAdamApproval = gates.every((gate) => gate.status !== 'fail');
  return {
    campaignId: input.plan.campaignId,
    phase: 'remote-canary-10',
    mutatesChain: false,
    userCount: slice.userCount,
    writeCount: slice.actions.length,
    writesByType: slice.writesByType,
    nativeWeiNeeded: nativeWei.toString(),
    nativeEthNeeded: formatEther(nativeWei),
    paymentTokenUnitsNeeded: paymentTokenUnits.toString(),
    pacingMs,
    concurrency,
    estimatedDurationMs,
    estimatedDurationMinutes: Math.round((estimatedDurationMs / 60_000) * 10) / 10,
    nativeTokenBudgetWei: nativeWei.toString(),
    transactionCap: slice.actions.length,
    secrets: CANARY_SECRETS_POLICY,
    syntheticDataLabel: input.manifest.campaign.syntheticDataLabel,
    chainId: input.chainPreflight.chainId,
    contracts: input.environment.contracts,
    indexerUrl: input.indexerUrl,
    indexerLagBlocks: input.indexerLagBlocks === null ? null : input.indexerLagBlocks.toString(),
    gates,
    readyForAdamApproval,
  };
}

export function formatCanaryProposalMarkdown(proposal: CampaignCanaryProposal): string {
  const gateLines = proposal.gates.map((gate) => `- [${gate.status}] ${gate.id}: ${gate.detail}`).join('\n');
  const typeLines = Object.entries(proposal.writesByType).map(([type, count]) => `- ${type}: ${count}`).join('\n');
  return `# Remote canary proposal (${proposal.campaignId})

This preflight **does not mutate** the chain. Do not run \`gen:campaign:execute --mode remote --confirm-remote-mutation\` until Adam approves this file.

- Users: ${proposal.userCount}
- Writes: ${proposal.writeCount}
- Native needed: ${proposal.nativeEthNeeded} ETH (${proposal.nativeWeiNeeded} wei)
- Payment-token units: ${proposal.paymentTokenUnitsNeeded}
- Pacing: ${proposal.pacingMs} ms, concurrency ${proposal.concurrency}
- Estimated duration: ${proposal.estimatedDurationMinutes} minutes
- Transaction cap: ${proposal.transactionCap}
- Chain ID: ${proposal.chainId}
- Indexer: ${proposal.indexerUrl} (lag ${proposal.indexerLagBlocks ?? 'unknown'} blocks)
- Synthetic label: ${proposal.syntheticDataLabel}
- Secrets: ${proposal.secrets.storage}; ${proposal.secrets.retention}

## Writes by type

${typeLines}

## Readiness gates

${gateLines}

Ready for Adam approval: **${proposal.readyForAdamApproval ? 'yes (pending the needs-adam items)' : 'no'}**
`;
}

export async function runRemoteCanaryPreflight(input: {
  manifest: CampaignManifestV1;
  plan: CampaignPlan;
  environment: CampaignEnvironment;
  chain: CampaignChainAdapter;
  indexerUrl: string;
  outputDirectory: string;
  pacingMs?: number;
  concurrency?: number;
  probeIndexer?: () => Promise<{ chainHead: bigint; indexerHead: bigint }>;
}): Promise<{ proposal: CampaignCanaryProposal; jsonPath: string; markdownPath: string }> {
  if (input.environment.mode !== 'remote') throw new Error('remote canary preflight refuses local mode');
  const chainPreflight = await preflightCampaignEnvironment(input.environment, input.chain);
  const probe = input.probeIndexer ?? (async () => {
    const stack = createLocalCampaignStack({
      rpcUrl: input.environment.rpcUrl,
      eventCacheUrl: input.indexerUrl,
      chainId: input.environment.expectedChainId,
    });
    return probeLocalCampaignStack(stack);
  });
  let indexerLagBlocks: bigint | null = null;
  try {
    const heads = await probe();
    indexerLagBlocks = heads.chainHead > heads.indexerHead ? heads.chainHead - heads.indexerHead : 0n;
  } catch {
    indexerLagBlocks = null;
  }
  const proposal = buildRemoteCanaryProposal({
    plan: input.plan,
    manifest: input.manifest,
    environment: input.environment,
    chainPreflight,
    pacingMs: input.pacingMs,
    concurrency: input.concurrency,
    indexerUrl: input.indexerUrl,
    indexerLagBlocks,
  });
  const jsonPath = path.join(input.outputDirectory, 'reports/remote-canary-preflight.json');
  const markdownPath = path.join(input.outputDirectory, 'reports/remote-canary-preflight.md');
  await mkdir(path.dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(proposal, null, 2)}\n`);
  await writeFile(markdownPath, formatCanaryProposalMarkdown(proposal));
  return { proposal, jsonPath, markdownPath };
}

loadEnv();

function parseOption(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

async function main(): Promise<void> {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = parseOption('--manifest', path.join(directory, 'campaigns/medium-realistic-v1.json'))!;
  const outputDirectory = parseOption('--output', path.join(directory, 'output/campaigns/medium-realistic-v1'))!;
  const deploymentEnvPath = parseOption('--deployment-env', path.join(directory, DEFAULT_TESTNET_DEPLOYMENT_ENV))!;
  const indexerUrl = parseOption('--indexer-url', process.env.EVENT_CACHE_URL || DEFAULT_TESTNET_INDEXER_URL)!;
  const rpcUrl = parseOption('--rpc-url', RPC_URL)!;
  const expectedChainId = Number(parseOption('--chain-id', String(BASE_SEPOLIA_CHAIN_ID)));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as CampaignManifestV1;
  const plan = await loadCampaignPlan(manifest, outputDirectory);
  const environment = await loadCampaignEnvironment({
    mode: 'remote',
    rpcUrl,
    expectedChainId,
    deploymentEnvPath,
    mutationConfirmed: false,
  });
  const { proposal, jsonPath, markdownPath } = await runRemoteCanaryPreflight({
    manifest,
    plan,
    environment,
    chain: createCampaignChainAdapter(environment.rpcUrl),
    indexerUrl,
    outputDirectory,
    pacingMs: Number(parseOption('--pacing-ms', String(DEFAULT_REMOTE_PACING_MS))),
    concurrency: Number(parseOption('--concurrency', String(DEFAULT_REMOTE_CONCURRENCY))),
  });
  console.log(formatCanaryProposalMarkdown(proposal));
  console.log(`Wrote ${jsonPath} and ${markdownPath}`);
  if (!proposal.readyForAdamApproval) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
