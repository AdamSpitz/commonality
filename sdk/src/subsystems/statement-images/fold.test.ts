import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { encodeEventTopics } from 'viem';
import { StatementImagesAbi } from '../../abis.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { foldStatementImageRecords } from './fold.js';

const signer = '0x1111111111111111111111111111111111111111';
const attester = '0x2222222222222222222222222222222222222222';
const statementId = `0x${'ab'.repeat(32)}` as const;
const imageId = `0x${'cd'.repeat(32)}` as const;
const promptHash = `0x${'11'.repeat(32)}` as const;
const modelId = `0x${'22'.repeat(32)}` as const;

function raw(
  eventName: string,
  args: Record<string, `0x${string}`>,
  logIndex: number,
  data = '0x',
): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: StatementImagesAbi,
    eventName: eventName as 'ImageAdopted',
    args,
  }) as readonly `0x${string}`[];
  return {
    id: String(logIndex),
    contractAddress: '0x3333333333333333333333333333333333333333',
    eventName,
    blockNumber: '10',
    blockTimestamp: '1700000000',
    transactionHash: `0x${'aa'.repeat(32)}`,
    logIndex,
    topic0: topics[0] ?? null,
    topic1: topics[1] ?? null,
    topic2: topics[2] ?? null,
    topic3: topics[3] ?? null,
    data,
  };
}

describe('foldStatementImageRecords', () => {
  it('lets a later revoke hide an adoption and a safety yes', () => {
    const adopted = raw('ImageAdopted', { signer, statementId, imageId }, 0);
    const revoked = raw('ImageAdoptionRevoked', { signer, statementId, imageId }, 2);
    const yes = raw('MosaicSafetyAttested', { attester, statementId, imageId }, 1, encodeSafetyData());
    const withdrawn = raw('MosaicSafetyRevoked', { attester, statementId, imageId }, 3);

    const folded = foldStatementImageRecords([withdrawn, adopted, yes, revoked]);
    assert.deepEqual(folded.adoptions, [{
      signer,
      statementId,
      imageId,
      adopted: false,
    }]);
    assert.deepEqual(folded.safety, [{
      attester,
      statementId,
      imageId,
      active: false,
    }]);
  });
});

function encodeSafetyData(): `0x${string}` {
  return `0x${promptHash.slice(2)}${modelId.slice(2)}`;
}
