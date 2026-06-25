import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Leaderboard } from './Leaderboard'
import { ETH_CURRENCY } from '@commonality/sdk/utils'

function makeContribution(overrides: Record<string, any> = {}) {
  return {
    id: 'contrib-1',
    participant: '0x1111111111111111111111111111111111111111',
    projectAddress: '0xproject',
    erc1155Address: '0xerc1155',
    tokenIds: '["1"]',
    tokenCounts: '["5"]',
    totalCost: '500000000000000000',
    currency: ETH_CURRENCY,
    createdAt: '1700000000',
    blockNumber: '100',
    transactionHash: '0xhash1',
    ...overrides,
  }
}

function makeRefund(overrides: Record<string, any> = {}) {
  return {
    id: 'refund-1',
    participant: '0x1111111111111111111111111111111111111111',
    projectAddress: '0xproject',
    erc1155Address: '0xerc1155',
    tokenIds: '["1"]',
    tokenCounts: '["2"]',
    totalRefund: '200000000000000000',
    currency: ETH_CURRENCY,
    createdAt: '1700000100',
    blockNumber: '110',
    transactionHash: '0xhash2',
    ...overrides,
  }
}

describe('Leaderboard', () => {
  it('returns null when there are no contributions', () => {
    const { container } = render(<Leaderboard contributions={[]} refunds={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when all contributors have zero net', () => {
    const contributions = [makeContribution({ totalCost: '500000000000000000' })]
    const refunds = [makeRefund({ totalRefund: '500000000000000000' })]
    const { container } = render(<Leaderboard contributions={contributions} refunds={refunds} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders contributor leaderboard heading', () => {
    const contributions = [makeContribution({ totalCost: '1000000000000000000' })]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    expect(screen.getByText('Contributor Leaderboard')).toBeInTheDocument()
  })

  it('displays contributor address truncated', () => {
    const contributions = [makeContribution({
      participant: '0xaaaa111111111111111111111111111111111111',
      totalCost: '1000000000000000000',
    })]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    expect(screen.getByText('0xaaaa...1111')).toBeInTheDocument()
  })

  it('displays contributed amount', () => {
    const contributions = [makeContribution({ totalCost: '1000000000000000000' })]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    expect(screen.getAllByText('1 ETH').length).toBeGreaterThanOrEqual(1)
  })

  it('displays refunded amount', () => {
    const contributions = [makeContribution({
      participant: '0xaaaa111111111111111111111111111111111111',
      totalCost: '1000000000000000000',
    })]
    const refunds = [makeRefund({
      participant: '0xaaaa111111111111111111111111111111111111',
      totalRefund: '300000000000000000',
    })]
    render(<Leaderboard contributions={contributions} refunds={refunds} />)
    expect(screen.getByText('0.3 ETH')).toBeInTheDocument()
  })

  it('displays net contribution', () => {
    const contributions = [makeContribution({
      participant: '0xaaaa111111111111111111111111111111111111',
      totalCost: '1000000000000000000',
    })]
    const refunds = [makeRefund({
      participant: '0xaaaa111111111111111111111111111111111111',
      totalRefund: '300000000000000000',
    })]
    render(<Leaderboard contributions={contributions} refunds={refunds} />)
    expect(screen.getByText('0.7 ETH')).toBeInTheDocument()
  })

  it('sorts contributors by net contribution descending', () => {
    const contributions = [
      makeContribution({ participant: '0xaaaa00000000000000000000000000000000aaaa', totalCost: '500000000000000000' }),
      makeContribution({ participant: '0xbbbb00000000000000000000000000000000bbbb', totalCost: '1000000000000000000' }),
    ]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('0xbbbb...bbbb')
    expect(rows[2]).toHaveTextContent('0xaaaa...aaaa')
  })

  it('shows ranking numbers', () => {
    const contributions = [
      makeContribution({ participant: '0xaaaa00000000000000000000000000000000aaaa', totalCost: '500000000000000000' }),
      makeContribution({ participant: '0xbbbb00000000000000000000000000000000bbbb', totalCost: '1000000000000000000' }),
    ]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('1')
    expect(rows[2]).toHaveTextContent('2')
  })

  it('displays delegation chains when provided', () => {
    const contributions = [makeContribution({
      participant: '0xaaaa111111111111111111111111111111111111',
      totalCost: '1000000000000000000',
      transactionHash: '0xhash1',
    })]
    const contributionChains = {
      '0xhash1': ['0xroot000000000000000000000000000000000000', '0xaaaa111111111111111111111111111111111111'],
    }
    render(
      <Leaderboard
        contributions={contributions}
        refunds={[]}
        contributionChains={contributionChains}
      />
    )
    expect(screen.getByText('via:')).toBeInTheDocument()
    expect(screen.getByText('0xroot...0000')).toBeInTheDocument()
    const chainAddrElements = screen.getAllByText('0xaaaa...1111')
    expect(chainAddrElements.length).toBeGreaterThanOrEqual(1)
  })

  it('deduplicates identical chains', () => {
    const contributions = [
      makeContribution({ participant: '0xaaaa111111111111111111111111111111111111', totalCost: '500000000000000000', transactionHash: '0xhash1' }),
      makeContribution({ participant: '0xaaaa111111111111111111111111111111111111', totalCost: '500000000000000000', transactionHash: '0xhash2' }),
    ]
    const chain = ['0xroot', '0xaaaa111111111111111111111111111111111111']
    const contributionChains = { '0xhash1': chain, '0xhash2': chain }
    render(
      <Leaderboard
        contributions={contributions}
        refunds={[]}
        contributionChains={contributionChains}
      />
    )
    const viaElements = screen.getAllByText('via:')
    expect(viaElements).toHaveLength(1)
  })

  it('aggregates multiple contributions from same address', () => {
    const contributions = [
      makeContribution({ participant: '0xaaaa111111111111111111111111111111111111', totalCost: '500000000000000000' }),
      makeContribution({ participant: '0xaaaa111111111111111111111111111111111111', totalCost: '300000000000000000' }),
    ]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    expect(screen.getAllByText('0.8 ETH').length).toBeGreaterThanOrEqual(1)
  })
})
