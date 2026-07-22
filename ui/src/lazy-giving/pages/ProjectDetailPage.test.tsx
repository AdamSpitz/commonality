import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectDetailPage } from './ProjectDetailPage'

// Mock react-router-dom
const mockProjectAddress = '0x1234567890abcdef1234567890abcdef12345678'
vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
  useParams: () => ({ projectAddress: mockProjectAddress }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

// Mock wagmi
const mockAccount = {
  address: undefined as `0x${string}` | undefined,
  isConnected: false,
}
const mockWalletClient = { data: undefined as any }
const mockPublicClient = {} as any

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>()
  return {
    ...actual,
    useAccount: () => mockAccount,
    useWalletClient: () => mockWalletClient,
    usePublicClient: () => mockPublicClient,
  }
})

vi.mock('connectkit', () => ({
  ConnectKitButton: () => <button type="button">Connect Wallet</button>,
  getDefaultConfig: () => ({}),
}))

vi.mock('../../wagmi', () => ({ isPrivyEnabled: false }))

// Mock SDK
vi.mock('@commonality/sdk/lazy-giving', async () => {
  const actual = await vi.importActual('@commonality/sdk/lazy-giving')
  return {
    ...actual,
    getProject: vi.fn(),
    getProjectTokens: vi.fn(),
    getProjectContributions: vi.fn(),
    getProjectRefunds: vi.fn(),
    getProjectReimbursementState: vi.fn(),
    getContributorReimbursementState: vi.fn(),
    buyProjectTokens: vi.fn(),
    approveERC1155ForOperator: vi.fn(),
    refundProjectTokens: vi.fn(),
    withdrawProjectFunds: vi.fn(),
  }
})

vi.mock('@commonality/sdk/machinery', async () => {
  const actual = await vi.importActual('@commonality/sdk/machinery')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
  }
})

vi.mock('@commonality/sdk/utils', async () => {
  const actual = await vi.importActual('@commonality/sdk/utils')
  return {
    ...actual,
    fetchFromIPFS: vi.fn(),
  }
})

import { getProject, getProjectTokens, getProjectContributions, getProjectRefunds, getProjectReimbursementState, getContributorReimbursementState, buyProjectTokens, approveERC1155ForOperator, refundProjectTokens, withdrawProjectFunds } from '@commonality/sdk/lazy-giving'
import { createSDKMachinery } from '@commonality/sdk/machinery'
import { fetchFromIPFS } from '@commonality/sdk/utils'

const mockMachinery = {} as any
const NOW_SECONDS = Math.floor(Date.now() / 1000)
const USDC_CURRENCY = {
  kind: 'erc20' as const,
  symbol: 'USDC',
  decimals: 6,
  tokenAddress: '0x1212121212121212121212121212121212121212',
  tokenType: 0,
}

function makeProject(overrides: Record<string, any> = {}) {
  return {
    id: mockProjectAddress,
    erc1155Address: '0xaaaa',
    recipient: '0xbbbbccccddddeeee1111222233334444aaaabbbb',
    threshold: '1000000000000000000', // 1 ETH
    deadline: String(NOW_SECONDS + 86400), // 1 day from now
    totalReceived: '500000000000000000', // 0.5 ETH
    metadataCid: 'bafytest123',
    createdAt: '1700000000',
    ...overrides,
  }
}

function makeToken(overrides: Record<string, any> = {}) {
  return {
    projectAddress: mockProjectAddress,
    erc1155Address: '0xaaaa',
    tokenId: '1',
    price: '100000000000000000', // 0.1 ETH
    createdAt: '1700000000',
    ...overrides,
  }
}

