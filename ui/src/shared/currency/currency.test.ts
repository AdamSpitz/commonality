import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadRuntimeConfig } from '../config/runtimeConfig'
import { formatCurrencyAmount, formatCurrencyAmountWithLocalEstimate } from './currency'

const USDC = {
  kind: 'erc20' as const,
  symbol: 'USDC',
  decimals: 6,
  tokenAddress: null,
  tokenType: 0,
}

const ETH = {
  kind: 'native' as const,
  symbol: 'ETH',
  decimals: 18,
  tokenAddress: null,
  tokenType: 0,
}

describe('currency formatting', () => {
  afterEach(async () => {
    vi.unstubAllGlobals()
    await loadRuntimeConfig('/missing-config.json')
  })

  it('keeps the settlement-token amount as the default display', () => {
    expect(formatCurrencyAmount(150_000_000n, USDC)).toBe('150 USDC')
  })

  it('adds a configured local-fiat estimate while keeping the USDC amount visible', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      VITE_LOCAL_FIAT_CURRENCY: 'CAD',
      VITE_LOCAL_FIAT_SYMBOL: 'C$',
      VITE_LOCAL_FIAT_USD_RATE: '1.37',
      VITE_LOCAL_FIAT_RATE_TIMESTAMP: '2026-07-14T09:30:00Z',
    }), { status: 200 })))

    await loadRuntimeConfig('/config.json')

    expect(formatCurrencyAmountWithLocalEstimate(150_000_000n, USDC)).toBe('≈ C$206 (US$150 USDC; FX 2026-07-14)')
  })

  it('does not estimate non-USD settlement currencies', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      VITE_LOCAL_FIAT_CURRENCY: 'CAD',
      VITE_LOCAL_FIAT_USD_RATE: '1.37',
      VITE_LOCAL_FIAT_RATE_TIMESTAMP: '2026-07-14',
    }), { status: 200 })))

    await loadRuntimeConfig('/config.json')

    expect(formatCurrencyAmountWithLocalEstimate(1_000_000_000_000_000_000n, ETH)).toBe('1 ETH')
  })
})
