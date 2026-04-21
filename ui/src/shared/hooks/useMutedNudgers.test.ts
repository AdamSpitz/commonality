import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMutedNudgers, MUTED_NUDGERS_KEY } from './useMutedNudgers'

describe('useMutedNudgers', () => {
  const ADDR1 = '0xaabbccddaabbccddaabbccddaabbccddaabbccdd'
  const ADDR2 = '0x1234567890123456789012345678901234567890'

  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadMutedNudgers', () => {
    it('returns empty array when nothing is stored', () => {
      const { result } = renderHook(() => useMutedNudgers())
      expect(result.current.mutedNudgers).toEqual([])
    })

    it('loads muted nudgers from localStorage', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify([ADDR1, ADDR2]))
      const { result } = renderHook(() => useMutedNudgers())
      expect(result.current.mutedNudgers).toEqual([ADDR1.toLowerCase(), ADDR2.toLowerCase()])
    })

    it('normalizes addresses to lowercase on load', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify(['0xAABBCCDDAABBCCDDAABBCCDDAABBCCDDAABBCCDD']))
      const { result } = renderHook(() => useMutedNudgers())
      expect(result.current.mutedNudgers).toEqual([ADDR1.toLowerCase()])
    })

    it('returns empty array for corrupted localStorage', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, '{not valid json')
      const { result } = renderHook(() => useMutedNudgers())
      expect(result.current.mutedNudgers).toEqual([])
    })

    it('returns empty array for non-array JSON', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify({ address: ADDR1 }))
      const { result } = renderHook(() => useMutedNudgers())
      expect(result.current.mutedNudgers).toEqual([])
    })
  })

  describe('muteNudger', () => {
    it('adds a nudger to the muted list', () => {
      const { result } = renderHook(() => useMutedNudgers())
      act(() => {
        result.current.muteNudger(ADDR1)
      })
      expect(result.current.mutedNudgers).toContain(ADDR1.toLowerCase())
    })

    it('normalizes address to lowercase', () => {
      const { result } = renderHook(() => useMutedNudgers())
      act(() => {
        result.current.muteNudger('0xAABBCCDDAABBCCDDAABBCCDDAABBCCDDAABBCCDD')
      })
      expect(result.current.mutedNudgers).toContain(ADDR1.toLowerCase())
    })

    it('does not add duplicates', () => {
      const { result } = renderHook(() => useMutedNudgers())
      act(() => {
        result.current.muteNudger(ADDR1)
        result.current.muteNudger(ADDR1)
      })
      expect(result.current.mutedNudgers.filter((a) => a === ADDR1.toLowerCase())).toHaveLength(1)
    })

    it('persists to localStorage', () => {
      const { result } = renderHook(() => useMutedNudgers())
      act(() => {
        result.current.muteNudger(ADDR1)
      })
      const stored = JSON.parse(localStorage.getItem(MUTED_NUDGERS_KEY)!)
      expect(stored).toEqual([ADDR1.toLowerCase()])
    })

    it('ignores empty addresses', () => {
      const { result } = renderHook(() => useMutedNudgers())
      act(() => {
        result.current.muteNudger('')
        result.current.muteNudger('   ')
      })
      expect(result.current.mutedNudgers).toEqual([])
    })
  })

  describe('unmuteNudger', () => {
    it('removes a nudger from the muted list', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify([ADDR1, ADDR2]))
      const { result } = renderHook(() => useMutedNudgers())
      act(() => {
        result.current.unmuteNudger(ADDR1)
      })
      expect(result.current.mutedNudgers).not.toContain(ADDR1.toLowerCase())
      expect(result.current.mutedNudgers).toContain(ADDR2.toLowerCase())
    })

    it('persists removal to localStorage', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify([ADDR1, ADDR2]))
      const { result } = renderHook(() => useMutedNudgers())
      act(() => {
        result.current.unmuteNudger(ADDR1)
      })
      const stored = JSON.parse(localStorage.getItem(MUTED_NUDGERS_KEY)!)
      expect(stored).toEqual([ADDR2.toLowerCase()])
    })
  })

  describe('isMuted', () => {
    it('returns true for muted nudgers', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify([ADDR1]))
      const { result } = renderHook(() => useMutedNudgers())
      expect(result.current.isMuted(ADDR1)).toBe(true)
    })

    it('returns false for unmuted nudgers', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify([ADDR1]))
      const { result } = renderHook(() => useMutedNudgers())
      expect(result.current.isMuted(ADDR2)).toBe(false)
    })

    it('is case-insensitive', () => {
      localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify([ADDR1]))
      const { result } = renderHook(() => useMutedNudgers())
      expect(result.current.isMuted('0xAABBCCDDAABBCCDDAABBCCDDAABBCCDDAABBCCDD')).toBe(true)
    })
  })
})
