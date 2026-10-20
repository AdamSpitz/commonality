import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { CampaignManifestV1 } from '../campaignSchema.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildCampaignPlan, loadCampaignPlan, validatePlannedActions, writePlanArtifacts } from '../campaignPlanner.js';
import { CAMPAIGN_PROJECT_STORIES, SPOTLIGHT_PROJECTS } from '../campaignProjectStories.js';

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

test('validation rejects catalog statements that collide on a planned ID', async () => {
  const manifest = await loadManifest();
  const plan = await buildCampaignPlan(manifest);
  plan.statements[1].id = plan.statements[0].id;
  assert.throws(() => validatePlannedActions(manifest, plan.statements, plan.users, plan.projects, plan.actions), /planned statement IDs must be unique/);
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
  assert.equal(plan.statements.length, 65);
  assert.equal(plan.projects.length, 37);
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
  assert.deepEqual(kurt.causeIds, ['car-repair', 'gluten-free-cooking', 'game-commons', 'music-learning']);
  assert.equal(kurt.roles.includes('delegate'), true);
  assert.deepEqual(fred.causeIds, ['game-commons', 'small-trades', 'congregational-music']);
  assert.equal(fred.delegatesTo, kurt.id);
  assert.deepEqual(sean.causeIds, ['local-food', 'staying-productive']);
  assert.equal(sean.roles.includes('delegate'), true);
  const fredDelegations = plan.actions.filter((action) => action.type === 'delegate-note' && action.actorUserId === fred.id);
  assert.ok(fredDelegations.length > 0);
  assert.ok(fredDelegations.every((action) => action.delegateUserId === kurt.id && action.delegationBasis!.sharedCauseIds.join() === 'game-commons'));
  for (const user of [kurt, fred, sean]) {
    for (const causeId of user.causeIds) {
      const spotlightTitle = SPOTLIGHT_PROJECTS[user.displayName!]![causeId];
      assert.ok(plan.actions.some((action) => action.type === 'fund-project' && action.actorUserId === user.id &&
        action.causeId === causeId && plan.projects.find((project) => project.id === action.projectId)?.title === spotlightTitle));
    }
  }
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

test('network-societies pilot pins persona belief choices', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-pilot.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const decisions = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-pilot-decisions.json', import.meta.url), 'utf8')) as {
    people: { userId: string; name: string; signs?: string[]; rejects?: string[]; unsigned?: string[] }[];
  };
  const plan = await buildCampaignPlan(manifest);
  const beliefs = plan.actions.filter((action) => action.type === 'set-belief');
  assert.equal(beliefs.length, 60);
  const byStatementId = (sourceId: string, userId: string) => beliefs.filter((action) => {
    const statement = plan.statements.find((item) => item.id === action.statementId);
    return action.actorUserId === userId && statement?.source.statementId === sourceId;
  });
  for (const person of decisions.people) {
    for (const statementId of person.signs ?? []) {
      assert.deepEqual(byStatementId(statementId, person.userId).map((action) => action.belief), ['believe'], `${person.name} ${statementId}`);
    }
    for (const statementId of person.rejects ?? []) {
      assert.deepEqual(byStatementId(statementId, person.userId).map((action) => action.belief), ['disbelieve'], `${person.name} ${statementId}`);
    }
  }
  const owen = plan.users.find((user) => user.displayName === 'Owen')!;
  const staffed = plan.statements.find((statement) => statement.source.statementId === 'staffed-schools')!;
  assert.equal(beliefs.some((action) => action.actorUserId === owen.id && action.statementId === staffed.id && action.belief === 'disbelieve'), false);
});

