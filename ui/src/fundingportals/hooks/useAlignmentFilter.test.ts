import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ALIGNMENT_FILTER_STORAGE_KEY,
  readStoredAlignmentFilter,
  useAlignmentFilter,
  writeStoredAlignmentFilter,
} from './useAlignmentFilter'

afterEach(() => {
  window.localStorage.removeItem(ALIGNMENT_FILTER_STORAGE_KEY)
})

describe('useAlignmentFilter', () => {
  it('defaults to All when nothing is stored', () => {
    const { result } = renderHook(() => useAlignmentFilter())
    expect(result.current[0]).toBe('all')
    expect(readStoredAlignmentFilter()).toBe('all')
  })

  it('reads a stored filter', () => {
    window.localStorage.setItem(ALIGNMENT_FILTER_STORAGE_KEY, 'direct')
    const { result } = renderHook(() => useAlignmentFilter())
    expect(result.current[0]).toBe('direct')
  })

  it('ignores unknown stored values, including the retired Indirect option', () => {
    window.localStorage.setItem(ALIGNMENT_FILTER_STORAGE_KEY, 'indirect')
    expect(readStoredAlignmentFilter()).toBe('all')
  })

  it('persists a change and notifies other hook instances', () => {
    const a = renderHook(() => useAlignmentFilter())
    const b = renderHook(() => useAlignmentFilter())

    act(() => {
      a.result.current[1]('direct')
    })

    expect(window.localStorage.getItem(ALIGNMENT_FILTER_STORAGE_KEY)).toBe('direct')
    expect(a.result.current[0]).toBe('direct')
    expect(b.result.current[0]).toBe('direct')
  })

  it('writeStoredAlignmentFilter updates subscribers', () => {
    const { result } = renderHook(() => useAlignmentFilter())
    act(() => {
      writeStoredAlignmentFilter('direct')
    })
    expect(result.current[0]).toBe('direct')
  })
})
