import assert from 'assert';
import type { Address, Hash } from 'viem';
import { BeliefsAbi } from '../../abis.js';
import { buildCidV1FromDigest } from '../../utils/cid-types.js';
import { clearWalletCapabilitiesCache } from '../../utils/walletCapabilities.js';
import type { WriteClients } from '../../utils/ethereum.js';
import { believeStatement, setBeliefsBatch, BELIEVES, DISBELIEVES } from './actions.js';

const ACCOUNT = '0xbbbb000000000000000000000000000000000000' as Address;
const BELIEFS = '0xaaaa000000000000000000000000000000000000' as Address;
const TANK = '0xcccc000000000000000000000000000000000000' as Address;
const SPONSOR = '0xdddd000000000000000000000000000000000000' as Address;
const OTHER = '0xeeee000000000000000000000000000000000000' as Address;
const ZERO = '0x0000000000000000000000000000000000000000' as Address;
const PAYMASTER = 'https://example.test/paymaster';

const cidA = buildCidV1FromDigest(0x55, new Uint8Array(32).fill(1));
const cidB = buildCidV1FromDigest(0x55, new Uint8Array(32).fill(2));

function makeClients(sponsors: Record<string, Address>) {
  const writes: { functionName: string }[] = [];
  const requests: { method: string; params: readonly unknown[] }[] = [];
  const publicClient = {
    readContract: async ({ args }: { args: readonly unknown[] }) => {
      const id = String(args[0]).toLowerCase();
      return sponsors[id] ?? ZERO;
    },
    waitForTransactionReceipt: async () => ({ status: 'success' }),
  };
  const walletClient = {
    chain: { id: 84532 },
    account: { address: ACCOUNT },
    writeContract: async (call: { functionName: string }): Promise<Hash> => {
      writes.push(call);
      return '0xwrite' as Hash;
    },
    request: async (request: { method: string; params: readonly unknown[] }) => {
      requests.push(request);
      if (request.method === 'wallet_getCapabilities') {
        return { '0x14a34': { paymasterService: { supported: true }, atomicBatch: { supported: true } } };
      }
      if (request.method === 'wallet_sendCalls') return 'batch-id';
      return { status: 200, receipts: [{ transactionHash: '0xbatch' }] };
    },
  };
  const clients = {
    walletClient: walletClient as unknown as WriteClients['walletClient'],
    publicClient: publicClient as unknown as WriteClients['publicClient'],
    account: ACCOUNT,
  };
  return { clients, writes, requests };
}

function sendCallsPayload(requests: { method: string; params: readonly unknown[] }[]) {
  return requests.find((r) => r.method === 'wallet_sendCalls')!.params[0] as {
    capabilities?: { paymasterService?: { url: string } };
    calls: unknown[];
  };
}

describe('sponsored statement signatures', () => {
  beforeEach(() => clearWalletCapabilitiesCache());

  it('attaches the paymaster for an enrolled support call', async () => {
    const { clients, writes, requests } = makeClients({});
    Object.assign(clients.publicClient, {
      readContract: async () => SPONSOR,
    });
    const hash = await believeStatement(
      clients,
      { address: BELIEFS, abi: BeliefsAbi },
      cidA,
      { paymasterUrl: PAYMASTER, statementGasTankAddress: TANK },
    );
    assert.strictEqual(hash, '0xbatch');
    assert.deepStrictEqual(writes, []);
    assert.strictEqual(sendCallsPayload(requests).capabilities?.paymasterService?.url, PAYMASTER);
  });

  it('does not use wallet_sendCalls when the wallet cannot sponsor', async () => {
    const { clients, writes, requests } = makeClients({});
    Object.assign(clients.publicClient, {
      readContract: async () => SPONSOR,
    });
    Object.assign(clients.walletClient, {
      request: async (request: { method: string; params: readonly unknown[] }) => {
        requests.push(request);
        if (request.method === 'wallet_getCapabilities') return {};
        throw new Error('wallet_sendCalls should not be used');
      },
    });
    const hash = await believeStatement(
      clients,
      { address: BELIEFS, abi: BeliefsAbi },
      cidA,
      { paymasterUrl: PAYMASTER, statementGasTankAddress: TANK },
    );
    assert.strictEqual(hash, '0xwrite');
    assert.deepStrictEqual(writes.map((w) => w.functionName), ['setBelief']);
    assert.strictEqual(requests.find((r) => r.method === 'wallet_sendCalls'), undefined);
  });

  it('does not attach the paymaster when the statement is not enrolled', async () => {
    const { clients, writes, requests } = makeClients({});
    const hash = await believeStatement(
      clients,
      { address: BELIEFS, abi: BeliefsAbi },
      cidA,
      { paymasterUrl: PAYMASTER, statementGasTankAddress: TANK },
    );
    assert.strictEqual(hash, '0xwrite');
    assert.deepStrictEqual(writes.map((w) => w.functionName), ['setBelief']);
    assert.strictEqual(requests.find((r) => r.method === 'wallet_sendCalls'), undefined);
  });

  it('sponsors a support-only batch with one sponsor', async () => {
    const { clients, writes, requests } = makeClients({});
    Object.assign(clients.publicClient, {
      readContract: async () => SPONSOR,
    });
    const hash = await setBeliefsBatch(
      clients,
      { address: BELIEFS, abi: BeliefsAbi },
      [
        { statementCid: cidA, beliefState: BELIEVES },
        { statementCid: cidB, beliefState: BELIEVES },
      ],
      { paymasterUrl: PAYMASTER, statementGasTankAddress: TANK },
    );
    assert.strictEqual(hash, '0xbatch');
    assert.deepStrictEqual(writes, []);
    const payload = sendCallsPayload(requests);
    assert.strictEqual(payload.calls.length, 1);
    assert.strictEqual(payload.capabilities?.paymasterService?.url, PAYMASTER);
  });

  it('does not sponsor a mixed-support batch', async () => {
    const { clients, writes, requests } = makeClients({});
    Object.assign(clients.publicClient, {
      readContract: async () => SPONSOR,
    });
    await setBeliefsBatch(
      clients,
      { address: BELIEFS, abi: BeliefsAbi },
      [
        { statementCid: cidA, beliefState: BELIEVES },
        { statementCid: cidB, beliefState: DISBELIEVES },
      ],
      { paymasterUrl: PAYMASTER, statementGasTankAddress: TANK },
    );
    assert.deepStrictEqual(writes.map((w) => w.functionName), ['setBeliefsInBatch']);
    assert.strictEqual(requests.find((r) => r.method === 'wallet_sendCalls'), undefined);
  });

  it('does not sponsor a batch with two sponsors', async () => {
    let n = 0;
    const { clients, writes, requests } = makeClients({});
    Object.assign(clients.publicClient, {
      readContract: async () => {
        n += 1;
        return n === 1 ? SPONSOR : OTHER;
      },
    });
    await setBeliefsBatch(
      clients,
      { address: BELIEFS, abi: BeliefsAbi },
      [
        { statementCid: cidA, beliefState: BELIEVES },
        { statementCid: cidB, beliefState: BELIEVES },
      ],
      { paymasterUrl: PAYMASTER, statementGasTankAddress: TANK },
    );
    assert.deepStrictEqual(writes.map((w) => w.functionName), ['setBeliefsInBatch']);
    assert.strictEqual(requests.find((r) => r.method === 'wallet_sendCalls'), undefined);
  });
});
