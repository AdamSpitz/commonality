import assert from 'assert';
import { type Address, type PublicClient } from 'viem';
import {
  readConditionParams,
  readProjectETHBalance,
  readNoteOnChainInfo,
  type NoteOnChainInfo,
} from './chain-reads.js';
import { createSDKMachinery } from '../machinery.js';

const CONDITION_ADDRESS = '0x2222222222222222222222222222222222222222' as const;
const PROJECT_ADDRESS = '0x3333333333333333333333333333333333333333' as const;
const NOTE_CONTRACT = '0x4444444444444444444444444444444444444444' as const;

type ReadContractArgs = { address: Address; functionName: string; args?: readonly unknown[] };
type GetBalanceArgs = { address: Address };

function mockPublicClient(mockOverrides: Partial<{
  readContract: (args: ReadContractArgs) => Promise<unknown>;
  getBalance: (args: GetBalanceArgs) => Promise<bigint>;
}> = {}) {
  return {
    readContract: mockOverrides.readContract ?? (async () => { throw new Error('not mocked'); }),
    getBalance: mockOverrides.getBalance ?? (async () => { throw new Error('not mocked'); }),
  };
}

function makeMachineryWithClient(mockOverrides: Parameters<typeof mockPublicClient>[0] = {}) {
  const client = mockPublicClient(mockOverrides);
  return createSDKMachinery(
    'http://localhost:4000/graphql',
    {},
    undefined,
    client as unknown as PublicClient,
  );
}

// ============================================================================
// readConditionParams
// ============================================================================

describe('readConditionParams', () => {
  it('reads threshold and deadline from condition contract', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'threshold') return 10_000_000_000_000_000_000n; // 10 ETH
        if (functionName === 'deadline') return 1_700_000_000n;
        throw new Error('unexpected');
      },
    });

    const result = await readConditionParams(machinery, CONDITION_ADDRESS);
    assert.deepStrictEqual(result, {
      threshold: 10_000_000_000_000_000_000n,
      deadline: 1_700_000_000n,
    });
  });

  it('falls back to 0n when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('revert'); },
    });

    const result = await readConditionParams(machinery, CONDITION_ADDRESS);
    assert.deepStrictEqual(result, { threshold: 0n, deadline: 0n });
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readConditionParams(machinery, CONDITION_ADDRESS),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readProjectETHBalance
// ============================================================================

describe('readProjectETHBalance', () => {
  it('reads ETH balance of project', async () => {
    const machinery = makeMachineryWithClient({
      getBalance: async ({ address }: GetBalanceArgs) => {
        if (address === PROJECT_ADDRESS) return 5_000_000_000_000_000_000n; // 5 ETH
        throw new Error('unexpected');
      },
    });

    const result = await readProjectETHBalance(machinery, PROJECT_ADDRESS);
    assert.strictEqual(result, 5_000_000_000_000_000_000n);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readProjectETHBalance(machinery, PROJECT_ADDRESS),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readNoteOnChainInfo
// ============================================================================

describe('readNoteOnChainInfo', () => {
  it('reads note info from contract', async () => {
    const chainHash = '0x' + 'ab'.repeat(32) as `0x${string}`;
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName, args }: ReadContractArgs) => {
        if (functionName === 'notes' && args && args[0] === 5n) {
          return [chainHash, 1_000_000_000_000_000_000n, '0x5555555555555555555555555555555555555555', 0, 0n] as const;
        }
        throw new Error('unexpected');
      },
    });

    const result = await readNoteOnChainInfo(machinery, NOTE_CONTRACT, 5n);
    assert.deepStrictEqual(result, {
      chainHash,
      amount: 1_000_000_000_000_000_000n,
      token: '0x5555555555555555555555555555555555555555',
      tokenType: 0,
      tokenId: 0n,
    } satisfies NoteOnChainInfo);
  });

  it('returns null when note does not exist (call reverts)', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readNoteOnChainInfo(machinery, NOTE_CONTRACT, 999n);
    assert.strictEqual(result, null);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readNoteOnChainInfo(machinery, NOTE_CONTRACT, 1n),
      /publicClient is required/,
    );
  });
});
