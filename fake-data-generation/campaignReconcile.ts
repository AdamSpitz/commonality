import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  const stack = createLocalCampaignStack();
  const heads = await probeLocalCampaignStack(stack);
  console.log(`Chain head ${heads.chainHead}; indexer head ${heads.indexerHead}; lag ${heads.chainHead > heads.indexerHead ? heads.chainHead - heads.indexerHead : 0n} blocks.`);
  if (probeOnly) return;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as CampaignManifestV1;
  const result = await reconcileLocalCampaign({ manifest, outputDirectory, bindingsPath, stack });
  console.log(result.summary);
  console.log(`Wrote ${result.jsonPath} and ${result.summaryPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
