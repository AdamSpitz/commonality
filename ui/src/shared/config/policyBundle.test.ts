import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Civility policy bundle runtime', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('allows an unavailable bundle only during local Civility development', async () => {
    const { loadRuntimeConfig } = await import('./runtimeConfig')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })))
    await loadRuntimeConfig('/missing.json')
    const { loadActivePolicyBundle } = await import('./policyBundle')
    await expect(loadActivePolicyBundle('civility')).resolves.toMatchObject({ status: 'unavailable' })
  })

  it('fails a deployed Civility cold start when no bundle URL is configured', async () => {
    const { loadRuntimeConfig } = await import('./runtimeConfig')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      COMMONALITY_ENVIRONMENT: 'testnet',
      VITE_ENABLE_CHANNEL_METADATA_LOOKUP: 'true',
      VITE_PLATFORM_API_URL: 'https://platform.example',
    }), { status: 200 })))
    await loadRuntimeConfig('/config.json')
    const { loadActivePolicyBundle } = await import('./policyBundle')

    await expect(loadActivePolicyBundle('civility')).rejects.toThrow(
      'Civility requires an active policy bundle in testnet',
    )
  })

  it('fails a deployed Civility cold start when bundle activation fails', async () => {
    const { loadRuntimeConfig } = await import('./runtimeConfig')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/config.json') {
        return new Response(JSON.stringify({
          COMMONALITY_ENVIRONMENT: 'mainnet',
          VITE_POLICY_BUNDLE_URL: '/bundle.json',
          VITE_ENABLE_CHANNEL_METADATA_LOOKUP: 'true',
          VITE_PLATFORM_API_URL: 'https://platform.example',
        }), { status: 200 })
      }
      return new Response('{"invalid":true}', { status: 200 })
    }))
    await loadRuntimeConfig('/config.json')
    const { loadActivePolicyBundle } = await import('./policyBundle')

    await expect(loadActivePolicyBundle('civility')).rejects.toThrow(
      'Civility requires an active policy bundle in mainnet',
    )
  })
})
