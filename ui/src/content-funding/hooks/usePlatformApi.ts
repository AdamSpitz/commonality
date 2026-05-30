import { useState, useCallback, useEffect, useRef } from 'react'

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

interface ContentSubmission {
  contentUrl: string
  statementCid: string
  declaredPerspective?: string
}

function isPlatformApiError(value: unknown): value is PlatformApiError {
  if (!value || typeof value !== 'object') return false
  const maybeError = value as Partial<PlatformApiError>
  return typeof maybeError.code === 'string' && typeof maybeError.message === 'string'
}

function normalizePlatformApiError(value: unknown): PlatformApiError {
  if (isPlatformApiError(value)) return value
  if (value instanceof Error && value.message) {
    return { code: 'network_error', message: `Platform API request failed: ${value.message}` }
  }
  return { code: 'unknown', message: 'Platform API request failed' }
}

interface UsePlatformApiResult {
  resolveChannel: (platform: string, handle: string) => Promise<ResolvedChannel>
  resolveContent: (url: string) => Promise<ResolvedContent>
  submitContentSubmission: (submission: ContentSubmission) => Promise<ContentSubmission>
  isLoading: boolean
  error: PlatformApiError | null
  clearError: () => void
}

export function usePlatformApi(): UsePlatformApiResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<PlatformApiError | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const safeSetIsLoading = useCallback((value: boolean) => {
    if (mountedRef.current) setIsLoading(value)
  }, [])

  const safeSetError = useCallback((value: PlatformApiError | null) => {
    if (mountedRef.current) setError(value)
  }, [])

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
    safeSetIsLoading(true)
    safeSetError(null)
    try {
      const response = await fetch(`${getBaseUrl()}/resolve/channel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, handle }),
      })
      const result = await handleResponse<ResolvedChannel>(response)
      return result
    } catch (err) {
      const error = normalizePlatformApiError(err)
      safeSetError(error)
      throw error
    } finally {
      safeSetIsLoading(false)
    }
  }, [getBaseUrl, handleResponse, safeSetError, safeSetIsLoading])

  const resolveContent = useCallback(async (url: string): Promise<ResolvedContent> => {
    safeSetIsLoading(true)
    safeSetError(null)
    try {
      const response = await fetch(`${getBaseUrl()}/resolve/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const result = await handleResponse<ResolvedContent>(response)
      return result
    } catch (err) {
      const error = normalizePlatformApiError(err)
      safeSetError(error)
      throw error
    } finally {
      safeSetIsLoading(false)
    }
  }, [getBaseUrl, handleResponse, safeSetError, safeSetIsLoading])

  const submitContentSubmission = useCallback(async (
    submission: ContentSubmission,
  ): Promise<ContentSubmission> => {
    safeSetIsLoading(true)
    safeSetError(null)
    try {
      const response = await fetch(`${getBaseUrl()}/content-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      })
      const result = await handleResponse<ContentSubmission>(response)
      return result
    } catch (err) {
      const error = normalizePlatformApiError(err)
      safeSetError(error)
      throw error
    } finally {
      safeSetIsLoading(false)
    }
  }, [getBaseUrl, handleResponse, safeSetError, safeSetIsLoading])

  const clearError = useCallback(() => {
    safeSetError(null)
  }, [safeSetError])

  return { resolveChannel, resolveContent, submitContentSubmission, isLoading, error, clearError }
}
