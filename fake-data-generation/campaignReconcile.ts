import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceCampaignPlanForCanary } from './campaignCanary.js';
import { loadCampaignPlan } from './campaignPlanner.js';
import { createLocalCampaignStack, probeLocalCampaignStack, reconcileLocalCampaign } from './campaignLocalStack.js';
import type { CampaignManifestV1 } from './campaignSchema.js';
import { loadEnv } from './loadEnv.js';

loadEnv();

async function main(): Promise<void> {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const probeOnly = process.argv.includes('--probe');
  const args = process.argv.slice(2).filter((arg) => arg !== '--probe');
  const manifestPath = args[0] ?? path.join(directory, 'campaigns/medium-realistic-v1.json');
  const outputDirectory = args[1] ?? path.join(directory, 'output/campaigns/medium-realistic-v1');
  const bindingsPath = args[2] ?? path.join(outputDirectory, 'execution/runtime-bindings.json');
  const chainIdFlag = process.argv.indexOf('--chain-id');
  const chainId = chainIdFlag >= 0 ? Number(process.argv[chainIdFlag + 1]) : (process.env.RPC_URL && !process.env.RPC_URL.includes('localhost') ? 84532 : 31337);
  const stack = createLocalCampaignStack({ chainId });
  const heads = await probeLocalCampaignStack(stack);
  console.log(`Chain head ${heads.chainHead}; indexer head ${heads.indexerHead}; lag ${heads.chainHead > heads.indexerHead ? heads.chainHead - heads.indexerHead : 0n} blocks.`);
  if (probeOnly) return;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as CampaignManifestV1;
  const userCountFlag = args.indexOf('--user-count');
  const userCount = userCountFlag >= 0 ? Number(args[userCountFlag + 1]) : undefined;
  const loadedPlan = userCount ? await loadCampaignPlan(manifest, outputDirectory) : undefined;
  const slice = loadedPlan && userCount ? sliceCampaignPlanForCanary(loadedPlan, userCount) : undefined;
  const plan = slice && loadedPlan
    ? { ...loadedPlan, users: [...slice.users, ...slice.extraActors], actions: slice.actions, projects: slice.projects }
    : undefined;
  const stageDirectory = slice ? path.join(outputDirectory, `stage-${slice.userCount}`) : outputDirectory;
  const result = await reconcileLocalCampaign({
    manifest,
    outputDirectory,
    bindingsPath: slice ? path.join(stageDirectory, 'execution/runtime-bindings.json') : bindingsPath,
    executionPath: slice ? path.join(stageDirectory, manifest.artifactLayout.executionState) : undefined,
    reportDirectory: slice ? stageDirectory : undefined,
    plan,
    stack,
  });
  console.log(result.summary);
  console.log(`Wrote ${result.jsonPath} and ${result.summaryPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);
    process.exitCode = 1;
  });
}
