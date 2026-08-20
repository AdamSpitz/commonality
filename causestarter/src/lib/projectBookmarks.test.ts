import { beforeEach, describe, expect, it } from 'vitest'
import {
  bookmarkProject,
  isProjectBookmarked,
  listProjectBookmarks,
  parseProjectBookmarkDocument,
  unbookmarkProject,
} from './projectBookmarks'

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
})
