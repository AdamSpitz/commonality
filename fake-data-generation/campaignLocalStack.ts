import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPublicClient, http } from 'viem';
import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk/machinery';
import { CAMPAIGN_EXECUTION_VERSION, type CampaignExecutionState } from './campaignExecutor.js';
import { createCampaignIndexerAdapter } from './campaignIndexerAdapter.js';
import { loadCampaignPlan } from './campaignPlanner.js';
import { formatReconciliationReport, reconcileCampaign, writeReconciliationArtifacts, type CampaignReconciliationReport } from './campaignReconciler.js';
import { loadRuntimeBindings } from './campaignRuntimeBindings.js';
import { type CampaignManifestV1 } from './campaignSchema.js';
import { createCampaignSdkDerivedCheckProvider } from './campaignSdkDerivedChecks.js';
import { RPC_URL } from './loadEnv.js';

export const DEFAULT_EVENT_CACHE_URL = 'http://localhost:42069';

export interface LocalCampaignStack {
  machinery: SDKMachinery;
  publicClient: ReturnType<typeof createPublicClient>;
}

export function createLocalCampaignStack(input: { rpcUrl?: string; eventCacheUrl?: string; chainId?: number } = {}): LocalCampaignStack {
  const rpcUrl = input.rpcUrl ?? RPC_URL;
  const eventCacheUrl = input.eventCacheUrl ?? process.env.EVENT_CACHE_URL ?? DEFAULT_EVENT_CACHE_URL;
  const chainId = input.chainId ?? 31_337;
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  return {
    publicClient,
    machinery: createSDKMachinery({
      eventCacheUrl,
      defaultChainId: chainId,
      chainStatusKey: chainId === 31_337 ? 'hardhat' : undefined,
      publicClient,
    }),
  };
}

export async function probeLocalCampaignStack(stack: LocalCampaignStack): Promise<{ chainHead: bigint; indexerHead: bigint }> {
  const adapter = createCampaignIndexerAdapter({
    machinery: stack.machinery,
    publicClient: stack.publicClient,
    derivedChecks: { getDerivedChecks: async () => [] },
  });
  const [chainHead, indexerHead] = await Promise.all([adapter.getChainHead(), adapter.getIndexerHead()]);
  return { chainHead, indexerHead };
}

export async function reconcileLocalCampaign(input: {
  manifest: CampaignManifestV1;
  outputDirectory: string;
  bindingsPath: string;
  executionPath?: string;
  stack?: LocalCampaignStack;
  settlingWindowMs?: number;
  pollIntervalMs?: number;
}): Promise<{ report: CampaignReconciliationReport; summary: string; jsonPath: string; summaryPath: string }> {
  const stack = input.stack ?? createLocalCampaignStack();
  const plan = await loadCampaignPlan(input.manifest, input.outputDirectory);
  const bindings = await loadRuntimeBindings(plan, input.bindingsPath, { complete: true });
  const executionPath = input.executionPath ?? path.join(input.outputDirectory, input.manifest.artifactLayout.executionState);
  const execution = JSON.parse(await readFile(executionPath, 'utf8')) as CampaignExecutionState;
  if (execution.version !== CAMPAIGN_EXECUTION_VERSION) throw new Error('execution state version is not campaign-execution-v1');
  const adapter = createCampaignIndexerAdapter({
    machinery: stack.machinery,
    publicClient: stack.publicClient,
    derivedChecks: createCampaignSdkDerivedCheckProvider({ machinery: stack.machinery, plan, bindings }),
  });
  const report = await reconcileCampaign({
    actions: plan.actions,
    execution,
    adapter,
    options: { settlingWindowMs: input.settlingWindowMs ?? 30_000, pollIntervalMs: input.pollIntervalMs ?? 1_000 },
  });
  const jsonPath = path.join(input.outputDirectory, input.manifest.artifactLayout.reconciliation);
  const summaryPath = path.join(input.outputDirectory, input.manifest.artifactLayout.summary);
  await writeReconciliationArtifacts(report, jsonPath, summaryPath);
  return { report, summary: formatReconciliationReport(report), jsonPath, summaryPath };
}
