import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePlatformApi } from './usePlatformApi'

describe('usePlatformApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('VITE_PLATFORM_API_URL', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('initial state', () => {
    it('starts with isLoading false and error null', () => {
      const { result } = renderHook(() => usePlatformApi())
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('resolveChannel', () => {
    it('resolves a channel successfully', async () => {
      const mockResponse = {
        channelId: 'twitter:123',
        handle: 'testuser',
        displayName: 'Test User',
      }
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      let promise: ReturnType<typeof result.current.resolveChannel>
      await act(async () => {
        promise = result.current.resolveChannel('twitter', 'testuser')
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
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
                  json: () => Promise.resolve({ channelId: 'x' }),
                } as Response),
              50,
            ),
          ),
      )

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        result.current.resolveChannel('twitter', 'test')
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('throws and sets error on HTTP failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ code: 'channel_not_found', message: 'Channel not found' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        try {
          await result.current.resolveChannel('twitter', 'nonexistent')
        } catch {
          // expected
        }
      })

      expect(result.current.error).toEqual({ code: 'channel_not_found', message: 'Channel not found' })
    })

    it('normalizes network failures when the platform API is unavailable', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        try {
          await result.current.resolveChannel('twitter', 'offline')
        } catch (error) {
          expect(error).toEqual({
            code: 'network_error',
            message: 'Platform API request failed: Failed to fetch',
          })
        }
      })

      expect(result.current.error).toEqual({
        code: 'network_error',
        message: 'Platform API request failed: Failed to fetch',
      })
    })

    it('uses fallback error when response body is not valid JSON', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await expect(
        act(async () => {
          await result.current.resolveChannel('twitter', 'test')
        }),
      ).rejects.toEqual({ code: 'unknown', message: 'Internal Server Error' })
    })

    it('sends correct request payload', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ channelId: 'x' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        result.current.resolveChannel('youtube', 'mychannel')
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/resolve/channel'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'youtube', handle: 'mychannel' }),
        }),
      )
    })

    it('throws a safe error when a successful channel response is malformed', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ handle: 'missing channel id' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        await expect(result.current.resolveChannel('twitter', 'broken')).rejects.toEqual({
          code: 'malformed_response',
          message: 'Platform API returned malformed channel response',
        })
      })

      expect(result.current.error).toEqual({
        code: 'malformed_response',
        message: 'Platform API returned malformed channel response',
      })
    })
  })

  describe('resolveContent', () => {
    it('resolves content successfully', async () => {
      const mockResponse = {
        platform: 'twitter',
        channelId: 'twitter:123',
        contentSuffix: 'status/456',
        canonicalId: 'twitter:123:status/456',
        metadata: {},
      }
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      let promise: ReturnType<typeof result.current.resolveContent>
      await act(async () => {
        promise = result.current.resolveContent('https://twitter.com/user/status/456')
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const data = await promise!
      expect(data).toEqual(mockResponse)
    })

    it('throws on HTTP failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ code: 'invalid_url', message: 'Invalid URL' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await expect(
        act(async () => {
          await result.current.resolveContent('not-a-url')
        }),
      ).rejects.toEqual({ code: 'invalid_url', message: 'Invalid URL' })
    })

    it('sends correct request payload', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          platform: 'youtube',
          channelId: 'youtube:channel:abc',
          contentSuffix: 'watch/abc',
          canonicalId: 'youtube:channel:abc:watch/abc',
          metadata: {},
        }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        result.current.resolveContent('https://youtube.com/watch?v=abc')
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/resolve/content'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://youtube.com/watch?v=abc' }),
        }),
      )
    })

    it('throws a safe error when a successful content response is malformed', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ canonicalId: 'missing required fields' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        await expect(result.current.resolveContent('https://x.com/alice/status/broken')).rejects.toEqual({
          code: 'malformed_response',
          message: 'Platform API returned malformed content response',
        })
      })

      expect(result.current.error).toEqual({
        code: 'malformed_response',
        message: 'Platform API returned malformed content response',
      })
    })
  })

  describe('submitContentSubmission', () => {
    it('submits content successfully', async () => {
      const mockResponse = {
        contentUrl: 'https://twitter.com/user/status/456',
        statementCid: 'bafy123',
        declaredPerspective: 'supportive',
      }
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      let promise: ReturnType<typeof result.current.submitContentSubmission>
      await act(async () => {
        promise = result.current.submitContentSubmission({
          contentUrl: 'https://twitter.com/user/status/456',
          statementCid: 'bafy123',
          declaredPerspective: 'supportive',
        })
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const data = await promise!
      expect(data).toEqual(mockResponse)
    })

    it('throws on HTTP failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: () => Promise.resolve({ code: 'submission_failed', message: 'Submission failed' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await expect(
        act(async () => {
          await result.current.submitContentSubmission({
            contentUrl: 'https://twitter.com/user/status/456',
            statementCid: 'bafy123',
          })
        }),
      ).rejects.toEqual({ code: 'submission_failed', message: 'Submission failed' })
    })

    it('sends correct request payload', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contentUrl: 'x', statementCid: 'y' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        result.current.submitContentSubmission({
          contentUrl: 'https://twitter.com/x',
          statementCid: 'bafy456',
          declaredPerspective: 'opposing',
        })
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/content-submission'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentUrl: 'https://twitter.com/x',
            statementCid: 'bafy456',
            declaredPerspective: 'opposing',
          }),
        }),
      )
    })

    it('throws a safe error when a successful content-submission response is malformed', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ queued: true }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        await expect(result.current.submitContentSubmission({
          contentUrl: 'https://twitter.com/x',
          statementCid: 'bafy456',
        })).rejects.toEqual({
          code: 'malformed_response',
          message: 'Platform API returned malformed content-submission response',
        })
      })

      expect(result.current.error).toEqual({
        code: 'malformed_response',
        message: 'Platform API returned malformed content-submission response',
      })
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
        json: () => Promise.resolve({ code: 'err', message: 'test' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        try {
          await result.current.resolveChannel('twitter', 'test')
        } catch {
          // expected
        }
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
        json: () => Promise.resolve({ channelId: 'x' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        result.current.resolveChannel('twitter', 'test')
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://custom-api.example.com/resolve/channel',
        expect.any(Object),
      )
    })

    it('uses localhost default when env not set', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ channelId: 'x' }),
      } as Response)

      const { result } = renderHook(() => usePlatformApi())

      await act(async () => {
        result.current.resolveChannel('twitter', 'test')
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:3001/resolve/channel',
        expect.any(Object),
      )
    })
  })
})
