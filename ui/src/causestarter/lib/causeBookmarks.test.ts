import { afterEach, describe, expect, it } from 'vitest'
import {
  mergeBookmarkDocuments,
  mergeBookmarkIds,
  parseCauseBookmarkDocument,
  parseCauseBookmarkList,
  rememberBookmarkKept,
  rememberBookmarkRemoved,
  sameBookmarkDocument,
  sameBookmarkList,
  serializeCauseBookmarkDocument,
  serializeCauseBookmarkList,
} from './causeBookmarks'

describe('causeBookmarks', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('round-trips published cause identities and ignores statement-shaped lists', () => {
    const ids = [
      { owner: '0xAbC0000000000000000000000000000000000001', slug: 'safer-nights' },
      { owner: '0xabc0000000000000000000000000000000000001', slug: 'safer-nights' },
      { owner: '0x0000000000000000000000000000000000000002', slug: 'clean-water' },
    ]
    const encoded = serializeCauseBookmarkList(ids)
    expect(encoded).not.toContain('bafy')
    expect(JSON.parse(encoded).causes).toHaveLength(2)
    expect(JSON.parse(encoded).removed).toEqual([])
    expect(JSON.parse(encoded).version).toBe(2)

    const parsed = parseCauseBookmarkList(encoded)
    expect(parsed).toEqual([
      { owner: '0xabc0000000000000000000000000000000000001', slug: 'safer-nights' },
      { owner: '0x0000000000000000000000000000000000000002', slug: 'clean-water' },
    ])

    expect(parseCauseBookmarkList(JSON.stringify({ statements: ['bafy-one'] }))).toEqual([])
    expect(parseCauseBookmarkList(null)).toBeNull()
  })

  it('reads version-1 wallet documents as empty tombstone lists', () => {
    const v1 = JSON.stringify({
      version: 1,
      causes: [{ owner: '0xabc0000000000000000000000000000000000001', slug: 'safer-nights' }],
    })
    expect(parseCauseBookmarkDocument(v1)).toEqual({
      version: 1,
      causes: [{ owner: '0xabc0000000000000000000000000000000000001', slug: 'safer-nights' }],
      removed: [],
    })
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
    expect(sameBookmarkList(
      [{ owner: '0xabc0000000000000000000000000000000000001', slug: 'one', updatedAt: '2026-01-01T00:00:00.000Z' }],
      [{ owner: '0xabc0000000000000000000000000000000000001', slug: 'one', updatedAt: '2026-02-01T00:00:00.000Z' }],
    )).toBe(false)
  })

  it('lets a later tombstone beat a stale keep, and a later keep restore it', () => {
    const owner = '0xabc0000000000000000000000000000000000001'
    const earlier = mergeBookmarkDocuments(
      {
        version: 1,
        causes: [{ owner, slug: 'safer-nights', updatedAt: '2026-01-01T00:00:00.000Z' }],
        removed: [],
      },
      {
        version: 2,
        causes: [],
        removed: [{ owner, slug: 'safer-nights', updatedAt: '2026-02-01T00:00:00.000Z' }],
      },
    )
    expect(earlier.causes).toEqual([])
    expect(earlier.removed).toEqual([
      { owner, slug: 'safer-nights', updatedAt: '2026-02-01T00:00:00.000Z' },
    ])

    const restored = mergeBookmarkDocuments(earlier, {
      version: 2,
      causes: [{ owner, slug: 'safer-nights', updatedAt: '2026-03-01T00:00:00.000Z' }],
      removed: [],
    })
    expect(restored.causes).toEqual([
      { owner, slug: 'safer-nights', updatedAt: '2026-03-01T00:00:00.000Z' },
    ])
    expect(restored.removed).toEqual([])
    expect(sameBookmarkDocument(earlier, restored)).toBe(false)
  })

  it('prefers a tombstone when keep and remove share a stamp', () => {
    const owner = '0xabc0000000000000000000000000000000000001'
    const at = '2026-04-01T00:00:00.000Z'
    const merged = mergeBookmarkDocuments(
      { version: 2, causes: [{ owner, slug: 'safer-nights', updatedAt: at }], removed: [] },
      { version: 2, causes: [], removed: [{ owner, slug: 'safer-nights', updatedAt: at }] },
    )
    expect(merged.causes).toEqual([])
    expect(merged.removed[0]?.slug).toBe('safer-nights')
  })

  it('tracks local tombstones across keep and remove', () => {
    const id = { owner: '0xabc0000000000000000000000000000000000001', slug: 'safer-nights' }
    rememberBookmarkRemoved(id, '2026-05-01T00:00:00.000Z')
    expect(parseCauseBookmarkDocument(serializeCauseBookmarkDocument({
      version: 2,
      causes: [],
      removed: [{ ...id, updatedAt: '2026-05-01T00:00:00.000Z' }],
    }))?.removed).toHaveLength(1)
    rememberBookmarkKept(id)
    const encoded = serializeCauseBookmarkList([id])
    expect(JSON.parse(encoded).removed).toEqual([])
  })

  it('does not let a later cause-draft clock beat a tombstone', () => {
    const owner = '0xabc0000000000000000000000000000000000001'
    const merged = mergeBookmarkDocuments(
      {
        version: 2,
        causes: [],
        removed: [{ owner, slug: 'safer-nights', updatedAt: '2026-02-01T00:00:00.000Z' }],
      },
      {
        version: 2,
        causes: [{ owner, slug: 'safer-nights' }],
        removed: [],
      },
    )
    expect(merged.causes).toEqual([])
    expect(merged.removed[0]?.updatedAt).toBe('2026-02-01T00:00:00.000Z')
  })

  it('lets an explicit later keep restore a tombstoned identity', () => {
    const id = { owner: '0xabc0000000000000000000000000000000000001', slug: 'safer-nights' }
    rememberBookmarkRemoved(id, '2026-02-01T00:00:00.000Z')
    rememberBookmarkKept(id, '2026-03-01T00:00:00.000Z')
    const merged = mergeBookmarkDocuments(
      {
        version: 2,
        causes: [],
        removed: [{ ...id, updatedAt: '2026-02-01T00:00:00.000Z' }],
      },
      {
        version: 2,
        causes: [{ ...id, updatedAt: '2026-03-01T00:00:00.000Z' }],
        removed: [],
      },
    )
    expect(merged.causes[0]?.updatedAt).toBe('2026-03-01T00:00:00.000Z')
    expect(merged.removed).toEqual([])
  })
})
