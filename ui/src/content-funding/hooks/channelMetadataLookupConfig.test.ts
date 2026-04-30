import { describe, expect, it } from 'vitest'
import { resolveChannelMetadataLookupConfig } from './useContentFundingState'

describe('resolveChannelMetadataLookupConfig', () => {
  it('allows channel metadata lookup to be disabled in local environments', () => {
    expect(resolveChannelMetadataLookupConfig({ COMMONALITY_ENVIRONMENT: 'local' })).toEqual({
      enabled: false,
      baseUrl: 'http://localhost:3001',
    })
  })

  it('requires channel metadata lookup in testnet environments', () => {
    expect(() => resolveChannelMetadataLookupConfig({ COMMONALITY_ENVIRONMENT: 'testnet' })).toThrow(
      'Channel metadata lookup is required for testnet',
    )
  })

  it('requires a platform API URL when lookup is enabled outside local', () => {
    expect(() => resolveChannelMetadataLookupConfig({
      COMMONALITY_ENVIRONMENT: 'mainnet',
      VITE_ENABLE_CHANNEL_METADATA_LOOKUP: 'true',
    })).toThrow('VITE_PLATFORM_API_URL is not configured')
  })

  it('accepts enabled lookup with a platform API URL outside local', () => {
    expect(resolveChannelMetadataLookupConfig({
      COMMONALITY_ENVIRONMENT: 'testnet',
      VITE_ENABLE_CHANNEL_METADATA_LOOKUP: 'true',
      VITE_PLATFORM_API_URL: 'https://platform-api.example.com',
    })).toEqual({
      enabled: true,
      baseUrl: 'https://platform-api.example.com',
    })
  })
})
