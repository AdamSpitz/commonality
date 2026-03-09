import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AlignmentAttestationsSection } from './AlignmentAttestationsSection'

vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
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
    getSubjectStatements: vi.fn(),
    getStatement: vi.fn(),
    getAllStatements: vi.fn(),
    attestAlignment: vi.fn(),
  }
})

vi.mock('./alignmentContract', () => ({
  getAlignmentContract: vi.fn(),
}))

import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  createSDKMachinery,
  getSubjectStatements,
  getStatement,
  getAllStatements,
  attestAlignment,
} from '@commonality/sdk'
import { getAlignmentContract } from './alignmentContract'

const mockMachinery = {} as any
const PROJECT_ADDR = '0x1111111111111111111111111111111111111111'
const USER_ADDR = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const ATTESTER_A = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const CONTRACT_ADDR = '0x9999999999999999999999999999999999999999'

function makeAlignment(overrides: Partial<{
  attester: string
  statementCid: string
  subject: string
}> = {}) {
  return {
    attester: ATTESTER_A,
    statementCid: 'QmStatement1',
    subject: PROJECT_ADDR,
    topic: 'project-alignment',
    createdAt: '0',
    blockNumber: '0',
    ...overrides,
  }
}

describe('AlignmentAttestationsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)
    vi.mocked(useWalletClient).mockReturnValue({ data: null } as any)
    vi.mocked(usePublicClient).mockReturnValue(undefined as any)
    vi.mocked(getAlignmentContract).mockReturnValue({ address: CONTRACT_ADDR as `0x${string}`, abi: [] as any })
    vi.mocked(getStatement).mockResolvedValue(null)
    vi.mocked(getAllStatements).mockResolvedValue([])
  })

  describe('Loading state', () => {
    it('shows spinner while loading', () => {
      vi.mocked(getSubjectStatements).mockReturnValue(new Promise(() => {}))

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error alert with message when loading fails', async () => {
      vi.mocked(getSubjectStatements).mockRejectedValue(new Error('Network error'))

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('shows generic error for non-Error exceptions', async () => {
      vi.mocked(getSubjectStatements).mockRejectedValue('string error')

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load alignments')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    it('shows "No alignment attestations yet." when there are none', async () => {
      vi.mocked(getSubjectStatements).mockResolvedValue([])

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        expect(screen.getByText('No alignment attestations yet.')).toBeInTheDocument()
      })
    })
  })

  describe('Alignment list display', () => {
    it('shows statement title when available', async () => {
      vi.mocked(getSubjectStatements).mockResolvedValue([makeAlignment()])
      vi.mocked(getStatement).mockResolvedValue({ title: 'My Statement' } as any)

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        expect(screen.getByText('My Statement')).toBeInTheDocument()
      })
    })

    it('shows truncated CID fallback when no statement title is available', async () => {
      const cid = 'QmSTATEMENT1234567890'
      vi.mocked(getSubjectStatements).mockResolvedValue([makeAlignment({ statementCid: cid })])
      vi.mocked(getStatement).mockResolvedValue(null)

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        // Component shows: `Statement ${a.statementCid.slice(0, 12)}...`
        expect(screen.getByText(`Statement ${cid.slice(0, 12)}...`)).toBeInTheDocument()
      })
    })

    it('shows truncated attester address', async () => {
      vi.mocked(getSubjectStatements).mockResolvedValue([makeAlignment()])
      vi.mocked(getStatement).mockResolvedValue(null)

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        // ATTESTER_A = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
        // truncateAddress: first 6 chars + '...' + last 4 chars → '0xBBBB...BBBB'
        // The caption renders "Attester: 0xBBBB...BBBB" — use regex to match within element text
        expect(screen.getByText(/Attester: 0xBBBB\.\.\.BBBB/)).toBeInTheDocument()
      })
    })

    it('shows "Direct" chip for each alignment', async () => {
      vi.mocked(getSubjectStatements).mockResolvedValue([makeAlignment()])
      vi.mocked(getStatement).mockResolvedValue(null)

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        expect(screen.getByText('Direct')).toBeInTheDocument()
      })
    })

    it('shows link to /portal/:cid for each alignment', async () => {
      const cid = 'QmStatement1'
      vi.mocked(getSubjectStatements).mockResolvedValue([makeAlignment({ statementCid: cid })])
      vi.mocked(getStatement).mockResolvedValue({ title: 'My Statement' } as any)

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        const link = screen.getByRole('link', { name: 'My Statement' })
        expect(link).toHaveAttribute('href', `/portal/${cid}`)
      })
    })

    it('renders multiple alignments as separate rows', async () => {
      vi.mocked(getSubjectStatements).mockResolvedValue([
        makeAlignment({ statementCid: 'QmCid1' }),
        makeAlignment({ statementCid: 'QmCid2', attester: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC' }),
      ])
      vi.mocked(getStatement).mockImplementation(async (_m, cid) => {
        if (cid === 'QmCid1') return { title: 'Statement One' } as any
        if (cid === 'QmCid2') return { title: 'Statement Two' } as any
        return null
      })

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => {
        expect(screen.getByText('Statement One')).toBeInTheDocument()
        expect(screen.getByText('Statement Two')).toBeInTheDocument()
      })
    })
  })

  describe('"Attest Alignment" button', () => {
    it('is hidden when wallet is not connected', async () => {
      vi.mocked(getSubjectStatements).mockResolvedValue([])
      vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => screen.getByText('No alignment attestations yet.'))
      expect(screen.queryByRole('button', { name: /attest alignment/i })).not.toBeInTheDocument()
    })

    it('is visible when wallet is connected', async () => {
      vi.mocked(getSubjectStatements).mockResolvedValue([])
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true } as any)

      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)

      await waitFor(() => screen.getByText('No alignment attestations yet.'))
      expect(screen.getByRole('button', { name: /attest alignment/i })).toBeInTheDocument()
    })
  })

  describe('Dialog', () => {
    beforeEach(() => {
      vi.mocked(getSubjectStatements).mockResolvedValue([])
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)
    })

    async function openDialog() {
      const user = userEvent.setup()
      render(<AlignmentAttestationsSection projectAddress={PROJECT_ADDR} />)
      await waitFor(() => screen.getByText('No alignment attestations yet.'))
      await user.click(screen.getByRole('button', { name: /attest alignment/i }))
      return user
    }

    it('opens when "Attest Alignment" button is clicked', async () => {
      vi.mocked(getAllStatements).mockReturnValue(new Promise(() => {}))

      await openDialog()

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('calls getAllStatements when dialog opens', async () => {
      vi.mocked(getAllStatements).mockResolvedValue([])

      await openDialog()

      expect(getAllStatements).toHaveBeenCalledTimes(1)
    })

    it('closes when Cancel is clicked', async () => {
      vi.mocked(getAllStatements).mockResolvedValue([])

      const user = await openDialog()
      await waitFor(() => screen.getByRole('dialog'))
      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      // MUI Dialog uses a transition; use waitFor to wait for unmount
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('shows error when wallet clients are not available on submit', async () => {
      vi.mocked(useWalletClient).mockReturnValue({ data: null } as any)
      vi.mocked(getAllStatements).mockResolvedValue([])

      const user = await openDialog()
      await waitFor(() => screen.getByRole('combobox'))
      await user.type(screen.getByRole('combobox'), 'QmTestCid')
      await user.keyboard('{Enter}')
      await user.click(screen.getByRole('button', { name: /submit attestation/i }))

      await waitFor(() => {
        expect(screen.getByText(/wallet not connected/i)).toBeInTheDocument()
      })
    })

    it('shows error when contract is not configured on submit', async () => {
      vi.mocked(getAlignmentContract).mockReturnValue(null)
      vi.mocked(getAllStatements).mockResolvedValue([])

      const user = await openDialog()
      await waitFor(() => screen.getByRole('combobox'))
      await user.type(screen.getByRole('combobox'), 'QmTestCid')
      await user.keyboard('{Enter}')
      await user.click(screen.getByRole('button', { name: /submit attestation/i }))

      await waitFor(() => {
        expect(screen.getByText(/contract not configured/i)).toBeInTheDocument()
      })
    })

    it('shows success message after successful attestation', async () => {
      vi.mocked(getAllStatements).mockResolvedValue([])
      vi.mocked(attestAlignment).mockResolvedValue(undefined as any)

      const user = await openDialog()
      await waitFor(() => screen.getByRole('combobox'))
      await user.type(screen.getByRole('combobox'), 'QmTestCid')
      await user.keyboard('{Enter}')
      await user.click(screen.getByRole('button', { name: /submit attestation/i }))

      await waitFor(() => {
        expect(screen.getByText('Alignment attested successfully!')).toBeInTheDocument()
      })
    })

    it('shows error message on attestation failure', async () => {
      vi.mocked(getAllStatements).mockResolvedValue([])
      vi.mocked(attestAlignment).mockRejectedValue(new Error('Transaction reverted'))

      const user = await openDialog()
      await waitFor(() => screen.getByRole('combobox'))
      await user.type(screen.getByRole('combobox'), 'QmTestCid')
      await user.keyboard('{Enter}')
      await user.click(screen.getByRole('button', { name: /submit attestation/i }))

      await waitFor(() => {
        expect(screen.getByText('Transaction reverted')).toBeInTheDocument()
      })
    })

    it('refreshes alignment list after successful attestation', async () => {
      vi.mocked(getAllStatements).mockResolvedValue([])
      vi.mocked(attestAlignment).mockResolvedValue(undefined as any)

      const user = await openDialog()
      await waitFor(() => screen.getByRole('combobox'))
      await user.type(screen.getByRole('combobox'), 'QmTestCid')
      await user.keyboard('{Enter}')
      await user.click(screen.getByRole('button', { name: /submit attestation/i }))

      await waitFor(() => {
        expect(screen.getByText('Alignment attested successfully!')).toBeInTheDocument()
      })
      // getSubjectStatements called: once on mount + once after successful attestation (refreshKey++)
      expect(getSubjectStatements).toHaveBeenCalledTimes(2)
    })
  })
})
