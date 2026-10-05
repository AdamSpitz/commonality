import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { CampaignManifestV1 } from '../campaignSchema.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildCampaignPlan, loadCampaignPlan, validatePlannedActions, writePlanArtifacts } from '../campaignPlanner.js';
import { CAMPAIGN_PROJECT_STORIES } from '../campaignProjectStories.js';

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

test('v2 gives every cause a concrete project and bridge projects use shared outcomes', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/medium-realistic-v2.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const plan = await buildCampaignPlan(manifest);
  assert.deepEqual(new Set(plan.projects.map((project) => project.causeId)), new Set(manifest.causes.map((cause) => cause.id)));
  for (const project of plan.projects) {
    assert.ok(project.blocker);
    assert.match(project.outcome, /This is fake data created for testing/);
    if (project.causeId.endsWith('common-ground')) {
      assert.deepEqual(project.statementIds.map((id) => plan.statements.find((statement) => statement.id === id)?.role), ['commonality']);
    }
  }
});

test('v2 includes every hobby story and its interested synthetic people', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/medium-realistic-v2.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const plan = await buildCampaignPlan(manifest);
  const hobbyCauses = ['music-learning', 'car-repair', 'gluten-free-cooking', 'game-commons'];
  assert.equal(plan.users.length, 100);
  assert.equal(plan.statements.length, 58);
  assert.equal(plan.projects.length, 29);
  for (const causeId of hobbyCauses) {
    assert.deepEqual(
      plan.projects.filter((project) => project.causeId === causeId).map((project) => project.title),
      CAMPAIGN_PROJECT_STORIES[causeId].map((story) => story.title),
    );
    const profiles = plan.users.filter((user) => user.favoriteCauseId === causeId);
    assert.ok(profiles.length >= 4);
    assert.ok(profiles.every((user) => user.causeIds.includes(causeId) && user.displayName && user.bio && user.interests?.length));
    assert.ok(plan.projects.filter((project) => project.causeId === causeId).every((project) => profiles.some((user) => user.id === project.founderUserId)));
    const causeFounder = plan.actions.find((action) => action.type === 'create-cause' && action.causeId === causeId);
    assert.ok(causeFounder && profiles.some((user) => user.id === causeFounder.actorUserId));
    assert.ok(plan.actions.some((action) => action.type === 'fund-project' && action.causeId === causeId && profiles.some((user) => user.id === action.actorUserId)));
    assert.ok(plan.actions.filter((action) => action.type === 'fund-project' && action.causeId === causeId).every((action) =>
      action.actorUserId !== plan.projects.find((project) => project.id === action.projectId)?.founderUserId));
  }
  assert.ok(plan.statements.filter((statement) => hobbyCauses.includes(statement.causeId)).every((statement) => statement.source.collectionId === 'medium-realistic-v2'));
  assert.ok(plan.projects.every((project) => project.blocker && project.statementIds.length > 0 && project.outcome.includes('This is fake data created for testing')));
});

test('v2 pins the Grey County walkthrough profiles and Fred delegates to Kurt', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/medium-realistic-v2.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const plan = await buildCampaignPlan(manifest);
  const kurt = plan.users.find((user) => user.displayName === 'Kurt')!;
  const fred = plan.users.find((user) => user.displayName === 'Fred')!;
  const sean = plan.users.find((user) => user.displayName === 'Sean')!;
  assert.deepEqual(kurt.causeIds, ['car-repair', 'gluten-free-cooking', 'game-commons']);
  assert.equal(kurt.roles.includes('delegate'), true);
  assert.deepEqual(fred.causeIds, ['game-commons']);
  assert.equal(fred.delegatesTo, kurt.id);
  assert.deepEqual(sean.causeIds, ['local-food']);
  assert.equal(sean.roles.includes('delegate'), true);
  const fredDelegations = plan.actions.filter((action) => action.type === 'delegate-note' && action.actorUserId === fred.id);
  assert.ok(fredDelegations.length > 0);
  assert.ok(fredDelegations.every((action) => action.delegateUserId === kurt.id));
  assert.deepEqual([kurt, fred, sean].map((user) => user.spotlightOrder), [1, 2, 3]);
});

