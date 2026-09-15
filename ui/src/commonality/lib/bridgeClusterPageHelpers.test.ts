import { describe, expect, it } from 'vitest'
import { createBridge } from './bridgeStore'
import { nextImplicationPair, parentSlotUsed, slugOrEmpty } from './bridgeClusterPageHelpers'

describe('bridgeClusterPageHelpers', () => {
  it('normalizes a slug only when the raw string is non-empty', () => {
    expect(slugOrEmpty('  ')).toBe('')
    expect(slugOrEmpty('Hello World')).toBe('hello-world')
  })

  it('treats a stand-in parent as a used slot even without owner/slug', () => {
    const draft = createBridge()
    expect(parentSlotUsed({ ...draft.parents[0]!, kind: 'stand-in' })).toBe(true)
  })

  it('refuses a pair until both ends have text', () => {
    const draft = createBridge()
    expect(nextImplicationPair(draft, 'modified-to-bridge')).toBeNull()
  })

  it('defaults a modified→bridge pair from the first used parent and the first bridge plank', () => {
    const draft = createBridge()
    draft.parents[0]!.modified.planks[0]!.text = 'thinner wording'
    draft.bridge.planks[0]!.text = 'shared plank'
    const pair = nextImplicationPair(draft, 'modified-to-bridge')
    expect(pair).toEqual({
      fromPlankId: draft.parents[0]!.modified.planks[0]!.id,
      toPlankId: draft.bridge.planks[0]!.id,
      role: 'modified-to-bridge',
    })
  })
})
