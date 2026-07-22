import { strict as assert } from 'assert';
import { toHex, type Abi, type Address, type Hex } from 'viem';
import { PublishedDataAbi } from '../../../abis/PublishedDataAbi.js';
import { createStatement, toCanonicalJson } from '../displayable-documents/displayable-document.js';
import { computePublishedDataId, publishedDataIdToCid } from '../published-data/id.js';
import { publishStatementData } from './actions.js';
import type { WriteClients } from '../../utils/ethereum.js';

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

describe('conceptspace PublishedData actions', () => {
  it('publishes canonical statement bytes and returns the matching PublishedData CID', async () => {
    const calls: unknown[] = [];
    const statement = createStatement({ content: 'PublishedData statement', createdDate: '2026-07-17T00:00:00.000Z' });
    const result = await publishStatementData(
      makeWriteClients(calls),
      { address: publishedDataAddress, abi: PublishedDataAbi as Abi },
      statement,
    );

    const content = new TextEncoder().encode(toCanonicalJson(statement));
    assert.equal(result.cid, publishedDataIdToCid(computePublishedDataId(content)));
    assert.equal(result.txHash, '0xabc');

    const writeCall = calls[0] as { data?: Hex; args?: readonly unknown[]; functionName?: string };
    assert.equal(writeCall.functionName, 'publishData');
    assert.deepEqual(writeCall.args, [toHex(content)]);

  });
});
