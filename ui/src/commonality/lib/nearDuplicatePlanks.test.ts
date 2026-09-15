import { describe, expect, it } from 'vitest'
import { rankNearDuplicates } from './nearDuplicatePlanks'

describe('rankNearDuplicates', () => {
  it('ranks overlapping plank text and skips identical copies', () => {
    const hits = rankNearDuplicates(
      'Kids do better with two committed parents.',
      [
        { text: 'Kids do better with two committed parents.', source: 'self' },
        { text: 'Children do better with two committed parents at home.', cid: 'bafy1', source: 'device' },
        { text: 'The creek should be clean.', source: 'unrelated' },
      ],
    )
    expect(hits[0]?.cid).toBe('bafy1')
    expect(hits.some((hit) => hit.source === 'unrelated')).toBe(false)
    expect(hits.some((hit) => hit.source === 'self')).toBe(false)
  })
})
