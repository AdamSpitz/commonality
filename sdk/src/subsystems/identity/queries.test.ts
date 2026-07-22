import assert from 'assert';
import { encodeEventTopics } from 'viem';
import { createSDKMachinery } from '../../machinery.js';
import type { RawEventFromCache } from '../../utils/eventCacheClient.js';
import { AccountAssertionsAbi } from '../../abis.js';
import {
  computeAnonymizedId,
  ProofTier,
} from './unique-human-id.js';
import {
  getKnownProofTiers,
  getAccountAssertion,
  foldAssertedAnchors,
  type AccountAssertionEvent,
} from './queries.js';

const ACCOUNT_ASSERTIONS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const USER_A = '0x1111111111111111111111111111111111111111' as const;
const USER_B = '0x2222222222222222222222222222222222222222' as const;
const USER_C = '0x3333333333333333333333333333333333333333' as const;
const TX_HASH = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

function makeAccountAssertionRawEvent(
  user: `0x${string}`,
  asserted: boolean,
  overrides: Partial<RawEventFromCache> = {},
): RawEventFromCache {
  const topics = encodeEventTopics({
    abi: AccountAssertionsAbi,
    eventName: 'AccountAssertionSet',
    args: { user },
  });
  return {
    id: `${user}-${asserted}-${overrides.logIndex ?? 0}`,
    contractAddress: ACCOUNT_ASSERTIONS,
    eventName: 'AccountAssertionSet',
    blockNumber: '100',
    blockTimestamp: '1700000000',
    transactionHash: TX_HASH,
    logIndex: 0,
    topic0: topics[0] ?? null,
    topic1: (topics[1] ?? null) as string | null,
    topic2: null,
    topic3: null,
    data: asserted ? '0x' + '0'.repeat(63) + '1' : '0x' + '0'.repeat(64),
    ...overrides,
  };
}

function machineryFor(eventsByQuery: (url: URL) => RawEventFromCache[]) {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    return new Response(JSON.stringify({ items: eventsByQuery(url) }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return createSDKMachinery({
    ipfsConfig: { shouldUseMock: true },
    eventCacheUrl: 'http://localhost:42069',
    contractAddresses: {
      beliefs: '0x0000000000000000000000000000000000000000',
      implications: '0x0000000000000000000000000000000000000000',
      assuranceContractFactory: '0x0000000000000000000000000000000000000000',
      erc1155Factory: '0x0000000000000000000000000000000000000000',
      delegatableNotes: '0x0000000000000000000000000000000000000000',
      noteIntent: '0x0000000000000000000000000000000000000000',
      alignmentAttestations: '0x0000000000000000000000000000000000000000',
      mutableRefUpdater: '0x0000000000000000000000000000000000000000',
      trustRegistry: '0x0000000000000000000000000000000000000000',
      accountAssertions: ACCOUNT_ASSERTIONS,
    },
  });
}

describe('identity queries — AccountAssertions (tier 0/1)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('foldAssertedAnchors', () => {
    function ev(user: `0x${string}`, asserted: boolean, logIndex: number): AccountAssertionEvent {
      return {
        user,
        asserted,
        blockNumber: 1n,
        blockTimestamp: 0n,
        transactionHash: TX_HASH,
        logIndex,
      };
    }

    it('keeps the latest assertion per anchor and excludes revoked anchors', () => {
      const anchors = foldAssertedAnchors([
        ev(USER_A, true, 0),
        ev(USER_A, false, 1), // revoked
        ev(USER_B, false, 0), // revoked without prior assertion
        ev(USER_B, true, 1), // later asserts
        ev(USER_C, true, 0),
      ]);
      assert.ok(!anchors.has(USER_A.toLowerCase() as `0x${string}`));
      assert.ok(anchors.has(USER_B.toLowerCase() as `0x${string}`));
      assert.ok(anchors.has(USER_C.toLowerCase() as `0x${string}`));
      assert.strictEqual(anchors.size, 2);
    });
  });

  describe('getKnownProofTiers', () => {
    it('maps asserted anchors to ProofTier.ASSERTED and omits revoked ones', async () => {
      const assertionEvents = [
        makeAccountAssertionRawEvent(USER_A, true, { logIndex: 0 }),
        makeAccountAssertionRawEvent(USER_B, true, { logIndex: 1 }),
        makeAccountAssertionRawEvent(USER_B, false, { logIndex: 2, blockNumber: '101' }), // revoked
      ];

      const machinery = machineryFor(() => assertionEvents);
      const tiers = await getKnownProofTiers(machinery);

      assert.strictEqual(tiers.get(computeAnonymizedId(USER_A)), ProofTier.ASSERTED);
      assert.strictEqual(tiers.get(computeAnonymizedId(USER_B)), undefined); // revoked → absent
      assert.strictEqual(tiers.size, 1);
    });

    it('returns an empty map when no assertions exist', async () => {
      const machinery = machineryFor(() => []);
      const tiers = await getKnownProofTiers(machinery);
      assert.strictEqual(tiers.size, 0);
    });
  });

  describe('getAccountAssertion', () => {
    it('returns true when the latest event for the account is an assertion', async () => {
      const events = [
        makeAccountAssertionRawEvent(USER_A, false, { logIndex: 0, blockNumber: '100' }),
        makeAccountAssertionRawEvent(USER_A, true, { logIndex: 1, blockNumber: '101' }),
      ];
      const machinery = machineryFor((url) => {
        // The query filters by topic1 = padded address.
        const topic1 = url.searchParams.get('topic1');
        const lower = USER_A.toLowerCase().slice(2).padStart(64, '0');
        assert.strictEqual(topic1, `0x${lower}`);
        return events;
      });
      assert.ok(await getAccountAssertion(machinery, USER_A));
    });

    it('returns false when the latest event is a revocation', async () => {
      const events = [
        makeAccountAssertionRawEvent(USER_A, true, { logIndex: 0, blockNumber: '100' }),
        makeAccountAssertionRawEvent(USER_A, false, { logIndex: 1, blockNumber: '101' }),
      ];
      const machinery = machineryFor(() => events);
      assert.ok(!(await getAccountAssertion(machinery, USER_A)));
    });

    it('returns false when the account has no assertion events', async () => {
      const machinery = machineryFor(() => []);
      assert.ok(!(await getAccountAssertion(machinery, USER_C)));
    });
  });
});
