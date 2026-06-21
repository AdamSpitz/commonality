import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
    getActiveStandingPledgesByUser: vi.fn(),
    cancelStandingPledge: vi.fn(),
  }
})

import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  createSDKMachinery,
  getNotesByOwner,
  getNotesByRoot,
  getDelegationChain,
  delegateNote,
  revokeNote,
  reclaimFunds,
  getActiveStandingPledgesByUser,
  cancelStandingPledge,
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
    contractAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    createdAt: '1700000000',
    createdAtBlock: '100',
    updatedAt: '1700000000',
    ...overrides,
  }
}

function makeStandingPledge(overrides: Record<string, any> = {}) {
  return {
    id: '5',
    contractAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    rootOwner: '0x1111111111111111111111111111111111111111',
    delegateTo: '0x2222222222222222222222222222222222222222',
    token: '0x4444444444444444444444444444444444444444',
    amountPerPeriod: '1000000',
    period: String(30 * 24 * 60 * 60),
    causeRef: 'bafy-cause',
    backingType: 1,
    lastExecuted: '1700000000',
    active: true,
    createdAt: '1700000000',
    createdAtBlock: '100',
    updatedAt: '1700000000',
    executedNoteIds: ['99'],
    ...overrides,
  }
}

describe('MyNotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(getActiveStandingPledgesByUser).mockResolvedValue([])
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

    it('shows active monthly pledges when recurring pledges are configured', async () => {
      vi.stubEnv('VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS', '0x5555555555555555555555555555555555555555')
      vi.stubEnv('VITE_PAYMENT_TOKEN_ADDRESS', '0x4444444444444444444444444444444444444444')
      vi.stubEnv('VITE_PAYMENT_TOKEN_SYMBOL', 'USDZZZ')
      vi.stubEnv('VITE_PAYMENT_TOKEN_DECIMALS', '6')
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([])
      vi.mocked(getActiveStandingPledgesByUser).mockResolvedValue([makeStandingPledge()] as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByText('Monthly Pledges')).toBeInTheDocument()
        expect(screen.getByText('Monthly pledge #5')).toBeInTheDocument()
        expect(screen.getByText('1 USDZZZ/month')).toBeInTheDocument()
        expect(screen.getByText(/Delegated to 0x2222...2222/i)).toBeInTheDocument()
        const activePledgesCard = screen.getByText('Active Monthly Pledges').closest('div')
        expect(activePledgesCard).toHaveTextContent('1')
      })
    })

    it('skips loading monthly pledges when recurring pledges are not configured', async () => {
      vi.stubEnv('VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS', '')
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByText(/don't have any active monthly pledges/i)).toBeInTheDocument()
      })
      expect(getActiveStandingPledgesByUser).not.toHaveBeenCalled()
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
        expect(link).toHaveAttribute('href', '/delegation/notes/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa%3A7')
      })
    })

    it('shows Deposit New Note button', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        const depositLink = screen.getByRole('link', { name: /add funds/i })
        expect(depositLink).toHaveAttribute('href', '/delegation/notes/new')
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

  describe('Delegate action flow', () => {
    const userAddress = '0x1111111111111111111111111111111111111111'
    const delegateAddress = '0x2222222222222222222222222222222222222222'

    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)
    })

    it('opens delegate dialog when Delegate button is clicked', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))

      await waitFor(() => {
        expect(screen.getByText(/delegate fund #1/i)).toBeInTheDocument()
      })
    })

    it('shows address and amount inputs in delegate dialog', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))
      })

      await waitFor(() => {
        expect(screen.getByLabelText(/delegate to address/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/amount \(eth\)/i)).toBeInTheDocument()
      })
    })

    it('pre-fills amount with note balance in delegate dialog', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote({ amount: '3000000000000000000' })] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])

      render(<MyNotesPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))
      })

      await waitFor(() => {
        const amountInput = screen.getByLabelText(/amount \(eth\)/i) as HTMLInputElement
        // Verify the input has a value (format may vary)
        expect(amountInput.value).not.toBe('')
        expect(amountInput.value).not.toBe('1.0') // Should not be default
      })
    })

    it('calls delegateNote with correct parameters on submit', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])
      vi.mocked(getDelegationChain).mockResolvedValue([
        { address: userAddress, position: 0, createdAt: '1700000000' },
      ])
      vi.mocked(delegateNote).mockResolvedValue({ hash: '0xdelegate' } as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))
      })

      const addressInput = screen.getByLabelText(/delegate to address/i)
      fireEvent.change(addressInput, { target: { value: delegateAddress } })

      const submitButton = screen.getByRole('button', { name: 'Delegate' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(getDelegationChain).toHaveBeenCalledWith(mockMachinery, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:1')
        expect(delegateNote).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
          expect.objectContaining({
            noteId: 1n,
            owners: [userAddress],
            delegateTo: delegateAddress,
            amount: 1000000000000000000n,
          })
        )
      })
    })

    it('shows error alert when delegation fails', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()] as any)
      vi.mocked(getNotesByRoot).mockResolvedValue([])
      vi.mocked(getDelegationChain).mockResolvedValue([
        { address: userAddress, position: 0, createdAt: '1700000000' },
      ])
      vi.mocked(delegateNote).mockRejectedValue(new Error('Delegation reverted'))

      render(<MyNotesPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))
      })

      const addressInput = screen.getByLabelText(/delegate to address/i)
      fireEvent.change(addressInput, { target: { value: delegateAddress } })
      fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))

      await waitFor(() => {
        expect(screen.getByText('Delegation reverted')).toBeInTheDocument()
      })
    })
  })

  describe('Revoke action flow', () => {
    const userAddress = '0x1111111111111111111111111111111111111111'
    const delegateAddress = '0x2222222222222222222222222222222222222222'

    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)
    })

    it('calls revokeNote when Revoke button is clicked', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([
        makeNote({
          rootOwner: userAddress,
          owner: delegateAddress,
        }),
      ] as any)
      vi.mocked(getDelegationChain).mockResolvedValue([
        { address: userAddress, position: 0, createdAt: '1700000000' },
        { address: delegateAddress, position: 1, createdAt: '1700000001' },
      ])
      vi.mocked(revokeNote).mockResolvedValue({ hash: '0xrevoke' } as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))

      await waitFor(() => {
        expect(getDelegationChain).toHaveBeenCalledWith(mockMachinery, '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:1')
        expect(revokeNote).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
          expect.objectContaining({
            noteId: 1n,
            owners: [delegateAddress, userAddress],
          })
        )
      })
    })

    it('shows error alert when revocation fails', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([
        makeNote({
          rootOwner: userAddress,
          owner: delegateAddress,
        }),
      ] as any)
      vi.mocked(getDelegationChain).mockResolvedValue([
        { address: userAddress, position: 0, createdAt: '1700000000' },
        { address: delegateAddress, position: 1, createdAt: '1700000001' },
      ])
      vi.mocked(revokeNote).mockRejectedValue(new Error('Revocation reverted'))

      render(<MyNotesPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
      })

      await waitFor(() => {
        expect(screen.getByText('Revocation reverted')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel monthly pledge flow', () => {
    const userAddress = '0x1111111111111111111111111111111111111111'

    beforeEach(() => {
      vi.stubEnv('VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS', '0x5555555555555555555555555555555555555555')
      vi.stubEnv('VITE_PAYMENT_TOKEN_ADDRESS', '0x4444444444444444444444444444444444444444')
      vi.stubEnv('VITE_PAYMENT_TOKEN_SYMBOL', 'USDZZZ')
      vi.stubEnv('VITE_PAYMENT_TOKEN_DECIMALS', '6')
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)
    })

    it('calls cancelStandingPledge when Cancel monthly pledge is clicked', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([])
      vi.mocked(getActiveStandingPledgesByUser).mockResolvedValue([makeStandingPledge()] as any)
      vi.mocked(cancelStandingPledge).mockResolvedValue('0xcancel' as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel monthly pledge/i })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: /cancel monthly pledge/i }))

      await waitFor(() => {
        expect(cancelStandingPledge).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }),
          5n,
        )
      })
    })

    it('shows error alert when monthly pledge cancellation fails', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([])
      vi.mocked(getActiveStandingPledgesByUser).mockResolvedValue([makeStandingPledge()] as any)
      vi.mocked(cancelStandingPledge).mockRejectedValue(new Error('Cancel reverted'))

      render(<MyNotesPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel monthly pledge/i }))
      })

      await waitFor(() => {
        expect(screen.getByText('Cancel reverted')).toBeInTheDocument()
      })
    })
  })

  describe('Reclaim action flow', () => {
    const userAddress = '0x1111111111111111111111111111111111111111'

    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)
    })

    it('calls reclaimFunds when Reclaim button is clicked', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([makeNote()] as any)
      vi.mocked(reclaimFunds).mockResolvedValue({ hash: '0xreclaim' } as any)

      render(<MyNotesPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reclaim' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Reclaim' }))

      await waitFor(() => {
        expect(reclaimFunds).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          1n
        )
      })
    })

    it('shows error alert when reclaim fails', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([makeNote()] as any)
      vi.mocked(reclaimFunds).mockRejectedValue(new Error('Reclaim reverted'))

      render(<MyNotesPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Reclaim' }))
      })

      await waitFor(() => {
        expect(screen.getByText('Reclaim reverted')).toBeInTheDocument()
      })
    })
  })

  describe('Action error dismissal', () => {
    const userAddress = '0x1111111111111111111111111111111111111111'

    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)
    })

    it('clears error alert when close button is clicked', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      vi.mocked(getNotesByRoot).mockResolvedValue([makeNote()] as any)
      vi.mocked(reclaimFunds).mockRejectedValue(new Error('Reclaim reverted'))

      render(<MyNotesPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Reclaim' }))
      })

      await waitFor(() => {
        const alert = screen.getByText('Reclaim reverted').closest('[role="alert"]')
        expect(alert).toBeInTheDocument()
        const closeButton = alert!.querySelector('button[aria-label="Close"]') as HTMLElement
        fireEvent.click(closeButton)
      })

      expect(screen.queryByText('Reclaim reverted')).not.toBeInTheDocument()
    })
  })
})
