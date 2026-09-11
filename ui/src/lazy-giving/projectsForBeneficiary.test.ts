import { describe, expect, it } from 'vitest'
import {
  canonicalDnsOrNull,
  matchesBeneficiary,
  projectsForBeneficiary,
  proposeProjectPath,
} from './projectsForBeneficiary'

describe('canonicalDnsOrNull', () => {
  it('normalizes www and URLs, and rejects junk', () => {
    expect(canonicalDnsOrNull('https://www.Example.org/')).toBe('example.org')
    expect(canonicalDnsOrNull('')).toBeNull()
    expect(canonicalDnsOrNull('not a domain')).toBeNull()
  })
})

describe('projectsForBeneficiary', () => {
  it('matches canonical dns beneficiary ids, not display names', () => {
    expect(matchesBeneficiary(
      { beneficiary: { namespace: 'dns', canonicalIdentifier: 'example.org' } },
      'dns',
      'example.org',
    )).toBe(true)
    expect(matchesBeneficiary(
      { name: 'Example Org garden', beneficiary: { namespace: 'dns', canonicalIdentifier: 'other.org' } },
      'dns',
      'example.org',
    )).toBe(false)
    expect(matchesBeneficiary({ name: 'example.org' }, 'dns', 'example.org')).toBe(false)
  })

  it('lists matching projects with title and purpose', () => {
    const matches = projectsForBeneficiary(
      [{ id: '0xaaa' }, { id: '0xbbb' }, { id: '0xccc' }],
      {
        '0xaaa': { name: 'Garden', description: 'Beds', beneficiary: { namespace: 'dns', canonicalIdentifier: 'example.org' } },
        '0xbbb': { name: 'Unrelated', beneficiary: { namespace: 'dns', canonicalIdentifier: 'other.org' } },
        '0xccc': { name: 'No beneficiary' },
      },
      'dns',
      'example.org',
    )
    expect(matches).toEqual([
      { id: '0xaaa', name: 'Garden', description: 'Beds' },
    ])
  })
})

describe('proposeProjectPath', () => {
  it('carries statement and beneficiary query params', () => {
    expect(proposeProjectPath()).toBe('/projects/new')
    expect(proposeProjectPath({ statementCid: 'bafyabc' })).toBe('/projects/new?statement=bafyabc')
    expect(proposeProjectPath({ beneficiary: 'example.org' })).toBe('/projects/new?beneficiary=example.org')
    expect(proposeProjectPath({ statementCid: 'bafyabc', beneficiary: 'example.org' }))
      .toBe('/projects/new?statement=bafyabc&beneficiary=example.org')
  })
})
