import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bookmarkProject,
  hydrateProjectBookmarks,
  isProjectBookmarked,
  listProjectBookmarks,
  mergeProjectBookmarkDocuments,
  parseProjectBookmarkDocument,
  persistProjectBookmarks,
  unbookmarkProject,
} from './projectBookmarks'

const getUserRef = vi.hoisted(() => vi.fn())
const updateRef = vi.hoisted(() => vi.fn())

vi.mock('@commonality/sdk/mutable-refs', () => ({
  getUserRef: (...args: unknown[]) => getUserRef(...args),
  updateRef: (...args: unknown[]) => updateRef(...args),
}))

vi.mock('@commonality/sdk/abis', () => ({
  MutableRefUpdaterAbi: [],
}))

vi.mock('../../shared', () => ({
  getRuntimeConfigValue: () => '0xcccccccccccccccccccccccccccccccccccccccc',
}))

const ADDR = '0x1234567890123456789012345678901234567890'
const OTHER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

describe('projectBookmarks', () => {
  beforeEach(() => {
    window.localStorage.clear()
    getUserRef.mockReset()
    updateRef.mockReset()
    updateRef.mockResolvedValue(undefined)
  })

  it('parses v1 string lists and lists bookmarked addresses', () => {
    expect(parseProjectBookmarkDocument(`{"version":1,"projects":["${ADDR}"]}`).projects).toEqual([
      { address: ADDR },
    ])
    bookmarkProject(ADDR, '2026-01-01T00:00:00.000Z')
    expect(isProjectBookmarked(ADDR)).toBe(true)
    expect(listProjectBookmarks()).toEqual([ADDR])
    unbookmarkProject(ADDR, '2026-01-02T00:00:00.000Z')
    expect(isProjectBookmarked(ADDR)).toBe(false)
  })

  it('lets a later tombstone beat a stale keep, and a later keep restore it', () => {
    const earlier = mergeProjectBookmarkDocuments(
      {
        version: 2,
        projects: [{ address: ADDR, updatedAt: '2026-01-01T00:00:00.000Z' }],
        removed: [],
      },
      {
        version: 2,
        projects: [],
        removed: [{ address: ADDR, updatedAt: '2026-02-01T00:00:00.000Z' }],
      },
    )
    expect(earlier.projects).toEqual([])
    const restored = mergeProjectBookmarkDocuments(earlier, {
      version: 2,
      projects: [{ address: ADDR, updatedAt: '2026-03-01T00:00:00.000Z' }],
      removed: [],
    })
    expect(restored.projects[0]?.updatedAt).toBe('2026-03-01T00:00:00.000Z')
    expect(restored.removed).toEqual([])
  })

  it('unions a remote keep with a local keep written while hydrate is in flight', async () => {
    let resolveRef: (value: { value: string }) => void = () => {}
    getUserRef.mockImplementation(
      () => new Promise((resolve) => {
        resolveRef = resolve
      }),
    )
    const pending = hydrateProjectBookmarks({} as never, ADDR)
    bookmarkProject(ADDR, '2026-04-01T00:00:00.000Z')
    resolveRef({
      value: JSON.stringify({
        version: 2,
        projects: [{ address: OTHER, updatedAt: '2026-03-01T00:00:00.000Z' }],
        removed: [],
      }),
    })
    const projects = await pending
    expect(projects.sort()).toEqual([OTHER, ADDR].sort())
  })

  it('does not let persist clobber a remote keep from another device', async () => {
    bookmarkProject(ADDR, '2026-05-01T00:00:00.000Z')
    getUserRef.mockResolvedValue({
      value: JSON.stringify({
        version: 2,
        projects: [{ address: OTHER, updatedAt: '2026-04-01T00:00:00.000Z' }],
        removed: [],
      }),
    })
    await persistProjectBookmarks({} as never, ADDR, {} as never)
    const written = JSON.parse(updateRef.mock.calls[0][3] as string) as {
      projects: { address: string }[]
    }
    expect(written.projects.map((row) => row.address).sort()).toEqual([OTHER, ADDR].sort())
  })

  it('copies a nonempty chain ref onto a device with no local list', async () => {
    getUserRef.mockResolvedValue({
      value: `{"version":1,"projects":["${ADDR}"]}`,
    })
    const projects = await hydrateProjectBookmarks({} as never, ADDR)
    expect(projects).toEqual([ADDR])
    expect(isProjectBookmarked(ADDR)).toBe(true)
  })
})
