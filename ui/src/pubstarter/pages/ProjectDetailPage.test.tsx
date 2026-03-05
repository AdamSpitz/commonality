import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectDetailPage } from './ProjectDetailPage'

// Mock react-router-dom
const mockProjectAddress = '0x1234567890abcdef1234567890abcdef12345678'
vi.mock('react-router-dom', () => ({
  useParams: () => ({ projectAddress: mockProjectAddress }),
}))

// Mock wagmi
const mockAccount = {
  address: undefined as `0x${string}` | undefined,
  isConnected: false,
}
const mockWalletClient = { data: undefined as any }
const mockPublicClient = {} as any

vi.mock('wagmi', () => ({
  useAccount: () => mockAccount,
  useWalletClient: () => mockWalletClient,
  usePublicClient: () => mockPublicClient,
}))

// Mock SDK
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getProject: vi.fn(),
    getProjectTokens: vi.fn(),
    buyProjectTokens: vi.fn(),
    fetchFromIPFS: vi.fn(),
  }
})

import {
  createSDKMachinery,
  getProject,
  getProjectTokens,
  buyProjectTokens,
  fetchFromIPFS,
} from '@commonality/sdk'

const mockMachinery = {} as any
const NOW_SECONDS = Math.floor(Date.now() / 1000)

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

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(fetchFromIPFS).mockResolvedValue(null)
    vi.mocked(getProjectTokens).mockResolvedValue([])
    mockAccount.address = undefined
    mockAccount.isConnected = false
    mockWalletClient.data = undefined
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching project', () => {
      vi.mocked(getProject).mockReturnValue(new Promise(() => {}))
      vi.mocked(getProjectTokens).mockReturnValue(new Promise(() => {}))

      render(<ProjectDetailPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error states', () => {
    it('displays error when project is not found', async () => {
      vi.mocked(getProject).mockResolvedValue(null)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Project not found')).toBeInTheDocument()
      })
    })

    it('displays error when API call fails', async () => {
      vi.mocked(getProject).mockRejectedValue(new Error('Network error'))

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
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
        expect(screen.getByText(/0xbbbbccccddddeeee/)).toBeInTheDocument()
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

  describe('Buy Tokens section', () => {
    it('does not show Buy Tokens when wallet not connected', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Connect your wallet to buy tokens.')).toBeInTheDocument()
      })
      expect(screen.queryByText('Buy Tokens')).not.toBeInTheDocument()
    })

    it('shows Buy Tokens section when wallet connected and project is active', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Buy Tokens')).toBeInTheDocument()
      })
    })

    it('does not show Buy Tokens for succeeded projects', async () => {
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
      expect(screen.queryByText('Buy Tokens')).not.toBeInTheDocument()
    })

    it('displays token info with price', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([
        makeToken({ tokenId: '1', price: '100000000000000000' }),
        makeToken({ tokenId: '2', price: '200000000000000000' }),
      ] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Token #1')).toBeInTheDocument()
        expect(screen.getByText('0.1 ETH each')).toBeInTheDocument()
        expect(screen.getByText('Token #2')).toBeInTheDocument()
        expect(screen.getByText('0.2 ETH each')).toBeInTheDocument()
      })
    })

    it('shows error when trying to buy with no quantity', async () => {
      mockAccount.address = '0x1111111111111111111111111111111111111111' as `0x${string}`
      mockAccount.isConnected = true
      mockWalletClient.data = {} as any
      vi.mocked(getProject).mockResolvedValue(makeProject() as any)
      vi.mocked(getProjectTokens).mockResolvedValue([makeToken()] as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Buy Tokens')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(screen.getByText('Please enter a quantity for at least one token')).toBeInTheDocument()
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
        expect(screen.getByText('Buy Tokens')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const quantityInput = screen.getByLabelText('Quantity')
      await user.type(quantityInput, '3')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

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
        expect(screen.getByText('Buy Tokens')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Quantity'), '1')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(screen.getByText('Tokens purchased successfully!')).toBeInTheDocument()
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
        expect(screen.getByText('Buy Tokens')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Quantity'), '1')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(screen.getByText('Insufficient funds')).toBeInTheDocument()
      })
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

    it('does not fetch metadata for projects without metadataCid', async () => {
      vi.mocked(getProject).mockResolvedValue(makeProject({ metadataCid: undefined }) as any)

      render(<ProjectDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/Project 0x12345678/)).toBeInTheDocument()
      })

      expect(fetchFromIPFS).not.toHaveBeenCalled()
    })
  })
})
