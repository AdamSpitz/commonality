import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadTwitterHandleHint, saveTwitterHandleHint } from './twitterHandleHints'

const STORAGE_KEY = 'commonality:twitterHandleHints'

describe('twitterHandleHints', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('loadTwitterHandleHint', () => {
    it('returns null when no hints are stored', () => {
      expect(loadTwitterHandleHint('0xABC')).toBeNull()
    })

    it('returns null when the address has no hint', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        '0xother': '@otheruser',
      }))
      expect(loadTwitterHandleHint('0xABC')).toBeNull()
    })

    it('returns the hint for a matching address', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        '0xabc': '@alice',
      }))
      expect(loadTwitterHandleHint('0xABC')).toBe('@alice')
    })

    it('normalizes address to lowercase for lookup', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        '0xabc': '@bob',
      }))
      expect(loadTwitterHandleHint('0xABC')).toBe('@bob')
      expect(loadTwitterHandleHint('0xabc')).toBe('@bob')
    })

    it('returns null when localStorage contains invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not json')
      expect(loadTwitterHandleHint('0xABC')).toBeNull()
    })

    it('returns null when localStorage contains a non-object value', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(['array']))
      expect(loadTwitterHandleHint('0xABC')).toBeNull()
    })
  })

  describe('saveTwitterHandleHint', () => {
    it('stores a hint for an address', () => {
      saveTwitterHandleHint('0xABC', '@alice')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored['0xabc']).toBe('@alice')
    })

    it('normalizes address to lowercase', () => {
      saveTwitterHandleHint('0xABC', '@alice')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored['0xabc']).toBe('@alice')
      expect(stored['0xABC']).toBeUndefined()
    })

    it('adds @ prefix if handle does not have one', () => {
      saveTwitterHandleHint('0xABC', 'alice')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored['0xabc']).toBe('@alice')
    })

    it('does not double-prefix @ if handle already has one', () => {
      saveTwitterHandleHint('0xABC', '@alice')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored['0xabc']).toBe('@alice')
    })

    it('trims whitespace from handle', () => {
      saveTwitterHandleHint('0xABC', '  @alice  ')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored['0xabc']).toBe('@alice')
    })

    it('preserves existing hints when adding a new one', () => {
      saveTwitterHandleHint('0xAAA', '@alice')
      saveTwitterHandleHint('0xBBB', '@bob')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored['0xaaa']).toBe('@alice')
      expect(stored['0xbbb']).toBe('@bob')
    })

    it('overwrites existing hint for the same address', () => {
      saveTwitterHandleHint('0xABC', '@alice')
      saveTwitterHandleHint('0xABC', '@bob')
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored['0xabc']).toBe('@bob')
    })
  })
})