test('network-societies pilot reuses one directory statement and publishes no implication', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-pilot.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const plan = await buildCampaignPlan(manifest);
  assert.equal(plan.users.length, 40);
  assert.equal(plan.statements.length, 20);
  assert.equal(plan.projects.length, 20);
  const shared = plan.statements.find((statement) => statement.source.statementId === 'class-host-directory');
  assert.ok(shared);
  assert.deepEqual(shared!.alsoOnCauseIds, ['christian-teaching', 'home-learning']);
  assert.equal(plan.actions.filter((action) => action.type === 'publish-statement' && action.statementId === shared!.id).length, 1);
  assert.equal(plan.projects.filter((project) => project.statementIds.includes(shared!.id)).length, 1);
  assert.equal(plan.actions.filter((action) => action.type === 'attest-implication').length, 0);
  const pat = plan.users.find((user) => user.displayName === 'Pat')!;
  const ned = plan.users.find((user) => user.displayName === 'Ned')!;
  const patDelegations = plan.actions.filter((action) => action.type === 'delegate-note' && action.actorUserId === pat.id);
  assert.ok(patDelegations.length > 0);
  assert.ok(patDelegations.every((action) => action.delegateUserId === ned.id));
  for (const causeId of manifest.causes.map((cause) => cause.id)) {
    assert.ok(plan.projects.filter((project) => project.causeId === causeId).length >= 5);
  }
});

