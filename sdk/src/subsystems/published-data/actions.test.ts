import { strict as assert } from 'node:assert';
import { describe, it } from 'mocha';
import { hardhat } from 'viem/chains';
import { publishData } from './actions.js';
import type { WriteClients } from '../../utils/ethereum.js';

const publishedDataContract = {
  address: '0x0000000000000000000000000000000000000001' as const,
  abi: [
    {
      type: 'function',
      name: 'publishData',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'content', type: 'bytes' }],
      outputs: [],
    },
  ] as const,
};

describe('publishData', () => {
  it('passes dynamic bytes to viem as hex', async () => {
    let writtenArgs: unknown[] | undefined;
    const clients = {
      walletClient: {
        chain: hardhat,
        account: '0x0000000000000000000000000000000000000002',
        writeContract: async (request: { args?: unknown[] }) => {
          writtenArgs = request.args;
          return '0x0000000000000000000000000000000000000000000000000000000000000003';
        },
      },
      publicClient: {
        waitForTransactionReceipt: async () => ({}),
      },
      account: '0x0000000000000000000000000000000000000002',
    } as unknown as WriteClients;

    await publishData(clients, publishedDataContract, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));

    assert.deepEqual(writtenArgs, ['0xdeadbeef']);
  });

  it('skips waiting for the receipt when asked and forwards nonce', async () => {
    let waited = false;
    let writtenNonce: number | undefined;
    const clients = {
      walletClient: {
        chain: hardhat,
        account: '0x0000000000000000000000000000000000000002',
        writeContract: async (request: { nonce?: number }) => {
          writtenNonce = request.nonce;
          return '0x0000000000000000000000000000000000000000000000000000000000000003';
        },
      },
      publicClient: {
        waitForTransactionReceipt: async () => {
          waited = true;
          return {};
        },
      },
      account: '0x0000000000000000000000000000000000000002',
    } as unknown as WriteClients;

    await publishData(
      clients,
      publishedDataContract,
      new Uint8Array([0x01]),
      { waitForReceipt: false, nonce: 7 },
    );

    assert.equal(writtenNonce, 7);
    assert.equal(waited, false);
  });
});
