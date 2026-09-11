import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildCidV1FromDigest } from '@commonality/sdk/utils';
import { createEmptyRuntimeBindings, loadRuntimeBindings, validateRuntimeBindings, writeRuntimeBindings } from '../campaignRuntimeBindings.js';
import type { CampaignPlan } from '../campaignPlanner.js';

const ADDRESS_A = '0x00000000000000000000000000000000000000a1';
const ADDRESS_B = '0x00000000000000000000000000000000000000b1';
const CID = buildCidV1FromDigest(0x70, new Uint8Array(32).fill(7));
const plan = {
  version: 'commonality-campaign-plan-v1', campaignId: 'test', deterministicSeed: 'seed', manifestFingerprint: 'fingerprint',
  users: [{ id: 'user-1' }], statements: [{ id: 'statement-1', causeId: 'cause-1' }], projects: [{ id: 'project-1' }],
  actions: [{ noteId: 'note-1' }],
} as CampaignPlan;

function completeBindings() {
  const bindings = createEmptyRuntimeBindings(plan, new Date('2026-01-01T00:00:00.000Z'));
  bindings.users['user-1'] = ADDRESS_A;
  bindings.statements['statement-1'] = CID;
  bindings.causes['cause-1'] = { owner: ADDRESS_A, refName: 'cause/test', rosterCid: CID };
  bindings.projects['project-1'] = ADDRESS_B;
  bindings.notes['note-1'] = { contractAddress: ADDRESS_B, noteId: '42' };
  return bindings;
}

test('validates a complete execution-to-SDK binding artifact', () => {
  assert.doesNotThrow(() => validateRuntimeBindings(plan, completeBindings(), { complete: true }));
});

test('rejects mismatched plans, unknown IDs, invalid values, and incomplete artifacts', () => {
  const mismatched = completeBindings(); mismatched.manifestFingerprint = 'other';
  assert.throws(() => validateRuntimeBindings(plan, mismatched), /do not match/);
  const unknown = completeBindings(); unknown.users['user-unknown'] = ADDRESS_A;
  assert.throws(() => validateRuntimeBindings(plan, unknown), /unknown planned ID/);
  const invalid = completeBindings(); invalid.notes['note-1'].noteId = '-1';
  assert.throws(() => validateRuntimeBindings(plan, invalid), /invalid on-chain ID/);
  const partial = createEmptyRuntimeBindings(plan);
  assert.doesNotThrow(() => validateRuntimeBindings(plan, partial));
  assert.throws(() => validateRuntimeBindings(plan, partial, { complete: true }), /user:user-1.*statement:statement-1.*cause:cause-1.*project:project-1.*note:note-1/);
});

test('atomically persists and reloads public bindings without wallet secrets', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-bindings-'));
  const outputPath = path.join(directory, 'runtime-bindings.json');
  try {
    const bindings = completeBindings();
    await writeRuntimeBindings(plan, bindings, outputPath);
    assert.deepEqual(await loadRuntimeBindings(plan, outputPath, { complete: true }), bindings);
    const serialized = await readFile(outputPath, 'utf8');
    assert.doesNotMatch(serialized, /privateKey|secret/i);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