test('batch 2 keeps the pilot families, reuses accepted bridges, and shares one checklist', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-b2.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const pilotStatements = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-pilot-statements.json', import.meta.url), 'utf8'));
  const batchStatements = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-b2-statements.json', import.meta.url), 'utf8'));
  for (const group of pilotStatements.groups) {
    const copy = batchStatements.groups.find((item: { id: string }) => item.id === group.id);
    assert.deepEqual(copy.statements, group.statements);
  }
  const plan = await buildCampaignPlan(manifest);
  assert.equal(plan.users.length, 72);
  assert.equal(plan.statements.length, 93);
  assert.equal(plan.projects.length, 65);
  assert.equal(plan.actions.filter((action) => action.funding?.kind === 'retroactive').length, 0);
  const checklist = plan.statements.find((statement) => statement.source.statementId === 'moderator-checklist');
  assert.ok(checklist);
  assert.equal(checklist!.causeId, 'abortion-forum');
  assert.deepEqual(checklist!.alsoOnCauseIds, ['voting']);
  assert.equal(plan.projects.filter((project) => project.statementIds.includes(checklist!.id)).length, 2);
  const singleShared = plan.projects.filter((project) => {
    if (project.statementIds.length !== 1) return false;
    const statement = plan.statements.find((item) => item.id === project.statementIds[0]);
    return (statement?.alsoOnCauseIds?.length ?? 0) >= 1;
  });
  assert.deepEqual(singleShared.map((project) => project.title).sort(), [
    'Grey County class-host directory',
    'Plain-text Grey County notice',
    'Printed moderator checklist',
  ]);
  const notice = plan.statements.find((statement) => statement.source.statementId === 'plain-text-notice')!;
  assert.equal(notice.causeId, 'civic-assimilation');
  assert.deepEqual(notice.alsoOnCauseIds, ['christian-teaching']);
  const implications = plan.actions.filter((action) => action.type === 'attest-implication');
  assert.equal(implications.length, 17);
  const accepted = implications.filter((action) => action.implication!.evidence === 'accepted-bridge-role-pair');
  const live = implications.filter((action) => action.implication!.evidence === 'live-attester-modified-to-commonality');
  assert.equal(accepted.length, 4);
  assert.equal(live.length, 13);
  for (const action of accepted) {
    const from = plan.statements.find((statement) => statement.id === action.implication!.fromStatementId)!;
    assert.ok(from.source.collectionId === 'compromise-abortion' || from.source.collectionId === 'lgbt-schools');
  }
  for (const action of implications) {
    const from = plan.statements.find((statement) => statement.id === action.implication!.fromStatementId)!;
    const to = plan.statements.find((statement) => statement.id === action.implication!.toStatementId)!;
    const plainModified = from.role === null && from.source.statementId.startsWith('modified-') && action.implication!.evidence === 'live-attester-modified-to-commonality';
    assert.ok(from.role === 'modified-left' || from.role === 'modified-right' || plainModified);
    assert.equal(to.role, 'commonality');
    assert.equal(from.source.groupId, to.source.groupId);
  }
  const michigan = plan.statements.find((statement) => statement.source.statementId === 'michigan-legislature')!;
  assert.equal(implications.some((action) => action.implication!.fromStatementId === michigan.id || action.implication!.toStatementId === michigan.id), false);
  for (const causeId of ['abortion', 'schools']) {
    const board = plan.actions.find((action) => action.type === 'create-cause' && action.causeId === causeId)!.board!;
    assert.equal(board.role, 'commonality');
    assert.equal(board.statementIds.length, 1);
  }
  const forum = plan.actions.find((action) => action.type === 'create-cause' && action.causeId === 'abortion-forum')!.board!;
  assert.equal(forum.role, 'plain');
  assert.ok(forum.statementIds.includes(michigan.id));
  for (const causeId of ['grey-assimilation', 'checkout-trial-bridge']) {
    const board = plan.actions.find((action) => action.type === 'create-cause' && action.causeId === causeId)!.board!;
    assert.equal(board.role, 'commonality');
    assert.equal(implications.filter((action) => action.causeId === causeId).length, 0, causeId);
  }
  for (const causeId of ['ranked-approval-poll', 'minors-medicine', 'opinion-employment', 'canada-us-ties']) {
    const board = plan.actions.find((action) => action.type === 'create-cause' && action.causeId === causeId)!.board!;
    assert.equal(board.role, 'commonality');
    assert.equal(implications.filter((action) => action.causeId === causeId).length, 2, causeId);
    assert.ok(implications.filter((action) => action.causeId === causeId).every((action) => action.implication!.evidence === 'live-attester-modified-to-commonality'));
  }
  const pauseBoard = plan.actions.find((action) => action.type === 'create-cause' && action.causeId === 'ai-pause')!.board!;
  assert.equal(pauseBoard.role, 'plain');
  const pauseArrows = implications.filter((action) => action.causeId === 'ai-pause');
  assert.equal(pauseArrows.length, 5);
  const pauseFrom = pauseArrows.map((action) => plan.statements.find((statement) => statement.id === action.implication!.fromStatementId)!.source.statementId).sort();
  assert.deepEqual(pauseFrom, ['modified-children', 'modified-industry', 'modified-jobs', 'modified-not-luddite', 'modified-small-chance']);
  const canadaBoard = plan.actions.find((action) => action.type === 'create-cause' && action.causeId === 'canada-us-ties')!.board!;
  const canadaIds = canadaBoard.statementIds.map((id) => plan.statements.find((statement) => statement.id === id)!.source.statementId);
  assert.deepEqual(canadaIds, ['commonality', 'boycott-ordinary-ties', 'narrower-than-visits']);
  assert.equal(plan.projects.filter((project) => project.causeId === 'canada-us-ties').length, 7);
  const boycott = plan.statements.find((statement) => statement.source.groupId === 'canada-us-ties' && statement.source.statementId === 'boycott-ordinary-ties')!;
  const narrower = plan.statements.find((statement) => statement.source.groupId === 'canada-us-ties' && statement.source.statementId === 'narrower-than-visits')!;
  const canadaCommonality = plan.statements.find((statement) => statement.source.groupId === 'canada-us-ties' && statement.source.statementId === 'commonality')!;
  assert.equal(implications.some((action) => action.implication!.fromStatementId === boycott.id || action.implication!.toStatementId === boycott.id || action.implication!.fromStatementId === narrower.id || action.implication!.toStatementId === narrower.id), false);
  assert.equal(implications.filter((action) => action.implication!.toStatementId === canadaCommonality.id).map((action) => plan.statements.find((statement) => statement.id === action.implication!.fromStatementId)!.source.statementId).sort().join(','), 'modified-left,modified-right');
  for (const statementId of ['natural-small-chance', 'natural-jobs', 'pole-stop', 'pole-accelerate']) {
    const statement = plan.statements.find((item) => item.source.groupId === 'ai-pause' && item.source.statementId === statementId)!;
    assert.equal(implications.some((action) => action.implication!.fromStatementId === statement.id || action.implication!.toStatementId === statement.id), false, statementId);
  }
  for (const causeId of manifest.causes.map((cause) => cause.id)) {
    assert.ok(plan.projects.filter((project) => project.causeId === causeId).length >= 2, causeId);
  }
});

