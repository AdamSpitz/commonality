import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { StatementSuggestions } from './StatementSuggestions'
import type { StatementSuggestion } from '@commonality/sdk'

// Mock the SDK functions
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getStatementSuggestions: vi.fn(),
  }
})

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

import { createSDKMachinery, getStatementSuggestions } from '@commonality/sdk'
import { useNavigate } from 'react-router-dom'

// Helper to wrap components with BrowserRouter
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('StatementSuggestions', () => {
  const mockMachinery = {} as any
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching suggestions', () => {
      // Mock a never-resolving promise to keep loading state
      vi.mocked(getStatementSuggestions).mockReturnValue(new Promise(() => {}))

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('displays error message when fetching suggestions fails', async () => {
      const errorMessage = 'Network error'
      vi.mocked(getStatementSuggestions).mockRejectedValue(new Error(errorMessage))

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('displays generic error message for non-Error exceptions', async () => {
      vi.mocked(getStatementSuggestions).mockRejectedValue('string error')

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Failed to load suggestions')).toBeInTheDocument()
      })
    })

    it('logs error to console when fetching fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')
      vi.mocked(getStatementSuggestions).mockRejectedValue(error)

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error loading statement suggestions:',
          error
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Empty state', () => {
    it('renders nothing when there are no suggestions', async () => {
      vi.mocked(getStatementSuggestions).mockResolvedValue([])

      const { container } = renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('Suggestions display', () => {
    const mockSuggestions: StatementSuggestion[] = [
      {
        statement: {
          id: 'stmt456',
          title: 'Related Statement 1',
          excerpt: 'This is an excerpt',
          believerCount: 42,
          disbelieverCount: 5,
          cid: 'bafyTest1',
          statementType: 'conceptspace',
          createdAt: '2024-01-01T00:00:00Z',
        },
        relationshipType: 'implies',
        reason: 'Because both statements share common concepts',
      },
      {
        statement: {
          id: 'stmt789',
          title: 'Related Statement 2',
          excerpt: '',
          believerCount: 15,
          disbelieverCount: 2,
          cid: 'bafyTest2',
          statementType: 'conceptspace',
          createdAt: '2024-01-01T00:00:00Z',
        },
        relationshipType: 'implied-by',
        reason: 'This statement implies the main statement',
      },
    ]

    beforeEach(() => {
      vi.mocked(getStatementSuggestions).mockResolvedValue(mockSuggestions)
    })

    it('displays the suggestions section header', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Suggested Statements')).toBeInTheDocument()
      })
    })

    it('displays the suggestions description', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText(/These statements are related to the current statement/i)).toBeInTheDocument()
      })
    })

    it('renders all suggestion cards', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Related Statement 1')).toBeInTheDocument()
        expect(screen.getByText('Related Statement 2')).toBeInTheDocument()
      })
    })

    it('displays statement titles correctly', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Related Statement 1')).toBeInTheDocument()
        expect(screen.getByText('Related Statement 2')).toBeInTheDocument()
      })
    })

    it('displays "Untitled Statement" for statements without titles', async () => {
      const suggestionsWithoutTitle: StatementSuggestion[] = [
        {
          statement: {
            id: 'stmt999',
            title: '',
            excerpt: 'An excerpt',
            believerCount: 10,
            disbelieverCount: 1,
            cid: 'bafyTest3',
            statementType: 'conceptspace',
            createdAt: '2024-01-01T00:00:00Z',
          },
          relationshipType: 'implies',
          reason: 'Test reason',
        },
      ]
      vi.mocked(getStatementSuggestions).mockResolvedValue(suggestionsWithoutTitle)

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Untitled Statement')).toBeInTheDocument()
      })
    })

    it('displays excerpt when present', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('This is an excerpt')).toBeInTheDocument()
      })
    })

    it('does not display excerpt section when excerpt is null', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        // Related Statement 2 has no excerpt
        const cards = screen.getAllByRole('button')
        const secondCard = cards[1]
        expect(secondCard).toBeInTheDocument()
        // The excerpt should not be present in the second card
        expect(secondCard.textContent).not.toContain('excerpt')
      })
    })

    it('displays reason for each suggestion', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Because both statements share common concepts')).toBeInTheDocument()
        expect(screen.getByText('This statement implies the main statement')).toBeInTheDocument()
      })
    })

    it('displays believer count for each suggestion', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('42 supporters')).toBeInTheDocument()
        expect(screen.getByText('15 supporters')).toBeInTheDocument()
      })
    })

    it('displays correct relationship chip for "implies" type', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Implied by this')).toBeInTheDocument()
      })
    })

    it('displays correct relationship chip for "implied-by" type', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Implies this')).toBeInTheDocument()
      })
    })

    it('navigates to statement page when suggestion card is clicked', async () => {
      const userEvent = (await import('@testing-library/user-event')).default

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Related Statement 1')).toBeInTheDocument()
      })

      const firstCard = screen.getByText('Related Statement 1').closest('button')
      expect(firstCard).toBeInTheDocument()

      await userEvent.click(firstCard!)

      expect(mockNavigate).toHaveBeenCalledWith('/statement/bafyTest1')
    })
  })

  describe('API integration', () => {
    it('calls createSDKMachinery with correct URL from environment', async () => {
      vi.mocked(getStatementSuggestions).mockResolvedValue([])

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(createSDKMachinery).toHaveBeenCalled()
        expect(vi.mocked(createSDKMachinery).mock.calls[0][0]).toContain('graphql')
      })
    })

    it('calls getStatementSuggestions with statementCid and no userAddress', async () => {
      vi.mocked(getStatementSuggestions).mockResolvedValue([])

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(getStatementSuggestions).toHaveBeenCalledWith(
          mockMachinery,
          'bafyTest123',
          undefined
        )
      })
    })

    it('calls getStatementSuggestions with statementCid and userAddress when provided', async () => {
      vi.mocked(getStatementSuggestions).mockResolvedValue([])

      renderWithRouter(
        <StatementSuggestions
          statementCid="bafyTest123"
          userAddress="0x1234567890123456789012345678901234567890"
        />
      )

      await waitFor(() => {
        expect(getStatementSuggestions).toHaveBeenCalledWith(
          mockMachinery,
          'bafyTest123',
          '0x1234567890123456789012345678901234567890'
        )
      })
    })

    it('refetches suggestions when statementId changes', async () => {
      vi.mocked(getStatementSuggestions).mockResolvedValue([])

      const { rerender } = renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(getStatementSuggestions).toHaveBeenCalledTimes(1)
      })

      rerender(
        <BrowserRouter>
          <StatementSuggestions statementCid="bafyTest456" />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(getStatementSuggestions).toHaveBeenCalledTimes(2)
        expect(getStatementSuggestions).toHaveBeenLastCalledWith(
          mockMachinery,
          'bafyTest456',
          undefined
        )
      })
    })

    it('refetches suggestions when userAddress changes', async () => {
      vi.mocked(getStatementSuggestions).mockResolvedValue([])

      const { rerender } = renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" userAddress="0xAAA" />
      )

      await waitFor(() => {
        expect(getStatementSuggestions).toHaveBeenCalledTimes(1)
      })

      rerender(
        <BrowserRouter>
          <StatementSuggestions statementCid="bafyTest123" userAddress="0xBBB" />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(getStatementSuggestions).toHaveBeenCalledTimes(2)
        expect(getStatementSuggestions).toHaveBeenLastCalledWith(
          mockMachinery,
          'bafyTest123',
          '0xBBB'
        )
      })
    })
  })

  describe('Loading state transitions', () => {
    it('transitions from loading to success state', async () => {
      const mockSuggestions: StatementSuggestion[] = [
        {
          statement: {
            id: 'stmt456',
            title: 'Test Statement',
            excerpt: '',
            believerCount: 10,
            disbelieverCount: 1,
            cid: 'bafyTest456',
            statementType: 'conceptspace',
            createdAt: '2024-01-01T00:00:00Z',          },
          relationshipType: 'implies',
          reason: 'Test reason',
        },
      ]
      vi.mocked(getStatementSuggestions).mockResolvedValue(mockSuggestions)

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show content after loading
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(screen.getByText('Test Statement')).toBeInTheDocument()
      })
    })

    it('transitions from loading to error state', async () => {
      vi.mocked(getStatementSuggestions).mockRejectedValue(new Error('API Error'))

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show error after loading fails
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('transitions from loading to empty state', async () => {
      vi.mocked(getStatementSuggestions).mockResolvedValue([])

      const { container } = renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show nothing after loading with empty results
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(container.firstChild).toBeNull()
      })
    })
  })
})
