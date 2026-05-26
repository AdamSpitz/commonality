import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { TradeHistory } from './TradeHistory'
import { ETH_CURRENCY } from '@commonality/sdk'

function makeTrade(overrides: Record<string, any> = {}) {
  return {
    id: 'trade-1',
    marketplaceAddress: '0xmarket123456789012345678901234567890123456',
    orderType: 'sale',
    orderId: '1',
    buyer: '0x4444444444444444444444444444444444444444',
    seller: '0x5555555555555555555555555555555555555555',
    tokenId: '1',
    count: '3',
    pricePerToken: '50000000000000000',
    totalPrice: '150000000000000000',
    currency: ETH_CURRENCY,
    createdAt: '1700000000',
    blockNumber: '200',
    transactionHash: '0xhash3',
    ...overrides,
  }
}

describe('TradeHistory', () => {
  it('returns null when there are no trades', () => {
    const { container } = render(<TradeHistory trades={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders an accordion with trade count in header', () => {
    const trades = [makeTrade(), makeTrade({ id: 'trade-2', orderId: '2' })]
    render(<TradeHistory trades={trades} />)
    expect(screen.getByText('Trade History (2)')).toBeInTheDocument()
  })

  it('displays trade details in table when expanded', async () => {
    const user = userEvent.setup()
    const trades = [makeTrade({
      buyer: '0x4444444444444444444444444444444444444444',
      seller: '0x5555555555555555555555555555555555555555',
      tokenId: '1',
      count: '3',
      totalPrice: '150000000000000000',
      createdAt: '1700000000',
    })]
    render(<TradeHistory trades={trades} />)

    await user.click(screen.getByText('Trade History (1)'))

    expect(screen.getByText('0x4444...4444')).toBeInTheDocument()
    expect(screen.getByText('0x5555...5555')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('0.15 ETH')).toBeInTheDocument()
  })

  it('displays date as locale date string', async () => {
    const user = userEvent.setup()
    const trades = [makeTrade({ createdAt: '1700000000' })]
    render(<TradeHistory trades={trades} />)

    await user.click(screen.getByText('Trade History (1)'))

    const expectedDate = new Date(1700000000 * 1000).toLocaleDateString()
    expect(screen.getByText(expectedDate)).toBeInTheDocument()
  })

  it('renders multiple trades in table rows', async () => {
    const user = userEvent.setup()
    const trades = [
      makeTrade({ id: 'trade-1', buyer: '0xaaaa00000000000000000000000000000000aaaa', count: '5' }),
      makeTrade({ id: 'trade-2', buyer: '0xbbbb00000000000000000000000000000000bbbb', count: '10' }),
    ]
    render(<TradeHistory trades={trades} />)

    await user.click(screen.getByText('Trade History (2)'))

    expect(screen.getByText('0xaaaa...aaaa')).toBeInTheDocument()
    expect(screen.getByText('0xbbbb...bbbb')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})