function makeContribution(overrides: Record<string, any> = {}) {
  return {
    id: 'contrib-1',
    participant: '0x1111111111111111111111111111111111111111',
    projectAddress: mockProjectAddress,
    erc1155Address: '0xaaaa',
    tokenIds: '["1"]',
    tokenCounts: '["5"]',
    totalCost: '500000000000000000', // 0.5 ETH
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
    projectAddress: mockProjectAddress,
    erc1155Address: '0xaaaa',
    tokenIds: '["1"]',
    tokenCounts: '["2"]',
    totalRefund: '200000000000000000', // 0.2 ETH
    createdAt: '1700000100',
    blockNumber: '110',
    transactionHash: '0xhash2',
    ...overrides,
  }
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(fetchFromIPFS).mockResolvedValue(null)
    vi.mocked(getProjectTokens).mockResolvedValue([])
    vi.mocked(getProjectContributions).mockResolvedValue([])
    vi.mocked(getProjectRefunds).mockResolvedValue([])
    vi.mocked(getProjectReimbursementState).mockResolvedValue({
      projectAddress: mockProjectAddress,
      currency: { kind: 'native', symbol: 'ETH', decimals: 18, tokenAddress: null, tokenType: 0 },
      totalEarlyContributions: '0', totalRetroactiveDonations: '0', outstandingReimbursement: '0',
      totalReimbursementsWithdrawn: '0', totalReimbursementsForgone: '0',
    })
    vi.mocked(getContributorReimbursementState).mockResolvedValue({
      projectAddress: mockProjectAddress, contributor: mockProjectAddress,
      currency: { kind: 'native', symbol: 'ETH', decimals: 18, tokenAddress: null, tokenType: 0 },
      earlyContribution: '0', reimbursableAmount: '0', withdrawnAmount: '0', forgoneAmount: '0',
    })
    vi.mocked(approveERC1155ForOperator).mockResolvedValue('0xapprove' as any)
    mockAccount.address = undefined
    mockAccount.isConnected = false
    mockWalletClient.data = undefined
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching project', () => {
      vi.mocked(getProject).mockReturnValue(new Promise(() => {}))
      vi.mocked(getProjectTokens).mockReturnValue(new Promise(() => {}))
      vi.mocked(getProjectContributions).mockReturnValue(new Promise(() => {}))
      vi.mocked(getProjectRefunds).mockReturnValue(new Promise(() => {}))

      render(<ProjectDetailPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error states', () => {
    it('displays error when project is not found', async () => {
      vi.mocked(getProject).mockResolvedValue(null)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Project not found' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Back to projects' })).toHaveAttribute('href', '/projects')
      })
    })

    it('displays error when API call fails', async () => {
      vi.mocked(getProject).mockRejectedValue(new Error('Network error'))

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText("We couldn't load this project")).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
        // The technical detail is still surfaced (demoted to a caption).
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('displays generic error for non-Error exceptions', async () => {
      vi.mocked(getProject).mockRejectedValue('string error')

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load project')).toBeInTheDocument()
      })
    })
  })

  describe('Header section', () => {
    it('displays project name from IPFS metadata', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'My Cool Project', description: 'A great project' })

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'My Cool Project' })).toBeInTheDocument()
      })
    })

    it('displays truncated address when no metadata available', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({ metadataCid: undefined }) as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/Project 0x12345678/)).toBeInTheDocument()
      })
    })

    it('displays project description from metadata', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Test', description: 'A detailed description' })

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('A detailed description')).toBeInTheDocument()
      })
    })

    it('displays recipient address', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/Recipient:/)).toBeInTheDocument()
        expect(screen.getByText(/0xbbbb\.\.\.bbbb/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /copy recipient address/i })).toBeInTheDocument()
      })
    })

    it('displays Funding status badge for active projects', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Funding')).toBeInTheDocument()
      })
    })

    it('displays Succeeded status badge when threshold met', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({
        totalReceived: '2000000000000000000',
      }) as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Succeeded')).toBeInTheDocument()
      })
    })

    it('displays Refunding status badge when deadline passed and threshold not met', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({
        deadline: String(NOW_SECONDS - 86400),
      }) as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Refunding')).toBeInTheDocument()
      })
    })

    it('displays funding progress as ETH amounts', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/0\.5 of 1 ETH raised/)).toBeInTheDocument()
      })
    })

    it('displays funding percentage', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument()
      })
    })

    it('displays deadline countdown', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/left/)).toBeInTheDocument()
      })
    })

    it('displays Ended for past deadlines', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({
        deadline: String(NOW_SECONDS - 86400),
        totalReceived: '2000000000000000000',
      }) as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Ended')).toBeInTheDocument()
      })
    })
  })

  describe('Giving section', () => {
    it('shows a read-only pledge preview but no interactive giving form when wallet not connected', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Connect your wallet to give to this project.')).toBeInTheDocument()
      })
      // The read-only preview shows the heading and giving options...
      expect(screen.getByText('Give to this project')).toBeInTheDocument()
      expect(screen.getByText('Giving options')).toBeInTheDocument()
      // ...but not the interactive amount field or Give button.
      expect(screen.queryByLabelText(/Give amount/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Give' })).not.toBeInTheDocument()
    })

    it('shows the card on-ramp sign-in CTA for disconnected visitors on USDC projects', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({ fundingCurrency: USDC_CURRENCY }) as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken({ price: '100000', currency: USDC_CURRENCY })] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('Give amount (USDC)')).toBeInTheDocument()
      })
      expect(screen.getByText(/Sign in first so Commonality can create your non-custodial wallet address/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pay by card' })).toBeDisabled()
      expect(screen.queryByText('Connect your wallet to give to this project.')).not.toBeInTheDocument()
    })

    it('shows giving section when wallet connected and project is active', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Give to this project')).toBeInTheDocument()
      })
    })

    it('does not show giving form for succeeded projects', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject({
        totalReceived: '2000000000000000000',
      }) as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Succeeded')).toBeInTheDocument()
      })
      expect(screen.queryByText('Give to this project')).not.toBeInTheDocument()
    })

    it('displays reward add-on info with price', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([
        makeToken({ tokenId: '1', price: '100000000000000000' }),
        makeToken({ tokenId: '2', price: '200000000000000000' }),
      ] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Give to this project')).toBeInTheDocument()
        expect(screen.getByLabelText('Give amount (ETH)')).toBeInTheDocument()
        expect(screen.getByText('Reward #2')).toBeInTheDocument()
        expect(screen.getByText('Adds 0.2 ETH')).toBeInTheDocument()
      })
    })

    it('shows error when the exact give amount is unavailable', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Give to this project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Give amount (ETH)'), '0.05')
      await user.click(screen.getByRole('button', { name: 'Give' }))

      await waitFor(() => {
        expect(screen.getAllByText('No available contribution option can fit this amount.').length).toBeGreaterThan(0)
      })
    })

    it('calls buyProjectTokens with correct params', async () => {
      const mockAddress = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.address = mockAddress
      mockAccount.isConnected = true
      mockWalletClient.data = { writeContract: vi.fn() } as any
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)
      vi.mocked(buyProjectTokens).mockResolvedValue('0xhash' as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Give to this project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const amountInput = screen.getByLabelText('Give amount (ETH)')
      await user.type(amountInput, '0.3')
      await user.click(screen.getByRole('button', { name: 'Give' }))

      await waitFor(() => {
        expect(buyProjectTokens).toHaveBeenCalledWith(
          expect.objectContaining({ account: mockAddress }),
          expect.objectContaining({ address: mockProjectAddress }),
          expect.objectContaining({
            buyer: mockAddress,
            tokenAddress: '0xaaaa',
            tokenIds: [1n],
            tokenCounts: [3n],
            totalCost: 300000000000000000n,
          })
        )
      })
    })

    it('shows success message after purchase', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)
      vi.mocked(buyProjectTokens).mockResolvedValue('0xhash' as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Give to this project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Give amount (ETH)'), '0.1')
      await user.click(screen.getByRole('button', { name: 'Give' }))

      await waitFor(() => {
        expect(screen.getByText(/Contribution sent successfully/)).toBeInTheDocument()
      })
    })

    it('shows error message when purchase fails', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)
      vi.mocked(buyProjectTokens).mockRejectedValue(new Error('Insufficient funds'))

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Give to this project')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Give amount (ETH)'), '0.1')
      await user.click(screen.getByRole('button', { name: 'Give' }))

      await waitFor(() => {
        expect(screen.getByText(/enough ETH to cover the network fee/i)).toBeInTheDocument()
      })
    })
  })

  describe('User-visible state matrix', () => {
    it('explains active projects that have no indexed giving options yet', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([])

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/no giving options are indexed yet/i)).toBeInTheDocument()
      })
      expect(screen.queryByText('Give to this project')).not.toBeInTheDocument()
    })

    it('explains refunding projects when the connected wallet has nothing refundable', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject({
        deadline: String(NOW_SECONDS - 86400),
        totalReceived: '500000000000000000',
      }) as any)
      vi.mocked(getProjectContributions).mockResolvedValue([])

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/no refundable tokens left/i)).toBeInTheDocument()
      })
      expect(screen.queryByText('Refund Tokens')).not.toBeInTheDocument()
    })

    it('explains succeeded projects to connected contributors who are not the recipient', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject({
        totalReceived: '2000000000000000000',
      }) as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/only the recipient wallet can withdraw/i)).toBeInTheDocument()
        expect(screen.getByText(/permanent recognition receipts/i)).toBeInTheDocument()
      })
      expect(screen.queryByRole('heading', { name: 'Withdraw Funds' })).not.toBeInTheDocument()
    })
  })

  describe('IPFS metadata', () => {
    it('fetches metadata for projects with metadataCid', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'From IPFS' })

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(fetchFromIPFS).toHaveBeenCalledWith(
          expect.objectContaining({}),
          'bafytest123'
        )
        expect(screen.getByText('From IPFS')).toBeInTheDocument()
      })
    })

    it('does not turn unavailable project metadata into a page-level failure', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(fetchFromIPFS).mockResolvedValue(null)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/Project 0x12345678/)).toBeInTheDocument()
        expect(screen.getByText(/Project metadata could not be loaded from IPFS/i)).toBeInTheDocument()
      })
      expect(screen.queryByText('Project not found')).not.toBeInTheDocument()
    })

    it('keeps funding actions available when token metadata is unavailable', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)
      vi.mocked(fetchFromIPFS).mockImplementation(async (_config, cid) => {
        if (cid === 'bafytest123') return { name: 'Fundable Project', tokens: { 1: 'bafy-token' } }
        throw new Error('IPFS gateway down')
      })

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Fundable Project' })).toBeInTheDocument()
        expect(screen.getByText('Give to this project')).toBeInTheDocument()
        expect(screen.getByLabelText('Give amount (ETH)')).toBeInTheDocument()
        expect(screen.getByText(/Some token metadata could not be loaded from IPFS/i)).toBeInTheDocument()
      })
    })

    it('does not fetch metadata for projects without metadataCid', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({ metadataCid: undefined }) as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/Project 0x12345678/)).toBeInTheDocument()
      })

      expect(fetchFromIPFS).not.toHaveBeenCalled()
    })
  })

  describe('Refund section', () => {
    const refundingProject = () => makeProject({
      deadline: String(NOW_SECONDS - 86400), // past deadline
      totalReceived: '500000000000000000', // below threshold
    })

    it('shows Refund section when project is refunding and user has contributed', async () => {
      const userAddr = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.address = userAddr
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(refundingProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([makeContribution({ participant: userAddr })] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Refund Tokens')).toBeInTheDocument()
        expect(screen.getByText(/Token #1: 5 refundable/)).toBeInTheDocument()
      })
    })

    it('does not show Refund section for active projects', async () => {
      const userAddr = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.address = userAddr
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([makeContribution({ participant: userAddr })] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Funding')).toBeInTheDocument()
      })
      expect(screen.queryByText('Refund Tokens')).not.toBeInTheDocument()
    })

    it('does not show Refund section when user has no contributions', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(refundingProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Refunding')).toBeInTheDocument()
      })
      expect(screen.queryByText('Refund Tokens')).not.toBeInTheDocument()
    })

    it('subtracts already-refunded tokens from refundable count', async () => {
      const userAddr = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.address = userAddr
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(refundingProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([
        makeContribution({ participant: userAddr, tokenIds: '["1"]', tokenCounts: '["5"]' }),
      ] as any)
      vi.mocked(getProjectRefunds).mockResolvedValue([
        makeRefund({ participant: userAddr, tokenIds: '["1"]', tokenCounts: '["3"]' }),
      ] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/Token #1: 2 refundable/)).toBeInTheDocument()
      })
    })

    it('hides Refund section when all tokens already refunded', async () => {
      const userAddr = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.address = userAddr
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(refundingProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([
        makeContribution({ participant: userAddr, tokenIds: '["1"]', tokenCounts: '["5"]' }),
      ] as any)
      vi.mocked(getProjectRefunds).mockResolvedValue([
        makeRefund({ participant: userAddr, tokenIds: '["1"]', tokenCounts: '["5"]' }),
      ] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Refunding')).toBeInTheDocument()
      })
      expect(screen.queryByText('Refund Tokens')).not.toBeInTheDocument()
    })

    it('calls refundProjectTokens when Refund All clicked', async () => {
      const userAddr = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.address = userAddr
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(refundingProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([makeContribution({ participant: userAddr })] as any)
      vi.mocked(refundProjectTokens).mockResolvedValue('0xhash' as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Refund Tokens')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Refund All' }))

      await waitFor(() => {
        expect(refundProjectTokens).toHaveBeenCalledWith(
          expect.objectContaining({ account: userAddr }),
          expect.objectContaining({ address: mockProjectAddress }),
          expect.objectContaining({
            holder: userAddr,
            tokenAddress: '0xaaaa',
            tokenIds: [1n],
            tokenCounts: [5n],
          })
        )
      })
    })

    it('shows success message after refund', async () => {
      const userAddr = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.address = userAddr
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(refundingProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([makeContribution({ participant: userAddr })] as any)
      vi.mocked(refundProjectTokens).mockResolvedValue('0xhash' as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Refund Tokens')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Refund All' }))

      await waitFor(() => {
        expect(screen.getByText(/Refund sent/)).toBeInTheDocument()
      })
    })

    it('shows error message when refund fails', async () => {
      const userAddr = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.address = userAddr
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(refundingProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([makeContribution({ participant: userAddr })] as any)
      vi.mocked(refundProjectTokens).mockRejectedValue(new Error('Transaction reverted'))

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Refund Tokens')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Refund All' }))

      await waitFor(() => {
        expect(screen.getByText('Transaction reverted')).toBeInTheDocument()
      })
    })
  })

  describe('Withdraw section', () => {
    const recipientAddr = '0xbbbbccccddddeeee1111222233334444aaaabbbb' as `0x${string}`
    const succeededProject = () => makeProject({
      totalReceived: '2000000000000000000', // above threshold
      recipient: recipientAddr,
    })

    it('shows Withdraw section for recipient when threshold met', async () => {
      mockAccount.address = recipientAddr
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(succeededProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Withdraw Funds' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Withdraw Funds' })).toBeInTheDocument()
      })
    })

    it('does not show Withdraw section for non-recipient', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(succeededProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Succeeded')).toBeInTheDocument()
      })
      expect(screen.queryByRole('heading', { name: 'Withdraw Funds' })).not.toBeInTheDocument()
    })

    it('does not show Withdraw section for active projects', async () => {
      mockAccount.address = recipientAddr
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject({ recipient: recipientAddr }) as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Funding')).toBeInTheDocument()
      })
      expect(screen.queryByRole('heading', { name: 'Withdraw Funds' })).not.toBeInTheDocument()
    })

    it('calls withdrawProjectFunds when Withdraw button clicked', async () => {
      mockAccount.address = recipientAddr
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(succeededProject() as any)
      vi.mocked(withdrawProjectFunds).mockResolvedValue('0xhash' as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Withdraw Funds' })).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

      await waitFor(() => {
        expect(withdrawProjectFunds).toHaveBeenCalledWith(
          expect.objectContaining({ account: recipientAddr }),
          expect.objectContaining({ address: mockProjectAddress })
        )
      })
    })

    it('shows success message after withdrawal', async () => {
      mockAccount.address = recipientAddr
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(succeededProject() as any)
      vi.mocked(withdrawProjectFunds).mockResolvedValue('0xhash' as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Withdraw Funds' })).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

      await waitFor(() => {
        expect(screen.getByText('Funds withdrawn successfully!')).toBeInTheDocument()
      })
    })

    it('shows error message when withdrawal fails', async () => {
      mockAccount.address = recipientAddr
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(succeededProject() as any)
      vi.mocked(withdrawProjectFunds).mockRejectedValue(new Error('Already withdrawn'))

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Withdraw Funds' })).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Withdraw Funds' }))

      await waitFor(() => {
        expect(screen.getByText('Already withdrawn')).toBeInTheDocument()
      })
    })
  })

  describe('Contributor Leaderboard', () => {
    it('shows leaderboard when there are contributions', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([
        makeContribution({
          participant: '0xaaaa111111111111111111111111111111111111',
          totalCost: '1000000000000000000',
        }),
        makeContribution({
          participant: '0xbbbb111111111111111111111111111111111111',
          totalCost: '500000000000000000',
        }),
      ] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Contributor Leaderboard')).toBeInTheDocument()
        expect(screen.getByText('0xaaaa...1111')).toBeInTheDocument()
        expect(screen.getByText('0xbbbb...1111')).toBeInTheDocument()
      })
    })

    it('does not show leaderboard when no contributions', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/ETH raised/)).toBeInTheDocument()
      })
      expect(screen.queryByText('Contributor Leaderboard')).not.toBeInTheDocument()
    })

    it('sorts contributors by net contribution descending', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([
        makeContribution({
          participant: '0xaaaa111111111111111111111111111111111111',
          totalCost: '500000000000000000', // 0.5 ETH
        }),
        makeContribution({
          participant: '0xbbbb111111111111111111111111111111111111',
          totalCost: '1000000000000000000', // 1 ETH
        }),
      ] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        // rows[0] is header, rows[1] should be the higher contributor
        expect(rows[1]).toHaveTextContent('0xbbbb...1111')
        expect(rows[2]).toHaveTextContent('0xaaaa...1111')
      })
    })

    it('accounts for refunds in net contribution', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([
        makeContribution({
          participant: '0xaaaa111111111111111111111111111111111111',
          totalCost: '1000000000000000000', // 1 ETH
        }),
      ] as any)
      vi.mocked(getProjectRefunds).mockResolvedValue([
        makeRefund({
          participant: '0xaaaa111111111111111111111111111111111111',
          totalRefund: '300000000000000000', // 0.3 ETH
        }),
      ] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Contributor Leaderboard')).toBeInTheDocument()
        // Net should be 0.7 ETH
        expect(screen.getByText('0.7 ETH')).toBeInTheDocument()
      })
    })

    it('excludes contributors with zero net contribution', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectContributions).mockResolvedValue([
        makeContribution({
          participant: '0xaaaa111111111111111111111111111111111111',
          totalCost: '500000000000000000',
        }),
      ] as any)
      vi.mocked(getProjectRefunds).mockResolvedValue([
        makeRefund({
          participant: '0xaaaa111111111111111111111111111111111111',
          totalRefund: '500000000000000000',
        }),
      ] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/ETH raised/)).toBeInTheDocument()
      })
      expect(screen.queryByText('Contributor Leaderboard')).not.toBeInTheDocument()
    })
  })
})
