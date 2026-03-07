import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NoteDetailPage } from './NoteDetailPage'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const OTHER_ADDR = '0x2222222222222222222222222222222222222222'
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

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
    getProjectsFiltered: vi.fn(),
    getProjectTokens: vi.fn(),
  }
})

import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  createSDKMachinery,
  getNote,
  getDelegationChain,
  getNoteIntentAttestationsByNote,
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

describe('NoteDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useParams).mockReturnValue({ noteId: '42' })
    vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR } as any)
    vi.mocked(getDelegationChain).mockResolvedValue([])
    vi.mocked(getNoteIntentAttestationsByNote).mockResolvedValue([])
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
  })

  describe('Successful render', () => {
    it('shows note ID in heading', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote({ id: '42' }))

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Note #42')).toBeInTheDocument()
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
        expect(screen.getByText('ERC1155')).toBeInTheDocument()
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
        expect(screen.getByText(/back to my notes/i)).toBeInTheDocument()
      })
    })
  })

  describe('DelegationChainVisualization', () => {
    it('shows "no delegation chain" when chain is empty', async () => {
      vi.mocked(getNote).mockResolvedValue(makeNote())
      vi.mocked(getDelegationChain).mockResolvedValue([])

      render(<NoteDetailPage />)

      await waitFor(() => {
        expect(screen.getByText(/no delegation chain/i)).toBeInTheDocument()
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
})
