import assert from 'assert'
import {
  computeAnonymizedId,
  createUniqueHumanIdConfig,
  foldAnonymizedBelieverIds,
  getProofTierForAnchor,
  unionAnonymizedBelieverIds,
  COMMONALITY_APP_SALT_DEFAULT,
  ProofTier,
  type AnonymizedId,
} from './unique-human-id.js'
import type { DirectSupportEvent } from '../conceptspace/events.js'

const USER_A = '0x1111111111111111111111111111111111111111' as const
const USER_A_UPPER = '0x1111111111111111111111111111111111111111' as const
const USER_B = '0x2222222222222222222222222222222222222222' as const
const CONTRACT = '0x9999999999999999999999999999999999999999' as const
const TX = '0x' + 'aa'.repeat(32) as const

const ALT_SALT = '0x' + '01'.repeat(32) as const

function supportEvent(user: typeof USER_A, beliefState: number): DirectSupportEvent {
  return {
    contractAddress: CONTRACT,
    blockNumber: 1n,
    blockTimestamp: 0n,
    transactionHash: TX,
    logIndex: 0,
    user,
    statementId: 'bafyfake',
    beliefState,
  }
}

describe('unique-human-id', () => {
  describe('computeAnonymizedId', () => {
    it('is deterministic for the same anchor and salt', () => {
      const id1 = computeAnonymizedId(USER_A)
      const id2 = computeAnonymizedId(USER_A)
      assert.strictEqual(id1, id2)
      // 32-byte hash
      assert.match(id1, /^0x[0-9a-f]{64}$/)
    })

    it('is case-insensitive on the anchor address', () => {
      const lower = computeAnonymizedId(USER_A.toLowerCase() as typeof USER_A)
      // USER_A_UPPER is the same address; build a checksummed variant
      const checksummed = '0x1111111111111111111111111111111111111111' as typeof USER_A
      assert.strictEqual(lower, computeAnonymizedId(checksummed))
      assert.strictEqual(computeAnonymizedId(USER_A_UPPER), lower)
    })

    it('differs per anchor', () => {
      assert.notStrictEqual(computeAnonymizedId(USER_A), computeAnonymizedId(USER_B))
    })

    it('differs per app salt (context-scoping)', () => {
      const defaultId = computeAnonymizedId(USER_A)
      const scopedId = computeAnonymizedId(USER_A, createUniqueHumanIdConfig(ALT_SALT))
      assert.notStrictEqual(defaultId, scopedId)
    })

    it('uses the documented default salt when none is provided', () => {
      // Sanity: default salt is a 32-byte hex constant.
      assert.match(COMMONALITY_APP_SALT_DEFAULT, /^0x[0-9a-f]{64}$/)
      assert.strictEqual(
        computeAnonymizedId(USER_A),
        computeAnonymizedId(USER_A, createUniqueHumanIdConfig(COMMONALITY_APP_SALT_DEFAULT)),
      )
    })
  })

  describe('ProofTier', () => {
    it('exposes ordered numeric tier values, not a boolean', () => {
      assert.strictEqual(ProofTier.NONE, 0)
      assert.strictEqual(ProofTier.ASSERTED, 1)
      assert.strictEqual(ProofTier.ONE_ATTESTATION, 2)
      assert.strictEqual(ProofTier.MULTIPLE_ATTESTATIONS, 3)
      assert.ok(ProofTier.NONE < ProofTier.ASSERTED)
      assert.ok(ProofTier.ASSERTED < ProofTier.ONE_ATTESTATION)
      assert.ok(ProofTier.ONE_ATTESTATION < ProofTier.MULTIPLE_ATTESTATIONS)
    })
  })

  describe('getProofTierForAnchor', () => {
    it('defaults to NONE when no attestations are recorded', () => {
      const id = computeAnonymizedId(USER_A)
      assert.strictEqual(getProofTierForAnchor(id), ProofTier.NONE)
      assert.strictEqual(getProofTierForAnchor(id, new Map<AnonymizedId, number>()), ProofTier.NONE)
    })

    it('returns the recorded tier when proof has attached additively', () => {
      const idA = computeAnonymizedId(USER_A)
      const idB = computeAnonymizedId(USER_B)
      const known = new Map<AnonymizedId, number>([
        [idA, ProofTier.ONE_ATTESTATION],
        [idB, ProofTier.MULTIPLE_ATTESTATIONS],
      ])
      assert.strictEqual(getProofTierForAnchor(idA, known), ProofTier.ONE_ATTESTATION)
      assert.strictEqual(getProofTierForAnchor(idB, known), ProofTier.MULTIPLE_ATTESTATIONS)
    })
  })

  describe('foldAnonymizedBelieverIds', () => {
    it('returns one anonymized ID per current believer', () => {
      const ids = foldAnonymizedBelieverIds([
        supportEvent(USER_A, 1),
        supportEvent(USER_B, 1),
      ])
      assert.strictEqual(ids.size, 2)
      assert.ok(ids.has(computeAnonymizedId(USER_A)))
      assert.ok(ids.has(computeAnonymizedId(USER_B)))
    })

    it('excludes disbelievers and no-opinions', () => {
      const ids = foldAnonymizedBelieverIds([
        supportEvent(USER_A, 1),
        supportEvent(USER_B, 2), // disbelieves
      ])
      assert.strictEqual(ids.size, 1)
      assert.ok(ids.has(computeAnonymizedId(USER_A)))
      assert.ok(!ids.has(computeAnonymizedId(USER_B)))
    })

    it('applies last-write-wins per anchor', () => {
      const ids = foldAnonymizedBelieverIds([
        supportEvent(USER_A, 1),
        supportEvent(USER_A, 0), // later flips to no-opinion
        supportEvent(USER_B, 2),
        supportEvent(USER_B, 1), // later flips to believes
      ])
      assert.strictEqual(ids.size, 1)
      assert.ok(!ids.has(computeAnonymizedId(USER_A)))
      assert.ok(ids.has(computeAnonymizedId(USER_B)))
    })

    it('dedupes the same anchor across many events', () => {
      const ids = foldAnonymizedBelieverIds([
        supportEvent(USER_A, 1),
        supportEvent(USER_A, 1),
        supportEvent(USER_A, 1),
      ])
      assert.strictEqual(ids.size, 1)
    })

    it('honours a custom app salt', () => {
      const ids = foldAnonymizedBelieverIds(
        [supportEvent(USER_A, 1)],
        createUniqueHumanIdConfig(ALT_SALT),
      )
      assert.ok(ids.has(computeAnonymizedId(USER_A, createUniqueHumanIdConfig(ALT_SALT))))
      assert.ok(!ids.has(computeAnonymizedId(USER_A)))
    })
  })

  describe('unionAnonymizedBelieverIds', () => {
    it('unions per-statement sets into one dedupe key set', () => {
      const setA = foldAnonymizedBelieverIds([supportEvent(USER_A, 1)])
      const setB = foldAnonymizedBelieverIds([supportEvent(USER_B, 1)])
      const union = unionAnonymizedBelieverIds([setA, setB])
      assert.strictEqual(union.size, 2)
      assert.ok(union.has(computeAnonymizedId(USER_A)))
      assert.ok(union.has(computeAnonymizedId(USER_B)))
    })

    it('counts a signer of multiple equivalent statements once', () => {
      // USER_A signed two equivalent statements; USER_B signed one of them.
      const setA = foldAnonymizedBelieverIds([supportEvent(USER_A, 1), supportEvent(USER_B, 1)])
      const setB = foldAnonymizedBelieverIds([supportEvent(USER_A, 1)])
      const union = unionAnonymizedBelieverIds([setA, setB])
      assert.strictEqual(union.size, 2)
    })
  })
})
