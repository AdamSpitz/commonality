import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bookmarkProject,
  hydrateProjectBookmarks,
  isProjectBookmarked,
  listProjectBookmarks,
  parseProjectBookmarkDocument,
  unbookmarkProject,
} from './projectBookmarks'

const getUserRef = vi.hoisted(() => vi.fn())

vi.mock('@commonality/sdk/mutable-refs', () => ({
  getUserRef: (...args: unknown[]) => getUserRef(...args),
  updateRef: vi.fn(),
}))

vi.mock('@commonality/sdk/abis', () => ({
  MutableRefUpdaterAbi: [],
}))

vi.mock('./runtimeConfig', () => ({
  getRuntimeConfigValue: () => undefined,
}))

const ADDR = '0x1234567890123456789012345678901234567890'

describe('projectBookmarks', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('parses and lists bookmarked addresses', () => {
    expect(parseProjectBookmarkDocument('{"version":1,"projects":["0x1234567890123456789012345678901234567890"]}').projects).toEqual([ADDR])
    bookmarkProject(ADDR)
    expect(isProjectBookmarked(ADDR)).toBe(true)
    expect(listProjectBookmarks()).toEqual([ADDR])
    unbookmarkProject(ADDR)
    expect(isProjectBookmarked(ADDR)).toBe(false)
  })

  it('does not write a local document when the chain ref is empty', async () => {
    getUserRef.mockResolvedValue({ value: '{"version":1,"projects":[]}' })
    await hydrateProjectBookmarks({} as never, ADDR)
    expect(window.localStorage.getItem('causestarter.bookmarked-projects.v1')).toBeNull()
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
