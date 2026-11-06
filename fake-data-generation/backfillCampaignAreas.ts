import { createDecipheriv } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { campaignRunAreas } from './campaignAreas.js';
import { loadCampaignPlan } from './campaignPlanner.js';
import type { CampaignExecutionState } from './campaignExecutor.js';
import type { CampaignManifestV1 } from './campaignSchema.js';
import { loadRuntimeBindings } from './campaignRuntimeBindings.js';
import { encryptTestData, type EncryptedTestDataDocument, type TestDataRun } from './testDataArtifacts.js';

/** Enrich an existing encrypted run without resubmitting transactions or changing its identity. */
async function main() {
  const [campaignDirectory, runId] = process.argv.slice(2);
  if (!campaignDirectory || !runId || !/^[0-9TZ]+$/.test(runId)) throw new Error('Usage: tsx backfillCampaignAreas.ts <saved-campaign-directory> <run-id>');
  const manifest = JSON.parse(await readFile(path.join(campaignDirectory, 'manifest.json'), 'utf8')) as CampaignManifestV1;
  const plan = await loadCampaignPlan(manifest, campaignDirectory);
  const bindings = await loadRuntimeBindings(plan, path.join(campaignDirectory, manifest.artifactLayout.runtimeBindings ?? 'execution/runtime-bindings.json'));
  const state = JSON.parse(await readFile(path.join(campaignDirectory, manifest.artifactLayout.executionState), 'utf8')) as CampaignExecutionState;
  const artifactRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), 'output/test-data');
  const key = Buffer.from((await readFile(path.join(artifactRoot, '.admin-capability'), 'utf8')).trim(), 'base64url');
  const runPath = path.join(artifactRoot, 'runs', runId, 'run.enc.json');
  const encrypted = JSON.parse(await readFile(runPath, 'utf8')) as EncryptedTestDataDocument;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64url'));
  const run = JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, 'base64url')), decipher.final()]).toString('utf8')) as TestDataRun;
  if (run.runId !== runId || run.parameters.campaignId !== plan.campaignId) throw new Error('saved run does not match campaign');
  // Check wallet identity too: the same campaign may have many independent executions.
  for (const user of plan.users) {
    const saved = run.users.find((candidate) => candidate.id === Number(user.id.replace('user-', '')) - 1);
    if (!saved || saved.address.toLowerCase() !== bindings.users[user.id]?.toLowerCase()) throw new Error(`run wallet does not match ${user.id}`);
    saved.personaId = user.personaId;
    saved.roles = user.roles;
  }
  const areas = campaignRunAreas(plan, bindings, manifest.causes, state, manifest.demoAreas);
  run.entities.areas = areas;
  await writeFile(`${runPath}.tmp`, `${JSON.stringify(encryptTestData(run, key), null, 2)}\n`);
  await rename(`${runPath}.tmp`, runPath);
  console.log(`Enriched run ${runId} with ${areas.length} areas; registry and saved plan unchanged.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
