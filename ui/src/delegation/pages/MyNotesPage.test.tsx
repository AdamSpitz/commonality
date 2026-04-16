import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyNotesPage } from './MyNotesPage'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
}))

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(() => ({ data: null })),
  usePublicClient: vi.fn(() => null),
}))

// Mock the SDK functions
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getNotesByOwner: vi.fn(),
    getNotesByRoot: vi.fn(),
    getDelegationChain: vi.fn(),
    delegateNote: vi.fn(),
    revokeNote: vi.fn(),
    reclaimFunds: vi.fn(),
  }
})

import { useAccount } from 'wagmi'
import {
  createSDKMachinery,
  getNotesByOwner,
  getNotesByRoot,
} from '@commonality/sdk'

const mockMachinery = {} as any

function makeNote(overrides: Record<string, any> = {}) {
  return {
    id: '1',
    chainHash: '0xabc',
    amount: '1000000000000000000', // 1 ETH
    token: '0x0000000000000000000000000000000000000000',
    tokenType: 0,
    tokenId: '0',
    owner: '0x1111111111111111111111111111111111111111',
    rootOwner: '0x1111111111111111111111111111111111111111',
    active: true,
    createdAt: '1700000000',
    createdAtBlock: '100',
    updatedAt: '1700000000',
    ...overrides,
  }
}

describe('MyNotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
  })

  describe('Wallet not connected', () => {
    it('shows connect wallet prompt when no wallet is connected', () => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)

      render(<MyNotesPage />)

      expect(screen.getByText('My Delegated Funds')).toBeInTheDocument()
      expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
    })

    it('does not show notes sections when wallet not connected', () => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)

      render(<MyNotesPage />)

      expect(screen.queryByText('Funds I Control')).not.toBeInTheDocument()
      expect(screen.queryByText('Funds I Created')).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('shows loading spinner while fetching notes', () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x1111111111111111111111111111111111111111',
      } as any)
      vi.mocked(getNotesByOwner).mockReturnValue(new Promise(() => {}))
      vi.mocked(getNotesByRoot).mockReturnValue(new Promise(() => {}))

      render(<MyNotesPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error message when loading fails', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x1111111111111111111111111111111111111111',
      } as any)
      vi.mocked(getNotesByOwner).mockRejectedValue(new Error('Network error'))
      vi.mocked(getNotesByRoot).mockRejectedValue(new Error('Network error'))

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    it('shows empty messages when user has no notes', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x1111111111111111111111111111111111111111',
      } as any)
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByText(/don't control any funds/i)).toBeInTheDocument()
        expect(screen.getByText(/haven't created any delegated funds/i)).toBeInTheDocument()
      })
    })
  })

  describe('Successful rendering', () => {
    const userAddress = '0x1111111111111111111111111111111111111111'

    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
    })

    it('displays summary cards', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([makeNote()] as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByText('Total Funds')).toBeInTheDocument()
        expect(screen.getByText('Active Funds')).toBeInTheDocument()
        expect(screen.getByText('Acting as Delegate')).toBeInTheDocument()
        expect(screen.getByText('Created & Delegated')).toBeInTheDocument()
      })
    })

    it('displays total funds in summary', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([makeNote()] as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        // Summary card shows total funds; note card also shows amount
        const totalFundsCard = screen.getByText('Total Funds').closest('div')
        expect(totalFundsCard).toHaveTextContent('1 ETH')
      })
    })

    it('displays owned notes in "Notes I Control" section', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([
        makeNote({ id: '42' }),
      ] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByText('Funds I Control')).toBeInTheDocument()
        expect(screen.getByText('Fund #42')).toBeInTheDocument()
      })
    })

    it('shows "Delegated from" chip on delegated notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([
        makeNote({
          owner: userAddress,
          rootOwner: '0x2222222222222222222222222222222222222222',
        }),
      ] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByText(/delegated from/i)).toBeInTheDocument()
      })
    })

    it('shows "Undelegated" chip for non-delegated deposited notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([makeNote()] as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByText('Undelegated')).toBeInTheDocument()
      })
    })

    it('shows Delegate button on owned notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument()
      })
    })

    it('shows Reclaim button on undelegated deposited notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([makeNote()] as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reclaim' })).toBeInTheDocument()
      })
    })

    it('shows Revoke button on delegated deposited notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([
        makeNote({
          rootOwner: userAddress,
          owner: '0x2222222222222222222222222222222222222222',
        }),
      ] as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
      })
    })

    it('links notes to detail page', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote({ id: '7' })] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        const link = screen.getByText('Fund #7').closest('a')
        expect(link).toHaveAttribute('href', '/notes/7')
      })
    })

    it('shows Deposit New Note button', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        const depositLink = screen.getByRole('link', { name: /add funds/i })
        expect(depositLink).toHaveAttribute('href', '/notes/new')
      })
    })

    it('filters out inactive notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([
        makeNote({ id: '1', active: true }),
        makeNote({ id: '2', active: false }),
      ] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByText('Fund #1')).toBeInTheDocument()
        expect(screen.queryByText('Fund #2')).not.toBeInTheDocument()
      })
    })

    it('counts acting-as-delegate correctly', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([
        makeNote({ id: '1', owner: userAddress, rootOwner: userAddress }),
        makeNote({ id: '2', owner: userAddress, rootOwner: '0x2222222222222222222222222222222222222222' }),
        makeNote({ id: '3', owner: userAddress, rootOwner: '0x3333333333333333333333333333333333333333' }),
      ] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        // 2 notes where owner != rootOwner = acting as delegate
        const delegateCard = screen.getByText('Acting as Delegate').closest('div')
        expect(delegateCard).toHaveTextContent('2')
      })
    })
  })
})
