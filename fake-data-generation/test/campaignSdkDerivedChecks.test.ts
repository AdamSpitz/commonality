import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Address } from 'viem';
import { fakeIpfsCidV1 } from '@commonality/sdk/testing';
import { createCampaignSdkDerivedCheckProvider, type CampaignSdkQueries } from '../campaignSdkDerivedChecks.js';
import { buildCampaignPlan } from '../campaignPlanner.js';
import { CAMPAIGN_RUNTIME_BINDINGS_VERSION, type CampaignRuntimeBindings } from '../campaignRuntimeBindings.js';
import type { CampaignManifestV1 } from '../campaignSchema.js';

const address = (index: number): Address => `0x${index.toString(16).padStart(40, '0')}` as Address;

test('SDK provider checks final folded state through runtime bindings', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/medium-realistic-v1.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const plan = await buildCampaignPlan(manifest);
  const bindings: CampaignRuntimeBindings = {
    version: CAMPAIGN_RUNTIME_BINDINGS_VERSION,
    campaignId: plan.campaignId,
    manifestFingerprint: plan.manifestFingerprint,
    updatedAt: new Date(0).toISOString(),
    users: Object.fromEntries(plan.users.map((item, index) => [item.id, address(index + 1)])),
    statements: Object.fromEntries(plan.statements.map((item) => [item.id, fakeIpfsCidV1(item.id)])),
    causes: Object.fromEntries([...new Set(plan.statements.map((item) => item.causeId))].map((id, index) => [id, { owner: address(index + 201), refName: `cause-${id}`, rosterCid: fakeIpfsCidV1(`roster-${id}`) }])),
    projects: Object.fromEntries(plan.projects.map((item, index) => [item.id, address(index + 301)])),
    notes: Object.fromEntries([...new Set(plan.actions.flatMap((item) => item.noteId ? [item.noteId] : []))].map((id, index) => [id, { contractAddress: address(401), noteId: String(index + 1) }])),
  };

  const calls: string[] = [];
  const latestBeliefs = new Map<string, number>();
  for (const action of plan.actions.filter((item) => item.type === 'set-belief')) {
    latestBeliefs.set(`${bindings.users[action.actorUserId!]}/${bindings.statements[action.statementId!]}`, action.belief === 'believe' ? 1 : 2);
  }
  const queries: CampaignSdkQueries = {
    getUserBelief: async (user, statement) => latestBeliefs.get(`${user}/${statement}`)!,
    hasImplication: async () => true,
    getRefsByName: async (name) => {
      const binding = Object.values(bindings.causes).find((item) => item.refName === name)!;
      return [{ owner: binding.owner, name, value: binding.rosterCid, updatedAt: '0', updatedAtBlock: '1', transactionHash: `0x${'1'.repeat(64)}` }];
    },
    getProject: async (projectAddress) => {
      calls.push(projectAddress);
      const projectId = Object.entries(bindings.projects).find(([, value]) => value === projectAddress)![0];
      const total = plan.actions.filter((item) => item.type === 'fund-project' && item.projectId === projectId).reduce((sum, item) => sum + item.amount!, 0);
      return { id: projectAddress, erc1155Address: address(999), marketplaceAddress: null, recipient: address(998), fundingCurrency: { chainId: 31337, tokenAddress: address(997), symbol: 'TEST', decimals: 0 }, threshold: '1', deadline: '1', totalReceived: String(total), conditionAddress: null };
    },
    hasAlignment: async () => true,
    getNote: async (scopedId) => {
      const bindingEntry = Object.entries(bindings.notes).find(([, value]) => `${value.contractAddress}:${value.noteId}` === scopedId)!;
      const deposit = plan.actions.find((item) => item.type === 'deposit-note' && item.noteId === bindingEntry[0])!;
      const final = plan.actions.filter((item) => item.noteId === bindingEntry[0]).at(-1)!;
      const owner = final.type === 'delegate-note' ? bindings.users[final.delegateUserId!] : bindings.users[final.actorUserId!];
      return { id: bindingEntry[1].noteId, contractAddress: bindingEntry[1].contractAddress, chainHash: '0x', amount: String(deposit.amount), token: address(996), tokenType: 0, tokenId: '0', owner, rootOwner: bindings.users[deposit.actorUserId!], active: true, createdAt: '0', createdAtBlock: '1', updatedAt: '0' };
    },
  };
  const provider = createCampaignSdkDerivedCheckProvider({ machinery: { ipfsConfig: {}, twitterApiConfig: {}, testConfig: {} }, plan, bindings, queries });

  for (const action of plan.actions) {
    const checks = await provider.getDerivedChecks(action);
    assert.ok(checks.every((item) => item.expected === item.actual), `${action.id} ${action.type} did not match`);
  }
  assert.ok(calls.length > 0);
});

test('SDK provider exposes a derived mismatch instead of hiding it', async () => {
  const manifest = JSON.parse(await readFile(new URL('../campaigns/medium-realistic-v1.json', import.meta.url), 'utf8')) as CampaignManifestV1;
  const plan = await buildCampaignPlan(manifest);
  const users = Object.fromEntries(plan.users.map((item, index) => [item.id, address(index + 1)]));
  const bindings = {
    version: CAMPAIGN_RUNTIME_BINDINGS_VERSION, campaignId: plan.campaignId, manifestFingerprint: plan.manifestFingerprint, updatedAt: new Date(0).toISOString(), users,
    statements: Object.fromEntries(plan.statements.map((item) => [item.id, fakeIpfsCidV1(item.id)])),
    causes: Object.fromEntries([...new Set(plan.statements.map((item) => item.causeId))].map((id, index) => [id, { owner: address(index + 201), refName: id, rosterCid: fakeIpfsCidV1(id) }])),
    projects: Object.fromEntries(plan.projects.map((item, index) => [item.id, address(index + 301)])),
    notes: Object.fromEntries([...new Set(plan.actions.flatMap((item) => item.noteId ? [item.noteId] : []))].map((id, index) => [id, { contractAddress: address(401), noteId: String(index + 1) }])),
  } satisfies CampaignRuntimeBindings;
  const queries = { getUserBelief: async () => 0 } as CampaignSdkQueries;
  const provider = createCampaignSdkDerivedCheckProvider({ machinery: { ipfsConfig: {}, twitterApiConfig: {}, testConfig: {} }, plan, bindings, queries });
  const belief = plan.actions.find((item) => item.type === 'set-belief')!;
  assert.notEqual((await provider.getDerivedChecks(belief))[0].expected, (await provider.getDerivedChecks(belief))[0].actual);
});
