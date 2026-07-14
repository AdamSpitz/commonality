import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RefundSection } from './RefundSection'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const PROJECT_ADDR = '0xaaaa000000000000000000000000000000000001'
const ERC1155_ADDR = '0xbbbb000000000000000000000000000000000002'

vi.mock('wagmi', () => ({
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk/abis', async () => {
  const actual = await vi.importActual('@commonality/sdk/abis')
  return {
    ...actual,
    AssuranceContractAbi: [],
  }
})

vi.mock('@commonality/sdk/lazy-giving', async () => {
  const actual = await vi.importActual('@commonality/sdk/lazy-giving')
  return {
    ...actual,
    approveERC1155ForOperator: vi.fn(),
    refundProjectTokens: vi.fn(),
  }
})

import { useWalletClient, usePublicClient } from 'wagmi'
import { approveERC1155ForOperator, refundProjectTokens } from '@commonality/sdk/lazy-giving'

function makeProject(overrides: Record<string, any> = {}): any {
  return {
    id: PROJECT_ADDR,
    erc1155Address: ERC1155_ADDR,
    recipient: '0xcccc000000000000000000000000000000000003',
    threshold: '1000000000000000000',
    deadline: String(Math.floor(Date.now() / 1000) - 86400),
    totalReceived: '500000000000000000',
    metadataCid: 'bafytest123',
    createdAt: '1700000000',
    ...overrides,
  }
}

function makeContribution(overrides: Record<string, any> = {}): any {
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

function makeRefund(overrides: Record<string, any> = {}): any {
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

describe('RefundSection', () => {
  const onRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useWalletClient).mockReturnValue({
      data: { chain: { blockExplorers: { default: { url: 'https://explorer.example' } } } },
    } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(approveERC1155ForOperator).mockResolvedValue('0xapprovetx' as any)
    vi.mocked(refundProjectTokens).mockResolvedValue('0xtxhash' as any)
  })

  it('renders heading and description', () => {
    const contributions = [makeContribution()]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByRole('heading', { name: 'Refund Tokens' })).toBeInTheDocument()
    expect(screen.getByText(/deadline has passed/)).toBeInTheDocument()
    expect(screen.getByText(/Commonality never custodies those funds/)).toBeInTheDocument()
    expect(screen.getByText(/both calls are eligible for sponsored gas/)).toBeInTheDocument()
    expect(screen.getByText(/licensed off-ramp\/KYC flow/)).toBeInTheDocument()
  })

  it('displays refundable token counts', () => {
    const contributions = [makeContribution({ tokenIds: '["1", "2"]', tokenCounts: '["5", "3"]' })]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByText('Token #1: 5 refundable')).toBeInTheDocument()
    expect(screen.getByText('Token #2: 3 refundable')).toBeInTheDocument()
  })

  it('subtracts already-refunded tokens from count', () => {
    const contributions = [makeContribution({ tokenIds: '["1"]', tokenCounts: '["5"]' })]
    const refunds = [makeRefund({ tokenIds: '["1"]', tokenCounts: '["2"]' })]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={refunds}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByText('Token #1: 3 refundable')).toBeInTheDocument()
  })

  it('renders Refund All button', () => {
    const contributions = [makeContribution()]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )
    expect(screen.getByRole('button', { name: 'Refund All' })).toBeInTheDocument()
  })

  it('approves the project as receipt-token operator before refunding', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Refund All' }))

    await waitFor(() => {
      expect(approveERC1155ForOperator).toHaveBeenCalledWith(
        expect.objectContaining({ account: USER_ADDR }),
        ERC1155_ADDR,
        PROJECT_ADDR,
      )
    })
  })

  it('calls refundProjectTokens with correct params', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution({ tokenIds: '["1", "2"]', tokenCounts: '["5", "3"]' })]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Refund All' }))

    await waitFor(() => {
      expect(refundProjectTokens).toHaveBeenCalledWith(
        expect.objectContaining({ account: USER_ADDR }),
        expect.objectContaining({ address: PROJECT_ADDR }),
        expect.objectContaining({
          holder: USER_ADDR,
          tokenAddress: ERC1155_ADDR,
          tokenIds: [1n, 2n],
          tokenCounts: [5n, 3n],
        }),
      )
    })
  })

  it('shows success message after refund', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Refund All' }))

    await waitFor(() => {
      expect(screen.getByText(/Refund sent/)).toBeInTheDocument()
      expect(screen.getByText(/approval and refund can be gas-sponsored/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'View transaction.' })).toHaveAttribute(
        'href',
        'https://explorer.example/tx/0xtxhash',
      )
    })
  })

  it('calls onRefresh after refund', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Refund All' }))

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  it('shows error message when refund fails', async () => {
    vi.mocked(refundProjectTokens).mockRejectedValue(new Error('Transaction reverted'))
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Refund All' }))

    await waitFor(() => {
      expect(screen.getByText('Transaction reverted')).toBeInTheDocument()
    })
  })

  it('does nothing when address is undefined', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={undefined}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Refund All' }))

    expect(approveERC1155ForOperator).not.toHaveBeenCalled()
    expect(refundProjectTokens).not.toHaveBeenCalled()
  })

  it('does nothing when no refundable tokens', async () => {
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    const refunds = [makeRefund({ tokenIds: '["1"]', tokenCounts: '["5"]' })]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={refunds}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Refund All' }))

    expect(approveERC1155ForOperator).not.toHaveBeenCalled()
    expect(refundProjectTokens).not.toHaveBeenCalled()
  })

  it('shows loading state while refunding', async () => {
    vi.mocked(refundProjectTokens).mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    const contributions = [makeContribution()]
    render(
      <RefundSection
        project={makeProject()}
        contributions={contributions}
        refunds={[]}
        address={USER_ADDR}
        onRefresh={onRefresh}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Refund All' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Refunding...' })).toBeInTheDocument()
    })
  })
})
