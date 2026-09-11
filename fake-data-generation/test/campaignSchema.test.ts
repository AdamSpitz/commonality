import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CAMPAIGN_SCHEMA_VERSION, type CampaignManifestV1, validateCampaignManifest } from '../campaignSchema.js';
import { flattenSeedStatements, loadSeedCollections } from '../seed-content-format.js';

async function loadManifest(): Promise<CampaignManifestV1> {
  return JSON.parse(await readFile(new URL('../campaigns/medium-realistic-v1.json', import.meta.url), 'utf8')) as CampaignManifestV1;
}

test('v1 medium campaign satisfies the frozen schema and target shape', async () => {
  const manifest = await loadManifest();
  validateCampaignManifest(manifest);

  assert.equal(manifest.schema, CAMPAIGN_SCHEMA_VERSION);
  assert.equal(manifest.campaign.userCount, 100);
  assert.equal(manifest.causes.length, 10);
  assert.equal(manifest.causes.flatMap((cause) => cause.statementRefs).length, 46);
  assert.deepEqual(
    Object.fromEntries(['large', 'medium', 'small'].map((tier) => [tier, manifest.causes.filter((cause) => cause.activityTier === tier).length])),
    { large: 3, medium: 3, small: 4 },
  );
});

test('every campaign statement resolves to accepted, non-proliferated seed content', async () => {
  const manifest = await loadManifest();
  const records = flattenSeedStatements(await loadSeedCollections());
  const available = new Set(records.map(({ collection, group, statement }) => `${collection.id}/${group.id}/${statement.id}`));

  for (const cause of manifest.causes) {
    for (const ref of cause.statementRefs) {
      assert.ok(!manifest.sourcePolicy.excludeCollections.includes(ref.collectionId));
      assert.ok(available.has(`${ref.collectionId}/${ref.groupId}/${ref.statementId}`), `missing statement ${JSON.stringify(ref)}`);
    }
  }
});

test('v1 action targets describe roughly 1,000-3,000 successful writes', async () => {
  const manifest = await loadManifest();
  const minimum = manifest.actionRules.reduce((total, rule) => total + rule.targetCount.min, 0);
  const maximum = manifest.actionRules.reduce((total, rule) => total + rule.targetCount.max, 0);

  assert.ok(minimum >= 1_000, `minimum action target was ${minimum}`);
  assert.ok(maximum <= 3_000, `maximum action target was ${maximum}`);
});

test('manifest validation rejects secrets inside campaign artifacts', async () => {
  const manifest = await loadManifest();
  const invalid = structuredClone(manifest);
  invalid.artifactLayout.walletSecrets = 'plan/private-keys.json';
  assert.throws(() => validateCampaignManifest(invalid), /outside the campaign artifact directory/);
});
