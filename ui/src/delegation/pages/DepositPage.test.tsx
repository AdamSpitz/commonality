import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DepositPage } from './DepositPage'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const OTHER_ADDR = '0x2222222222222222222222222222222222222222'
const CONTRACT_ADDR = '0x3333333333333333333333333333333333333333'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    browseStatementsByNewest: vi.fn(),
    depositERC20: vi.fn(),
    delegateNote: vi.fn(),
    attestNoteIntent: vi.fn(),
    approveRecurringPledgeToken: vi.fn(),
    createStandingPledge: vi.fn(),
  }
})

import { useNavigate } from 'react-router-dom'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { createSDKMachinery, browseStatementsByNewest, depositERC20, delegateNote, attestNoteIntent, approveRecurringPledgeToken, createStandingPledge } from '@commonality/sdk'

const mockNavigate = vi.fn()
const mockMachinery = {} as any

const TEST_STATEMENT = {
  cid: 'QmStatementCid123456789012345678901234567',
  title: 'Universal Basic Income',
  excerpt: 'Every citizen should receive a basic income regardless of employment status.',
}

describe('DepositPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS', CONTRACT_ADDR)
    vi.stubEnv('VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS', '0x5555555555555555555555555555555555555555')
    vi.stubEnv('VITE_PAYMENT_TOKEN_ADDRESS', '0x4444444444444444444444444444444444444444')
    vi.stubEnv('VITE_PAYMENT_TOKEN_SYMBOL', 'USDZZZ')
    vi.stubEnv('VITE_PAYMENT_TOKEN_DECIMALS', '6')
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR } as any)
    vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(browseStatementsByNewest).mockResolvedValue([])
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('Unauthenticated state', () => {
    it('shows connect wallet message when address is undefined', () => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)

      render(<DepositPage />)

      expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
    })

    it('shows Deposit New Note heading when not connected', () => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)

      render(<DepositPage />)

      expect(screen.getByText('Add Delegated Funds')).toBeInTheDocument()
    })
  })

  describe('Form render', () => {
    it('shows amount input field', () => {
      render(<DepositPage />)

      expect(screen.getByLabelText(/amount \(usdzzz\)/i)).toBeInTheDocument()
    })

    it('shows delegate to field', () => {
      render(<DepositPage />)

      expect(screen.getByLabelText(/delegate to/i)).toBeInTheDocument()
    })

    it('shows intended statement autocomplete', () => {
      render(<DepositPage />)

      expect(screen.getByLabelText(/intended statement/i)).toBeInTheDocument()
    })

    it('shows Deposit submit button', () => {
      render(<DepositPage />)

      expect(screen.getByRole('button', { name: 'Deposit' })).toBeInTheDocument()
    })

    it('shows Cancel button', () => {
      render(<DepositPage />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  describe('Form validation', () => {
    it('submit button is disabled when amount is empty', () => {
      render(<DepositPage />)

      expect(screen.getByRole('button', { name: 'Deposit' })).toBeDisabled()
    })

    it('submit button is enabled when amount is set and no delegate', () => {
      render(<DepositPage />)

      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })

      expect(screen.getByRole('button', { name: 'Deposit' })).not.toBeDisabled()
    })

    it('submit button is disabled when delegate address is invalid', () => {
      render(<DepositPage />)

      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: 'not-an-address' } })

      expect(screen.getByRole('button', { name: 'Deposit' })).toBeDisabled()
    })

    it('shows invalid address helper text for malformed delegate address', () => {
      render(<DepositPage />)

      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: 'invalid' } })

      expect(screen.getByText(/invalid wallet address/i)).toBeInTheDocument()
    })

    it('does not show invalid address error for a valid delegate address', () => {
      render(<DepositPage />)

      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: OTHER_ADDR } })

      expect(screen.queryByText(/invalid ethereum address/i)).not.toBeInTheDocument()
    })
  })

  describe('Submission', () => {
    it('shows Processing... on the button while submitting', async () => {
      vi.mocked(depositERC20).mockReturnValue(new Promise(() => {}))

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      })
    })

    it('shows transaction-in-progress alert while submitting', async () => {
      vi.mocked(depositERC20).mockReturnValue(new Promise(() => {}))

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText(/transaction in progress/i)).toBeInTheDocument()
      })
    })

    it('shows error alert when deposit fails', async () => {
      vi.mocked(depositERC20).mockRejectedValue(new Error('Transaction rejected'))

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Transaction rejected')).toBeInTheDocument()
      })
    })

    it('shows success heading after successful deposit', async () => {
      vi.mocked(depositERC20).mockResolvedValue({ noteId: 42n, hash: '0xabc' })

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Funds Added')).toBeInTheDocument()
      })
    })

    it('shows the created fund ID in the success state', async () => {
      vi.mocked(depositERC20).mockResolvedValue({ noteId: 42n, hash: '0xabc' })

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Fund ID: 42')).toBeInTheDocument()
      })
    })

    it('starts a monthly pledge using the settlement token when recurring is checked', async () => {
      vi.mocked(browseStatementsByNewest).mockResolvedValue([TEST_STATEMENT] as any)
      vi.mocked(approveRecurringPledgeToken).mockResolvedValue('0xapprove')
      vi.mocked(createStandingPledge).mockResolvedValue({ hash: '0xpledge', pledgeId: 1n, firstNoteId: 99n })

      render(<DepositPage />)
      fireEvent.click(screen.getByLabelText(/monthly recurring pledge/i))
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '2' } })
      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: OTHER_ADDR } })

      const autocomplete = screen.getByLabelText(/intended statement\/cause/i)
      fireEvent.mouseDown(autocomplete)
      const option = await screen.findByText(/universal basic income/i)
      fireEvent.click(option)

      fireEvent.click(screen.getByRole('button', { name: 'Start Monthly Pledge' }))

      await waitFor(() => {
        expect(createStandingPledge).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({
            delegateTo: OTHER_ADDR,
            token: '0x4444444444444444444444444444444444444444',
            causeRef: TEST_STATEMENT.cid,
          })
        )
      })
      expect(depositERC20).not.toHaveBeenCalled()
      expect(screen.getByText('Fund ID: 99')).toBeInTheDocument()
    })
  })

  describe('Success state', () => {
    async function depositAndWait() {
      vi.mocked(depositERC20).mockResolvedValue({ noteId: 5n, hash: '0xabc' })
      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))
      await waitFor(() => {
        expect(screen.getByText('Funds Added')).toBeInTheDocument()
      })
    }

    it('shows View Fund Details button', async () => {
      await depositAndWait()
      expect(screen.getByRole('button', { name: 'View Fund Details' })).toBeInTheDocument()
    })

    it('shows Back to My Delegated Funds button', async () => {
      await depositAndWait()
      expect(screen.getByRole('button', { name: 'Back to My Delegated Funds' })).toBeInTheDocument()
    })

    it('navigates to the note detail page when View Fund Details is clicked', async () => {
      await depositAndWait()
      fireEvent.click(screen.getByRole('button', { name: 'View Fund Details' }))
      expect(mockNavigate).toHaveBeenCalledWith('/delegation/notes/5')
    })

    it('navigates to /delegation/notes when Back to My Delegated Funds is clicked', async () => {
      await depositAndWait()
      fireEvent.click(screen.getByRole('button', { name: 'Back to My Delegated Funds' }))
      expect(mockNavigate).toHaveBeenCalledWith('/delegation/notes')
    })
  })

  describe('Statement loading', () => {
    it('calls browseStatementsByNewest on mount', async () => {
      render(<DepositPage />)

      await waitFor(() => {
        expect(browseStatementsByNewest).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Cancel button', () => {
    it('navigates to /delegation/notes when Cancel is clicked', () => {
      render(<DepositPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(mockNavigate).toHaveBeenCalledWith('/delegation/notes')
    })
  })

  describe('Delegation during deposit', () => {
    it('calls delegateNote when delegate address is provided', async () => {
      vi.mocked(depositERC20).mockResolvedValue({ noteId: 7n, hash: '0xabc' })
      vi.mocked(delegateNote).mockResolvedValue({ hash: '0xdef' } as any)

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '0.5' } })
      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: OTHER_ADDR } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(delegateNote).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({
            noteId: 7n,
            owners: [USER_ADDR],
            delegateTo: OTHER_ADDR,
            amount: expect.any(BigInt),
          })
        )
      })
    })

    it('skips delegateNote when no delegate address is provided', async () => {
      vi.mocked(depositERC20).mockResolvedValue({ noteId: 7n, hash: '0xabc' })

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '0.5' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Funds Added')).toBeInTheDocument()
      })
      expect(delegateNote).not.toHaveBeenCalled()
    })

    it('shows error when delegation fails after successful deposit', async () => {
      vi.mocked(depositERC20).mockResolvedValue({ noteId: 7n, hash: '0xabc' })
      vi.mocked(delegateNote).mockRejectedValue(new Error('Delegation reverted'))

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '0.5' } })
      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: OTHER_ADDR } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Delegation reverted')).toBeInTheDocument()
      })
    })
  })

  describe('Statement attestation during deposit', () => {
    it('calls attestNoteIntent when statement is selected', async () => {
      vi.mocked(depositERC20).mockResolvedValue({ noteId: 12n, hash: '0xabc' })
      vi.mocked(attestNoteIntent).mockResolvedValue({ hash: '0xdef' } as any)
      vi.mocked(browseStatementsByNewest).mockResolvedValue([TEST_STATEMENT] as any)

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })

      // Select a statement from autocomplete
      const autocomplete = screen.getByLabelText(/intended statement/i)
      fireEvent.mouseDown(autocomplete)
      const option = await screen.findByText(/universal basic income/i)
      fireEvent.click(option)

      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(attestNoteIntent).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          CONTRACT_ADDR,
          12n,
          TEST_STATEMENT.cid
        )
      })
    })

    it('skips attestNoteIntent when no statement is selected', async () => {
      vi.mocked(depositERC20).mockResolvedValue({ noteId: 12n, hash: '0xabc' })

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Funds Added')).toBeInTheDocument()
      })
      expect(attestNoteIntent).not.toHaveBeenCalled()
    })

    it('shows statement options in autocomplete', async () => {
      vi.mocked(browseStatementsByNewest).mockResolvedValue([TEST_STATEMENT] as any)

      render(<DepositPage />)

      const autocomplete = screen.getByLabelText(/intended statement/i)
      fireEvent.mouseDown(autocomplete)

      await waitFor(() => {
        expect(screen.getByText(/universal basic income/i)).toBeInTheDocument()
      })
    })

    it('shows statement excerpt in autocomplete options', async () => {
      vi.mocked(browseStatementsByNewest).mockResolvedValue([TEST_STATEMENT] as any)

      render(<DepositPage />)

      const autocomplete = screen.getByLabelText(/intended statement/i)
      fireEvent.mouseDown(autocomplete)

      await waitFor(() => {
        expect(screen.getByText(/every citizen should receive/i)).toBeInTheDocument()
      })
    })
  })

  describe('Statement autocomplete loading', () => {
    it('shows loading spinner while statements are fetching', () => {
      vi.mocked(browseStatementsByNewest).mockReturnValue(new Promise(() => {}))

      render(<DepositPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('shows error when wallet is not connected during submit', async () => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: undefined } as any)

      render(<DepositPage />)

      // Should show connect wallet message, not form
      expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
    })

    it('shows error when contract address is not configured', async () => {
      vi.stubEnv('VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS', '')

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText(/wallet not connected or contract not configured/i)).toBeInTheDocument()
      })

      vi.unstubAllEnvs()
    })

    it('shows error for zero amount', async () => {
      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '0' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid amount/i)).toBeInTheDocument()
      })
    })

    it('handles non-Error exception during deposit', async () => {
      vi.mocked(depositERC20).mockRejectedValue('String error')

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Deposit failed')).toBeInTheDocument()
      })
    })

    it('clears error alert when close button is clicked', async () => {
      vi.mocked(depositERC20).mockRejectedValue(new Error('Transaction rejected'))

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        const alert = screen.getByText('Transaction rejected').closest('[role="alert"]')
        expect(alert).toBeInTheDocument()
        const closeButton = alert!.querySelector('button[aria-label="Close"]') as HTMLElement
        fireEvent.click(closeButton)
      })

      expect(screen.queryByText('Transaction rejected')).not.toBeInTheDocument()
    })
  })
})
