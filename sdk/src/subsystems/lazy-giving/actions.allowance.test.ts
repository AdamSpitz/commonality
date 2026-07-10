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

interface BatchCall {
  to: Address;
  data: Hash;
  value?: bigint;
}

/**
 * Build a mock smart-account WriteClients that records the single batched
 * sendTransaction({ calls }) a smart-account client makes instead of separate
 * writeContract calls.
 */
function makeMockSmartClients(allowance: bigint): { clients: WriteClients; batches: BatchCall[][] } {
  const batches: BatchCall[][] = [];

  const publicClient = {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === 'paymentToken') return PAYMENT_TOKEN;
      if (functionName === 'allowance') return allowance;
      throw new Error(`unexpected read: ${functionName}`);
    },
    waitForTransactionReceipt: async () => ({ status: 'success' }),
  };

  const walletClient = {
    chain: undefined,
    account: { address: BUYER, type: 'smart' },
    sendTransaction: async ({ calls }: { calls: BatchCall[] }): Promise<Hash> => {
      batches.push(calls);
      return '0xbatched' as Hash;
    },
  };

  return {
    clients: {
      walletClient: walletClient as unknown as WriteClients['walletClient'],
      publicClient: publicClient as unknown as WriteClients['publicClient'],
      account: BUYER,
      isSmartAccount: true,
    },
    batches,
  };
}

// Function selectors for decoding batched call data.
const APPROVE_SELECTOR = '0x095ea7b3';
const BUY_ERC1155_SELECTOR = '0x2af8f3f4';

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

describe('buyProjectTokens smart-account batching', () => {
  it('batches approve + buyERC1155 into one sendTransaction when allowance is insufficient', async () => {
    const { clients, batches } = makeMockSmartClients(0n);
    const hash = await buyProjectTokens(clients, { address: ASSURANCE, abi: AssuranceContractAbi }, buyParams);

    assert.strictEqual(hash, '0xbatched');
    // Exactly one batched UserOperation, not two sequential ones.
    assert.strictEqual(batches.length, 1);
    const calls = batches[0];
    assert.strictEqual(calls.length, 2);
    // approve targets the payment token; buy targets the assurance contract.
    assert.strictEqual(calls[0].to, PAYMENT_TOKEN);
    assert.ok(calls[0].data.startsWith(APPROVE_SELECTOR), `expected approve selector, got ${calls[0].data.slice(0, 10)}`);
    assert.strictEqual(calls[1].to, ASSURANCE);
    assert.ok(calls[1].data.startsWith(BUY_ERC1155_SELECTOR), `expected buyERC1155 selector, got ${calls[1].data.slice(0, 10)}`);
  });

  it('batches only the buy when the allowance already covers the cost', async () => {
    const { clients, batches } = makeMockSmartClients(100n);
    await buyProjectTokens(clients, { address: ASSURANCE, abi: AssuranceContractAbi }, buyParams);

    assert.strictEqual(batches.length, 1);
    const calls = batches[0];
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].to, ASSURANCE);
    assert.ok(calls[0].data.startsWith(BUY_ERC1155_SELECTOR));
  });
});
