import { describe, expect, it } from 'vitest'
import { hashBeneficiaryId, type BeneficiaryState } from '@commonality/sdk/content-funding'
import { claimStateForDnsDomain, COMMUNITY_CREATED_NOTICE, WEBSITE_CLAIM_STATE_TOOLTIPS } from './websiteBeneficiaryClaim'

describe('claimStateForDnsDomain', () => {
  it('treats missing fold entries as unclaimed', () => {
    expect(claimStateForDnsDomain(new Map(), 'example.org')).toBe('unclaimed')
    expect(claimStateForDnsDomain(undefined, 'example.org')).toBe('unclaimed')
  })

  it('looks up the hashed dns beneficiary id', () => {
    const channels = new Map<string, { state: BeneficiaryState }>([
      [hashBeneficiaryId('dns', 'example.org'), { state: 'verified' }],
    ])
    expect(claimStateForDnsDomain(channels, 'example.org')).toBe('verified')
    expect(claimStateForDnsDomain(channels, 'other.org')).toBe('unclaimed')
  })
})

describe('community-created notice', () => {
  it('stays on claim-state tooltips after verification', () => {
    expect(WEBSITE_CLAIM_STATE_TOOLTIPS.unclaimed).toContain(COMMUNITY_CREATED_NOTICE)
    expect(WEBSITE_CLAIM_STATE_TOOLTIPS.verified).toContain(COMMUNITY_CREATED_NOTICE)
    expect(WEBSITE_CLAIM_STATE_TOOLTIPS['beneficiary-controlled']).toContain(COMMUNITY_CREATED_NOTICE)
  })
})
