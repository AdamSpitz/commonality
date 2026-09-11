import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  BASE_SEPOLIA_CHAIN_ID, CAMPAIGN_CONTRACT_ENV_KEYS, loadCampaignEnvironment, preflightCampaignEnvironment,
} from '../campaignEnvironment.js';
import {
  REMOTE_CANARY_USER_COUNT, buildRemoteCanaryProposal, runRemoteCanaryPreflight, sliceCampaignPlanForCanary,
} from '../campaignCanary.js';
import type { CampaignPlan, PlannedAction, PlannedUser } from '../campaignPlanner.js';
import type { CampaignManifestV1 } from '../campaignSchema.js';

function user(id: string): PlannedUser {
  return {
    id, walletSlot: `wallet-${id}`, personaId: 'regular-supporter', roles: ['supporter'],
    causeIds: ['open-source'], inactive: false, activityWeight: 1, fundingWeight: 1,
  };
}

function action(partial: Partial<PlannedAction> & Pick<PlannedAction, 'id' | 'sequence' | 'type'>): PlannedAction {
  return { actorUserId: 'user-001', dependsOn: [], ...partial };
}

function plan(): CampaignPlan {
  const users = Array.from({ length: 12 }, (_, index) => user(`user-${String(index + 1).padStart(3, '0')}`, index));
  return {
    version: 'commonality-campaign-plan-v1',
    campaignId: 'medium-realistic-v1',
    deterministicSeed: 'seed',
    manifestFingerprint: 'abc',
    statements: [],
    users,
    projects: [{ id: 'project-001', title: 't', outcome: 'o', causeId: 'open-source', founderUserId: 'user-011', statementIds: [] }],
    actions: [
      action({ id: 'action-00001', sequence: 1, type: 'publish-statement', actorUserId: null, statementId: 's1', dependsOn: [] }),
      action({ id: 'action-00002', sequence: 2, type: 'create-cause', actorUserId: 'user-011', causeId: 'open-source', dependsOn: ['action-00001'] }),
      action({ id: 'action-00003', sequence: 3, type: 'create-project', actorUserId: 'user-011', projectId: 'project-001', dependsOn: ['action-00002'] }),
      action({ id: 'action-00004', sequence: 4, type: 'set-belief', actorUserId: 'user-001', statementId: 's1', belief: 'believe', dependsOn: ['action-00001'] }),
      action({ id: 'action-00005', sequence: 5, type: 'fund-project', actorUserId: 'user-002', projectId: 'project-001', amount: 10, dependsOn: ['action-00003'] }),
      action({ id: 'action-00006', sequence: 6, type: 'set-belief', actorUserId: 'user-012', statementId: 's1', belief: 'believe', dependsOn: ['action-00001'] }),
    ],
    estimate: {
      writesByType: {} as CampaignPlan['estimate']['writesByType'],
      totalWrites: 6,
      estimatedGasByType: {} as CampaignPlan['estimate']['estimatedGasByType'],
      estimatedTotalGas: 0,
      assumptions: { gasUnitsPerWrite: {} as CampaignPlan['estimate']['assumptions']['gasUnitsPerWrite'], paymentTokenBaseUnit: 100 },
      estimatedPaymentTokenUnits: 0,
    },
  };
}

function manifest(): CampaignManifestV1 {
  return {
    campaign: { id: 'medium-realistic-v1', syntheticDataLabel: 'SYNTHETIC TESTNET CAMPAIGN — NOT REAL USERS OR ADOPTION' },
    artifactLayout: { walletSecrets: '../secrets/medium-realistic-v1.wallets.json' },
  } as CampaignManifestV1;
}

async function withEnv(run: (deploymentEnvPath: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-canary-'));
  const deploymentEnvPath = path.join(directory, 'deployment.env');
  const lines = Object.values(CAMPAIGN_CONTRACT_ENV_KEYS).map((key, index) => `${key}=0x${String(index + 1).padStart(40, '0')}`);
  await writeFile(deploymentEnvPath, `${lines.join('\n')}\n`);
  try { await run(deploymentEnvPath); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('canary slice keeps the first 10 users plus dependency actors', () => {
  const slice = sliceCampaignPlanForCanary(plan(), 10);
  assert.equal(slice.userCount, REMOTE_CANARY_USER_COUNT);
  assert.equal(slice.users.length, 10);
  assert.ok(slice.extraActors.some((actor) => actor.id === 'user-011'));
  assert.ok(slice.actions.some((item) => item.id === 'action-00005'));
  assert.equal(slice.actions.some((item) => item.id === 'action-00006'), false);
  assert.ok(slice.actions.some((item) => item.type === 'publish-statement'));
  assert.ok(slice.projects.some((project) => project.id === 'project-001'));
});

test('preflight proposal is read-only and fail-closed on indexer lag', async () => withEnv(async (deploymentEnvPath) => {
  const environment = await loadCampaignEnvironment({
    mode: 'remote', rpcUrl: 'https://sepolia.base.org', expectedChainId: BASE_SEPOLIA_CHAIN_ID, deploymentEnvPath,
  });
  const chainPreflight = await preflightCampaignEnvironment(environment, {
    getChainId: async () => BASE_SEPOLIA_CHAIN_ID, getBytecode: async () => '0x01',
  });
  const proposal = buildRemoteCanaryProposal({
    plan: plan(), manifest: manifest(), environment, chainPreflight,
    indexerUrl: 'https://commonality-indexer.onrender.com', indexerLagBlocks: 0n,
  });
  assert.equal(proposal.mutatesChain, false);
  assert.equal(proposal.phase, 'remote-canary-10');
  assert.equal(proposal.userCount, 10);
  assert.ok(Number(proposal.nativeWeiNeeded) > 0);
  assert.ok(proposal.gates.some((gate) => gate.id === 'budget-and-window' && gate.status === 'needs-adam'));
  assert.equal(proposal.readyForAdamApproval, true);
  assert.equal(proposal.secrets.hardhatKeys, 'forbidden on remote');
  const lagFail = buildRemoteCanaryProposal({
    plan: plan(), manifest: manifest(), environment, chainPreflight,
    indexerUrl: 'https://commonality-indexer.onrender.com', indexerLagBlocks: 10_000n,
  });
  assert.equal(lagFail.gates.find((gate) => gate.id === 'indexer-lag')?.status, 'fail');
  assert.equal(lagFail.readyForAdamApproval, false);
}));

test('runRemoteCanaryPreflight writes artifacts and never confirms mutation', async () => withEnv(async (deploymentEnvPath) => {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), 'campaign-canary-out-'));
  try {
    const environment = await loadCampaignEnvironment({
      mode: 'remote', rpcUrl: 'https://sepolia.base.org', expectedChainId: BASE_SEPOLIA_CHAIN_ID, deploymentEnvPath,
    });
    const { proposal, jsonPath, markdownPath } = await runRemoteCanaryPreflight({
      manifest: manifest(), plan: plan(), environment,
      chain: { getChainId: async () => BASE_SEPOLIA_CHAIN_ID, getBytecode: async () => '0x01' },
      indexerUrl: 'https://example.invalid',
      outputDirectory,
      probeIndexer: async () => ({ chainHead: 100n, indexerHead: 100n }),
    });
    assert.equal(environment.mutationConfirmed, false);
    assert.equal(proposal.indexerLagBlocks, '0');
    const written = JSON.parse(await readFile(jsonPath, 'utf8')) as { mutatesChain: boolean };
    assert.equal(written.mutatesChain, false);
    const markdown = await readFile(markdownPath, 'utf8');
    assert.match(markdown, /does not mutate/);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}));
