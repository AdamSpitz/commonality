import assert from 'node:assert/strict';
import type { IpfsCidV1 } from '@commonality/sdk/utils';
import { buildCidV1FromDigest, cidToBytes32 } from '@commonality/sdk/utils';
import { AlignmentAttestationsAbi } from '@commonality/sdk/abis';
import { getSubjectIdForContentCanonicalId, hasBeatAgentAttestation } from '../src/index.js';

const statementCid = buildCidV1FromDigest(0x70, new Uint8Array(32).fill(1)) as IpfsCidV1;
const topicStatementCid = buildCidV1FromDigest(0x70, new Uint8Array(32).fill(2)) as IpfsCidV1;

describe('beat-agent blockchain helpers', () => {
  it('checks durable on-chain idempotency using the same tuple published by attestAlignment', async () => {
    const calls: unknown[] = [];
    const exists = await hasBeatAgentAttestation({
      publicClient: {
        readContract: async (params) => {
          calls.push(params);
          return true;
        },
      },
      alignmentAttestationsContract: {
        address: `0x${'a'.repeat(40)}`,
        abi: AlignmentAttestationsAbi,
      },
      attesterAddress: `0x${'b'.repeat(40)}`,
      contentCanonicalId: 'twitter:uid:alice:123',
      statementCid,
      topicStatementCid,
    });

    assert.equal(exists, true);
    assert.deepEqual(calls, [
      {
        address: `0x${'a'.repeat(40)}`,
        abi: AlignmentAttestationsAbi,
        functionName: 'hasAttestation',
        args: [
          `0x${'b'.repeat(40)}`,
          cidToBytes32(topicStatementCid),
          getSubjectIdForContentCanonicalId('twitter:uid:alice:123'),
          cidToBytes32(statementCid),
        ],
      },
    ]);
  });

  it('returns false when the chain has no matching attestation', async () => {
    const exists = await hasBeatAgentAttestation({
      publicClient: {
        readContract: async () => false,
      },
      alignmentAttestationsContract: {
        address: `0x${'a'.repeat(40)}`,
        abi: AlignmentAttestationsAbi,
      },
      attesterAddress: `0x${'b'.repeat(40)}`,
      contentCanonicalId: 'twitter:uid:alice:123',
      statementCid,
      topicStatementCid,
    });

    assert.equal(exists, false);
  });
});
