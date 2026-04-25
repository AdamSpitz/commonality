import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  useTrustedAttesters,
  loadTrustedAttesters,
  saveTrustedAttesters,
  TRUSTED_ATTESTERS_KEY,
} from './useTrustedAttesters'

const ADDR1 = '0xaabbccddaabbccddaabbccddaabbccddaabbccdd'
const ADDR2 = '0x1234567890123456789012345678901234567890'

describe('useTrustedAttesters', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_DEFAULT_TRUSTED_ATTESTERS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('loadTrustedAttesters', () => {
    it('returns empty array when nothing is stored and no env default', () => {
      expect(loadTrustedAttesters()).toEqual([])
    })

    it('loads attesters from localStorage', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([ADDR1, ADDR2]))
      expect(loadTrustedAttesters()).toEqual([ADDR1, ADDR2])
    })

    it('filters out invalid addresses from localStorage', () => {
      localStorage.setItem(
        TRUSTED_ATTESTERS_KEY,
        JSON.stringify([ADDR1, 'not-an-address', '0xshort', ADDR2]),
      )
      expect(loadTrustedAttesters()).toEqual([ADDR1, ADDR2])
    })

    it('returns empty array for corrupted localStorage', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, '{not valid json')
      expect(loadTrustedAttesters()).toEqual([])
    })

    it('returns empty array for non-array JSON', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify({ address: ADDR1 }))
      expect(loadTrustedAttesters()).toEqual([])
    })

    it('falls back to env default when localStorage is empty', () => {
      vi.stubEnv('VITE_DEFAULT_TRUSTED_ATTESTERS', `${ADDR1}, ${ADDR2}`)
      expect(loadTrustedAttesters()).toEqual([ADDR1, ADDR2])
    })

    it('filters invalid addresses from env default', () => {
      vi.stubEnv('VITE_DEFAULT_TRUSTED_ATTESTERS', `${ADDR1}, not-an-address, ${ADDR2}`)
      expect(loadTrustedAttesters()).toEqual([ADDR1, ADDR2])
    })

    it('ignores env default when it is empty string', () => {
      vi.stubEnv('VITE_DEFAULT_TRUSTED_ATTESTERS', '')
      expect(loadTrustedAttesters()).toEqual([])
    })

    it('ignores env default when it is whitespace only', () => {
      vi.stubEnv('VITE_DEFAULT_TRUSTED_ATTESTERS', '   ')
      expect(loadTrustedAttesters()).toEqual([])
    })

    it('prefers localStorage over env default', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([ADDR1]))
      vi.stubEnv('VITE_DEFAULT_TRUSTED_ATTESTERS', ADDR2)
      expect(loadTrustedAttesters()).toEqual([ADDR1])
    })
  })

  describe('saveTrustedAttesters', () => {
    it('stores attesters to localStorage', () => {
      saveTrustedAttesters([ADDR1, ADDR2])
      const stored = JSON.parse(localStorage.getItem(TRUSTED_ATTESTERS_KEY)!)
      expect(stored).toEqual([ADDR1, ADDR2])
    })

    it('overwrites existing value', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([ADDR1]))
      saveTrustedAttesters([ADDR2])
      const stored = JSON.parse(localStorage.getItem(TRUSTED_ATTESTERS_KEY)!)
      expect(stored).toEqual([ADDR2])
    })

    it('stores empty array', () => {
      saveTrustedAttesters([])
      const stored = JSON.parse(localStorage.getItem(TRUSTED_ATTESTERS_KEY)!)
      expect(stored).toEqual([])
    })
  })

  describe('useTrustedAttesters hook', () => {
    it('returns attesters from localStorage on mount', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([ADDR1, ADDR2]))
      const { result } = renderHook(() => useTrustedAttesters())
      expect(result.current).toEqual([ADDR1, ADDR2])
    })

    it('returns empty array when nothing stored', () => {
      const { result } = renderHook(() => useTrustedAttesters())
      expect(result.current).toEqual([])
    })
  })
})
