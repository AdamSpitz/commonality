import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DISCOVERY_LEVEL_STORAGE_KEY,
  readStoredDiscoveryLevel,
  useDiscoveryLevel,
  writeStoredDiscoveryLevel,
} from './useDiscoveryLevel'

afterEach(() => {
  window.localStorage.removeItem(DISCOVERY_LEVEL_STORAGE_KEY)
})

describe('useDiscoveryLevel', () => {
  it('defaults to My network when nothing is stored', () => {
    const { result } = renderHook(() => useDiscoveryLevel())
    expect(result.current[0]).toBe('network')
    expect(readStoredDiscoveryLevel()).toBe('network')
  })

  it('reads a stored level', () => {
    window.localStorage.setItem(DISCOVERY_LEVEL_STORAGE_KEY, 'anyone')
    const { result } = renderHook(() => useDiscoveryLevel())
    expect(result.current[0]).toBe('anyone')
  })

  it('ignores unknown stored values', () => {
    window.localStorage.setItem(DISCOVERY_LEVEL_STORAGE_KEY, 'nope')
    expect(readStoredDiscoveryLevel()).toBe('network')
  })

  it('persists a change and notifies other hook instances', () => {
    const a = renderHook(() => useDiscoveryLevel())
    const b = renderHook(() => useDiscoveryLevel())

    act(() => {
      a.result.current[1]('one-hop')
    })

    expect(window.localStorage.getItem(DISCOVERY_LEVEL_STORAGE_KEY)).toBe('one-hop')
    expect(a.result.current[0]).toBe('one-hop')
    expect(b.result.current[0]).toBe('one-hop')
  })

  it('writeStoredDiscoveryLevel updates subscribers', () => {
    const { result } = renderHook(() => useDiscoveryLevel())
    act(() => {
      writeStoredDiscoveryLevel('anyone')
    })
    expect(result.current[0]).toBe('anyone')
  })
})
