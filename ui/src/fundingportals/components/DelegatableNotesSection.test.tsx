import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DelegatableNotesSection } from './DelegatableNotesSection'

vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getNoteIntentAttestationsByStatement: vi.fn(),
    getNote: vi.fn(),
  }
})

import {
  createSDKMachinery,
  getNoteIntentAttestationsByStatement,
  getNote,
} from '@commonality/sdk'

const mockMachinery = {} as any

const ETH_TOKEN = '0x0000000000000000000000000000000000000000'
const NON_ETH_TOKEN = '0x1111111111111111111111111111111111111111'
const OWNER_A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const OWNER_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const ROOT_OWNER = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'
const NOTE_CONTRACT = '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'

function makeAttestation(noteId: string) {
  return {
    attester: OWNER_A,
    noteContract: NOTE_CONTRACT,
    noteId,
    intendedStatementId: 'QmTest',
    createdAt: '0',
    blockNumber: '0',
  }
}

function makeNote(overrides: Partial<{
  id: string
  contractAddress: string
  amount: string
  token: string
  tokenType: number
  owner: string
  rootOwner: string
  active: boolean
}> = {}) {
  return {
    id: '1',
    contractAddress: NOTE_CONTRACT,
    chainHash: '0x000',
    amount: '1000000000000000000', // 1 ETH
    token: ETH_TOKEN,
    tokenType: 0,
    tokenId: '0',
    owner: OWNER_A,
    rootOwner: ROOT_OWNER,
    active: true,
    createdAt: '0',
    createdAtBlock: '0',
    updatedAt: '0',
    ...overrides,
  }
}

describe('DelegatableNotesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
  })

  describe('Collapsed state', () => {
    it('shows "Show" toggle button by default', () => {
      render(<DelegatableNotesSection statementCid="QmTest" />)

      expect(screen.getByRole('button', { name: /show available delegatable notes/i })).toBeInTheDocument()
    })

    it('does not fetch data until opened', () => {
      render(<DelegatableNotesSection statementCid="QmTest" />)

      expect(getNoteIntentAttestationsByStatement).not.toHaveBeenCalled()
    })
  })

  describe('Loading state', () => {
    it('shows "Hide" button text when open', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockReturnValue(new Promise(() => {}))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      expect(screen.getByRole('button', { name: /hide available delegatable notes/i })).toBeInTheDocument()
    })

    it('shows spinner while data is loading', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockReturnValue(new Promise(() => {}))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error Alert with message when loading fails', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockRejectedValue(new Error('Network failure'))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network failure')).toBeInTheDocument()
      })
    })

    it('shows generic error for non-Error exceptions', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockRejectedValue('string error')

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('Failed to load delegatable notes')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    it('shows empty message when no attestations exist', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('No delegatable notes intended for this cause.')).toBeInTheDocument()
      })
    })

    it('shows empty message when all notes are inactive', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '1', active: false }))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('No delegatable notes intended for this cause.')).toBeInTheDocument()
      })
    })

    it('still shows notes when they use non-ETH currencies', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '1', token: NON_ETH_TOKEN }))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
      })
    })
  })

  describe('Note filtering', () => {
    it('excludes inactive notes from the table', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([
        makeAttestation('1'),
        makeAttestation('2'),
      ])
      vi.mocked(getNote).mockImplementation(async (_m, noteId) => {
        if (noteId === `${NOTE_CONTRACT.toLowerCase()}:1`) return makeNote({ id: '1', active: true })
        if (noteId === `${NOTE_CONTRACT.toLowerCase()}:2`) return makeNote({ id: '2', active: false })
        return null
      })

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.queryByText('#2')).not.toBeInTheDocument()
      })
    })

    it('includes non-ETH notes in the table', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([
        makeAttestation('1'),
        makeAttestation('2'),
      ])
      vi.mocked(getNote).mockImplementation(async (_m, noteId) => {
        if (noteId === `${NOTE_CONTRACT.toLowerCase()}:1`) return makeNote({ id: '1', token: ETH_TOKEN })
        if (noteId === `${NOTE_CONTRACT.toLowerCase()}:2`) return makeNote({ id: '2', token: NON_ETH_TOKEN })
        return null
      })

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.getByText('#2')).toBeInTheDocument()
      })
    })

    it('skips notes that fail to load (getNote rejects)', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([
        makeAttestation('1'),
        makeAttestation('2'),
      ])
      vi.mocked(getNote).mockImplementation(async (_m, noteId) => {
        if (noteId === `${NOTE_CONTRACT.toLowerCase()}:1`) return makeNote({ id: '1' })
        throw new Error('Not found')
      })

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.queryByText('#2')).not.toBeInTheDocument()
      })
    })
  })

  describe('Table display', () => {
    it('shows table column headers', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote())

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('Note ID')).toBeInTheDocument()
        expect(screen.getByText('Amount')).toBeInTheDocument()
        expect(screen.getByText('Root Owner (Depositor)')).toBeInTheDocument()
        expect(screen.getByText('Current Leaf Owner')).toBeInTheDocument()
        expect(screen.getByText('Delegation')).toBeInTheDocument()
      })
    })

    it('shows note id as a Delegation link', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('42')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '42' }))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        const link = screen.getByRole('link', { name: '#42' })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '#')
      })
    })

    it('formats ETH amount correctly', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ amount: '1500000000000000000' })) // 1.5 ETH

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
      })
    })

    it('formats ERC-20 note amounts generically', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(
        makeNote({
          amount: '2500000000000000000',
          token: NON_ETH_TOKEN,
          tokenType: 0,
        })
      )

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('2.5 tokens')).toBeInTheDocument()
      })
    })

    it('shows "Direct" chip when owner equals rootOwner (not delegated)', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_A, rootOwner: OWNER_A }))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('Direct')).toBeInTheDocument()
      })
    })

    it('shows "Delegated" chip when owner differs from rootOwner', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_B, rootOwner: ROOT_OWNER }))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('Delegated')).toBeInTheDocument()
      })
    })

    it('shows truncated addresses for root owner and current owner', async () => {
      // truncateAddress: first 6 + '...' + last 4
      // OWNER_A: '0xAAAAAAAA...' → '0xAAAA...AAAA'
      // ROOT_OWNER: '0xCCCCCCCC...' → '0xCCCC...CCCC'
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_A, rootOwner: ROOT_OWNER }))

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('0xAAAA...AAAA')).toBeInTheDocument()
        expect(screen.getByText('0xCCCC...CCCC')).toBeInTheDocument()
      })
    })

    it('renders multiple notes as separate rows', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([
        makeAttestation('1'),
        makeAttestation('2'),
        makeAttestation('3'),
      ])
      vi.mocked(getNote).mockImplementation(async (_m, noteId) =>
        makeNote({ id: noteId.split(':').at(-1) ?? noteId })
      )

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.getByText('#2')).toBeInTheDocument()
        expect(screen.getByText('#3')).toBeInTheDocument()
      })
    })
  })

  describe('Toggle behavior', () => {
    it('reloads data after closing and re-opening', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])

      const user = userEvent.setup()
      render(<DelegatableNotesSection statementCid="QmTest" />)

      // Open
      await user.click(screen.getByRole('button', { name: /show/i }))
      await waitFor(() => screen.getByText('No delegatable notes intended for this cause.'))

      // Close then re-open
      await user.click(screen.getByRole('button', { name: /hide/i }))
      await user.click(screen.getByRole('button', { name: /show/i }))

      await waitFor(() => screen.getByText('No delegatable notes intended for this cause.'))
      expect(getNoteIntentAttestationsByStatement).toHaveBeenCalledTimes(2)
    })
  })
})
