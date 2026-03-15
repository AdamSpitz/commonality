import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserProfilePage } from './UserProfilePage'
import type { StatementListItem, IndirectSupportInfo } from '@commonality/sdk'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
}))

// Mock the SDK functions
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getUserBeliefs: vi.fn(),
    getUserDisbeliefs: vi.fn(),
    getUserIndirectSupport: vi.fn(),
    getUserSocialData: vi.fn().mockResolvedValue(null),
  }
})

import { useParams, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  createSDKMachinery,
  getUserBeliefs,
  getUserDisbeliefs,
  getUserIndirectSupport,
} from '@commonality/sdk'

const mockExecutor = {} as any
const mockNavigate = vi.fn()

function makeStatement(overrides: Partial<StatementListItem> = {}): StatementListItem {
  return {
    id: 'stmt1',
    cid: `bafyTest${overrides.id}`,
    statementType: 'conceptspace',
    title: 'Test Statement',
    excerpt: 'This is a test excerpt',
    believerCount: 10,
    disbelieverCount: 3,
    createdAt: '2025-06-15T00:00:00Z',
    ...overrides,
  }
}

function makeIndirectSupport(overrides: Partial<IndirectSupportInfo> = {}): IndirectSupportInfo {
  return {
    statement: makeStatement({ id: 'indirect1', title: 'Indirectly Supported Statement' }),
    supportedVia: [
      {
        directlyBelievedStatement: makeStatement({ id: 'via1', cid: 'bafyVia1', title: 'Via Statement 1' }),
        viaStatementCid: 'bafyVia1',
      },
    ],
    ...overrides,
  }
}

