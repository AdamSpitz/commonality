import assert from 'assert';
import type { Address, Hash } from 'viem';
import { AssuranceContractAbi } from '../../abis.js';
import { buyProjectTokens } from './actions.js';
import type { WriteClients } from '../../utils/ethereum.js';

const BUYER = '0xbbbb000000000000000000000000000000000000' as Address;
const ASSURANCE = '0xaaaa000000000000000000000000000000000000' as Address;
const ERC1155 = '0xcccc000000000000000000000000000000000000' as Address;
const PAYMENT_TOKEN = '0xdddd000000000000000000000000000000000000' as Address;

interface WriteCall {
  functionName: string;
  address: Address;
  args: readonly unknown[];
}

/**
 * Build a mock WriteClients that records writeContract calls and returns a
 * configurable ERC20 allowance from readContract.
 */
function makeMockClients(allowance: bigint): { clients: WriteClients; writes: WriteCall[] } {
  const writes: WriteCall[] = [];

  const publicClient = {
    // paymentToken() then allowance() are the two reads buyProjectTokens makes.
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === 'paymentToken') return PAYMENT_TOKEN;
      if (functionName === 'allowance') return allowance;
      throw new Error(`unexpected read: ${functionName}`);
    },
    waitForTransactionReceipt: async () => ({ status: 'success' }),
  };

  const walletClient = {
    chain: undefined,
    account: { address: BUYER },
    writeContract: async (call: WriteCall): Promise<Hash> => {
      writes.push(call);
      return '0xdeadbeef' as Hash;
    },
  };

  return {
    clients: {
      walletClient: walletClient as unknown as WriteClients['walletClient'],
      publicClient: publicClient as unknown as WriteClients['publicClient'],
      account: BUYER,
    },
    writes,
  };
}

const buyParams = {
  buyer: BUYER,
  tokenAddress: ERC1155,
  tokenIds: [0n],
  tokenCounts: [1n],
  totalCost: 100n,
};

describe('buyProjectTokens ERC20 allowance handling', () => {
  it('sends an approve when the existing allowance is insufficient', async () => {
    const { clients, writes } = makeMockClients(0n);
    await buyProjectTokens(clients, { address: ASSURANCE, abi: AssuranceContractAbi }, buyParams);

    assert.deepStrictEqual(writes.map((w) => w.functionName), ['approve', 'buyERC1155']);
    const approve = writes[0];
    assert.strictEqual(approve.address, PAYMENT_TOKEN);
    assert.deepStrictEqual(approve.args, [ASSURANCE, 100n]);
  });

  it('skips the approve when the existing allowance already covers the cost', async () => {
    const { clients, writes } = makeMockClients(100n);
    await buyProjectTokens(clients, { address: ASSURANCE, abi: AssuranceContractAbi }, buyParams);

    assert.deepStrictEqual(writes.map((w) => w.functionName), ['buyERC1155']);
  });

  it('skips the approve when the allowance exceeds the cost', async () => {
    const { clients, writes } = makeMockClients(1_000n);
    await buyProjectTokens(clients, { address: ASSURANCE, abi: AssuranceContractAbi }, buyParams);

    assert.deepStrictEqual(writes.map((w) => w.functionName), ['buyERC1155']);
  });
});
