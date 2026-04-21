import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useMutedTopics, MUTED_TOPICS_KEY } from './useMutedTopics'

describe('useMutedTopics', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with empty muted topics', () => {
    const { result } = renderHook(() => useMutedTopics())
    expect(result.current.mutedTopics).toEqual([])
  })

  it('loads muted topics from localStorage', () => {
    localStorage.setItem(MUTED_TOPICS_KEY, JSON.stringify(['crypto', 'education']))
    const { result } = renderHook(() => useMutedTopics())
    expect(result.current.mutedTopics).toEqual(['crypto', 'education'])
  })

  it('adds a topic', () => {
    const { result } = renderHook(() => useMutedTopics())
    act(() => {
      result.current.addTopic('crypto')
    })
    expect(result.current.mutedTopics).toEqual(['crypto'])
    expect(JSON.parse(localStorage.getItem(MUTED_TOPICS_KEY)!)).toEqual(['crypto'])
  })

  it('removes a topic', () => {
    localStorage.setItem(MUTED_TOPICS_KEY, JSON.stringify(['crypto', 'education']))
    const { result } = renderHook(() => useMutedTopics())
    act(() => {
      result.current.removeTopic('crypto')
    })
    expect(result.current.mutedTopics).toEqual(['education'])
  })

  it('normalizes topics to lowercase', () => {
    const { result } = renderHook(() => useMutedTopics())
    act(() => {
      result.current.addTopic('Crypto')
    })
    expect(result.current.mutedTopics).toEqual(['crypto'])
  })

  it('does not add duplicate topics', () => {
    const { result } = renderHook(() => useMutedTopics())
    act(() => {
      result.current.addTopic('crypto')
      result.current.addTopic('Crypto')
    })
    expect(result.current.mutedTopics).toEqual(['crypto'])
  })

  it('ignores empty topic strings', () => {
    const { result } = renderHook(() => useMutedTopics())
    act(() => {
      result.current.addTopic('')
      result.current.addTopic('   ')
    })
    expect(result.current.mutedTopics).toEqual([])
  })

  it('trims whitespace from topics', () => {
    const { result } = renderHook(() => useMutedTopics())
    act(() => {
      result.current.addTopic('  crypto  ')
    })
    expect(result.current.mutedTopics).toEqual(['crypto'])
  })
})
