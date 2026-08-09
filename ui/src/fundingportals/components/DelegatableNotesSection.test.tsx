import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DelegatableNotesSection } from './DelegatableNotesSection'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

vi.mock('@commonality/sdk/delegation', async () => {
  const actual = await vi.importActual('@commonality/sdk/delegation')
  return {
    ...actual,
    getNoteIntentAttestationsByStatement: vi.fn(),
    getNote: vi.fn(),
  }
})

vi.mock('@commonality/sdk/machinery', async () => {
  const actual = await vi.importActual('@commonality/sdk/machinery')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
  }
})

import { useAccount } from 'wagmi'
import { getNoteIntentAttestationsByStatement, getNote } from '@commonality/sdk/delegation'
import { createSDKMachinery } from '@commonality/sdk/machinery'

const mockMachinery = {} as any

const ETH_TOKEN = '0x0000000000000000000000000000000000000000'
const NON_ETH_TOKEN = '0x1111111111111111111111111111111111111111'
const OWNER_A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const OWNER_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const ROOT_OWNER = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'
const NOTE_CONTRACT = '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'
const USER = '0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE'

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

function renderSection(
  ui: React.ReactElement = <DelegatableNotesSection statementCid="QmTest" />,
) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

async function waitForTotal(text: string | RegExp) {
  await waitFor(() => {
    expect(screen.getAllByText(text).length).toBeGreaterThanOrEqual(1)
  })
}

