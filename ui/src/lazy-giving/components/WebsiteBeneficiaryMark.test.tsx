import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dnsBeneficiaryDomain, WebsiteBeneficiaryMark } from './WebsiteBeneficiaryMark'

describe('dnsBeneficiaryDomain', () => {
  it('returns the exact dns identifier', () => {
    expect(dnsBeneficiaryDomain({ namespace: 'dns', canonicalIdentifier: 'example.org' })).toBe('example.org')
  })

  it('does not fold a lookalike into a different domain', () => {
    expect(dnsBeneficiaryDomain({ namespace: 'dns', canonicalIdentifier: 'еxample.org' })).toBe('еxample.org')
  })

  it('ignores non-dns beneficiaries', () => {
    expect(dnsBeneficiaryDomain({ namespace: 'x', canonicalIdentifier: 'uid:1' })).toBeUndefined()
  })
})

describe('WebsiteBeneficiaryMark', () => {
  it('renders the full domain without ellipsis', () => {
    render(<WebsiteBeneficiaryMark domain="very-long-sub.example-organization.org" size="hero" />)
    expect(screen.getByTestId('website-beneficiary-domain')).toHaveTextContent(
      'very-long-sub.example-organization.org',
    )
    expect(screen.getByText(/community-created; not affiliated with or endorsed by the beneficiary/i)).toBeInTheDocument()
    expect(screen.getByText(/domain control is the only identity/i)).toBeInTheDocument()
  })

  it('keeps mixed-script lookalikes visible as-is', () => {
    render(<WebsiteBeneficiaryMark domain="еxample.org" />)
    expect(screen.getByTestId('website-beneficiary-domain')).toHaveTextContent('еxample.org')
  })

  it('keeps the unaffiliated notice after the domain is claimed', () => {
    render(<WebsiteBeneficiaryMark domain="example.org" claimState="verified" />)
    expect(screen.getByText(/community-created; not affiliated with or endorsed by the beneficiary/i)).toBeInTheDocument()
    expect(screen.getByText(/domain-controlled/i)).toBeInTheDocument()
  })
})
