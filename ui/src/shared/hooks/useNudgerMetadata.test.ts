import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNudgerMetadata } from './useNudgerMetadata'

describe('useNudgerMetadata', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null when serviceUrl is null', () => {
    const { result } = renderHook(() => useNudgerMetadata(null))
    expect(result.current).toBeNull()
  })

  it('returns null when serviceUrl is empty string', () => {
    const { result } = renderHook(() => useNudgerMetadata(''))
    expect(result.current).toBeNull()
  })

  it('fetches nudger metadata successfully', async () => {
    const mockData = {
      address: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd',
      name: 'Test Nudger',
      description: 'A test nudger',
      sourceType: 'twitter',
      version: '1.0.0',
    }
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const { result } = renderHook(() => useNudgerMetadata('https://example.com'))

    await waitFor(() => {
      expect(result.current).toEqual(mockData)
    })
  })

  it('applies default values for missing fields', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ address: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd' }),
    } as Response)

    const { result } = renderHook(() => useNudgerMetadata('https://example.com'))

    await waitFor(() => {
      expect(result.current).toEqual({
        address: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd',
        name: 'Unknown Nudger',
        description: '',
        sourceType: 'unknown',
        version: '0.0.0',
      })
    })
  })

  it('returns null on HTTP error response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { result } = renderHook(() => useNudgerMetadata('https://example.com'))

    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })

  it('returns null on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useNudgerMetadata('https://example.com'))

    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })

  it('returns null on malformed JSON', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    } as Response)

    const { result } = renderHook(() => useNudgerMetadata('https://example.com'))

    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })

  it('strips trailing slashes from serviceUrl', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          address: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd',
          name: 'Test',
          description: '',
          sourceType: 'twitter',
          version: '1.0.0',
        }),
    } as Response)

    renderHook(() => useNudgerMetadata('https://example.com///'))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://example.com/.well-known/nudger.json',
        expect.any(Object),
      )
    })
  })

  it('updates metadata when serviceUrl changes', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            address: '0xaabbccddaabbccddaabbccddaabbccddaabbccdd',
            name: 'First Nudger',
            description: '',
            sourceType: 'twitter',
            version: '1.0.0',
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            address: '0x1234567890123456789012345678901234567890',
            name: 'Second Nudger',
            description: '',
            sourceType: 'youtube',
            version: '2.0.0',
          }),
      } as Response)

    const { result, rerender } = renderHook(
      ({ url }) => useNudgerMetadata(url),
      { initialProps: { url: 'https://first.com' } },
    )

    await waitFor(() => {
      expect(result.current?.name).toBe('First Nudger')
    })

    rerender({ url: 'https://second.com' })

    await waitFor(() => {
      expect(result.current?.name).toBe('Second Nudger')
    })
  })
})
