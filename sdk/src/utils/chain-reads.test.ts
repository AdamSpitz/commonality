import assert from 'assert';
import { type Address, type PublicClient } from 'viem';
import {
  readConditionParams,
  readProjectETHBalance,
  readNoteOnChainInfo,
  readBelief,
  readHasAlignment,
  readHasImplication,
  readExplanation,
  readMutableRef,
  readTotalReceivedValue,
  readConditionStatus,
  readSaleListing,
  readBuyOrder,
  readNextNoteId,
  BELIEF_NO_OPINION,
  BELIEF_BELIEVES,
  BELIEF_DISBELIEVES,
  type NoteOnChainInfo,
  type SaleListingInfo,
  type BuyOrderInfo,
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
    { twitterApiDotIoApiKey: '' },
    {},
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

// ============================================================================
// readBelief
// ============================================================================

const BELIEFS_CONTRACT = '0x5555555555555555555555555555555555555555' as const;
const STATEMENT_ID = '0xabcd'.padEnd(66, '0') as `0x${string}`;
const USER_ADDRESS = '0x7777777777777777777777777777777777777777' as Address;

describe('readBelief', () => {
  it('reads belief state as believes (1)', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName, args }: ReadContractArgs) => {
        if (functionName === 'getBelief' && args) {
          assert.strictEqual(args[0], USER_ADDRESS);
          assert.strictEqual(args[1], STATEMENT_ID);
          return 1n;
        }
        throw new Error('unexpected');
      },
    });

    const result = await readBelief(machinery, BELIEFS_CONTRACT, USER_ADDRESS, STATEMENT_ID);
    assert.strictEqual(result, BELIEF_BELIEVES);
  });

  it('reads belief state as disbelieves (2)', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'getBelief') return 2n;
        throw new Error('unexpected');
      },
    });

    const result = await readBelief(machinery, BELIEFS_CONTRACT, USER_ADDRESS, STATEMENT_ID);
    assert.strictEqual(result, BELIEF_DISBELIEVES);
  });

  it('reads belief state as no opinion (0)', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'getBelief') return 0n;
        throw new Error('unexpected');
      },
    });

    const result = await readBelief(machinery, BELIEFS_CONTRACT, USER_ADDRESS, STATEMENT_ID);
    assert.strictEqual(result, BELIEF_NO_OPINION);
  });

  it('falls back to no opinion when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readBelief(machinery, BELIEFS_CONTRACT, USER_ADDRESS, STATEMENT_ID);
    assert.strictEqual(result, BELIEF_NO_OPINION);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readBelief(machinery, BELIEFS_CONTRACT, USER_ADDRESS, STATEMENT_ID),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readHasAlignment
// ============================================================================

const ALIGNMENTS_CONTRACT = '0x6666666666666666666666666666666666666666' as const;
const ATTESTER_ADDRESS = '0x8888888888888888888888888888888888888888' as Address;
const SUBJECT_ADDRESS = '0x9999999999999999999999999999999999999999' as Address;
const TOPIC_STATEMENT_ID = '0xaaa'.padEnd(66, '0') as `0x${string}`;
const STATEMENT_ID_ALIGN = '0xbbb'.padEnd(66, '0') as `0x${string}`;

describe('readHasAlignment', () => {
  it('returns true when alignment exists', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName, args }: ReadContractArgs) => {
        if (functionName === 'hasAttestation' && args) {
          assert.strictEqual(args[0], ATTESTER_ADDRESS);
          assert.strictEqual(args[1], TOPIC_STATEMENT_ID);
          assert.strictEqual(args[2], SUBJECT_ADDRESS);
          assert.strictEqual(args[3], STATEMENT_ID_ALIGN);
          return true;
        }
        throw new Error('unexpected');
      },
    });

    const result = await readHasAlignment(machinery, ALIGNMENTS_CONTRACT, ATTESTER_ADDRESS, TOPIC_STATEMENT_ID, SUBJECT_ADDRESS, STATEMENT_ID_ALIGN);
    assert.strictEqual(result, true);
  });

  it('returns false when alignment does not exist', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'hasAttestation') return false;
        throw new Error('unexpected');
      },
    });

    const result = await readHasAlignment(machinery, ALIGNMENTS_CONTRACT, ATTESTER_ADDRESS, TOPIC_STATEMENT_ID, SUBJECT_ADDRESS, STATEMENT_ID_ALIGN);
    assert.strictEqual(result, false);
  });

  it('falls back to false when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readHasAlignment(machinery, ALIGNMENTS_CONTRACT, ATTESTER_ADDRESS, TOPIC_STATEMENT_ID, SUBJECT_ADDRESS, STATEMENT_ID_ALIGN);
    assert.strictEqual(result, false);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readHasAlignment(machinery, ALIGNMENTS_CONTRACT, ATTESTER_ADDRESS, TOPIC_STATEMENT_ID, SUBJECT_ADDRESS, STATEMENT_ID_ALIGN),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readHasImplication
// ============================================================================

const IMPLICATIONS_CONTRACT = '0xaaaaaaa666666666666666666666666666666666' as const;
const FROM_CID = '0xccc'.padEnd(66, '0') as `0x${string}`;
const TO_CID = '0xddd'.padEnd(66, '0') as `0x${string}`;

describe('readHasImplication', () => {
  it('returns true when implication exists', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName, args }: ReadContractArgs) => {
        if (functionName === 'hasAttestation' && args) {
          assert.strictEqual(args[0], ATTESTER_ADDRESS);
          assert.strictEqual(args[1], FROM_CID);
          assert.strictEqual(args[2], TO_CID);
          return true;
        }
        throw new Error('unexpected');
      },
    });

    const result = await readHasImplication(machinery, IMPLICATIONS_CONTRACT, ATTESTER_ADDRESS, FROM_CID, TO_CID);
    assert.strictEqual(result, true);
  });

  it('returns false when implication does not exist', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'hasAttestation') return false;
        throw new Error('unexpected');
      },
    });

    const result = await readHasImplication(machinery, IMPLICATIONS_CONTRACT, ATTESTER_ADDRESS, FROM_CID, TO_CID);
    assert.strictEqual(result, false);
  });

  it('falls back to false when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readHasImplication(machinery, IMPLICATIONS_CONTRACT, ATTESTER_ADDRESS, FROM_CID, TO_CID);
    assert.strictEqual(result, false);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readHasImplication(machinery, IMPLICATIONS_CONTRACT, ATTESTER_ADDRESS, FROM_CID, TO_CID),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readExplanation
// ============================================================================

describe('readExplanation', () => {
  it('returns explanation CID when it exists', async () => {
    const explanationCid = '0xeee'.padEnd(66, 'f') as `0x${string}`;
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName, args }: ReadContractArgs) => {
        if (functionName === 'getExplanation' && args) {
          assert.strictEqual(args[0], ATTESTER_ADDRESS);
          assert.strictEqual(args[1], FROM_CID);
          assert.strictEqual(args[2], TO_CID);
          return explanationCid;
        }
        throw new Error('unexpected');
      },
    });

    const result = await readExplanation(machinery, IMPLICATIONS_CONTRACT, ATTESTER_ADDRESS, FROM_CID, TO_CID);
    assert.strictEqual(result, explanationCid);
  });

  it('returns null when explanation does not exist', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'getExplanation') return '0x' + '00'.repeat(32) as `0x${string}`;
        throw new Error('unexpected');
      },
    });

    const result = await readExplanation(machinery, IMPLICATIONS_CONTRACT, ATTESTER_ADDRESS, FROM_CID, TO_CID);
    assert.strictEqual(result, '0x' + '00'.repeat(32) as `0x${string}`);
  });

  it('returns null when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readExplanation(machinery, IMPLICATIONS_CONTRACT, ATTESTER_ADDRESS, FROM_CID, TO_CID);
    assert.strictEqual(result, null);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readExplanation(machinery, IMPLICATIONS_CONTRACT, ATTESTER_ADDRESS, FROM_CID, TO_CID),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readMutableRef
// ============================================================================

const MUTABLE_REF_CONTRACT = '0xbbbbbbbb66666666666666666666666666666666' as const;
const OWNER_ADDRESS = '0xcccccccccccccccccccccccccccccccccccccccc' as Address;

describe('readMutableRef', () => {
  it('returns ref value when it exists', async () => {
    const refValue = 'hello world';
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName, args }: ReadContractArgs) => {
        if (functionName === 'getRef' && args) {
          assert.strictEqual(args[0], OWNER_ADDRESS);
          assert.strictEqual(args[1], 'myRef');
          return refValue;
        }
        throw new Error('unexpected');
      },
    });

    const result = await readMutableRef(machinery, MUTABLE_REF_CONTRACT, OWNER_ADDRESS, 'myRef');
    assert.strictEqual(result, refValue);
  });

  it('returns null when ref does not exist', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'getRef') return '';
        throw new Error('unexpected');
      },
    });

    const result = await readMutableRef(machinery, MUTABLE_REF_CONTRACT, OWNER_ADDRESS, 'nonexistent');
    assert.strictEqual(result, '');
  });

  it('returns null when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readMutableRef(machinery, MUTABLE_REF_CONTRACT, OWNER_ADDRESS, 'myRef');
    assert.strictEqual(result, null);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readMutableRef(machinery, MUTABLE_REF_CONTRACT, OWNER_ADDRESS, 'myRef'),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readTotalReceivedValue
// ============================================================================

describe('readTotalReceivedValue', () => {
  it('reads total received value from project', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'getAssuranceContractProgress') return 15_000_000_000_000_000_000n; // 15 ETH
        throw new Error('unexpected');
      },
    });

    const result = await readTotalReceivedValue(machinery, PROJECT_ADDRESS);
    assert.strictEqual(result, 15_000_000_000_000_000_000n);
  });

  it('returns 0n when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readTotalReceivedValue(machinery, PROJECT_ADDRESS);
    assert.strictEqual(result, 0n);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readTotalReceivedValue(machinery, PROJECT_ADDRESS),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readConditionStatus
// ============================================================================

describe('readConditionStatus', () => {
  it('reads hasSucceeded and hasFailed from condition contract', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'hasSucceeded') return true;
        if (functionName === 'hasFailed') return false;
        throw new Error('unexpected');
      },
    });

    const result = await readConditionStatus(machinery, CONDITION_ADDRESS);
    assert.deepStrictEqual(result, { hasSucceeded: true, hasFailed: false });
  });

  it('returns false/false when both conditions are unmet', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'hasSucceeded') return false;
        if (functionName === 'hasFailed') return false;
        throw new Error('unexpected');
      },
    });

    const result = await readConditionStatus(machinery, CONDITION_ADDRESS);
    assert.deepStrictEqual(result, { hasSucceeded: false, hasFailed: false });
  });

  it('falls back to false/false when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readConditionStatus(machinery, CONDITION_ADDRESS);
    assert.deepStrictEqual(result, { hasSucceeded: false, hasFailed: false });
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readConditionStatus(machinery, CONDITION_ADDRESS),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readSaleListing
// ============================================================================

const MARKET_CONTRACT = '0xdddddddd66666666666666666666666666666666' as const;

describe('readSaleListing', () => {
  it('reads sale listing details', async () => {
    const seller = '0x1111111111111111111111111111111111111111' as Address;
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName, args }: ReadContractArgs) => {
        if (functionName === 'getSaleListing' && args && args[0] === 5n) {
          return [seller, 10n, 100n, 1_000_000_000_000_000_000n] as const;
        }
        throw new Error('unexpected');
      },
    });

    const result = await readSaleListing(machinery, MARKET_CONTRACT, 5n);
    const expected: SaleListingInfo = {
      seller,
      tokenId: 10n,
      count: 100n,
      pricePerToken: 1_000_000_000_000_000_000n,
    };
    assert.deepStrictEqual(result, expected);
  });

  it('returns null when listing does not exist', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readSaleListing(machinery, MARKET_CONTRACT, 999n);
    assert.strictEqual(result, null);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readSaleListing(machinery, MARKET_CONTRACT, 1n),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readBuyOrder
// ============================================================================

describe('readBuyOrder', () => {
  it('reads buy order details', async () => {
    const buyer = '0x2222222222222222222222222222222222222222' as Address;
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName, args }: ReadContractArgs) => {
        if (functionName === 'getBuyOrder' && args && args[0] === 3n) {
          return [buyer, 20n, 50n, 500_000_000_000_000_000n] as const;
        }
        throw new Error('unexpected');
      },
    });

    const result = await readBuyOrder(machinery, MARKET_CONTRACT, 3n);
    const expected: BuyOrderInfo = {
      buyer,
      tokenId: 20n,
      count: 50n,
      pricePerToken: 500_000_000_000_000_000n,
    };
    assert.deepStrictEqual(result, expected);
  });

  it('returns null when order does not exist', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readBuyOrder(machinery, MARKET_CONTRACT, 999n);
    assert.strictEqual(result, null);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readBuyOrder(machinery, MARKET_CONTRACT, 1n),
      /publicClient is required/,
    );
  });
});

// ============================================================================
// readNextNoteId
// ============================================================================

describe('readNextNoteId', () => {
  it('reads next note ID from contract', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async ({ functionName }: ReadContractArgs) => {
        if (functionName === 'nextNoteId') return 42n;
        throw new Error('unexpected');
      },
    });

    const result = await readNextNoteId(machinery, NOTE_CONTRACT);
    assert.strictEqual(result, 42n);
  });

  it('returns 0n when contract call throws', async () => {
    const machinery = makeMachineryWithClient({
      readContract: async () => { throw new Error('execution reverted'); },
    });

    const result = await readNextNoteId(machinery, NOTE_CONTRACT);
    assert.strictEqual(result, 0n);
  });

  it('throws when publicClient is not provided', async () => {
    const machinery = createSDKMachinery('http://localhost:4000/graphql', {});
    await assert.rejects(
      () => readNextNoteId(machinery, NOTE_CONTRACT),
      /publicClient is required/,
    );
  });
});
