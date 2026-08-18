import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Leaderboard } from './Leaderboard'
import { ETH_CURRENCY } from '@commonality/sdk/utils'

function makeContribution(overrides: Record<string, any> = {}) {
  return {
    id: 'contrib-1',
    contributor: '0x1111111111111111111111111111111111111111',
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
    contributor: '0x1111111111111111111111111111111111111111',
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
  it('shows an empty already-contributed card when there are no contributions', () => {
    render(<Leaderboard contributions={[]} refunds={[]} />)
    expect(screen.getByText('Already Contributed')).toBeInTheDocument()
    expect(screen.getByText('No contributions yet.')).toBeInTheDocument()
    expect(screen.getByLabelText('About Already Contributed')).toBeInTheDocument()
  })

  it('shows an empty already-contributed card when all contributors have zero net', () => {
    const contributions = [makeContribution({ totalCost: '500000000000000000' })]
    const refunds = [makeRefund({ totalRefund: '500000000000000000' })]
    render(<Leaderboard contributions={contributions} refunds={refunds} />)
    expect(screen.getByText('Already Contributed')).toBeInTheDocument()
    expect(screen.getByText('No contributions yet.')).toBeInTheDocument()
  })

  it('renders the already-contributed heading', () => {
    const contributions = [makeContribution({ totalCost: '1000000000000000000' })]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    expect(screen.getByText('Already Contributed')).toBeInTheDocument()
  })

  it('displays contributor address truncated', () => {
    const contributions = [makeContribution({
      contributor: '0xaaaa111111111111111111111111111111111111',
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
      contributor: '0xaaaa111111111111111111111111111111111111',
      totalCost: '1000000000000000000',
    })]
    const refunds = [makeRefund({
      contributor: '0xaaaa111111111111111111111111111111111111',
      totalRefund: '300000000000000000',
    })]
    render(<Leaderboard contributions={contributions} refunds={refunds} />)
    expect(screen.getByText('0.3 ETH')).toBeInTheDocument()
  })

  it('displays net contribution', () => {
    const contributions = [makeContribution({
      contributor: '0xaaaa111111111111111111111111111111111111',
      totalCost: '1000000000000000000',
    })]
    const refunds = [makeRefund({
      contributor: '0xaaaa111111111111111111111111111111111111',
      totalRefund: '300000000000000000',
    })]
    render(<Leaderboard contributions={contributions} refunds={refunds} />)
    expect(screen.getByText('0.7 ETH')).toBeInTheDocument()
  })

  it('sorts contributors by net contribution descending', () => {
    const contributions = [
      makeContribution({ contributor: '0xaaaa00000000000000000000000000000000aaaa', totalCost: '500000000000000000' }),
      makeContribution({ contributor: '0xbbbb00000000000000000000000000000000bbbb', totalCost: '1000000000000000000' }),
    ]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('0xbbbb...bbbb')
    expect(rows[2]).toHaveTextContent('0xaaaa...aaaa')
  })

  it('shows ranking numbers', () => {
    const contributions = [
      makeContribution({ contributor: '0xaaaa00000000000000000000000000000000aaaa', totalCost: '500000000000000000' }),
      makeContribution({ contributor: '0xbbbb00000000000000000000000000000000bbbb', totalCost: '1000000000000000000' }),
    ]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('1')
    expect(rows[2]).toHaveTextContent('2')
  })

  it('displays delegation chains when provided', () => {
    const contributions = [makeContribution({
      contributor: '0xaaaa111111111111111111111111111111111111',
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
      makeContribution({ contributor: '0xaaaa111111111111111111111111111111111111', totalCost: '500000000000000000', transactionHash: '0xhash1' }),
      makeContribution({ contributor: '0xaaaa111111111111111111111111111111111111', totalCost: '500000000000000000', transactionHash: '0xhash2' }),
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
      makeContribution({ contributor: '0xaaaa111111111111111111111111111111111111', totalCost: '500000000000000000' }),
      makeContribution({ contributor: '0xaaaa111111111111111111111111111111111111', totalCost: '300000000000000000' }),
    ]
    render(<Leaderboard contributions={contributions} refunds={[]} />)
    expect(screen.getAllByText('0.8 ETH').length).toBeGreaterThanOrEqual(1)
  })

  it('caps the embedded preview and links to the full page', () => {
    const contributions = [
      makeContribution({ contributor: '0xaaaa00000000000000000000000000000000aaaa', totalCost: '3000000000000000000' }),
      makeContribution({ contributor: '0xbbbb00000000000000000000000000000000bbbb', totalCost: '2000000000000000000' }),
      makeContribution({ contributor: '0xcccc00000000000000000000000000000000cccc', totalCost: '1000000000000000000' }),
      makeContribution({ contributor: '0xdddd00000000000000000000000000000000dddd', totalCost: '500000000000000000' }),
    ]
    render(
      <MemoryRouter>
        <Leaderboard
          contributions={contributions}
          refunds={[]}
          embedded
          limit={3}
          fullPageTo="/projects/0xproject/leaderboard"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Already Contributed')).toBeInTheDocument()
    expect(screen.queryByText('Ongoing Monthly Pledges')).not.toBeInTheDocument()
    expect(screen.getByLabelText('About Already Contributed')).toBeInTheDocument()
    expect(screen.getByText('0xaaaa...aaaa')).toBeInTheDocument()
    expect(screen.getByText('0xbbbb...bbbb')).toBeInTheDocument()
    expect(screen.getByText('0xcccc...cccc')).toBeInTheDocument()
    expect(screen.queryByText('0xdddd...dddd')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Show more' })).toHaveAttribute(
      'href',
      '/projects/0xproject/leaderboard',
    )
  })
})
