import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalWindow = globalThis.window

describe('domain URL helpers', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    globalThis.window = originalWindow
  })

  it('falls back to the requested path when a domain URL is not configured', async () => {
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(resolveDomainUrlFromConfig({}, 'tally', '/statements')).toBe('/statements')
  })

  it('supports explicit placeholder fallbacks for domains that are not locally routable', async () => {
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(resolveDomainUrlFromConfig({}, 'tally', '/', { fallbackHref: '#' })).toBe('#')
  })

  it('appends paths to configured domain base URLs', async () => {
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(
      resolveDomainUrlFromConfig(
        { VITE_TALLY_URL: 'https://tally.example' },
        'tally',
        '/statements',
      ),
    ).toBe('https://tally.example/statements')
  })

  it('supports LazyGiving and Aligning domain URL keys', async () => {
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(
      resolveDomainUrlFromConfig(
        { VITE_LAZYGIVING_URL: 'https://lazyGiving.example' },
        'lazyGiving',
        '/projects',
      ),
    ).toBe('https://lazyGiving.example/projects')
    expect(
      resolveDomainUrlFromConfig(
        { VITE_ALIGNMENT_URL: 'https://alignment.example' },
        'alignment',
        '/portal/example',
      ),
    ).toBe('https://alignment.example/portal/example')
  })

  it('preserves hash-router base URLs when appending paths', async () => {
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(
      resolveDomainUrlFromConfig(
        { VITE_TALLY_URL: 'http://localhost:8080/ipfs/bafy/tally-ui/#/' },
        'tally',
        '/statements',
      ),
    ).toBe('http://localhost:8080/ipfs/bafy/tally-ui/#/statements')
  })

  it('prefers explicit path-hosted URLs over same-naming-layer inference', async () => {
    vi.stubGlobal('window', {
      location: {
        protocol: 'https:',
        hostname: 'commonality.eth.limo',
        port: '',
      },
    })
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(
      resolveDomainUrlFromConfig(
        { VITE_ALIGNMENT_URL: '../alignment/#/' },
        'alignment',
        '/portal/example',
      ),
    ).toBe('../alignment/#/portal/example')
    expect(
      resolveDomainUrlFromConfig(
        { VITE_ALIGNMENT_URL: 'https://commonality.eth.limo/testnet/alignment/#/' },
        'alignment',
        '/portal/example',
      ),
    ).toBe('https://commonality.eth.limo/testnet/alignment/#/portal/example')
  })

  it('keeps cross-domain links on commonality.works when loaded from commonality.works', async () => {
    vi.stubGlobal('window', {
      location: {
        protocol: 'https:',
        hostname: 'commonality.testnet.commonality.works',
        port: '',
      },
    })
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(
      resolveDomainUrlFromConfig(
        { VITE_ALIGNMENT_URL: 'https://alignment.testnet.commonality.eth.limo' },
        'alignment',
        '/portal/example',
      ),
    ).toBe('https://alignment.testnet.commonality.works/portal/example')
  })

  it('keeps cross-domain links on commonality.eth.limo when loaded from commonality.eth.limo', async () => {
    vi.stubGlobal('window', {
      location: {
        protocol: 'https:',
        hostname: 'alignment.testnet.commonality.eth.limo',
        port: '',
      },
    })
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(
      resolveDomainUrlFromConfig(
        { VITE_TALLY_URL: 'https://tally.testnet.commonality.works' },
        'tally',
        '/statements',
      ),
    ).toBe('https://tally.testnet.commonality.eth.limo/statements')
  })

  it('uses hash routes for smart cross-domain links in IPFS mode', async () => {
    vi.stubEnv('VITE_ROUTER_MODE', 'hash')
    vi.stubGlobal('window', {
      location: {
        protocol: 'https:',
        hostname: 'content-funding.testnet.commonality.eth.limo',
        port: '',
      },
    })
    const { resolveDomainUrlFromConfig, resolveLinkHref } = await import('./domainUrls')

    expect(resolveDomainUrlFromConfig({}, 'common-sense-majority', '/tally')).toBe(
      'https://common-sense-majority.testnet.commonality.eth.limo/#/tally',
    )
    expect(resolveLinkHref({ domain: 'tally', path: '/statements' })).toBe(
      'https://tally.testnet.commonality.eth.limo/#/statements',
    )
  })

  it('links from the eth.limo apex to subdomains under commonality.eth.limo', async () => {
    vi.stubGlobal('window', {
      location: {
        protocol: 'https:',
        hostname: 'commonality.eth.limo',
        port: '',
      },
    })
    const { resolveDomainUrlFromConfig } = await import('./domainUrls')

    expect(resolveDomainUrlFromConfig({}, 'commonality', '/docs')).toBe('https://commonality.eth.limo/docs')
    expect(resolveDomainUrlFromConfig({}, 'alignment', '/portal')).toBe('https://alignment.commonality.eth.limo/portal')
  })
})
