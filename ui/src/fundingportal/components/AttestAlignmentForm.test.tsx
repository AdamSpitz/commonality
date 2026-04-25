import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AttestAlignmentForm } from './AttestAlignmentForm'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    getAllProjects: vi.fn(),
    attestAlignment: vi.fn(),
  }
})

vi.mock('./alignmentContract', () => ({
  getAlignmentContract: vi.fn(),
}))

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: vi.fn(() => ({})),
}))

import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { getAllProjects, attestAlignment } from '@commonality/sdk'
import { getAlignmentContract } from './alignmentContract'

const USER_ADDR = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const PROJECT_ADDR = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const CONTRACT_ADDR = '0x9999999999999999999999999999999999999999'
const STATEMENT_CID = 'bafyTestStatement123'

function makeProject(overrides: { id?: string; recipient?: string } = {}) {
  return {
    id: PROJECT_ADDR,
    recipient: '0x1234567890abcdef1234567890abcdef12345678',
    ...overrides,
  }
}

describe('AttestAlignmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)
    vi.mocked(useWalletClient).mockReturnValue({ data: null } as any)
    vi.mocked(usePublicClient).mockReturnValue(undefined as any)
    vi.mocked(getAlignmentContract).mockReturnValue({ address: CONTRACT_ADDR as `0x${string}`, abi: [] as any })
    vi.mocked(getAllProjects).mockResolvedValue([])
    vi.mocked(attestAlignment).mockResolvedValue(undefined as any)
  })

  describe('Wallet connection', () => {
    it('renders nothing when wallet is not connected', () => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)

      const { container } = render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      expect(container.firstChild).toBeNull()
    })

    it('shows "Vouch for a Project" button when wallet is connected', () => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true } as any)

      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      expect(screen.getByRole('button', { name: 'Vouch for a Project' })).toBeInTheDocument()
    })
  })

  describe('Form toggle', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true } as any)
    })

    it('opens the form when button is clicked', async () => {
      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))

      expect(screen.getByText('Vouch for a Project')).toBeInTheDocument()
      expect(screen.getByLabelText('Project address')).toBeInTheDocument()
    })

    it('shows "Cancel" button when form is open', async () => {
      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('closes the form when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))
      await waitFor(() => screen.getByRole('combobox'))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: 'Vouch for a Project' })).toBeInTheDocument()
    })
  })

  describe('Project loading', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true } as any)
    })

    it('shows loading spinner while projects are loading', async () => {
      vi.mocked(getAllProjects).mockReturnValue(new Promise(() => {}))

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('shows project options when loaded', async () => {
      vi.mocked(getAllProjects).mockResolvedValue([makeProject()])

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      })

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      await waitFor(() => {
        expect(screen.getByText(PROJECT_ADDR)).toBeInTheDocument()
      })
    })

    it('shows recipient address in project option', async () => {
      const project = makeProject()
      vi.mocked(getAllProjects).mockResolvedValue([project])

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      })

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      await waitFor(() => {
        expect(screen.getByText(/Recipient:/)).toBeInTheDocument()
      })
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)
    })

    it('disables submit button when no address entered', async () => {
      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))

      expect(screen.getByRole('button', { name: 'Submit Vouch' })).toBeDisabled()
    })

    it('disables submit button when invalid address entered', async () => {
      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))

      await user.type(screen.getByRole('combobox'), 'not-an-address')

      expect(screen.getByRole('button', { name: 'Submit Vouch' })).toBeDisabled()
    })

    it('enables submit button when project is selected', async () => {
      vi.mocked(getAllProjects).mockResolvedValue([makeProject()])

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))
      await waitFor(() => screen.getByRole('combobox'))
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await waitFor(() => screen.getByRole('listbox'))
      const listbox = screen.getByRole('listbox')
      const option = listbox.querySelector('li')!
      await user.click(option)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit Vouch' })).not.toBeDisabled()
      })
    })
  })

  describe('Submission', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)
      vi.mocked(getAllProjects).mockResolvedValue([makeProject()])
    })

    async function openFormAndSelectProject(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))
      await waitFor(() => screen.getByRole('combobox'))
      const combobox = screen.getByRole('combobox')
      await user.click(combobox)
      await waitFor(() => screen.getByRole('listbox'))
      const listbox = screen.getByRole('listbox')
      const option = listbox.querySelector('li')!
      await user.click(option)
    }

    it('shows error when wallet clients are not available', async () => {
      vi.mocked(useWalletClient).mockReturnValue({ data: null } as any)

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await openFormAndSelectProject(user)
      await user.click(screen.getByRole('button', { name: 'Submit Vouch' }))

      await waitFor(() => {
        expect(screen.getByText(/wallet not connected/i)).toBeInTheDocument()
      })
    })

    it('shows error when contract is not configured', async () => {
      vi.mocked(getAlignmentContract).mockReturnValue(null)

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await openFormAndSelectProject(user)
      await user.click(screen.getByRole('button', { name: 'Submit Vouch' }))

      await waitFor(() => {
        expect(screen.getByText(/contract not configured/i)).toBeInTheDocument()
      })
    })

    it('shows submitting state while attestation is in progress', async () => {
      vi.mocked(attestAlignment).mockReturnValue(new Promise(() => {}))

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await openFormAndSelectProject(user)
      await user.click(screen.getByRole('button', { name: 'Submit Vouch' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submitting...' })).toBeInTheDocument()
      })
    })

    it('shows success message after successful attestation', async () => {
      vi.mocked(attestAlignment).mockResolvedValue(undefined as any)

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await openFormAndSelectProject(user)
      await user.click(screen.getByRole('button', { name: 'Submit Vouch' }))

      await waitFor(() => {
        expect(screen.getByText('Vouch submitted successfully!')).toBeInTheDocument()
      })
    })

    it('shows error message on attestation failure', async () => {
      vi.mocked(attestAlignment).mockRejectedValue(new Error('Transaction reverted'))

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await openFormAndSelectProject(user)
      await user.click(screen.getByRole('button', { name: 'Submit Vouch' }))

      await waitFor(() => {
        expect(screen.getByText('Transaction reverted')).toBeInTheDocument()
      })
    })

    it('resets form state after successful submission', async () => {
      vi.mocked(attestAlignment).mockResolvedValue(undefined as any)

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await openFormAndSelectProject(user)
      await user.click(screen.getByRole('button', { name: 'Submit Vouch' }))

      await waitFor(() => {
        expect(screen.getByText('Vouch submitted successfully!')).toBeInTheDocument()
      })

      // Submit button should be disabled again after success (form reset)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit Vouch' })).toBeDisabled()
      })
    })

    it('clears success message when reopening form', async () => {
      vi.mocked(attestAlignment).mockResolvedValue(undefined as any)

      const user = userEvent.setup()
      render(<AttestAlignmentForm statementCid={STATEMENT_CID} />)

      await openFormAndSelectProject(user)
      await user.click(screen.getByRole('button', { name: 'Submit Vouch' }))

      await waitFor(() => {
        expect(screen.getByText('Vouch submitted successfully!')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      await user.click(screen.getByRole('button', { name: 'Vouch for a Project' }))

      expect(screen.queryByText('Vouch submitted successfully!')).not.toBeInTheDocument()
    })
  })
})
