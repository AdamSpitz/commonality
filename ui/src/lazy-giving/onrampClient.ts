import { getRuntimeConfigValue } from '../shared'

export interface CoinbaseOnrampSession {
  destinationAddress: `0x${string}`
  url: string
}

export interface BaseUsdcBalance {
  address: `0x${string}`
  rawBalance: string
  formattedBalance: string
  addressDeployed: boolean
}

export interface CreateCoinbaseOnrampSessionRequest {
  address: `0x${string}`
  presetFiatAmount?: string
  fiatCurrency?: string
}

export async function createCoinbaseOnrampSession(request: CreateCoinbaseOnrampSessionRequest): Promise<CoinbaseOnrampSession> {
  const response = await fetch(`${getPlatformApiUrl()}/onramp/coinbase/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(removeUndefinedValues(request)),
  })

  return parseJsonResponse<CoinbaseOnrampSession>(response, 'Coinbase Onramp session creation failed')
}

export async function getBaseUsdcBalance(address: `0x${string}`): Promise<BaseUsdcBalance> {
  const params = new URLSearchParams({ address })
  const response = await fetch(`${getPlatformApiUrl()}/onramp/base-usdc-balance?${params.toString()}`)

  return parseJsonResponse<BaseUsdcBalance>(response, 'Base USDC balance check failed')
}

function getPlatformApiUrl(): string {
  const platformApiUrl = getRuntimeConfigValue('VITE_PLATFORM_API_URL')
  if (!platformApiUrl) {
    throw new Error('Platform API URL is not configured. Set VITE_PLATFORM_API_URL to enable card/on-ramp contributions.')
  }
  return platformApiUrl.replace(/\/+$/, '')
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${fallbackMessage} (${response.status}): ${body || response.statusText}`)
  }
  return await response.json() as T
}

function removeUndefinedValues<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T
}
