import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAllowedPaymentTokens } from './useAllowedPaymentTokens'

const TOKEN = '0x1111111111111111111111111111111111111111'
vi.mock('../config/runtimeConfig', () => ({
  getRuntimeConfig: () => ({
    VITE_PAYMENT_TOKEN_ADDRESS: '0x1111111111111111111111111111111111111111',
    VITE_PAYMENT_TOKEN_REGISTRY_ADDRESS: '0x2222222222222222222222222222222222222222',
  }),
}))

describe('useAllowedPaymentTokens', () => {
  it('keeps an empty registry empty even when a default token is configured', async () => {
    const client = { readContract: vi.fn().mockResolvedValue(0n) }
    const { result } = renderHook(() => useAllowedPaymentTokens(client))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tokens).toEqual([])
  })

  it('excludes disallowed default tokens and deduplicates historical entries', async () => {
    const client = { readContract: vi.fn(async ({ functionName }: { functionName: string }): Promise<unknown> => {
      if (functionName === 'tokenCount') return 2n
      if (functionName === 'tokenAt') return TOKEN
      return true
    }) }
    const { result } = renderHook(() => useAllowedPaymentTokens(client))
    await waitFor(() => expect(result.current.tokens).toEqual([{ address: TOKEN }]))
    client.readContract.mockImplementation(async ({ functionName }) => {
      if (functionName === 'tokenCount') return 1n
      if (functionName === 'tokenAt') return TOKEN
      return false
    })
    const nextClient = { readContract: client.readContract }
    const next = renderHook(() => useAllowedPaymentTokens(nextClient))
    await waitFor(() => expect(next.result.current.loading).toBe(false))
    expect(next.result.current.tokens).toEqual([])
  })
})
