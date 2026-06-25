import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BurnTokensSection } from './BurnTokensSection'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const PROJECT_ADDR = '0xaaaa000000000000000000000000000000000001'
const ERC1155_ADDR = '0xbbbb000000000000000000000000000000000002'

vi.mock('wagmi', () => ({
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk/lazy-giving', async () => {
  const actual = await vi.importActual('@commonality/sdk/lazy-giving')
  return {
    ...actual,
    burnTokens: vi.fn(),
  }
})

import { useWalletClient, usePublicClient } from 'wagmi'
import { burnTokens } from '@commonality/sdk/lazy-giving'

function makeProject(overrides: Record<string, any> = {}) {
  return {
    id: PROJECT_ADDR,
    erc1155Address: ERC1155_ADDR,
    recipient: '0xcccc000000000000000000000000000000000003',
    threshold: '1000000000000000000',
    deadline: String(Math.floor(Date.now() / 1000) + 86400),
    totalReceived: '2000000000000000000',
    metadataCid: 'bafytest123',
    createdAt: '1700000000',
    ...overrides,
  }
}

function makeContribution(overrides: Record<string, any> = {}) {
  return {
    id: 'contrib-1',
    participant: USER_ADDR,
    projectAddress: PROJECT_ADDR,
    erc1155Address: ERC1155_ADDR,
    tokenIds: '["1"]',
    tokenCounts: '["5"]',
    totalCost: '500000000000000000',
    createdAt: '1700000000',
    blockNumber: '100',
    transactionHash: '0xhash1',
    ...overrides,
  }
}

function makeRefund(overrides: Record<string, any> = {}) {
  return {
    id: 'refund-1',
    participant: USER_ADDR,
    projectAddress: PROJECT_ADDR,
    erc1155Address: ERC1155_ADDR,
    tokenIds: '["1"]',
    tokenCounts: '["2"]',
    totalRefund: '200000000000000000',
    createdAt: '1700000100',
    blockNumber: '110',
    transactionHash: '0xhash2',
    ...overrides,
  }
}

function makeTokenBurn(overrides: Record<string, any> = {}) {
  return {
    id: 'burn-1',
    erc1155Address: ERC1155_ADDR,
    burner: USER_ADDR,
    tokenIds: '["1"]',
    tokenCounts: '["1"]',
    createdAt: '1700000200',
    blockNumber: '120',
    transactionHash: '0xhash3',
    ...overrides,
  }
}

describe('BurnTokensSection', () => {
  const onRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(burnTokens).mockResolvedValue(undefined as any)
  })

  it('renders heading and description', () => {
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByRole('heading', { name: 'Burn Tokens' })).toBeInTheDocument()
    expect(screen.getByText(/convert from investor to donor/)).toBeInTheDocument()
  })

  it('displays token labels with available counts', () => {
    const contributions = [makeContribution({ tokenIds: '["1"]', tokenCounts: '["5"]' })]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByText('Token #1')).toBeInTheDocument()
    expect(screen.getByText('5 available')).toBeInTheDocument()
  })

  it('subtracts refunded tokens from available count', () => {
    const contributions = [makeContribution({ tokenIds: '["1"]', tokenCounts: '["5"]' })]
    const refunds = [makeRefund({ tokenIds: '["1"]', tokenCounts: '["2"]' })]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={refunds}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByText('3 available')).toBeInTheDocument()
  })

  it('subtracts burned tokens from available count', () => {
    const contributions = [makeContribution({ tokenIds: '["1"]', tokenCounts: '["5"]' })]
    const userBurns = [makeTokenBurn({ tokenIds: '["1"]', tokenCounts: '["1"]' })]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={userBurns}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByText('4 available')).toBeInTheDocument()
  })

  it('renders quantity input for each burnable token', () => {
    const contributions = [makeContribution({ tokenIds: '["1", "2"]', tokenCounts: '["5", "3"]' })]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getAllByLabelText('Quantity')).toHaveLength(2)
  })

  it('renders Burn Tokens button', () => {
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByRole('button', { name: 'Burn Tokens' })).toBeInTheDocument()
  })

  it('shows error when burning with no quantity', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    expect(screen.getByText('Please enter a quantity for at least one token')).toBeInTheDocument()
    expect(burnTokens).not.toHaveBeenCalled()
  })

  it('calls burnTokens with correct parameters', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution({ tokenIds: '["1", "2"]', tokenCounts: '["5", "3"]' })]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    const inputs = screen.getAllByLabelText('Quantity')
    await user.type(inputs[0], '2')
    await user.type(inputs[1], '1')
    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    await waitFor(() => {
      expect(burnTokens).toHaveBeenCalledWith(
        expect.objectContaining({ account: USER_ADDR }),
        ERC1155_ADDR,
        expect.objectContaining({
          tokenIds: [1n, 2n],
          tokenCounts: [2n, 1n],
        }),
      )
    })
  })

  it('shows success message after burn', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    await waitFor(() => {
      expect(screen.getByText('Tokens burned successfully!')).toBeInTheDocument()
    })
  })

  it('calls onRefresh after burn', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  it('clears quantities after successful burn', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    const input = screen.getByLabelText('Quantity')
    await user.type(input, '2')
    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    await waitFor(() => {
      expect(input).toHaveValue(null)
    })
  })

  it('shows error message when burn fails', async () => {
    vi.mocked(burnTokens).mockRejectedValue(new Error('Tx reverted'))
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    await waitFor(() => {
      expect(screen.getByText('Tx reverted')).toBeInTheDocument()
    })
  })

  it('renders token images when tokenImages prop provided', () => {
    const contributions = [makeContribution({ tokenIds: '["1"]', tokenCounts: '["5"]' })]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
        tokenImages={{ '1': 'ipfs://bafyimage123' }}
      />
    )
    const img = screen.getByAltText('Token #1')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'ipfs://bafyimage123')
  })

  it('does not render token images when tokenImages not provided', () => {
    const contributions = [makeContribution({ tokenIds: '["1"]', tokenCounts: '["5"]' })]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('does nothing when address is undefined', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={undefined}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    expect(burnTokens).not.toHaveBeenCalled()
  })

  it('does nothing when no burnable tokens', async () => {
    const user = userEvent.setup()
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={[]}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    expect(burnTokens).not.toHaveBeenCalled()
  })

  it('shows loading state while burning', async () => {
    vi.mocked(burnTokens).mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <BurnTokensSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        userBurns={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.type(screen.getByLabelText('Quantity'), '1')
    await user.click(screen.getByRole('button', { name: 'Burn Tokens' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Burning...' })).toBeInTheDocument()
    })
  })
})
