import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DelegatableNotesSection } from './DelegatableNotesSection'

vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
}))

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

async function openDetails() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /show\s+note details/i }))
  return user
}

async function waitForTotal(text: string | RegExp) {
  await waitFor(() => {
    expect(screen.getAllByText(text).length).toBeGreaterThanOrEqual(1)
  })
}

describe('DelegatableNotesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)
    vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])
    vi.mocked(getNote).mockResolvedValue(null)
  })

  describe('Summary metrics', () => {
    it('loads notes on mount without requiring expand', async () => {
      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(getNoteIntentAttestationsByStatement).toHaveBeenCalledWith(mockMachinery, 'QmTest')
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

      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Total pledged to this cause')).toBeInTheDocument()
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

      render(<DelegatableNotesSection statementCid="QmTest" />)

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
          // User deposited and delegated away
          return makeNote({
            id: '1',
            amount: '1000000000000000000',
            rootOwner: USER,
            owner: OWNER_B,
          })
        }
        // Someone else
        return makeNote({
          id: '2',
          amount: '5000000000000000000',
          rootOwner: ROOT_OWNER,
          owner: ROOT_OWNER,
        })
      })

      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText("You've pledged")).toBeInTheDocument()
        // User's 1 ETH appears under You've pledged; total is 6 ETH
        expect(screen.getByText('6 ETH')).toBeInTheDocument()
        expect(screen.getAllByText('1 ETH').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows amount delegated to the connected user (leaf owner, not root)', async () => {
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

      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Delegated to you')).toBeInTheDocument()
        // Total and delegated-to-you both 2.5 ETH
        expect(screen.getAllByText('2.5 ETH').length).toBeGreaterThanOrEqual(2)
      })
    })

    it('does not count self-held notes as delegated to you', async () => {
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

      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Total pledged to this cause')).toBeInTheDocument()
      })

      // You've pledged = 1 ETH; delegated to you = 0
      expect(screen.getByText("You've pledged")).toBeInTheDocument()
      expect(screen.getByText('Delegated to you')).toBeInTheDocument()
      expect(screen.getByText('0 ETH')).toBeInTheDocument()
    })

    it('prompts to connect when wallet is disconnected for personal metrics', async () => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])

      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Connect a wallet to see your pledges')).toBeInTheDocument()
        expect(screen.getByText('Connect a wallet to see notes delegated to you')).toBeInTheDocument()
      })
    })
  })

  describe('Loading state', () => {
    it('shows spinner while data is loading', () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockReturnValue(new Promise(() => {}))

      render(<DelegatableNotesSection statementCid="QmTest" />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.getByText(/loading pledges/i)).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error Alert with message when loading fails', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockRejectedValue(new Error('Network failure'))

      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network failure')).toBeInTheDocument()
      })
    })

    it('shows generic error for non-Error exceptions', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockRejectedValue('string error')

      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load delegatable notes')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    it('shows empty message in details when no notes exist', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitFor(() => expect(screen.getByText('0 ETH')).toBeInTheDocument())
      await openDetails()

      await waitFor(() => {
        expect(screen.getByText('No delegatable notes intended for this cause.')).toBeInTheDocument()
      })
    })

    it('shows empty message when all notes are inactive', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '1', active: false }))

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitFor(() => expect(screen.getByText('0 ETH')).toBeInTheDocument())
      await openDetails()

      await waitFor(() => {
        expect(screen.getByText('No delegatable notes intended for this cause.')).toBeInTheDocument()
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

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('1 ETH')
      await openDetails()

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

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitFor(() => expect(getNote).toHaveBeenCalled())
      await openDetails()

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

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('1 ETH')
      await openDetails()

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.queryByText('#2')).not.toBeInTheDocument()
      })
    })
  })

  describe('Table display', () => {
    it('shows table column headers and explains owner/delegation labels', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote())

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('1 ETH')
      await openDetails()

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'Note ID' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Root Owner (Depositor)' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Current Leaf Owner' })).toBeInTheDocument()
        expect(screen.getByRole('columnheader', { name: 'Delegation' })).toBeInTheDocument()
        expect(screen.getByText(/root owner is the depositor who can revoke the note/i)).toBeInTheDocument()
        expect(screen.getByText(/current leaf owner is the wallet currently allowed to direct it/i)).toBeInTheDocument()
        expect(screen.getByText(/direct means those are the same wallet/i)).toBeInTheDocument()
      })
    })

    it('shows note id as a Delegation link', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('42')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '42' }))

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('1 ETH')
      await openDetails()

      await waitFor(() => {
        const link = screen.getByRole('link', { name: '#42' })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '#')
      })
    })

    it('formats ETH amount correctly', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ amount: '1500000000000000000' })) // 1.5 ETH

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('1.5 ETH')
      await openDetails()

      await waitFor(() => {
        // Summary + table both show the amount
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

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('2.5 tokens')
      await openDetails()

      await waitFor(() => {
        expect(screen.getAllByText('2.5 tokens').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows "Direct" chip when owner equals rootOwner (not delegated)', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_A, rootOwner: OWNER_A }))

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('1 ETH')
      await openDetails()

      await waitFor(() => {
        expect(screen.getByText('Direct')).toBeInTheDocument()
      })
    })

    it('shows "Delegated" chip when owner differs from rootOwner', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_B, rootOwner: ROOT_OWNER }))

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('1 ETH')
      await openDetails()

      await waitFor(() => {
        expect(screen.getByText('Delegated')).toBeInTheDocument()
      })
    })

    it('shows truncated addresses for root owner and current owner', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([makeAttestation('1')])
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: OWNER_A, rootOwner: ROOT_OWNER }))

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('1 ETH')
      await openDetails()

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

      render(<DelegatableNotesSection statementCid="QmTest" />)
      await waitForTotal('3 ETH')
      await openDetails()

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.getByText('#2')).toBeInTheDocument()
        expect(screen.getByText('#3')).toBeInTheDocument()
      })
    })
  })

  describe('Toggle behavior', () => {
    it('keeps summary loaded while toggling note details', async () => {
      vi.mocked(getNoteIntentAttestationsByStatement).mockResolvedValue([])

      render(<DelegatableNotesSection statementCid="QmTest" />)

      await waitFor(() => {
        expect(screen.getByText('Total pledged to this cause')).toBeInTheDocument()
        expect(screen.getByText('0 ETH')).toBeInTheDocument()
      })

      const user = await openDetails()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /hide\s+note details/i })).toBeInTheDocument()
        expect(screen.getByText('No delegatable notes intended for this cause.')).toBeVisible()
      })

      await user.click(screen.getByRole('button', { name: /hide\s+note details/i }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /show\s+note details/i })).toBeInTheDocument()
      })

      // Still only one load on mount
      expect(getNoteIntentAttestationsByStatement).toHaveBeenCalledTimes(1)
    })
  })
})
