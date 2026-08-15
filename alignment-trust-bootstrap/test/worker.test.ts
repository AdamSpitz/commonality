import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import type { Address } from 'viem';
import { parseDenylist } from '../src/policy.js';
import { admitAttesters, reconcileDenylist, type TrustWriter } from '../src/worker.js';

const SERVICE = '0x1111111111111111111111111111111111111111' as Address;
const ALICE = '0x2222222222222222222222222222222222222222' as Address;
const BOB = '0x3333333333333333333333333333333333333333' as Address;

function fakeWriter(initial: Array<[Address, number]> = []) {
  const trust = new Map<string, number>(initial.map(([address, score]) => [address.toLowerCase(), score]));
  const writes: Array<{ addresses: Address[]; scores: number[] }> = [];
  const writer: TrustWriter = {
    getTrust: async address => trust.get(address.toLowerCase()) ?? 0,
    setTrustBatch: async (addresses, scores) => {
      writes.push({ addresses, scores });
      addresses.forEach((address, index) => trust.set(address.toLowerCase(), scores[index]!));
    },
  };
  return { writer, trust, writes };
}

describe('alignment trust bootstrap policy', () => {
  it('admits each unseen, non-denied attester once and batches writes', async () => {
    const { writer, writes } = fakeWriter([[BOB, 100]]);
    const admitted = await admitAttesters(writer, [ALICE, ALICE, BOB, SERVICE], new Set(), SERVICE, 1);
    assert.deepEqual(admitted, [ALICE]);
    assert.deepEqual(writes, [{ addresses: [ALICE], scores: [100] }]);
  });

  it('revokes trusted denylist entries and leaves already-revoked entries alone', async () => {
    const { writer, writes } = fakeWriter([[ALICE, 100]]);
    const revoked = await reconcileDenylist(writer, new Set([ALICE, BOB]));
    assert.deepEqual(revoked, [ALICE]);
    assert.deepEqual(writes, [{ addresses: [ALICE], scores: [0] }]);
  });

  it('parses line-oriented and JSON denylists', () => {
    assert.deepEqual(Array.from(parseDenylist(`# spam\n${ALICE}\n`)), [ALICE]);
    assert.deepEqual(Array.from(parseDenylist(JSON.stringify([BOB]))), [BOB]);
    assert.throws(() => parseDenylist('not-an-address'), /invalid denylist address/);
  });
});
