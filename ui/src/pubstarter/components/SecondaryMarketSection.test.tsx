import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SecondaryMarketSection } from './SecondaryMarketSection'
import { ETH_CURRENCY } from '@commonality/sdk'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const PROJECT_ADDR = '0xaaaa000000000000000000000000000000000001'
const ERC1155_ADDR = '0xbbbb000000000000000000000000000000000002'
const MARKETPLACE_ADDR = '0xmarketplace1234567890123456789012345678'

vi.mock('wagmi', () => ({
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    ERC1155SecondaryMarketAbi: [],
    fulfillSaleListing: vi.fn(),
    fulfillBuyOrder: vi.fn(),
    createSaleListing: vi.fn(),
    createBuyOrder: vi.fn(),
    approveERC1155ForMarketplace: vi.fn(),
  }
})

import { useWalletClient, usePublicClient } from 'wagmi'
import {
  fulfillSaleListing,
  fulfillBuyOrder,
  createSaleListing,
  createBuyOrder,
  approveERC1155ForMarketplace,
} from '@commonality/sdk'

function makeProject(overrides: Record<string, any> = {}) {
  return {
    id: PROJECT_ADDR,
    erc1155Address: ERC1155_ADDR,
    marketplaceAddress: MARKETPLACE_ADDR,
    recipient: '0xcccc000000000000000000000000000000000003',
    threshold: '1000000000000000000',
    deadline: String(Math.floor(Date.now() / 1000) + 86400),
    totalReceived: '500000000000000000',
    metadataCid: 'bafytest123',
    createdAt: '1700000000',
    ...overrides,
  }
}

function makeSaleListing(overrides: Record<string, any> = {}) {
  return {
    marketplaceAddress: MARKETPLACE_ADDR,
    listingId: '1',
    seller: '0x2222222222222222222222222222222222222222',
    tokenId: '1',
    originalCount: '10',
    remainingCount: '10',
    pricePerToken: '50000000000000000',
    currency: ETH_CURRENCY,
    status: 'active',
    createdAt: '1700000000',
    updatedAt: '1700000000',
    ...overrides,
  }
}

function makeBuyOrder(overrides: Record<string, any> = {}) {
  return {
    marketplaceAddress: MARKETPLACE_ADDR,
    orderId: '1',
    buyer: '0x3333333333333333333333333333333333333333',
    tokenId: '1',
    originalCount: '5',
    remainingCount: '5',
    pricePerToken: '75000000000000000',
    currency: ETH_CURRENCY,
    status: 'active',
    createdAt: '1700000000',
    updatedAt: '1700000000',
    ...overrides,
  }
}

