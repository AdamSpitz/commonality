import { strict as assert } from 'assert';
import { type Abi, type Address, type Hex } from 'viem';
import { PublishedDataAbi } from '../../../abis/PublishedDataAbi.js';
import type { WriteClients } from '../../utils/ethereum.js';
import { computePublishedDataId, publishedDataIdToCid } from './id.js';
import { publishData } from './actions.js';

const publishedDataAddress = '0x0000000000000000000000000000000000000c0d' as Address;
const account = '0x00000000000000000000000000000000000000a1' as Address;

function makeWriteClients(calls: unknown[]): WriteClients {
  return {
    account,
    walletClient: {
      account: { address: account },
      chain: undefined,
      async writeContract(args: unknown) {
        calls.push(args);
        return '0xabc' as Hex;
      },
    },
    publicClient: {
      async waitForTransactionReceipt(args: unknown) {
        calls.push(args);
        return {};
      },
    },
  } as unknown as WriteClients;
}

describe('published-data actions', () => {
  it('publishes bytes and returns matching dataId, CID, and transaction hash', async () => {
    const calls: unknown[] = [];
    const content = new TextEncoder().encode('hello PublishedData');
    const result = await publishData(
      makeWriteClients(calls),
      { address: publishedDataAddress, abi: PublishedDataAbi as Abi },
      content,
    );

    const expectedDataId = computePublishedDataId(content);
    assert.equal(result.dataId, expectedDataId);
    assert.equal(result.cid, publishedDataIdToCid(expectedDataId));
    assert.equal(result.txHash, '0xabc');

    const writeCall = calls[0] as { args?: readonly unknown[]; functionName?: string };
    assert.equal(writeCall.functionName, 'publishData');
    assert.deepEqual(writeCall.args, [content]);
    assert.deepEqual(calls[1], { hash: '0xabc' });
  });
});