test('batch 2 pins persona belief choices and never has Eli believe the settlement', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-b2.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const decisions = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-b2-decisions.json', import.meta.url), 'utf8')) as {
    people: { userId: string; name: string; signs?: string[]; rejects?: string[]; unsigned?: string[] }[];
  };
  const plan = await buildCampaignPlan(manifest);
  const beliefs = plan.actions.filter((action) => action.type === 'set-belief');
  assert.equal(beliefs.length, 105);
  const byStatementId = (sourceId: string, userId: string) => beliefs.filter((action) => {
    const statement = plan.statements.find((item) => item.id === action.statementId);
    return action.actorUserId === userId && statement?.source.statementId === sourceId;
  });
  for (const person of decisions.people) {
    for (const statementId of person.signs ?? []) {
      const actions = byStatementId(statementId, person.userId);
      assert.deepEqual(actions.map((action) => action.belief), ['believe'], `${person.name} ${statementId}`);
    }
    for (const statementId of person.rejects ?? []) {
      const actions = byStatementId(statementId, person.userId);
      assert.deepEqual(actions.map((action) => action.belief), ['disbelieve'], `${person.name} ${statementId}`);
    }
  }
  const eli = plan.users.find((user) => user.displayName === 'Eli')!;
  const settlement = plan.statements.find((statement) => statement.source.collectionId === 'compromise-abortion' && statement.source.statementId === 'commonality')!;
  assert.equal(beliefs.some((action) => action.actorUserId === eli.id && action.statementId === settlement.id && action.belief === 'believe'), false);
  const pauseCommonality = plan.statements.find((statement) => statement.source.groupId === 'ai-pause' && statement.source.statementId === 'commonality')!;
  for (const name of ['Noor', 'Tess']) {
    const user = plan.users.find((item) => item.displayName === name)!;
    assert.equal(beliefs.some((action) => action.actorUserId === user.id && action.statementId === pauseCommonality.id), false, name);
  }
  for (const name of ['Hal', 'Vic']) {
    const user = plan.users.find((item) => item.displayName === name)!;
    assert.equal(beliefs.some((action) => action.actorUserId === user.id && action.statementId === pauseCommonality.id && action.belief === 'believe'), false, name);
    assert.equal(beliefs.some((action) => action.actorUserId === user.id && action.statementId === pauseCommonality.id && action.belief === 'disbelieve'), true, name);
  }
  const canadaCommonality = plan.statements.find((statement) => statement.source.groupId === 'canada-us-ties' && statement.source.statementId === 'commonality')!;
  const boycott = plan.statements.find((statement) => statement.source.groupId === 'canada-us-ties' && statement.source.statementId === 'boycott-ordinary-ties')!;
  for (const name of ['Greta', 'Neil']) {
    const user = plan.users.find((item) => item.displayName === name)!;
    assert.equal(beliefs.some((action) => action.actorUserId === user.id && action.statementId === canadaCommonality.id && action.belief === 'believe'), false, name);
    assert.equal(beliefs.some((action) => action.actorUserId === user.id && action.statementId === canadaCommonality.id && action.belief === 'disbelieve'), true, name);
  }
  const imani = plan.users.find((user) => user.displayName === 'Imani')!;
  const june = plan.users.find((user) => user.displayName === 'June')!;
  const blocked = plan.projects.find((project) => project.title === 'Blocked-customer sale record')!;
  const blockedStatement = plan.statements.find((statement) => statement.id === blocked.statementIds[0])!;
  assert.deepEqual(blocked.statementIds, [blockedStatement.id]);
  assert.equal(blockedStatement.source.statementId, 'bank-blocking');
  const checkoutTitles = [
    'Six-shop refundable checkout trial',
    'Independent checkout security review',
    'Fee and failure table',
    'Owen Sound merchant directory',
    'Quarterly checkout clinic and host kit',
    'Blocked-customer sale record',
  ];
  for (const title of checkoutTitles) {
    const project = plan.projects.find((item) => item.title === title)!;
    for (const user of [imani, june]) {
      assert.equal(plan.actions.some((action) => action.type === 'fund-project' && action.actorUserId === user.id && action.projectId === project.id), true, `${user.displayName} ${title}`);
    }
  }
  assert.deepEqual(byStatementId('bank-blocking', imani.id).map((action) => action.belief), ['believe']);
  assert.deepEqual(byStatementId('refuse-crypto-payments', june.id).map((action) => action.belief), ['disbelieve']);
  const greta = plan.users.find((user) => user.displayName === 'Greta')!;
  assert.equal(beliefs.some((action) => action.actorUserId === greta.id && action.statementId === boycott.id && action.belief === 'believe'), true);
  const adele = plan.users.find((user) => user.displayName === 'Adele')!;
  assert.equal(beliefs.some((action) => action.actorUserId === adele.id && action.statementId === canadaCommonality.id), false);
  const canadaArrows = plan.actions.filter((action) => action.type === 'attest-implication' && action.causeId === 'canada-us-ties');
  assert.equal(canadaArrows.some((action) => action.implication!.fromStatementId === boycott.id), false);
});

