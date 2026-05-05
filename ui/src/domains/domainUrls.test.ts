import { describe, expect, it } from 'vitest'
import { resolveDomainUrlFromConfig } from './domainUrls'

describe('domain URL helpers', () => {
  it('falls back to the requested path when a domain URL is not configured', () => {
    expect(resolveDomainUrlFromConfig({}, 'tally', '/statements')).toBe('/statements')
  })

  it('supports explicit placeholder fallbacks for domains that are not locally routable', () => {
    expect(resolveDomainUrlFromConfig({}, 'tally', '/', { fallbackHref: '#' })).toBe('#')
  })

  it('appends paths to configured domain base URLs', () => {
    expect(
      resolveDomainUrlFromConfig(
        { VITE_TALLY_URL: 'https://tally.example' },
        'tally',
        '/statements',
      ),
    ).toBe('https://tally.example/statements')
  })

  it('supports Pubstarter and Alignment domain URL keys', () => {
    expect(
      resolveDomainUrlFromConfig(
        { VITE_PUBSTARTER_URL: 'https://pubstarter.example' },
        'pubstarter',
        '/projects',
      ),
    ).toBe('https://pubstarter.example/projects')
    expect(
      resolveDomainUrlFromConfig(
        { VITE_ALIGNMENT_URL: 'https://alignment.example' },
        'alignment',
        '/notes',
      ),
    ).toBe('https://alignment.example/notes')
  })

  it('preserves hash-router base URLs when appending paths', () => {
    expect(
      resolveDomainUrlFromConfig(
        { VITE_TALLY_URL: 'http://localhost:8080/ipfs/bafy/tally-ui/#/' },
        'tally',
        '/statements',
      ),
    ).toBe('http://localhost:8080/ipfs/bafy/tally-ui/#/statements')
  })
})
