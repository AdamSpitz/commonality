import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getRuntimeConfigValue } = vi.hoisted(() => ({
  getRuntimeConfigValue: vi.fn(),
}))

vi.mock('../shared', () => ({
  getRuntimeConfigValue,
}))

import { createCoinbaseOnrampSession, getBaseUsdcBalance } from './onrampClient'

describe('onrampClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getRuntimeConfigValue.mockReturnValue('https://platform.example.com/')
  })

  it('creates Coinbase Onramp sessions through the platform API', async () => {
    const session = {
      destinationAddress: '0x1234567890123456789012345678901234567890',
      url: 'https://pay.coinbase.com/buy/select-asset?sessionToken=abc',
    }
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(session),
    } as Response)

    await expect(createCoinbaseOnrampSession({
      address: session.destinationAddress as `0x${string}`,
      presetFiatAmount: '50',
    })).resolves.toEqual(session)

    expect(fetchMock).toHaveBeenCalledWith('https://platform.example.com/onramp/coinbase/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: session.destinationAddress, presetFiatAmount: '50' }),
    })
  })

  it('polls Base USDC balances through the platform API', async () => {
    const balance = {
      address: '0x1234567890123456789012345678901234567890',
      rawBalance: '50000000',
      formattedBalance: '50',
      addressDeployed: false,
    }
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(balance),
    } as Response)

    await expect(getBaseUsdcBalance(balance.address as `0x${string}`)).resolves.toEqual(balance)

    expect(fetchMock).toHaveBeenCalledWith(`https://platform.example.com/onramp/base-usdc-balance?address=${balance.address}`)
  })

  it('reports platform API errors with response bodies', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: () => Promise.resolve('{"error":"temporarily unavailable"}'),
    } as Response)

    await expect(createCoinbaseOnrampSession({
      address: '0x1234567890123456789012345678901234567890',
    })).rejects.toThrow('Coinbase Onramp session creation failed (503): {"error":"temporarily unavailable"}')
  })

  it('fails fast when the platform API URL is not configured', async () => {
    getRuntimeConfigValue.mockReturnValue(undefined)

    await expect(getBaseUsdcBalance('0x1234567890123456789012345678901234567890')).rejects.toThrow(
      'Platform API URL is not configured',
    )
  })
})
