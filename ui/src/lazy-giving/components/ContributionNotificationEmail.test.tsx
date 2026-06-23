import { describe, expect, it } from 'vitest'
import type { Project } from '@commonality/sdk'
import { buildContributionNotificationEmail } from './ContributionNotificationEmail'

const PROJECT: Project = {
  id: '0xaaaa000000000000000000000000000000000001',
  erc1155Address: '0xbbbb000000000000000000000000000000000002',
  marketplaceAddress: null,
  recipient: '0xcccc000000000000000000000000000000000003',
  fundingCurrency: {
    kind: 'erc20',
    tokenType: 0,
    tokenAddress: '0xdddd000000000000000000000000000000000004',
    symbol: 'USDC',
    decimals: 6,
  },
  threshold: '100000000',
  deadline: '1700000000',
  totalReceived: '50000000',
  conditionAddress: null,
}

function decodeMailto(href: string) {
  const url = new URL(href)
  return {
    subject: url.searchParams.get('subject') ?? '',
    body: url.searchParams.get('body') ?? '',
  }
}

describe('buildContributionNotificationEmail', () => {
  it('builds a contribution confirmation draft with custody and transaction copy', () => {
    const email = decodeMailto(buildContributionNotificationEmail('confirmation', PROJECT, 'https://explorer.example/tx/0x123'))

    expect(email.subject).toContain('Your Commonality contribution')
    expect(email.body).toContain('was sent onchain')
    expect(email.body).toContain('Commonality does not custody card/on-ramp contributions')
    expect(email.body).toContain('https://explorer.example/tx/0x123')
    expect(email.body).toContain('refund the receipt tokens back to USDC')
  })

  it('builds a refund-available draft with wallet/off-ramp next steps', () => {
    const email = decodeMailto(buildContributionNotificationEmail('refund-available', PROJECT))

    expect(email.subject).toContain('Refund available')
    expect(email.body).toContain('receipt tokens are refundable')
    expect(email.body).toContain('receive USDC back into your wallet')
    expect(email.body).toContain('keep the USDC, re-contribute, or use a licensed off-ramp/KYC flow')
  })
})
