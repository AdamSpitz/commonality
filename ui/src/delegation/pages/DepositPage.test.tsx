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
    depositETH: vi.fn(),
    delegateNote: vi.fn(),
    attestNoteIntent: vi.fn(),
  }
})

import { useNavigate } from 'react-router-dom'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { createSDKMachinery, browseStatementsByNewest, depositETH } from '@commonality/sdk'

const mockNavigate = vi.fn()
const mockMachinery = {} as any

describe('DepositPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS', CONTRACT_ADDR)
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

      expect(screen.getByText('Deposit New Note')).toBeInTheDocument()
    })
  })

  describe('Form render', () => {
    it('shows amount input field', () => {
      render(<DepositPage />)

      expect(screen.getByLabelText(/amount \(eth\)/i)).toBeInTheDocument()
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

      fireEvent.change(screen.getByLabelText(/amount \(eth\)/i), { target: { value: '1' } })

      expect(screen.getByRole('button', { name: 'Deposit' })).not.toBeDisabled()
    })

    it('submit button is disabled when delegate address is invalid', () => {
      render(<DepositPage />)

      fireEvent.change(screen.getByLabelText(/amount \(eth\)/i), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: 'not-an-address' } })

      expect(screen.getByRole('button', { name: 'Deposit' })).toBeDisabled()
    })

    it('shows invalid address helper text for malformed delegate address', () => {
      render(<DepositPage />)

      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: 'invalid' } })

      expect(screen.getByText(/invalid ethereum address/i)).toBeInTheDocument()
    })

    it('does not show invalid address error for a valid delegate address', () => {
      render(<DepositPage />)

      fireEvent.change(screen.getByLabelText(/delegate to/i), { target: { value: OTHER_ADDR } })

      expect(screen.queryByText(/invalid ethereum address/i)).not.toBeInTheDocument()
    })
  })

  describe('Submission', () => {
    it('shows Processing... on the button while submitting', async () => {
      vi.mocked(depositETH).mockReturnValue(new Promise(() => {}))

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(eth\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
      })
    })

    it('shows transaction-in-progress alert while submitting', async () => {
      vi.mocked(depositETH).mockReturnValue(new Promise(() => {}))

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(eth\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText(/transaction in progress/i)).toBeInTheDocument()
      })
    })

    it('shows error alert when deposit fails', async () => {
      vi.mocked(depositETH).mockRejectedValue(new Error('Transaction rejected'))

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(eth\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Transaction rejected')).toBeInTheDocument()
      })
    })

    it('shows success heading after successful deposit', async () => {
      vi.mocked(depositETH).mockResolvedValue({ noteId: 42n })

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(eth\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Deposit Successful')).toBeInTheDocument()
      })
    })

    it('shows the created note ID in the success state', async () => {
      vi.mocked(depositETH).mockResolvedValue({ noteId: 42n })

      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(eth\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))

      await waitFor(() => {
        expect(screen.getByText('Note ID: 42')).toBeInTheDocument()
      })
    })
  })

  describe('Success state', () => {
    async function depositAndWait() {
      vi.mocked(depositETH).mockResolvedValue({ noteId: 5n })
      render(<DepositPage />)
      fireEvent.change(screen.getByLabelText(/amount \(eth\)/i), { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Deposit' }))
      await waitFor(() => {
        expect(screen.getByText('Deposit Successful')).toBeInTheDocument()
      })
    }

    it('shows View Note Details button', async () => {
      await depositAndWait()
      expect(screen.getByRole('button', { name: 'View Note Details' })).toBeInTheDocument()
    })

    it('shows Back to My Notes button', async () => {
      await depositAndWait()
      expect(screen.getByRole('button', { name: 'Back to My Notes' })).toBeInTheDocument()
    })

    it('navigates to the note detail page when View Note Details is clicked', async () => {
      await depositAndWait()
      fireEvent.click(screen.getByRole('button', { name: 'View Note Details' }))
      expect(mockNavigate).toHaveBeenCalledWith('/notes/5')
    })

    it('navigates to /notes when Back to My Notes is clicked', async () => {
      await depositAndWait()
      fireEvent.click(screen.getByRole('button', { name: 'Back to My Notes' }))
      expect(mockNavigate).toHaveBeenCalledWith('/notes')
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
    it('navigates to /notes when Cancel is clicked', () => {
      render(<DepositPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(mockNavigate).toHaveBeenCalledWith('/notes')
    })
  })
})