describe('DelegatableNotesSection', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)
    vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])
    vi.mocked(getNote).mockResolvedValue(null)
  })

  describe('Summary metrics', () => {
    it('loads notes on mount', async () => {
      renderSection()

      await waitFor(() => {
        expect(getNoteIntentAttestationsByStatement).toHaveBeenCalledWith(mockMachinery, 'QmTest')
      })
    })

    it('titles the section Earmarked funds', async () => {
      renderSection()
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /earmarked funds/i })).toBeInTheDocument()
      })
    })

    it('shows total pledged across all active notes earmarked for the cause', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([
        makeAttestation('1'),
        makeAttestation('2'),
      ])
      vi.mocked(getNote).mockImplementation(async (_m, noteId) => {
        if (noteId === `${NOTE_CONTRACT.toLowerCase()}:1`) {
          return makeNote({ id: '1', amount: '1000000000000000000' })
        }
        return makeNote({ id: '2', amount: '2000000000000000000' })
      })

      renderSection()

      await waitFor(() => {
        expect(screen.getByText('Total pledged')).toBeInTheDocument()
        expect(screen.getByText('3 ETH')).toBeInTheDocument()
      })
    })

    it('counts a note only once when multiple attesters attest it', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([
        makeAttestation('1'),
        { ...makeAttestation('1'), attester: OWNER_B },
      ])
      vi.mocked(getNote).mockResolvedValue(
        makeNote({ id: '1', amount: '1000000000000000000' }),
      )

      renderSection()

      await waitForTotal('1 ETH')
      expect(getNote).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('2 ETH')).not.toBeInTheDocument()
    })

    it('shows amount the connected user has pledged (root owner)', async () => {
      vi.mocked(useAccount).mockReturnValue({ address: USER } as any)
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([
        makeAttestation('1'),
        makeAttestation('2'),
      ])
      vi.mocked(getNote).mockImplementation(async (_m, noteId) => {
        if (noteId === `${NOTE_CONTRACT.toLowerCase()}:1`) {
          return makeNote({
            id: '1',
            amount: '1000000000000000000',
            rootOwner: USER,
            owner: OWNER_B,
          })
        }
        return makeNote({
          id: '2',
          amount: '5000000000000000000',
          rootOwner: ROOT_OWNER,
          owner: ROOT_OWNER,
        })
      })

      renderSection()

      await waitFor(() => {
        expect(screen.getByText("You've pledged")).toBeInTheDocument()
        expect(screen.getByText('6 ETH')).toBeInTheDocument()
        expect(screen.getAllByText('1 ETH').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows amount directed to the connected user (leaf owner, not root)', async () => {
      vi.mocked(useAccount).mockReturnValue({ address: USER } as any)
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(
        makeNote({
          id: '1',
          amount: '2500000000000000000',
          rootOwner: ROOT_OWNER,
          owner: USER,
        }),
      )

      renderSection()

      await waitFor(() => {
        expect(screen.getByText('Directed to you')).toBeInTheDocument()
        expect(screen.getAllByText('2.5 ETH').length).toBeGreaterThanOrEqual(2)
      })
    })

    it('does not count self-held notes as directed to you', async () => {
      vi.mocked(useAccount).mockReturnValue({ address: USER } as any)
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(
        makeNote({
          id: '1',
          amount: '1000000000000000000',
          rootOwner: USER,
          owner: USER,
        }),
      )

      renderSection()

      await waitFor(() => {
        expect(screen.getByText('Total pledged')).toBeInTheDocument()
      })

      expect(screen.getByText("You've pledged")).toBeInTheDocument()
      expect(screen.getByText('Directed to you')).toBeInTheDocument()
      expect(screen.getByText('nothing')).toBeInTheDocument()
    })

    it('shows em dash for personal metrics when wallet is disconnected', async () => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])

      renderSection()

      await waitFor(() => {
        expect(screen.getByText('Your pledge')).toBeInTheDocument()
        expect(screen.getByText('Directed to you')).toBeInTheDocument()
        expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
      })
    })

    it('does not show note details in summary mode', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote())

      renderSection()
      await waitForTotal('1 ETH')

      expect(screen.queryByRole('button', { name: /note details/i })).not.toBeInTheDocument()
      expect(screen.queryByText('Notes earmarked for this cause')).not.toBeInTheDocument()
      expect(screen.queryByText('#1')).not.toBeInTheDocument()
    })

    it('links the whole summary card when to is provided', async () => {
      renderSection(<DelegatableNotesSection statementCid="QmTest" to="/cause/abc/earmarked" />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /earmarked funds/i })).toBeInTheDocument()
      })

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/cause/abc/earmarked')
      expect(screen.getByText('Details →')).toBeInTheDocument()
    })

    it('uses a single caption line per metric (no secondary descriptions)', async () => {
      renderSection()
      await waitFor(() => {
        expect(screen.getByText('Total pledged')).toBeInTheDocument()
      })

      expect(screen.queryByText(/all active notes earmarked/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/connect a wallet to see/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/notes you deposited/i)).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('shows spinner while data is loading', () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockReturnValue(new Promise(() => {}))

      renderSection()

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText(/loading pledges/i)).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error Alert with message when loading fails', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockRejectedValue(new Error('Network failure'))

      renderSection()

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network failure')).toBeInTheDocument()
      })
    })

    it('shows generic error for non-Error exceptions', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockRejectedValue('string error')

      renderSection()

      await waitFor(() => {
        expect(screen.getByText('Failed to load earmarked funds')).toBeInTheDocument()
      })
    })
  })

  describe('Detail variant', () => {
    it('shows empty message when no notes exist', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitFor(() => expect(screen.getByText('nothing')).toBeInTheDocument())

      expect(screen.getByText('No notes earmarked for this cause yet.')).toBeInTheDocument()
    })

    it('shows empty message when all notes are inactive', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '1', active: false }))

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitFor(() => expect(screen.getByText('nothing')).toBeInTheDocument())

      expect(screen.getByText('No notes earmarked for this cause yet.')).toBeInTheDocument()
    })

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

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('1 ETH')

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

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitFor(() => expect(getNote).toHaveBeenCalled())

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

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('1 ETH')

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.queryByText('#2')).not.toBeInTheDocument()
      })
    })

    it('shows table column headers and explains owner/status labels', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote())

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('1 ETH')

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'Note ID' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Root Owner (Depositor)' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Current Leaf Owner' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
        expect(screen.getByText(/root owner is the depositor who can revoke the note/i)).toBeInTheDocument()
      })
    })

    it('shows note id as a link', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('42')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '42' }))

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('1 ETH')

      await waitFor(() => {
        const link = screen.getByRole('link', { name: '#42' })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '#')
      })
    })

    it('formats ETH amount correctly', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ amount: '1500000000000000000' }))

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('1.5 ETH')

      await waitFor(() => {
        expect(screen.getAllByText('1.5 ETH').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('formats ERC-20 note amounts generically', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(
        makeNote({
          amount: '2500000000000000000',
          token: NON_ETH_TOKEN,
          tokenType: 0,
        }),
      )

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('2.5 tokens')

      await waitFor(() => {
        expect(screen.getAllByText('2.5 tokens').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows "Direct" chip when owner equals rootOwner', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_A, rootOwner: OWNER_A }))

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('1 ETH')

      await waitFor(() => {
        expect(screen.getByText('Direct')).toBeInTheDocument()
      })
    })

    it('shows "Delegated" chip when owner differs from rootOwner', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_B, rootOwner: ROOT_OWNER }))

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('1 ETH')

      await waitFor(() => {
        expect(screen.getByText('Delegated')).toBeInTheDocument()
      })
    })

    it('shows truncated addresses for root owner and current owner', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_A, rootOwner: ROOT_OWNER }))

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('1 ETH')

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
        makeNote({ id: noteId.split(':').at(-1) ?? noteId }),
      )

      renderSection(<DelegatableNotesSection statementCid="QmTest" variant="detail" />)
      await waitForTotal('3 ETH')

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.getByText('#2')).toBeInTheDocument()
        expect(screen.getByText('#3')).toBeInTheDocument()
      })
    })

    it('does not wrap the detail card as a link even if to is provided', async () => {
      renderSection(
        <DelegatableNotesSection
          statementCid="QmTest"
          variant="detail"
          to="/cause/abc/earmarked"
        />,
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /earmarked funds/i })).toBeInTheDocument()
      })

      expect(screen.queryByText('Details →')).not.toBeInTheDocument()
      // Note table may add lazy-giving note links; the card itself is not a router link.
      expect(screen.queryByRole('link', { name: /earmarked funds/i })).not.toBeInTheDocument()
    })
  })
})