describe('UserProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockExecutor)
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    // Default: no params, wallet not connected
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
    } as any)
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching user data', () => {
      // Mock never-resolving promises to keep loading state
      vi.mocked(getUserBeliefs).mockReturnValue(new Promise(() => {}))
      vi.mocked(getUserDisbeliefs).mockReturnValue(new Promise(() => {}))
      vi.mocked(getUserIndirectSupport).mockReturnValue(new Promise(() => {}))
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)

      render(<UserProfilePage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('does not display error or content while loading', () => {
      vi.mocked(getUserBeliefs).mockReturnValue(new Promise(() => {}))
      vi.mocked(getUserDisbeliefs).mockReturnValue(new Promise(() => {}))
      vi.mocked(getUserIndirectSupport).mockReturnValue(new Promise(() => {}))
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)

      render(<UserProfilePage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    })
  })

  describe('No wallet connected state', () => {
    it('displays connect wallet message when no address is available', async () => {
      vi.mocked(useParams).mockReturnValue({})
      vi.mocked(useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as any)

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('User Profile')).toBeInTheDocument()
        expect(screen.getByText('Connect your wallet to view your profile.')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('does not fetch any data when no address is available', async () => {
      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Connect your wallet to view your profile.')).toBeInTheDocument()
      })

      expect(getUserBeliefs).not.toHaveBeenCalled()
      expect(getUserDisbeliefs).not.toHaveBeenCalled()
      expect(getUserIndirectSupport).not.toHaveBeenCalled()
    })
  })

  describe('Error states', () => {
    it('displays error message when API call fails', async () => {
      const errorMessage = 'Network error'
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockRejectedValue(new Error(errorMessage))
      vi.mocked(getUserDisbeliefs).mockRejectedValue(new Error(errorMessage))
      vi.mocked(getUserIndirectSupport).mockRejectedValue(new Error(errorMessage))

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('displays generic error message for non-Error exceptions', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockRejectedValue('string error')
      vi.mocked(getUserDisbeliefs).mockRejectedValue('string error')
      vi.mocked(getUserIndirectSupport).mockRejectedValue('string error')

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load user data')).toBeInTheDocument()
      })
    })

    it('logs errors to console when API call fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockRejectedValue(error)
      vi.mocked(getUserDisbeliefs).mockRejectedValue(error)
      vi.mocked(getUserIndirectSupport).mockRejectedValue(error)

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading user data:', error)
      })

      consoleErrorSpy.mockRestore()
    })

    it('hides loading spinner when error occurs', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockRejectedValue(new Error('Network error'))
      vi.mocked(getUserDisbeliefs).mockRejectedValue(new Error('Network error'))
      vi.mocked(getUserIndirectSupport).mockRejectedValue(new Error('Network error'))

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      })
    })
  })

  describe('Own profile vs other user profile', () => {
    it('displays "My Profile" heading for own profile when no address param', async () => {
      vi.mocked(useParams).mockReturnValue({})
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('My Profile')).toBeInTheDocument()
      })
    })

    it('displays "My Profile" when address param matches connected address', async () => {
      vi.mocked(useParams).mockReturnValue({ address: '0x123' })
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('My Profile')).toBeInTheDocument()
      })
    })

    it('displays "User Profile" for other user when address param differs', async () => {
      vi.mocked(useParams).mockReturnValue({ address: '0xabc' })
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('User Profile')).toBeInTheDocument()
      })
    })

    it('displays "Create Statement" button for own profile', async () => {
      vi.mocked(useParams).mockReturnValue({})
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create statement/i })).toBeInTheDocument()
      })
    })

    it('does not display "Create Statement" button for other user profile', async () => {
      vi.mocked(useParams).mockReturnValue({ address: '0xabc' })
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('User Profile')).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /create statement/i })).not.toBeInTheDocument()
    })

    it('navigates to home when "Create Statement" button is clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useParams).mockReturnValue({})
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create statement/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create statement/i }))

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Address display', () => {
    it('displays the connected address in monospace font', async () => {
      const address = '0x1234567890abcdef'
      vi.mocked(useAccount).mockReturnValue({
        address,
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(address)).toBeInTheDocument()
      })
    })

    it('displays the address from params when viewing other user', async () => {
      const paramAddress = '0xabcdef1234567890'
      vi.mocked(useParams).mockReturnValue({ address: paramAddress })
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(paramAddress)).toBeInTheDocument()
      })
    })
  })

  describe('Tabs', () => {
    it('displays three tabs with correct labels and counts', async () => {
      const beliefs = [makeStatement({ id: 'b1' }), makeStatement({ id: 'b2' })]
      const disbeliefs = [makeStatement({ id: 'd1' })]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue(beliefs)
      vi.mocked(getUserDisbeliefs).mockResolvedValue(disbeliefs)
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Beliefs (2)' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Disbeliefs (1)' })).toBeInTheDocument()
        expect(screen.getByRole('tab', { name: 'Indirect Support' })).toBeInTheDocument()
      })
    })

    it('defaults to showing the Beliefs tab', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        const beliefsTab = screen.getByRole('tab', { name: 'Beliefs (0)' })
        expect(beliefsTab).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('switches to Disbeliefs tab when clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([makeStatement()])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /disbeliefs/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /disbeliefs/i }))

      await waitFor(() => {
        const disbeliefsTab = screen.getByRole('tab', { name: /disbeliefs/i })
        expect(disbeliefsTab).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('switches to Indirect Support tab when clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /indirect support/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /indirect support/i }))

      await waitFor(() => {
        const indirectTab = screen.getByRole('tab', { name: /indirect support/i })
        expect(indirectTab).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('Beliefs tab', () => {
    it('displays "No statements found" when user has no beliefs', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('No statements found.')).toBeInTheDocument()
      })
    })

    it('displays statement cards with title, excerpt, and chips', async () => {
      const beliefs = [
        makeStatement({
          id: 'stmt1',
          title: 'Statement Title 1',
          excerpt: 'Excerpt text 1',
          believerCount: 42,
          disbelieverCount: 5,
          statementType: 'conceptspace',
        }),
      ]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue(beliefs)
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Statement Title 1')).toBeInTheDocument()
        expect(screen.getByText('Excerpt text 1')).toBeInTheDocument()
        expect(screen.getByText('42 believers')).toBeInTheDocument()
        expect(screen.getByText('5 disbelievers')).toBeInTheDocument()
        expect(screen.getByText('conceptspace')).toBeInTheDocument()
      })
    })

    it('displays "Untitled Statement" when title is missing', async () => {
      const beliefs = [makeStatement({ title: '' })]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue(beliefs)
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Untitled Statement')).toBeInTheDocument()
      })
    })

    it('displays "No preview available" when excerpt is missing', async () => {
      const beliefs = [makeStatement({ excerpt: '' })]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue(beliefs)
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('No preview available')).toBeInTheDocument()
      })
    })

    it('navigates to statement page when card is clicked', async () => {
      const user = userEvent.setup()
      const beliefs = [makeStatement({ id: 'stmt123' })]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue(beliefs)
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Test Statement')).toBeInTheDocument()
      })

      // Find the CardActionArea button within the card
      const cardButton = screen.getByText('Test Statement').closest('.MuiCardActionArea-root')
      await user.click(cardButton!)

      expect(mockNavigate).toHaveBeenCalledWith('/statement/bafyTeststmt123')
    })

    it('displays multiple belief statements', async () => {
      const beliefs = [
        makeStatement({ id: 'stmt1', title: 'Statement 1' }),
        makeStatement({ id: 'stmt2', title: 'Statement 2' }),
        makeStatement({ id: 'stmt3', title: 'Statement 3' }),
      ]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue(beliefs)
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Statement 1')).toBeInTheDocument()
        expect(screen.getByText('Statement 2')).toBeInTheDocument()
        expect(screen.getByText('Statement 3')).toBeInTheDocument()
      })
    })
  })

  describe('Disbeliefs tab', () => {
    it('displays disbeliefs when switching to disbeliefs tab', async () => {
      const user = userEvent.setup()
      const disbeliefs = [
        makeStatement({
          id: 'disbelief1',
          title: 'Disbelieved Statement',
          excerpt: 'Disbelief excerpt',
        }),
      ]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue(disbeliefs)
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /disbeliefs/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /disbeliefs/i }))

      await waitFor(() => {
        expect(screen.getByText('Disbelieved Statement')).toBeInTheDocument()
        expect(screen.getByText('Disbelief excerpt')).toBeInTheDocument()
      })
    })

    it('displays "No statements found" when user has no disbeliefs', async () => {
      const user = userEvent.setup()
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /disbeliefs/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /disbeliefs/i }))

      await waitFor(() => {
        expect(screen.getByText('No statements found.')).toBeInTheDocument()
      })
    })
  })

  describe('Indirect Support tab', () => {
    it('displays indirect support information', async () => {
      const user = userEvent.setup()
      const indirectSupport = [
        makeIndirectSupport({
          statement: makeStatement({
            id: 'indirect1',
            title: 'Indirectly Supported',
            excerpt: 'Indirect excerpt',
            believerCount: 20,
          }),
          supportedVia: [
            {
              directlyBelievedStatement: makeStatement({ id: 'via1', title: 'Via Statement 1' }),
              viaStatementCid: 'bafyVia1',
            },
          ],
        }),
      ]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue(indirectSupport)

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /indirect support/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /indirect support/i }))

      await waitFor(() => {
        expect(screen.getByText('Indirectly Supported')).toBeInTheDocument()
        expect(screen.getByText('Indirect excerpt')).toBeInTheDocument()
        expect(screen.getByText(/Supported indirectly via 1 statement:/)).toBeInTheDocument()
        expect(screen.getByText(/Via Statement 1/)).toBeInTheDocument()
      })
    })

    it('displays "No indirect support found" message when empty', async () => {
      const user = userEvent.setup()
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /indirect support/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /indirect support/i }))

      await waitFor(() => {
        expect(screen.getByText(/No indirect support found/)).toBeInTheDocument()
        expect(
          screen.getByText(/Indirect support is calculated via implication relationships/)
        ).toBeInTheDocument()
      })
    })

    it('pluralizes "statements" correctly for multiple via statements', async () => {
      const user = userEvent.setup()
      const indirectSupport = [
        makeIndirectSupport({
          statement: makeStatement({ id: 'indirect1', title: 'Indirectly Supported' }),
          supportedVia: [
            {
              directlyBelievedStatement: makeStatement({ id: 'via1', title: 'Via Statement 1' }),
              viaStatementCid: 'bafyVia1',
            },
            {
              directlyBelievedStatement: makeStatement({ id: 'via2', title: 'Via Statement 2' }),
              viaStatementCid: 'bafyVia2',
            },
          ],
        }),
      ]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue(indirectSupport)

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /indirect support/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /indirect support/i }))

      await waitFor(() => {
        expect(screen.getByText(/Supported indirectly via 2 statements:/)).toBeInTheDocument()
      })
    })

    it('truncates via statements list after 3 items', async () => {
      const user = userEvent.setup()
      const indirectSupport = [
        makeIndirectSupport({
          statement: makeStatement({ id: 'indirect1', title: 'Indirectly Supported' }),
          supportedVia: [
            {
              directlyBelievedStatement: makeStatement({ id: 'via1', title: 'Via Statement 1' }),
              viaStatementCid: 'bafyVia1',
            },
            {
              directlyBelievedStatement: makeStatement({ id: 'via2', title: 'Via Statement 2' }),
              viaStatementCid: 'bafyVia2',
            },
            {
              directlyBelievedStatement: makeStatement({ id: 'via3', title: 'Via Statement 3' }),
              viaStatementCid: 'bafyVia3',
            },
            {
              directlyBelievedStatement: makeStatement({ id: 'via4', title: 'Via Statement 4' }),
              viaStatementCid: 'bafyVia4',
            },
          ],
        }),
      ]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue(indirectSupport)

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /indirect support/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /indirect support/i }))

      await waitFor(() => {
        expect(screen.getByText(/Via Statement 1/)).toBeInTheDocument()
        expect(screen.getByText(/Via Statement 2/)).toBeInTheDocument()
        expect(screen.getByText(/Via Statement 3/)).toBeInTheDocument()
        expect(screen.queryByText(/Via Statement 4/)).not.toBeInTheDocument()
        expect(screen.getByText(/\.\.\./)).toBeInTheDocument()
      })
    })

    it('falls back to statement ID when via statement has no title', async () => {
      const user = userEvent.setup()
      const indirectSupport = [
        makeIndirectSupport({
          statement: makeStatement({ id: 'indirect1', title: 'Indirectly Supported' }),
          supportedVia: [
            {
              directlyBelievedStatement: undefined as any,
              viaStatementCid: 'bafyVia123456789',
            },
          ],
        }),
      ]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue(indirectSupport)

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /indirect support/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /indirect support/i }))

      await waitFor(() => {
        expect(screen.getByText(/bafyVia/)).toBeInTheDocument()
      })
    })

    it('navigates to statement when indirect support card is clicked', async () => {
      const user = userEvent.setup()
      const indirectSupport = [
        makeIndirectSupport({
          statement: makeStatement({ id: 'indirect123', title: 'Indirectly Supported' }),
          supportedVia: [
            {
              directlyBelievedStatement: makeStatement({ id: 'via1', title: 'Via Statement 1' }),
              viaStatementCid: 'bafyVia1',
            },
          ],
        }),
      ]
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue(indirectSupport)

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /indirect support/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('tab', { name: /indirect support/i }))

      await waitFor(() => {
        expect(screen.getByText('Indirectly Supported')).toBeInTheDocument()
      })

      // Find the CardActionArea button within the card
      const cardButton = screen.getByText('Indirectly Supported').closest('.MuiCardActionArea-root')
      await user.click(cardButton!)

      expect(mockNavigate).toHaveBeenCalledWith('/statement/bafyTestindirect123')
    })
  })

  describe('API integration', () => {
    it('calls SDK functions with correct executor and address', async () => {
      const address = '0x123abc'
      vi.mocked(useAccount).mockReturnValue({
        address,
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(createSDKMachinery).toHaveBeenCalled()
        expect(getUserBeliefs).toHaveBeenCalledWith(mockExecutor, address)
        expect(getUserDisbeliefs).toHaveBeenCalledWith(mockExecutor, address)
        expect(getUserIndirectSupport).toHaveBeenCalledWith(mockExecutor, address)
      })
    })

    it('uses address from params when viewing other user', async () => {
      const paramAddress = '0xabc123'
      vi.mocked(useParams).mockReturnValue({ address: paramAddress })
      vi.mocked(useAccount).mockReturnValue({
        address: '0x999',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(getUserBeliefs).toHaveBeenCalledWith(mockExecutor, paramAddress)
        expect(getUserDisbeliefs).toHaveBeenCalledWith(mockExecutor, paramAddress)
        expect(getUserIndirectSupport).toHaveBeenCalledWith(mockExecutor, paramAddress)
      })
    })

    it('uses GRAPHQL_URL from environment variable', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      render(<UserProfilePage />)

      await waitFor(() => {
        expect(createSDKMachinery).toHaveBeenCalled()
      })
    })
  })

  describe('Data refetching', () => {
    it('refetches data when displayAddress changes', async () => {
      const { rerender } = render(<UserProfilePage />)

      vi.mocked(useAccount).mockReturnValue({
        address: '0x123',
        isConnected: true,
      } as any)
      vi.mocked(getUserBeliefs).mockResolvedValue([])
      vi.mocked(getUserDisbeliefs).mockResolvedValue([])
      vi.mocked(getUserIndirectSupport).mockResolvedValue([])

      rerender(<UserProfilePage />)

      await waitFor(() => {
        expect(getUserBeliefs).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      // Change address
      vi.mocked(useAccount).mockReturnValue({
        address: '0xabc',
        isConnected: true,
      } as any)

      rerender(<UserProfilePage />)

      await waitFor(() => {
        expect(getUserBeliefs).toHaveBeenCalledWith(mockExecutor, '0xabc')
        expect(getUserDisbeliefs).toHaveBeenCalledWith(mockExecutor, '0xabc')
        expect(getUserIndirectSupport).toHaveBeenCalledWith(mockExecutor, '0xabc')
      })
    })
  })
})
