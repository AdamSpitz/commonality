import assert from 'node:assert/strict';
import test from 'node:test';
import { fakeIpfsCidV1 } from '@commonality/sdk/testing';
import { campaignRunAreas } from '../campaignAreas.js';
import type { CampaignPlan } from '../campaignPlanner.js';
import { createEmptyRuntimeBindings } from '../campaignRuntimeBindings.js';
import { CAMPAIGN_EXECUTION_VERSION, type CampaignExecutionState } from '../campaignExecutor.js';

test('areas include shared statements/projects and only users with confirmed relevant activity', () => {
  const plan = {
    campaignId: 'test', manifestFingerprint: 'saved-plan',
    users: ['user-1', 'user-2', 'user-3', 'user-4'].map((id) => ({ id, causeIds: ['ai'] })),
    statements: [{ id: 'shared', causeId: 'ai', alsoOnCauseIds: ['christian'], text: 'Shared statement' }],
    projects: [{ id: 'project', title: 'Shared project', causeId: 'ai', statementIds: ['shared'] }],
    actions: [
      { id: 'belief', type: 'set-belief', statementId: 'shared', actorUserId: 'user-1' },
      { id: 'failed', type: 'set-belief', statementId: 'shared', actorUserId: 'user-2' },
      { id: 'project', type: 'create-project', projectId: 'project', actorUserId: 'user-3' },
      { id: 'elsewhere', type: 'deposit-note', causeId: 'food', actorUserId: 'user-4' },
    ],
  } as unknown as CampaignPlan;
  const bindings = createEmptyRuntimeBindings(plan);
  bindings.statements.shared = fakeIpfsCidV1('shared');
  bindings.projects.project = '0x0000000000000000000000000000000000000001';
  const state: CampaignExecutionState = {
    version: CAMPAIGN_EXECUTION_VERSION, campaignId: plan.campaignId, manifestFingerprint: plan.manifestFingerprint, updatedAt: new Date().toISOString(),
    actions: plan.actions.map((action) => ({ actionId: action.id, status: action.id === 'failed' ? 'failed' : 'mined', attempts: 1 })),
  };
  const areas = campaignRunAreas(plan, bindings, [{ id: 'ai', title: 'AI' }, { id: 'christian', title: 'Christian' }], state);
  for (const area of areas) {
    assert.deepEqual(area.activeUserIds, [0, 2]);
    assert.equal(area.statements[0].text, 'Shared statement');
    assert.equal(area.statements[0].path, `/statement/${bindings.statements.shared}`);
    assert.equal(area.projects[0].title, 'Shared project');
  }
  assert.throws(() => campaignRunAreas(plan, bindings, [], { ...state, manifestFingerprint: 'different' }), /does not match/);
  assert.throws(() => campaignRunAreas(plan, { ...bindings, manifestFingerprint: 'different' }, [], state), /do not match/);
});
