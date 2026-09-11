import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { CampaignManifestV1 } from '../campaignSchema.js';
import { buildCampaignPlan, validatePlannedActions } from '../campaignPlanner.js';

async function loadManifest(): Promise<CampaignManifestV1> {
  return JSON.parse(await readFile(new URL('../campaigns/medium-realistic-v1.json', import.meta.url), 'utf8')) as CampaignManifestV1;
}

test('planner emits an identical, complete plan for the same seed', async () => {
  const manifest = await loadManifest();
  const first = await buildCampaignPlan(manifest); const second = await buildCampaignPlan(manifest);
  assert.deepEqual(first, second);
  assert.equal(first.users.length, 100); assert.equal(first.statements.length, 46);
  assert.ok(first.projects.length >= 18 && first.projects.length <= 26);
  assert.ok(first.estimate.totalWrites >= 1_000 && first.estimate.totalWrites <= 3_000);
  assert.equal(first.actions.length, first.estimate.totalWrites);
  assert.equal(first.users.some((user) => 'privateKey' in user || 'address' in user), false);
});

test('planner assigns overlapping, uneven causes and respects persona bounds', async () => {
  const manifest = await loadManifest(); const plan = await buildCampaignPlan(manifest);
  const memberships = Object.fromEntries(manifest.causes.map((cause) => [cause.id, plan.users.filter((user) => user.causeIds.includes(cause.id)).length]));
  assert.ok(new Set(Object.values(memberships)).size >= 5, JSON.stringify(memberships));
  assert.ok(plan.users.some((user) => user.causeIds.length > 1));
  for (const user of plan.users) { const persona = manifest.personas.find((item) => item.id === user.personaId)!; assert.ok(user.causeIds.length >= persona.causesPerUser.min && user.causeIds.length <= persona.causesPerUser.max); }
});

test('all implication actions use accepted bridge-role pairs', async () => {
  const plan = await buildCampaignPlan(await loadManifest()); const statements = new Map(plan.statements.map((statement) => [statement.id, statement]));
  for (const action of plan.actions.filter((item) => item.type === 'attest-implication')) {
    assert.equal(action.implication?.evidence, 'accepted-bridge-role-pair');
    assert.match(statements.get(action.implication!.fromStatementId)!.role!, /^modified-(left|right)$/);
    assert.equal(statements.get(action.implication!.toStatementId)!.role, 'commonality');
  }
});

test('validation rejects an action whose prerequisite points forward', async () => {
  const manifest = await loadManifest(); const plan = await buildCampaignPlan(manifest); const invalid = structuredClone(plan.actions);
  invalid[0].dependsOn = [invalid[1].id];
  assert.throws(() => validatePlannedActions(manifest, plan.statements, plan.users, plan.projects, invalid), /impossible dependency/);
});