test('reimbursement config plans early 0.10 receipts and later retroactive donations on one named project', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-b2.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const fundRule = manifest.actionRules.find((rule) => rule.type === 'fund-project')!;
  fundRule.targetCount = { min: 74, max: 74 };
  manifest.reimbursement = { projectTitle: 'Six-shop refundable checkout trial', earlyPurchases: 20, retroactiveDonations: 4 };
  const plan = await buildCampaignPlan(manifest);
  const project = plan.projects.find((item) => item.title === 'Six-shop refundable checkout trial')!;
  const early = plan.actions.filter((action) => action.projectId === project.id && action.funding?.kind === 'early');
  const retroactive = plan.actions.filter((action) => action.projectId === project.id && action.funding?.kind === 'retroactive');
  assert.equal(early.length, 20);
  assert.ok(early.every((action) => action.funding?.tokenId === 1 && action.funding.tokenCount === 1 && action.amount === 10));
  assert.equal(early.reduce((sum, action) => sum + action.amount!, 0), 200);
  assert.equal(retroactive.length, 4);
  assert.ok(retroactive.every((action) => early.every((purchase) => action.dependsOn.includes(purchase.id))));
  const funders = new Set([...early, ...retroactive].map((action) => action.actorUserId));
  assert.equal(funders.size, 2);
  assert.equal(funders.has(project.founderUserId), false);
  assert.equal(plan.actions.filter((action) => action.type === 'fund-project').length, 74);
});

test('delegatedSpend plans one payment-token note that stays delegated and is spent once', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/network-societies-v1-b2.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  manifest.userProfiles = [...(manifest.userProfiles ?? []), {
    userId: 'user-012',
    displayName: 'Willa',
    bio: 'Holds June\'s payment-token note for the six-shop checkout trial and spends it once.',
    favoriteCauseId: 'crypto-merchants',
    interests: ['limited notes', 'Owen Sound shops'],
    causeIds: ['crypto-merchants', 'home-learning'],
  }];
  manifest.actionRules.push({ type: 'spend-delegated-note', prerequisites: ['delegate-note', 'create-project', 'attest-alignment'], targetCount: { min: 1, max: 1 } });
  manifest.delegatedSpend = { ownerUserId: 'user-016', delegateUserId: 'user-012', projectTitle: 'Six-shop refundable checkout trial' };
  const plan = await buildCampaignPlan(manifest);
  const spends = plan.actions.filter((action) => action.type === 'spend-delegated-note');
  assert.equal(spends.length, 1);
  const spend = spends[0];
  const deposit = plan.actions.find((action) => action.type === 'deposit-note' && action.noteId === spend.noteId)!;
  const delegation = plan.actions.find((action) => action.type === 'delegate-note' && action.noteId === spend.noteId)!;
  const revokes = plan.actions.filter((action) => action.type === 'revoke-delegation' && action.noteId === spend.noteId);
  assert.equal(deposit.actorUserId, 'user-016');
  assert.equal(deposit.noteAsset, 'erc20');
  assert.equal(deposit.funding?.tokenId, 3);
  assert.equal(delegation.delegateUserId, 'user-012');
  assert.equal(spend.actorUserId, 'user-012');
  assert.equal(spend.amount, 1);
  assert.equal(revokes.length, 0);
  assert.ok(spend.dependsOn.includes(delegation.id));
  const patNote = plan.actions.find((action) => action.type === 'delegate-note' && action.actorUserId === 'user-021')!;
  assert.ok(plan.actions.some((action) => action.type === 'revoke-delegation' && action.noteId === patNote.noteId));
  assert.notEqual(patNote.noteId, spend.noteId);
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