describe('SecondaryMarketSection', () => {
  const onRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(fulfillSaleListing).mockResolvedValue(undefined as any)
    vi.mocked(fulfillBuyOrder).mockResolvedValue(undefined as any)
    vi.mocked(createSaleListing).mockResolvedValue(undefined as any)
    vi.mocked(createBuyOrder).mockResolvedValue(undefined as any)
    vi.mocked(approveERC1155ForMarketplace).mockResolvedValue(undefined as any)
  })

  it('renders Secondary Market heading', () => {
    render(
      <SecondaryMarketSection
        project={makeProject()}
        saleListings={[]}
        buyOrders={[]}
        isConnected={false}
        address={undefined}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByRole('heading', { name: 'Secondary Market' })).toBeInTheDocument()
  })

  describe('Sale Listings', () => {
    it('shows "No active sale listings" when empty', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={false}
          address={undefined}
          onRefresh={onRefresh}
        />
      )
      expect(screen.getByText('No active sale listings.')).toBeInTheDocument()
    })

    it('displays sale listings in table', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing({ tokenId: '1', remainingCount: '10', pricePerToken: '50000000000000000' })]}
          buyOrders={[]}
          isConnected={false}
          address={undefined}
          onRefresh={onRefresh}
        />
      )
      expect(screen.getByText('Sale Listings')).toBeInTheDocument()
      expect(screen.getByText('0x2222...2222')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('0.05 ETH')).toBeInTheDocument()
    })

    it('does not show Buy button when not connected', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing()]}
          buyOrders={[]}
          isConnected={false}
          address={undefined}
          onRefresh={onRefresh}
        />
      )
      expect(screen.queryByRole('button', { name: 'Buy' })).not.toBeInTheDocument()
    })

    it('shows Buy button when connected', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing()]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )
      expect(screen.getByRole('button', { name: 'Buy' })).toBeInTheDocument()
    })

    it('calls fulfillSaleListing with default quantity when Buy clicked', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing({ listingId: '1', remainingCount: '10', pricePerToken: '50000000000000000' })]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(fulfillSaleListing).toHaveBeenCalledWith(
          expect.objectContaining({ account: USER_ADDR }),
          expect.objectContaining({ address: MARKETPLACE_ADDR }),
          expect.objectContaining({
            saleListingId: 1n,
            count: 10n,
            totalCost: 500000000000000000n,
          }),
        )
      })
    })

    it('calls fulfillSaleListing with custom quantity', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing({ listingId: '1', remainingCount: '10', pricePerToken: '50000000000000000' })]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.type(screen.getByLabelText('Qty'), '3')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(fulfillSaleListing).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({ count: 3n, totalCost: 150000000000000000n }),
        )
      })
    })

    it('shows success message after fulfilling sale', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing()]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(screen.getByText('Tokens purchased from listing!')).toBeInTheDocument()
      })
    })

    it('shows error message when fulfilling sale fails', async () => {
      vi.mocked(fulfillSaleListing).mockRejectedValue(new Error('Insufficient funds'))
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing()]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(screen.getByText('Insufficient funds')).toBeInTheDocument()
      })
    })

    it('renders token images when provided', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing({ tokenId: '1' })]}
          buyOrders={[]}
          isConnected={false}
          address={undefined}
          onRefresh={onRefresh}
          tokenImages={{ '1': 'ipfs://bafyimage123' }}
        />
      )
      const img = screen.getByAltText('Token #1')
      expect(img).toHaveAttribute('src', 'ipfs://bafyimage123')
    })
  })

  describe('Buy Orders', () => {
    it('shows "No active buy orders" when empty', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={false}
          address={undefined}
          onRefresh={onRefresh}
        />
      )
      expect(screen.getByText('No active buy orders.')).toBeInTheDocument()
    })

    it('displays buy orders in table', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[makeBuyOrder({ tokenId: '1', remainingCount: '5', pricePerToken: '75000000000000000' })]}
          isConnected={false}
          address={undefined}
          onRefresh={onRefresh}
        />
      )
      expect(screen.getByText('Buy Orders')).toBeInTheDocument()
      expect(screen.getByText('0x3333...3333')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('0.075 ETH')).toBeInTheDocument()
    })

    it('does not show Sell button when not connected', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[makeBuyOrder()]}
          isConnected={false}
          address={undefined}
          onRefresh={onRefresh}
        />
      )
      expect(screen.queryByRole('button', { name: 'Sell' })).not.toBeInTheDocument()
    })

    it('shows Sell button when connected', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[makeBuyOrder()]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )
      expect(screen.getByRole('button', { name: 'Sell' })).toBeInTheDocument()
    })

    it('calls approve then fulfillBuyOrder when Sell clicked', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[makeBuyOrder({ orderId: '1', remainingCount: '5' })]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Sell' }))

      await waitFor(() => {
        expect(approveERC1155ForMarketplace).toHaveBeenCalledWith(
          expect.objectContaining({ account: USER_ADDR }),
          ERC1155_ADDR,
          MARKETPLACE_ADDR,
        )
        expect(fulfillBuyOrder).toHaveBeenCalledWith(
          expect.objectContaining({ account: USER_ADDR }),
          expect.objectContaining({ address: MARKETPLACE_ADDR }),
          expect.objectContaining({ buyOrderId: 1n, count: 5n }),
        )
      })
    })

    it('shows success message after fulfilling buy order', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[makeBuyOrder()]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Sell' }))

      await waitFor(() => {
        expect(screen.getByText('Tokens sold to buy order!')).toBeInTheDocument()
      })
    })

    it('shows error message when fulfilling buy order fails', async () => {
      vi.mocked(fulfillBuyOrder).mockRejectedValue(new Error('Insufficient token balance'))
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[makeBuyOrder()]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Sell' }))

      await waitFor(() => {
        expect(screen.getByText('Insufficient token balance')).toBeInTheDocument()
      })
    })

    it('shows error when approval fails', async () => {
      vi.mocked(approveERC1155ForMarketplace).mockRejectedValue(new Error('User rejected approval'))
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[makeBuyOrder()]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Sell' }))

      await waitFor(() => {
        expect(screen.getByText('User rejected approval')).toBeInTheDocument()
        expect(fulfillBuyOrder).not.toHaveBeenCalled()
      })
    })
  })

  describe('Create Order form', () => {
    it('does not show Create Order form when not connected', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={false}
          address={undefined}
          onRefresh={onRefresh}
        />
      )
      expect(screen.queryByText('Create Order')).not.toBeInTheDocument()
    })

    it('shows Create Order form when connected', () => {
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )
      expect(screen.getByText('Create Order')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create Sale Listing' })).toBeInTheDocument()
    })

    it('toggles between Sale Listing and Buy Order', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      expect(screen.getByRole('button', { name: 'Create Sale Listing' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Buy Order' }))
      expect(screen.getByRole('button', { name: 'Create Buy Order' })).toBeInTheDocument()
    })

    it('shows error when fields are empty', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Create Sale Listing' }))

      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
      expect(createSaleListing).not.toHaveBeenCalled()
    })

    it('creates sale listing with approval', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      const inputs = screen.getAllByLabelText(/Token ID|Quantity|Price/)
      await user.type(inputs[0], '1')
      await user.type(inputs[1], '5')
      await user.type(inputs[2], '0.1')
      await user.click(screen.getByRole('button', { name: 'Create Sale Listing' }))

      await waitFor(() => {
        expect(approveERC1155ForMarketplace).toHaveBeenCalled()
        expect(createSaleListing).toHaveBeenCalledWith(
          expect.objectContaining({ account: USER_ADDR }),
          expect.objectContaining({ address: MARKETPLACE_ADDR }),
          expect.objectContaining({
            tokenId: 1n,
            count: 5n,
            pricePerToken: 100000000000000000n,
          }),
        )
      })
    })

    it('creates buy order without approval', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Buy Order' }))

      const inputs = screen.getAllByLabelText(/Token ID|Quantity|Price/)
      await user.type(inputs[0], '1')
      await user.type(inputs[1], '3')
      await user.type(inputs[2], '0.05')
      await user.click(screen.getByRole('button', { name: 'Create Buy Order' }))

      await waitFor(() => {
        expect(approveERC1155ForMarketplace).not.toHaveBeenCalled()
        expect(createBuyOrder).toHaveBeenCalledWith(
          expect.objectContaining({ account: USER_ADDR }),
          expect.objectContaining({ address: MARKETPLACE_ADDR }),
          expect.objectContaining({
            tokenId: 1n,
            count: 3n,
            pricePerToken: 50000000000000000n,
          }),
        )
      })
    })

    it('shows success message after creating sale listing', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      const inputs = screen.getAllByLabelText(/Token ID|Quantity|Price/)
      await user.type(inputs[0], '1')
      await user.type(inputs[1], '1')
      await user.type(inputs[2], '0.1')
      await user.click(screen.getByRole('button', { name: 'Create Sale Listing' }))

      await waitFor(() => {
        expect(screen.getByText('Sale listing created!')).toBeInTheDocument()
      })
    })

    it('shows success message after creating buy order', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Buy Order' }))

      const inputs = screen.getAllByLabelText(/Token ID|Quantity|Price/)
      await user.type(inputs[0], '1')
      await user.type(inputs[1], '1')
      await user.type(inputs[2], '0.1')
      await user.click(screen.getByRole('button', { name: 'Create Buy Order' }))

      await waitFor(() => {
        expect(screen.getByText('Buy order created!')).toBeInTheDocument()
      })
    })

    it('calls onRefresh after creating order', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      const inputs = screen.getAllByLabelText(/Token ID|Quantity|Price/)
      await user.type(inputs[0], '1')
      await user.type(inputs[1], '1')
      await user.type(inputs[2], '0.1')
      await user.click(screen.getByRole('button', { name: 'Create Sale Listing' }))

      await waitFor(() => {
        expect(onRefresh).toHaveBeenCalled()
      })
    })

    it('clears form fields after successful order creation', async () => {
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      const inputs = screen.getAllByLabelText(/Token ID|Quantity|Price/)
      await user.type(inputs[0], '1')
      await user.type(inputs[1], '1')
      await user.type(inputs[2], '0.1')
      await user.click(screen.getByRole('button', { name: 'Create Sale Listing' }))

      await waitFor(() => {
        expect(inputs[0]).toHaveValue(null)
        expect(inputs[1]).toHaveValue(null)
        expect(inputs[2]).toHaveValue(null)
      })
    })

    it('shows error message when order creation fails', async () => {
      vi.mocked(createSaleListing).mockRejectedValue(new Error('Insufficient balance'))
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      const inputs = screen.getAllByLabelText(/Token ID|Quantity|Price/)
      await user.type(inputs[0], '1')
      await user.type(inputs[1], '1')
      await user.type(inputs[2], '0.1')
      await user.click(screen.getByRole('button', { name: 'Create Sale Listing' }))

      await waitFor(() => {
        expect(screen.getByText('Insufficient balance')).toBeInTheDocument()
      })
    })

    it('shows loading state while creating order', async () => {
      vi.mocked(createSaleListing).mockImplementation(() => new Promise(() => {}))
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      const inputs = screen.getAllByLabelText(/Token ID|Quantity|Price/)
      await user.type(inputs[0], '1')
      await user.type(inputs[1], '1')
      await user.type(inputs[2], '0.1')
      await user.click(screen.getByRole('button', { name: 'Create Sale Listing' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
      })
    })
  })

  describe('Market-wide error/success', () => {
    it('displays market error from fulfill actions', async () => {
      vi.mocked(fulfillSaleListing).mockRejectedValue(new Error('Market error'))
      const user = userEvent.setup()
      render(
        <SecondaryMarketSection
          project={makeProject()}
          saleListings={[makeSaleListing()]}
          buyOrders={[]}
          isConnected={true}
          address={USER_ADDR}
          onRefresh={onRefresh}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(screen.getByText('Market error')).toBeInTheDocument()
      })
    })
  })
})
