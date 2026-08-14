import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DepositPage } from './DepositPage'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const OTHER_ADDR = '0x2222222222222222222222222222222222222222'
const CONTRACT_ADDR = '0x3333333333333333333333333333333333333333'

/**
 * "Delegate to" is an AddressPicker, not a text box: choose the manual mode,
 * then type. A literal address resolves synchronously, so no debounce wait.
 */
async function typeDelegate(value: string) {
  fireEvent.click(screen.getByRole('radio', { name: /enter their address or ens name/i }))
  const input = await screen.findByPlaceholderText('0x... or name.eth')
  fireEvent.change(input, { target: { value } })
  return input
}

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk/conceptspace', async () => {
  const actual = await vi.importActual('@commonality/sdk/conceptspace')
  return {
    ...actual,
    browseStatementsByNewest: vi.fn(),
  }
})

vi.mock('@commonality/sdk/delegation', async () => {
  const actual = await vi.importActual('@commonality/sdk/delegation')
  return {
    ...actual,
    depositERC20: vi.fn(),
    delegateNote: vi.fn(),
    approveRecurringPledgeToken: vi.fn(),
    createStandingPledge: vi.fn(),
  }
})

vi.mock('@commonality/sdk/machinery', async () => {
  const actual = await vi.importActual('@commonality/sdk/machinery')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
  }
})

import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { browseStatementsByNewest } from '@commonality/sdk/conceptspace'
import { depositERC20, delegateNote, approveRecurringPledgeToken, createStandingPledge } from '@commonality/sdk/delegation'
import { createSDKMachinery } from '@commonality/sdk/machinery'

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
    vi.mocked(useSearchParams).mockReturnValue([new URLSearchParams(), vi.fn()] as any)
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
    it('preselects an immutable statement requested by a cause-page link', async () => {
      vi.mocked(useSearchParams).mockReturnValue([
        new URLSearchParams(`statement=${encodeURIComponent(TEST_STATEMENT.cid)}`),
        vi.fn(),
      ] as any)
      vi.mocked(browseStatementsByNewest).mockResolvedValue([TEST_STATEMENT] as any)

      render(<DepositPage />)

      await waitFor(() => {
        expect(screen.getByText(/funding scope selected/i)).toHaveTextContent(TEST_STATEMENT.title)
      })
    })

    it('shows amount input field', () => {
      render(<DepositPage />)

      expect(screen.getByLabelText(/amount \(usdzzz\)/i)).toBeInTheDocument()
    })

    it('shows delegate to field', () => {
      render(<DepositPage />)

      expect(screen.getByText(/delegate to/i)).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /pick from a saved delegate/i })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: /enter their address or ens name/i })).toBeInTheDocument()
    })

    it('does not offer delegating to yourself', () => {
      render(<DepositPage />)

      expect(screen.queryByRole('radio', { name: /my account/i })).not.toBeInTheDocument()
    })

    it('offers an optional cause earmark for one-time deposits', () => {
      render(<DepositPage />)

      expect(screen.getByTestId('statement-picker-delegation')).toBeInTheDocument()
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

    it('submit button is disabled when delegate address is invalid', async () => {
      render(<DepositPage />)

      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '1' } })
      await typeDelegate('not-an-address')

      // Unparseable delegate input must block the deposit rather than fall
      // through as "no delegate".
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Deposit' })).toBeDisabled()
      })
    })

    it('shows invalid address helper text for malformed delegate address', async () => {
      render(<DepositPage />)

      await typeDelegate('invalid')

      expect(await screen.findByText(/enter a valid ethereum address/i)).toBeInTheDocument()
    })

    it('does not show invalid address error for a valid delegate address', async () => {
      render(<DepositPage />)

      await typeDelegate(OTHER_ADDR)

      await waitFor(() => {
        expect(screen.queryByText(/enter a valid ethereum address/i)).not.toBeInTheDocument()
      })
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
      vi.mocked(useSearchParams).mockReturnValue([
        new URLSearchParams(`statement=${encodeURIComponent(TEST_STATEMENT.cid)}`),
        vi.fn(),
      ] as any)
      vi.mocked(browseStatementsByNewest).mockResolvedValue([TEST_STATEMENT] as any)
      vi.mocked(approveRecurringPledgeToken).mockResolvedValue('0xapprove')
      vi.mocked(createStandingPledge).mockResolvedValue({ hash: '0xpledge', pledgeId: 1n, firstNoteId: 99n })

      render(<DepositPage />)
      fireEvent.click(screen.getByLabelText(/monthly recurring pledge/i))
      expect(screen.getByLabelText(/authorize monthly payments/i)).toHaveValue(12)
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '2' } })
      fireEvent.change(screen.getByLabelText(/authorize monthly payments/i), { target: { value: '6' } })
      await typeDelegate(OTHER_ADDR)

      await screen.findByText(/funding scope selected/i)

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
      expect(approveRecurringPledgeToken).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ amount: 12_000_000n })
      )
      expect(depositERC20).not.toHaveBeenCalled()
      expect(screen.getByText('Fund ID: 99')).toBeInTheDocument()
    })

    it('requires a positive number of monthly payments for recurring allowance', async () => {
      render(<DepositPage />)
      fireEvent.click(screen.getByLabelText(/monthly recurring pledge/i))
      fireEvent.change(screen.getByLabelText(/amount \(usdzzz\)/i), { target: { value: '2' } })
      fireEvent.change(screen.getByLabelText(/authorize monthly payments/i), { target: { value: '0' } })

      expect(screen.getByRole('button', { name: 'Start Monthly Pledge' })).toBeDisabled()
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
      expect(mockNavigate).toHaveBeenCalledWith('/delegation/notes/0x3333333333333333333333333333333333333333%3A5')
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
      await typeDelegate(OTHER_ADDR)
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
      await typeDelegate(OTHER_ADDR)
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Delegation reverted')).toBeInTheDocument()
      })
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
