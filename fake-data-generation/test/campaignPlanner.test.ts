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
    assert.ok(plan.users.find((user) => user.id === action.actorUserId)!.causeIds.includes(action.causeId!));
    assert.match(statements.get(action.implication!.fromStatementId)!.role!, /^modified-(left|right)$/);
    assert.equal(statements.get(action.implication!.toStatementId)!.role, 'commonality');
  }
});

test('behavior histories are cause-aware and carry executable intent', async () => {
  const plan = await buildCampaignPlan(await loadManifest());
  const users = new Map(plan.users.map((user) => [user.id, user]));
  const projects = new Map(plan.projects.map((project) => [project.id, project]));
  const actions = new Map(plan.actions.map((action) => [action.id, action]));

  for (const action of plan.actions.filter((item) => item.type === 'set-belief')) {
    assert.ok(users.get(action.actorUserId!)!.causeIds.includes(action.causeId!));
    assert.ok(action.belief === 'believe' || action.belief === 'disbelieve');
  }
  assert.ok(plan.actions.some((action) => action.type === 'set-belief' && action.dependsOn.some((id) => actions.get(id)?.type === 'set-belief')), 'expected belief changes');

  for (const action of plan.actions.filter((item) => item.type === 'attest-alignment')) {
    assert.ok(users.get(action.actorUserId!)!.causeIds.includes(action.causeId!));
    assert.ok(projects.get(action.projectId!)!.statementIds.includes(action.statementId!));
    assert.equal(action.alignment, 'supports-described-outcome');
  }
  assert.ok(plan.projects.every((project) => project.title.length > 20 && project.outcome.length > 20));
  for (const action of plan.actions.filter((item) => item.type === 'fund-project')) {
    assert.ok(users.get(action.actorUserId!)!.causeIds.includes(action.causeId!));
    assert.ok(action.amount! > 0);
  }
  const fundingCounts = plan.projects.map((project) => plan.actions.filter((action) => action.type === 'fund-project' && action.projectId === project.id).length);
  assert.ok(fundingCounts.some((count) => count === 0), 'expected deliberately unfunded projects');
  assert.ok(Math.max(...fundingCounts) >= Math.max(10, Math.min(...fundingCounts.filter((count) => count > 0)) * 3), 'expected skewed project popularity');
  assert.ok(new Set(plan.actions.filter((item) => item.type === 'fund-project').map((item) => item.amount)).size > 10, 'expected uneven funding amounts');
  assert.equal(plan.estimate.estimatedPaymentTokenUnits, plan.actions.filter((item) => item.type === 'fund-project').reduce((sum, item) => sum + item.amount!, 0));
});

test('delegations follow a shared-cause trust graph and revocations follow delegations', async () => {
  const plan = await buildCampaignPlan(await loadManifest());
  const users = new Map(plan.users.map((user) => [user.id, user]));
  const actions = new Map(plan.actions.map((action) => [action.id, action]));
  for (const action of plan.actions.filter((item) => item.type === 'delegate-note')) {
    const owner = users.get(action.actorUserId!)!; const delegate = users.get(action.delegateUserId!)!;
    assert.ok(delegate.roles.includes('delegate'));
    assert.deepEqual(action.delegationBasis!.sharedCauseIds, delegate.causeIds.filter((causeId) => owner.causeIds.includes(causeId)).sort());
    assert.ok(action.amount! > 0);
  }
  for (const action of plan.actions.filter((item) => item.type === 'revoke-delegation')) {
    assert.ok(action.dependsOn.some((id) => actions.get(id)?.type === 'delegate-note'));
  }
});

test('validation rejects an action whose prerequisite points forward', async () => {
  const manifest = await loadManifest(); const plan = await buildCampaignPlan(manifest); const invalid = structuredClone(plan.actions);
  invalid[0].dependsOn = [invalid[1].id];
  assert.throws(() => validatePlannedActions(manifest, plan.statements, plan.users, plan.projects, invalid), /impossible dependency/);
});
