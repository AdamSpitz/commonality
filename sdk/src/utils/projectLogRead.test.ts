import assert from 'node:assert/strict';
import { encodeAbiParameters, encodeEventTopics, type Hex } from 'viem';
import { AssuranceContractAbi } from '../abis.js';
import { readProjectLogsFromNode, type ProjectLogSource } from './projectLogRead.js';

const PROJECT = '0x1111111111111111111111111111111111111111' as Hex;
const TX = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;

function metadataLog(blockNumber: bigint) {
  const topics = encodeEventTopics({
    abi: AssuranceContractAbi,
    eventName: 'ContractMetadataUpdated',
  });
  const data = encodeAbiParameters([{ type: 'string' }], ['ipfs://meta']);
  return {
    address: PROJECT,
    blockNumber,
    transactionHash: TX,
    logIndex: 0,
    topics,
    data,
  };
}

describe('readProjectLogsFromNode', () => {
  it('keeps the block timestamp on each decoded log', async () => {
    const source: ProjectLogSource = {
      getBlockNumber: async () => 40n,
      getLogs: async () => [metadataLog(40n)],
      getBlock: async () => ({ timestamp: 1_700_000_000n }),
    };

    const events = await readProjectLogsFromNode(source, 84532, PROJECT, 0n);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.eventName, 'ContractMetadataUpdated');
    assert.equal(events[0]?.blockTimestamp, '1700000000');
  });

  it('splits a result the node says is too large, and does not split a refused range', async () => {
    const seen: Array<[bigint, bigint]> = [];
    const source: ProjectLogSource = {
      getBlockNumber: async () => 10n,
      getLogs: async ({ fromBlock, toBlock }) => {
        seen.push([fromBlock, toBlock]);
        if (fromBlock === 0n && toBlock === 10n) {
          throw new Error('query returned more than 10000 results');
        }
        return [metadataLog(fromBlock)];
      },
      getBlock: async ({ blockNumber }) => ({ timestamp: blockNumber }),
    };

    const events = await readProjectLogsFromNode(source, 1, PROJECT, 0n);
    assert.ok(events.length >= 2);
    assert.ok(seen.some(([from, to]) => from === 0n && to < 10n));

    const refused: ProjectLogSource = {
      getBlockNumber: async () => 10n,
      getLogs: async () => {
        throw new Error('query exceeds max block range 2000');
      },
      getBlock: async () => ({ timestamp: 1n }),
    };
    await assert.rejects(() => readProjectLogsFromNode(refused, 1, PROJECT, 0n));
  });
});
