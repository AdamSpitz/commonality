import { useState, useCallback } from 'react'

interface ResolvedChannel {
  channelId: string
  handle?: string
  displayName?: string
}

interface ResolvedContent {
  platform: string
  channelId: string
  contentSuffix: string
  canonicalId: string
  metadata: Record<string, unknown>
}

interface PlatformApiError {
  code: string
  message: string
}

interface UsePlatformApiResult {
  resolveChannel: (platform: string, handle: string) => Promise<ResolvedChannel>
  resolveContent: (url: string) => Promise<ResolvedContent>
  isLoading: boolean
  error: PlatformApiError | null
  clearError: () => void
}

export function usePlatformApi(): UsePlatformApiResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<PlatformApiError | null>(null)

  const getBaseUrl = useCallback(() => {
    return import.meta.env.VITE_PLATFORM_API_URL || 'http://localhost:3001'
  }, [])

  const handleResponse = useCallback(async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
      const body = await response.json().catch(() => ({ code: 'unknown', message: response.statusText }))
      throw { code: body.code || 'unknown', message: body.message || response.statusText }
    }
    return response.json()
  }, [])

  const resolveChannel = useCallback(async (platform: string, handle: string): Promise<ResolvedChannel> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${getBaseUrl()}/resolve/channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, handle }),
      })
      const result = await handleResponse<ResolvedChannel>(response)
      return result
    } catch (err) {
      const error = err as PlatformApiError
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [getBaseUrl, handleResponse])

  const resolveContent = useCallback(async (url: string): Promise<ResolvedContent> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`${getBaseUrl()}/resolve/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const result = await handleResponse<ResolvedContent>(response)
      return result
    } catch (err) {
      const error = err as PlatformApiError
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [getBaseUrl, handleResponse])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { resolveChannel, resolveContent, isLoading, error, clearError }
}