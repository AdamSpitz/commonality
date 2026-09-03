import { describe, expect, it } from 'vitest'
import { resolveTrustedAlignmentAttesters } from './useAlignmentTrust'

const STARTER = '0x1111111111111111111111111111111111111111'
const ALICE = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const BOB = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const VIEWER = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'

describe('resolveTrustedAlignmentAttesters', () => {
  it('falls back to the starter network and includes the starter root', () => {
    const result = resolveTrustedAlignmentAttesters({
      starterAlignmentAttesters: new Set([STARTER, ALICE]),
      defaultAlignmentTrustRoot: STARTER,
      address: VIEWER,
    })
    expect(result).toEqual(new Set([
      STARTER.toLowerCase(),
      ALICE.toLowerCase(),
      VIEWER.toLowerCase(),
    ]))
  })

  it('does not union the starter root once a personal set exists', () => {
    const result = resolveTrustedAlignmentAttesters({
      personalAlignmentAttesters: new Set([BOB]),
      starterAlignmentAttesters: new Set([STARTER, ALICE]),
      defaultAlignmentTrustRoot: STARTER,
      address: VIEWER,
    })
    expect(result).toEqual(new Set([
      BOB.toLowerCase(),
      VIEWER.toLowerCase(),
    ]))
    expect(result?.has(STARTER.toLowerCase())).toBe(false)
  })

  it('returns undefined when neither personal nor starter set exists', () => {
    expect(resolveTrustedAlignmentAttesters({
      defaultAlignmentTrustRoot: STARTER,
      address: VIEWER,
    })).toBeUndefined()
  })
})
