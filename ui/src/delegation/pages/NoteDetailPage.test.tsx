import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NoteDetailPage } from './NoteDetailPage'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const OTHER_ADDR = '0x2222222222222222222222222222222222222222'
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const NOTE_CONTRACT = '0x3333333333333333333333333333333333333333'

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
}))

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
    getNote: vi.fn(),
    getDelegationChain: vi.fn(),
    getNoteIntentAttestationsByNote: vi.fn(),
    delegateNote: vi.fn(),
    revokeNote: vi.fn(),
    reclaimFunds: vi.fn(),
    purchaseFromPrimaryMarketWithNotes: vi.fn(),
    refundNote: vi.fn(),
    getProjectsFiltered: vi.fn(),
    getProjectTokens: vi.fn(),
  }
})

import { useParams } from 'react-router-dom'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
  createSDKMachinery,
  getNote,
  getDelegationChain,
  getNoteIntentAttestationsByNote,
  delegateNote as _delegateNote,
  revokeNote as _revokeNote,
  reclaimFunds as _reclaimFunds,
  getProjectsFiltered as _getProjectsFiltered,
  getProjectTokens as _getProjectTokens,
  purchaseFromPrimaryMarketWithNotes as _purchaseFromPrimaryMarketWithNotes,
  refundNote as _refundNote,
} from '@commonality/sdk'

const mockMachinery = {} as any

function makeNote(overrides: Record<string, any> = {}) {
  return {
    id: '42',
    chainHash: '0xabc',
    amount: '1000000000000000000',
    token: ETH_ADDRESS,
    tokenType: 0,
    tokenId: '0',
    owner: USER_ADDR,
    rootOwner: USER_ADDR,
    active: true,
    contractAddress: NOTE_CONTRACT,
    createdAt: '1700000000',
    createdAtBlock: '100',
    updatedAt: '1700000000',
    ...overrides,
  }
}

function makeChainLink(overrides: Record<string, any> = {}) {
  return {
    address: USER_ADDR,
    position: 0,
    createdAt: '1700000000',
    ...overrides,
  }
}

const ERC1155_ADDR = '0x4444444444444444444444444444444444444444'
const PROJECT_ADDR = '0x5555555555555555555555555555555555555555'

// A note holding ERC-1155 receipt tokens (tokenType 1) of a project.
function makeReceiptNote(overrides: Record<string, any> = {}) {
  return makeNote({
    token: ERC1155_ADDR,
    tokenType: 1,
    tokenId: '1',
    amount: '3',
    owner: USER_ADDR,
    rootOwner: USER_ADDR,
    ...overrides,
  })
}

// A project whose ERC-1155 collection matches the receipt note above.
function makeProject(overrides: Record<string, any> = {}) {
  const future = String(Math.floor(Date.now() / 1000) + 100000)
  return {
    id: PROJECT_ADDR,
    erc1155Address: ERC1155_ADDR,
    threshold: '1000',
    totalReceived: '0',
    deadline: future,
    ...overrides,
  } as any
}

// A project in the failed state: deadline passed, threshold not reached.
function makeFailedProject(overrides: Record<string, any> = {}) {
  return makeProject({ deadline: '1', totalReceived: '0', threshold: '1000', ...overrides })
}

