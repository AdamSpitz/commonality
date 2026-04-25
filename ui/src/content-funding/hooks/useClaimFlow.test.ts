import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useClaimFlow } from './useClaimFlow'

describe('useClaimFlow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('VITE_PLATFORM_API_URL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('initial state', () => {
    it('starts with loading false and error null', () => {
      const { result } = renderHook(() => useClaimFlow())
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('getChallenge', () => {
    it('fetches challenge successfully', async () => {
      const mockResponse = {
        nonce: 'abc123',
        verificationPostTemplate: 'I verify @handle',
        channelId: 'twitter:123',
        handle: 'testuser',
        displayName: 'Test User',
      }
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      let promise: ReturnType<typeof result.current.getChallenge>
      await act(async () => {
        promise = result.current.getChallenge('twitter', 'testuser', '0xabc')
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const data = await promise!
      expect(data).toEqual(mockResponse)
      expect(result.current.error).toBeNull()
    })

    it('sets loading true during fetch', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      nonce: 'abc',
                      verificationPostTemplate: '',
                      channelId: 'x',
                    }),
                }),
              50,
            ),
          ),
      )

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'test', '0xabc')
      })

      expect(result.current.loading).toBe(true)
    })

    it('sets error on HTTP failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Channel not found' }),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'testuser', '0xabc')
      })

      await waitFor(() => {
        expect(result.current.error).toEqual({ message: 'Channel not found' })
      })
      expect(result.current.loading).toBe(false)
    })

    it('sets error with default message when response has no message field', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'testuser', '0xabc')
      })

      await waitFor(() => {
        expect(result.current.error).toEqual({ message: 'Failed to get verification challenge' })
      })
    })

    it('sets error on network failure', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'testuser', '0xabc')
      })

      await waitFor(() => {
        expect(result.current.error).toEqual({ message: 'Network error' })
      })
      expect(result.current.loading).toBe(false)
    })

    it('sets error with fallback message when non-Error is thrown', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce('string error')

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'testuser', '0xabc')
      })

      await waitFor(() => {
        expect(result.current.error).toEqual({ message: 'Failed to get challenge' })
      })
    })

    it('returns null on failure', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'))

      const { result } = renderHook(() => useClaimFlow())

      let promise: ReturnType<typeof result.current.getChallenge>
      await act(async () => {
        promise = result.current.getChallenge('twitter', 'testuser', '0xabc')
      })

      const data = await promise!
      expect(data).toBeNull()
    })

    it('sends correct request payload', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nonce: 'abc',
            verificationPostTemplate: '',
            channelId: 'x',
          }),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('youtube', 'mychannel', '0xdef')
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/verify/challenge'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: 'youtube',
            handle: 'mychannel',
            claimantAddress: '0xdef',
          }),
        }),
      )
    })

    it('clears previous error before starting', async () => {
      vi.spyOn(global, 'fetch')
        .mockRejectedValueOnce(new Error('first error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              nonce: 'abc',
              verificationPostTemplate: '',
              channelId: 'x',
            }),
        })

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'test', '0xabc')
      })

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      await act(async () => {
        result.current.getChallenge('twitter', 'test', '0xabc')
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('confirmVerification', () => {
    it('confirms verification successfully', async () => {
      const mockResponse = {
        proof: {
          channelId: 'twitter:123',
          claimant: '0xabc',
          nonce: 'abc123',
          deadline: '2026-01-01',
          verifierSignature: 'sig',
        },
        txHash: '0xtx',
        observedPostId: 'post123',
      }
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      let promise: ReturnType<typeof result.current.confirmVerification>
      await act(async () => {
        promise = result.current.confirmVerification('abc123')
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const data = await promise!
      expect(data).toEqual(mockResponse)
      expect(result.current.error).toBeNull()
    })

    it('sets error on HTTP failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Invalid nonce' }),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.confirmVerification('abc123')
      })

      await waitFor(() => {
        expect(result.current.error).toEqual({ message: 'Invalid nonce' })
      })
      expect(result.current.loading).toBe(false)
    })

    it('sets error on network failure', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.confirmVerification('abc123')
      })

      await waitFor(() => {
        expect(result.current.error).toEqual({ message: 'Network error' })
      })
    })

    it('returns null on failure', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'))

      const { result } = renderHook(() => useClaimFlow())

      let promise: ReturnType<typeof result.current.confirmVerification>
      await act(async () => {
        promise = result.current.confirmVerification('abc123')
      })

      const data = await promise!
      expect(data).toBeNull()
    })

    it('sends correct request payload', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            proof: { channelId: 'x', claimant: '0x', nonce: 'abc', deadline: 'd', verifierSignature: 's' },
            observedPostId: 'p',
          }),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.confirmVerification('abc123')
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/verify/confirm'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nonce: 'abc123' }),
        }),
      )
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('test error'))

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'test', '0xabc')
      })

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('base URL', () => {
    it('uses env variable when set', async () => {
      vi.stubEnv('VITE_PLATFORM_API_URL', 'https://custom-api.example.com')

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nonce: 'abc',
            verificationPostTemplate: '',
            channelId: 'x',
          }),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'test', '0xabc')
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://custom-api.example.com/verify/challenge',
        expect.any(Object),
      )
    })

    it('uses localhost default when env not set', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            nonce: 'abc',
            verificationPostTemplate: '',
            channelId: 'x',
          }),
      } as Response)

      const { result } = renderHook(() => useClaimFlow())

      await act(async () => {
        result.current.getChallenge('twitter', 'test', '0xabc')
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:3001/verify/challenge',
        expect.any(Object),
      )
    })
  })
})
