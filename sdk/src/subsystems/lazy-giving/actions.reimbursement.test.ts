import assert from 'assert';
import type { Address, Hash } from 'viem';
import { AssuranceContractAbi } from '../../abis.js';
import type { WriteClients } from '../../utils/ethereum.js';
import { donateRetroactive, forgoReimbursement, withdrawReimbursement } from './actions.js';

const ACCOUNT = '0xbbbb000000000000000000000000000000000000' as Address;
const ASSURANCE = '0xaaaa000000000000000000000000000000000000' as Address;
const PAYMENT_TOKEN = '0xdddd000000000000000000000000000000000000' as Address;

interface WriteCall {
  functionName: string;
  address: Address;
  args: readonly unknown[];
}

function makeMockClients(allowance = 0n): { clients: WriteClients; writes: WriteCall[]; waited: Hash[] } {
  const writes: WriteCall[] = [];
  const waited: Hash[] = [];
  let nextHash = 1n;
  const clients = {
    account: ACCOUNT,
    publicClient: {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === 'paymentToken') return PAYMENT_TOKEN;
        if (functionName === 'allowance') return allowance;
        throw new Error(`unexpected read: ${functionName}`);
      },
      waitForTransactionReceipt: async ({ hash }: { hash: Hash }) => {
        waited.push(hash);
        return { status: 'success' };
      },
    },
    walletClient: {
      chain: undefined,
      account: { address: ACCOUNT },
      writeContract: async (call: WriteCall) => {
        writes.push(call);
        const hash = `0x${nextHash.toString(16).padStart(64, '0')}` as Hash;
        nextHash += 1n;
        return hash;
      },
    },
  };
  return { clients: clients as unknown as WriteClients, writes, waited };
}

const assuranceContract = { address: ASSURANCE, abi: AssuranceContractAbi };

describe('reimbursement actions', () => {
  it('approves the payment token and donates retroactively', async () => {
    const { clients, writes, waited } = makeMockClients();
    const hash = await donateRetroactive(clients, assuranceContract, 250n);

    assert.deepStrictEqual(writes.map(({ functionName }) => functionName), ['approve', 'donateRetroactive']);
    assert.deepStrictEqual(writes[0].args, [ASSURANCE, 250n]);
    assert.deepStrictEqual(writes[1].args, [250n]);
    assert.strictEqual(hash, waited.at(-1));
  });

  it('uses an existing allowance for a retroactive donation', async () => {
    const { clients, writes } = makeMockClients(250n);
    await donateRetroactive(clients, assuranceContract, 250n);
    assert.deepStrictEqual(writes.map(({ functionName }) => functionName), ['donateRetroactive']);
  });

  it('withdraws the caller reimbursement', async () => {
    const { clients, writes } = makeMockClients();
    await withdrawReimbursement(clients, assuranceContract);
    assert.deepStrictEqual(writes.map(({ functionName }) => functionName), ['withdrawReimbursement']);
    assert.deepStrictEqual(writes[0].args, []);
  });

  it('forgoes the requested reimbursement amount', async () => {
    const { clients, writes } = makeMockClients();
    await forgoReimbursement(clients, assuranceContract, 75n);
    assert.deepStrictEqual(writes.map(({ functionName }) => functionName), ['forgoReimbursement']);
    assert.deepStrictEqual(writes[0].args, [75n]);
  });
});