test('v2 funds one bridge project from both camps before retroactive reimbursement', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/medium-realistic-v2.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const plan = await buildCampaignPlan(manifest);
  const actions = new Map(plan.actions.map((action) => [action.id, action]));
  const bridgeProject = plan.projects.find((project) => project.causeId === 'abortion-common-ground')!;
  const purchases = plan.actions.filter((action) => action.projectId === bridgeProject.id && action.funding?.kind === 'early' && action.funding.camp);
  assert.equal(purchases.length, 20);
  assert.deepEqual(new Set(purchases.map((action) => action.funding?.camp)), new Set(['left', 'right']));
  assert.equal(purchases.reduce((sum, action) => sum + action.amount!, 0), 200);
  for (const purchase of purchases) {
    assert.ok(purchase.dependsOn.some((id) => {
      const belief = actions.get(id);
      return belief?.type === 'set-belief' && belief.actorUserId === purchase.actorUserId &&
        plan.statements.find((statement) => statement.id === belief.statementId)?.role === `natural-${purchase.funding?.camp}`;
    }));
  }
  const retroactive = plan.actions.filter((action) => action.funding?.kind === 'retroactive');
  assert.equal(retroactive.length, 4);
  assert.ok(retroactive.every((action) => action.projectId === bridgeProject.id && purchases.every((purchase) => action.dependsOn.includes(purchase.id))));
  assert.ok(new Set(plan.actions.filter((action) => action.funding?.kind === 'early').map((action) => action.funding?.tokenCount)).size > 1);
});

test('planner assigns overlapping, uneven causes and respects persona bounds', async () => {
  const manifest = await loadManifest(); const plan = await buildCampaignPlan(manifest);
  const memberships = Object.fromEntries(manifest.causes.map((cause) => [cause.id, plan.users.filter((user) => user.causeIds.includes(cause.id)).length]));
  assert.ok(new Set(Object.values(memberships)).size >= 5, JSON.stringify(memberships));
  assert.ok(plan.users.some((user) => user.causeIds.length > 1));
  for (const user of plan.users) { const persona = manifest.personas.find((item) => item.id === user.personaId)!; assert.ok(user.causeIds.length >= persona.causesPerUser.min && user.causeIds.length <= persona.causesPerUser.max); }
});

test('bridge topics publish five boards and a cluster, not one combined roster', async () => {
  const plan = await buildCampaignPlan(await loadManifest());
  const bridgeCauses = ['abortion-common-ground', 'immigration-common-ground', 'violent-crime-common-ground', 'schools-common-ground'];
  for (const causeId of bridgeCauses) {
    const boards = plan.actions.filter((action) => action.causeId === causeId && (action.type === 'create-cause' || action.type === 'create-bridge-board'));
    const roles = boards.map((action) => action.board?.role).sort();
    assert.deepEqual(roles, ['commonality', 'modified-left', 'modified-right', 'natural-left', 'natural-right']);
    for (const board of boards) assert.equal(board.board?.statementIds.length, 1);
    const cluster = plan.actions.find((action) => action.type === 'create-bridge' && action.causeId === causeId);
    assert.ok(cluster);
    assert.equal(cluster!.actorUserId, boards.find((action) => action.board?.role === 'commonality')!.actorUserId);
    assert.notEqual(cluster!.actorUserId, boards.find((action) => action.board?.role === 'natural-left')!.actorUserId);
    const commonality = boards.find((action) => action.type === 'create-cause')!;
    assert.equal(commonality.boardId, causeId);
    assert.ok(boards.find((action) => action.board?.role === 'modified-left')!.dependsOn.includes(boards.find((action) => action.board?.role === 'natural-left')!.id));
  }
  const plain = plan.actions.find((action) => action.type === 'create-cause' && action.causeId === 'open-source');
  assert.equal(plain?.board?.role, 'plain');
  assert.equal(plain?.board?.title, 'Open-source public infrastructure');
  assert.match(plain?.board?.summary ?? '', /Cause board supporting open-source public infrastructure/);
  assert.match(plain?.board?.summary ?? '', /This is fake data created for testing/);
  assert.equal(plan.actions.filter((action) => action.type === 'create-cause').length, 10);
  assert.equal(plan.actions.filter((action) => action.type === 'create-bridge').length, 4);
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
  const statementText = new Map(plan.statements.map((statement) => [statement.id, statement.text]));
  assert.ok(plan.projects.every((project) => {
    const texts = project.statementIds.map((id) => statementText.get(id)!);
    return project.title.length > 12 && project.title.length < 90
      && project.outcome.length > 20 && project.outcome.length < 280
      && project.title !== project.outcome
      && texts.every((text) => !project.title.includes(text) && !project.outcome.includes(text));
  }));
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

test('written planning artifacts reload into the same campaign plan', async () => {
  const manifest = await loadManifest();
  const plan = await buildCampaignPlan(manifest);
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-plan-'));
  try {
    await writePlanArtifacts(manifest, plan, directory);
    assert.deepEqual(await loadCampaignPlan(manifest, directory), plan);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
