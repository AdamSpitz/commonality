import { describe, expect, it } from 'vitest'
import { ETH_CURRENCY } from '@commonality/sdk/utils'
import type { AlignedContentContract } from '../../content-funding'
import { unionAlignedFundingProjects } from './unionAlignedFundingProjects'

const lazy = {
  projectAddress: '0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa',
  fundingCurrency: ETH_CURRENCY,
  totalReceived: '100',
  threshold: '1000',
  deadline: '99',
}

function content(overrides: Partial<AlignedContentContract> = {}): AlignedContentContract {
  return {
    contractAddress: '0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb',
    viaStatementCids: ['bafy-plank'],
    alignedItemCount: 1,
    contentItemCount: 1,
    totalReceived: '50',
    threshold: '200',
    deadline: '88',
    fundingCurrency: ETH_CURRENCY,
    ...overrides,
  }
}

describe('unionAlignedFundingProjects', () => {
  it('counts content-only contracts that LazyGiving alignment omitted', () => {
    const rows = unionAlignedFundingProjects([], [content()])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.projectAddress).toBe(content().contractAddress)
    expect(rows[0]?.totalReceived).toBe('50')
  })

  it('does not double-count an address already in the LazyGiving list', () => {
    const rows = unionAlignedFundingProjects(
      [lazy],
      [content({ contractAddress: lazy.projectAddress, totalReceived: '999' })],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.totalReceived).toBe('100')
  })

  it('unions distinct LazyGiving and content rows', () => {
    const rows = unionAlignedFundingProjects([lazy], [content()])
    expect(rows).toHaveLength(2)
  })
})
