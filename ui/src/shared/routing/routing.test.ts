import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('routing helpers', () => {
  const originalWindow = globalThis.window

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    globalThis.window = originalWindow
  })

  it('builds hash-based app urls in ipfs mode', async () => {
    vi.stubEnv('VITE_ROUTER_MODE', 'hash')
    vi.stubGlobal('window', {
      location: {
        origin: 'https://gateway.pinata.cloud',
        pathname: '/ipfs/bafy123/',
        search: '',
      },
    })

    const { getAppUrl } = await import('./routing')

    expect(getAppUrl('/docs')).toBe('https://gateway.pinata.cloud/ipfs/bafy123/#/docs')
  })

  it('falls back to hash routing when the build mode is ipfs', async () => {
    vi.stubEnv('MODE', 'ipfs')
    vi.stubGlobal('window', {
      location: {
        origin: 'https://gateway.pinata.cloud',
        pathname: '/ipfs/bafy123/',
        search: '',
      },
    })

    const { getAppUrl } = await import('./routing')

    expect(getAppUrl('/docs')).toBe('https://gateway.pinata.cloud/ipfs/bafy123/#/docs')
  })

  it('builds origin-relative urls in browser mode', async () => {
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubGlobal('window', {
      location: {
        origin: 'https://commonality.eth.limo',
        pathname: '/',
        search: '',
      },
    })

    const { getAppUrl } = await import('./routing')

    expect(getAppUrl('/content/twitter/alice')).toBe('https://commonality.eth.limo/content/twitter/alice')
  })
})
