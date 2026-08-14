import { describe, expect, it } from 'vitest'
import {
  mergeBookmarkIds,
  parseCauseBookmarkList,
  sameBookmarkList,
  serializeCauseBookmarkList,
} from './causeBookmarks'

describe('causeBookmarks', () => {
  it('round-trips published cause identities and ignores statement-shaped lists', () => {
    const ids = [
      { owner: '0xAbC0000000000000000000000000000000000001', slug: 'safer-nights' },
      { owner: '0xabc0000000000000000000000000000000000001', slug: 'safer-nights' },
      { owner: '0x0000000000000000000000000000000000000002', slug: 'clean-water' },
    ]
    const encoded = serializeCauseBookmarkList(ids)
    expect(encoded).not.toContain('bafy')
    expect(JSON.parse(encoded).causes).toHaveLength(2)

    const parsed = parseCauseBookmarkList(encoded)
    expect(parsed).toEqual([
      { owner: '0xabc0000000000000000000000000000000000001', slug: 'safer-nights' },
      { owner: '0x0000000000000000000000000000000000000002', slug: 'clean-water' },
    ])

    expect(parseCauseBookmarkList(JSON.stringify({ statements: ['bafy-one'] }))).toEqual([])
    expect(parseCauseBookmarkList(null)).toBeNull()
  })

  it('unions lists without mixing keys', () => {
    const a = [{ owner: '0xabc0000000000000000000000000000000000001', slug: 'one' }]
    const b = [{ owner: '0xABC0000000000000000000000000000000000001', slug: 'one' }, { owner: '0x0000000000000000000000000000000000000002', slug: 'two' }]
    expect(mergeBookmarkIds(a, b)).toEqual([
      { owner: '0xabc0000000000000000000000000000000000001', slug: 'one' },
      { owner: '0x0000000000000000000000000000000000000002', slug: 'two' },
    ])
    expect(sameBookmarkList(a, b)).toBe(false)
    expect(sameBookmarkList(mergeBookmarkIds(a, b), b)).toBe(true)
  })
})