describe('NoteDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useParams).mockReturnValue({ noteId: `${NOTE_CONTRACT}:42` })
    vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR } as any)
    vi.mocked(getDelegationChain).mockResolvedValue([])
    vi.mocked(getNoteIntentAttestationsByNote).mockResolvedValue([])
    vi.mocked(_getProjectsFiltered).mockResolvedValue([])
  })

  describe('Loading state', () => {
    it('shows spinner while data loads', () => {
      vi.mocked(getNote).mockReturnValue(new Promise(() => {}))

      render(<NoteDetailPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error alert when getNote rejects', async () => {
      vi.mocked(getNote).mockRejectedValue(new Error('Network error'))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('shows "Note not found" when getNote returns null', async () => {
      vi.mocked(getNote).mockResolvedValue(null)

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Note not found')).toBeInTheDocument()
      })
    })

    it('loads note and chain data with the scoped contract:id key from the route', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '42' }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(getNote).toHaveBeenCalledWith(mockMachinery, `${NOTE_CONTRACT}:42`)
        expect(getDelegationChain).toHaveBeenCalledWith(mockMachinery, `${NOTE_CONTRACT}:42`)
      })
      expect(getNoteIntentAttestationsByNote).toHaveBeenCalledWith(mockMachinery, NOTE_CONTRACT, '42')
    })
  })

  describe('Successful render', () => {
    it('shows note ID in heading', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '42' }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Fund #42')).toBeInTheDocument()
      })
    })

    it('shows formatted ETH amount', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ amount: '2000000000000000000' }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('2 ETH')).toBeInTheDocument()
      })
    })

    it('shows Active chip for active note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ active: true }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })

    it('shows Inactive chip for inactive note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ active: false }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument()
      })
    })

    it('shows ETH chip for ETH note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote())

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('ETH')).toBeInTheDocument()
      })
    })

    it('shows ERC1155 chip for token note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({
        token: OTHER_ADDR,
        tokenType: 1,
        tokenId: '5',
      }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getAllByText('Token')).toHaveLength(2)
      })
    })

    it('shows Delegated chip when note is delegated', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({
        owner: OTHER_ADDR,
        rootOwner: USER_ADDR,
      }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Delegated')).toBeInTheDocument()
      })
    })

    it('shows back-to-notes link', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote())

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/back to my delegated funds/i)).toBeInTheDocument()
      })
    })
  })

  describe('DelegationChainVisualization', () => {
    it('shows "no delegation chain" when chain is empty', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote())
      vi.mocked(getDelegationChain).mockResolvedValue([])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/hasn't been delegated/i)).toBeInTheDocument()
      })
    })

    it('shows Root and Leaf labels when chain has two members', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote())
      vi.mocked(getDelegationChain).mockResolvedValue([
        makeChainLink({ address: USER_ADDR, position: 0 }),
        makeChainLink({ address: OTHER_ADDR, position: 1 }),
      ])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeInTheDocument()
        expect(screen.getByText('Leaf')).toBeInTheDocument()
      })
    })

    it('shows "Delegate N" label for middle chain members', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote())
      const MIDDLE_ADDR = '0x3333333333333333333333333333333333333333'
      vi.mocked(getDelegationChain).mockResolvedValue([
        makeChainLink({ address: USER_ADDR, position: 0 }),
        makeChainLink({ address: MIDDLE_ADDR, position: 1 }),
        makeChainLink({ address: OTHER_ADDR, position: 2 }),
      ])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Delegate 1')).toBeInTheDocument()
      })
    })
  })

  describe('IntendedPurpose', () => {
    it('shows "no intended statement" when attestations are empty', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote())
      vi.mocked(getNoteIntentAttestationsByNote).mockResolvedValue([])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/no intended statement set/i)).toBeInTheDocument()
      })
    })

    it('shows attestation info when present', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote())
      vi.mocked(getNoteIntentAttestationsByNote).mockResolvedValue([
        {
          attester: USER_ADDR,
          noteContract: NOTE_CONTRACT,
          noteId: '42',
          intendedStatementId: 'QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          createdAt: '1700000000',
        } as any,
      ])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/intended for/i)).toBeInTheDocument()
      })
    })

    it('keys same-note-id attestations by contract version', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(getNote).mockResolvedValue(makeNote())
      vi.mocked(getNoteIntentAttestationsByNote).mockResolvedValue([
        {
          attester: USER_ADDR,
          noteContract: NOTE_CONTRACT,
          noteId: '42',
          intendedStatementId: 'QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
          createdAt: '1700000000',
        } as any,
        {
          attester: USER_ADDR,
          noteContract: OTHER_ADDR,
          noteId: '42',
          intendedStatementId: 'QmYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
          createdAt: '1700000001',
        } as any,
      ])

      try {
        render(<NoteDetailPage />)

        await waitFor(() => {
          expect(screen.getAllByText(/intended for/i)).toHaveLength(2)
        })
        const duplicateKeyWarning = consoleErrorSpy.mock.calls.some((args) =>
          args.some((arg) => String(arg).includes('Encountered two children with the same key')),
        )
        expect(duplicateKeyWarning).toBe(false)
      } finally {
        consoleErrorSpy.mockRestore()
      }
    })
  })

  describe('Action buttons', () => {
    it('shows Delegate button when user is current leaf owner', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument()
      })
    })

    it('shows Reclaim Funds button when user is root owner of undelegated note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reclaim Funds' })).toBeInTheDocument()
      })
    })

    it('shows Spend on Project button when user is leaf owner of ETH note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Spend on Project' })).toBeInTheDocument()
      })
    })

    it('shows Revoke button when user is a chain member but not leaf owner', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({
        owner: OTHER_ADDR,
        rootOwner: USER_ADDR,
      }))
      vi.mocked(getDelegationChain).mockResolvedValue([
        makeChainLink({ address: USER_ADDR, position: 0 }),
        makeChainLink({ address: OTHER_ADDR, position: 1 }),
      ])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
      })
    })

    it('does not show Spend on Project button for ERC1155 notes', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({
        owner: USER_ADDR,
        rootOwner: USER_ADDR,
        token: OTHER_ADDR,
        tokenType: 1,
      }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Spend on Project' })).not.toBeInTheDocument()
      })
    })

    it('does not show Reclaim Funds button when note is delegated', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({
        owner: OTHER_ADDR,
        rootOwner: USER_ADDR,
      }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Reclaim Funds' })).not.toBeInTheDocument()
      })
    })

    it('shows "no actions available" when user has no role in the note', async () => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR } as any)
      vi.mocked(getNote).mockResolvedValue(makeNote({
        owner: OTHER_ADDR,
        rootOwner: OTHER_ADDR,
      }))
      vi.mocked(getDelegationChain).mockResolvedValue([])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/don't have any actions available/i)).toBeInTheDocument()
      })
    })
  })

  describe('Delegate action flow', () => {
    it('opens delegate dialog when Delegate button is clicked', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))

      await waitFor(() => {
        expect(screen.getByText(/delegate fund #42/i)).toBeInTheDocument()
      })
    })

    it('shows address and amount inputs in delegate dialog', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)

      render(<NoteDetailPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))
      })

      await waitFor(() => {
        expect(screen.getByLabelText(/delegate to address/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/amount \(eth\)/i)).toBeInTheDocument()
      })
    })

    it('closes dialog when Cancel is clicked', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)

      render(<NoteDetailPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Delegate' }))
      })

      await waitFor(() => {
        expect(screen.getByText(/delegate fund #42/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByText(/delegate fund #42/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Revoke action flow', () => {
    it('shows Revoke button when user is chain member but not leaf', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({
        owner: OTHER_ADDR,
        rootOwner: USER_ADDR,
      }))
      vi.mocked(getDelegationChain).mockResolvedValue([
        makeChainLink({ address: USER_ADDR, position: 0 }),
        makeChainLink({ address: OTHER_ADDR, position: 1 }),
      ])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
      })
    })
  })

  describe('Reclaim action flow', () => {
    it('shows Reclaim Funds button when user is root owner of undelegated note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reclaim Funds' })).toBeInTheDocument()
      })
    })
  })

  describe('Spend on Project action flow', () => {
    it('opens spend dialog when Spend on Project button is clicked', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Spend on Project' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Spend on Project' }))

      await waitFor(() => {
        expect(screen.getByText(/spend fund on project/i)).toBeInTheDocument()
      })
    })

    it('closes spend dialog when Cancel is clicked', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)

      render(<NoteDetailPage />)

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Spend on Project' }))
      })

      await waitFor(() => {
        expect(screen.getByText(/spend fund on project/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByText(/spend fund on project/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Refund action flow', () => {
    it('shows Refund into a Fund button for a receipt note of a failed project', async () => {
      vi.mocked(getNote).mockResolvedValue(makeReceiptNote())
      vi.mocked(_getProjectsFiltered).mockResolvedValue([makeFailedProject()])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Refund into a Fund' })).toBeInTheDocument()
      })
    })

    it('does not show Refund button when the matching project has not failed', async () => {
      vi.mocked(getNote).mockResolvedValue(makeReceiptNote())
      // Project is still active (deadline in the future) → not refundable.
      vi.mocked(_getProjectsFiltered).mockResolvedValue([makeProject()])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Fund #42')).toBeInTheDocument()
      })
      expect(screen.queryByRole('button', { name: 'Refund into a Fund' })).not.toBeInTheDocument()
    })

    it('does not show Refund button for an ETH note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ owner: USER_ADDR, rootOwner: USER_ADDR }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Fund #42')).toBeInTheDocument()
      })
      expect(screen.queryByRole('button', { name: 'Refund into a Fund' })).not.toBeInTheDocument()
    })

    it('does not show Refund button for an inactive receipt note', async () => {
      vi.mocked(getNote).mockResolvedValue(makeReceiptNote({ active: false }))
      vi.mocked(_getProjectsFiltered).mockResolvedValue([makeFailedProject()])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Fund #42')).toBeInTheDocument()
      })
      expect(screen.queryByRole('button', { name: 'Refund into a Fund' })).not.toBeInTheDocument()
    })

    it('does not show Refund button when the user is not the leaf owner', async () => {
      // Receipt note delegated away: USER is root but OTHER is the current leaf.
      vi.mocked(getNote).mockResolvedValue(makeReceiptNote({ owner: OTHER_ADDR, rootOwner: USER_ADDR }))
      vi.mocked(_getProjectsFiltered).mockResolvedValue([makeFailedProject()])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Fund #42')).toBeInTheDocument()
      })
      expect(screen.queryByRole('button', { name: 'Refund into a Fund' })).not.toBeInTheDocument()
    })

    it('calls refundNote with the note id, chain, and failed project as primary market', async () => {
      vi.mocked(getNote).mockResolvedValue(makeReceiptNote())
      vi.mocked(getDelegationChain).mockResolvedValue([
        makeChainLink({ address: USER_ADDR, position: 0 }),
      ])
      vi.mocked(_getProjectsFiltered).mockResolvedValue([makeFailedProject()])
      vi.mocked(_refundNote).mockResolvedValue({ hash: '0xdead', noteId: 99n } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
      vi.mocked(usePublicClient).mockReturnValue({} as any)

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Refund into a Fund' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Refund into a Fund' }))

      await waitFor(() => {
        expect(_refundNote).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          {
            noteId: 42n,
            chain: [USER_ADDR],
            primaryMarket: PROJECT_ADDR,
          }
        )
      })
    })
  })
})
