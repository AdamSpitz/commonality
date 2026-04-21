import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { StatementSuggestions } from './StatementSuggestions'
import type { FoldedNudge, StatementWithContent } from '@commonality/sdk'

// Mock the SDK functions
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    getStatementNudges: vi.fn(),
    getStatementWithContent: vi.fn(),
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

vi.mock('../../shared/hooks/useTrustedNudgers', () => ({
  useTrustedNudgers: vi.fn(() => []),
}))

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: vi.fn(),
}))

import { getStatementNudges, getStatementWithContent } from '@commonality/sdk'
import { useNavigate } from 'react-router-dom'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedNudgers } from '../../shared/hooks/useTrustedNudgers'

const VALID_NUDGER_1 = '0xaabbccddaabbccddaabbccddaabbccddaabbccdd'
const VALID_NUDGER_2 = '0x1234567890123456789012345678901234567890'
const TEST_NUDGE: FoldedNudge = {
  nudger: VALID_NUDGER_1 as `0x${string}`,
  targetStatementCid: 'bafyTest123',
  suggestedStatementCid: 'bafySuggested1',
  reason: 'Because this statement strengthens the same position',
  confidence: 0.87,
  publishedAt: 1_700_000_000,
  publicationCid: 'bafyPublication1',
}
const TEST_STATEMENT: StatementWithContent = {
  statement: {
    id: 'stmt456',
    cid: 'bafySuggested1',
    believerCount: 42,
    disbelieverCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
  },
  content: {
    format: 'text/plain',
    content: 'Related Statement 1\nThis is an excerpt for the suggested statement.',
  },
}
const SECOND_NUDGE: FoldedNudge = {
  ...TEST_NUDGE,
  nudger: VALID_NUDGER_2 as `0x${string}`,
  suggestedStatementCid: 'bafySuggested2',
  reason: 'This fills in a nearby gap',
  confidence: 0.52,
  publicationCid: 'bafyPublication2',
}
const SECOND_STATEMENT: StatementWithContent = {
  statement: {
    id: 'stmt789',
    cid: 'bafySuggested2',
    believerCount: 15,
    disbelieverCount: 2,
    createdAt: '2024-01-01T00:00:00Z',
  },
  content: {
    format: 'text/plain',
    content: 'Related Statement 2',
  },
}

function mockSuggestionData(
  nudges: FoldedNudge[] = [TEST_NUDGE, SECOND_NUDGE],
  statements: Record<string, StatementWithContent | null> = {
    [TEST_NUDGE.suggestedStatementCid]: TEST_STATEMENT,
    [SECOND_NUDGE.suggestedStatementCid]: SECOND_STATEMENT,
  },
) {
  vi.mocked(getStatementNudges).mockResolvedValue(nudges)
  vi.mocked(getStatementWithContent).mockImplementation(async (_machinery, cid) => statements[cid] ?? null)
}

// Helper to wrap components with BrowserRouter
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('StatementSuggestions', () => {
  const mockMachinery = {} as any
  const mockNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(useMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    vi.mocked(useTrustedNudgers).mockReturnValue([])
    vi.mocked(getStatementNudges).mockResolvedValue([])
    vi.mocked(getStatementWithContent).mockResolvedValue(TEST_STATEMENT)
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching suggestions', () => {
      // Mock a never-resolving promise to keep loading state
      vi.mocked(getStatementNudges).mockReturnValue(new Promise(() => {}))

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('displays error message when fetching suggestions fails', async () => {
      const errorMessage = 'Network error'
      vi.mocked(getStatementNudges).mockRejectedValue(new Error(errorMessage))

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('displays generic error message for non-Error exceptions', async () => {
      vi.mocked(getStatementNudges).mockRejectedValue('string error')

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
      vi.mocked(getStatementNudges).mockRejectedValue(error)

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error loading statement nudges:',
          error
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Empty state', () => {
    it('renders nothing when there are no suggestions', async () => {
      const { container } = renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('Suggestions display', () => {
    it('displays the suggestions section header', async () => {
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Suggested Statements')).toBeInTheDocument()
      })
    })

    it('displays the suggestions description', async () => {
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText(/Trusted nudgers published these suggestions/i)).toBeInTheDocument()
      })
    })

    it('renders all suggestion cards', async () => {
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Related Statement 1' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Related Statement 2' })).toBeInTheDocument()
      })
    })

    it('displays "Untitled Statement" for statements without titles', async () => {
      mockSuggestionData(
        [TEST_NUDGE],
        {
          [TEST_NUDGE.suggestedStatementCid]: {
            statement: {
              id: 'stmt999',
              cid: 'bafySuggested3',
              believerCount: 10,
              disbelieverCount: 1,
              createdAt: '2024-01-01T00:00:00Z',
            },
            content: {
              format: 'text/plain',
              content: '',
            },
          },
        },
      )

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Untitled Statement')).toBeInTheDocument()
      })
    })

    it('displays excerpt when present', async () => {
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText(/This is an excerpt for the suggested statement/)).toBeInTheDocument()
      })
    })

    it('does not display excerpt section when the content has only a title line', async () => {
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        const secondCard = screen.getByRole('heading', { name: 'Related Statement 2' }).closest('button')
        expect(secondCard?.textContent).not.toContain('excerpt')
      })
    })

    it('displays reason and nudger metadata for each suggestion', async () => {
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('Because this statement strengthens the same position')).toBeInTheDocument()
        expect(screen.getByText('This fills in a nearby gap')).toBeInTheDocument()
        expect(screen.getByText('87% confidence')).toBeInTheDocument()
        expect(screen.getByText('52% confidence')).toBeInTheDocument()
        expect(screen.getByText('Nudger 0xaabb...ccdd')).toBeInTheDocument()
        expect(screen.getByText('Nudger 0x1234...7890')).toBeInTheDocument()
      })
    })

    it('displays believer count for each suggestion', async () => {
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByText('42 supporters')).toBeInTheDocument()
        expect(screen.getByText('15 supporters')).toBeInTheDocument()
      })
    })

    it('navigates to statement page when suggestion card is clicked', async () => {
      const userEvent = (await import('@testing-library/user-event')).default
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Related Statement 1' })).toBeInTheDocument()
      })

      const firstCard = screen.getByRole('heading', { name: 'Related Statement 1' }).closest('button')
      expect(firstCard).toBeInTheDocument()

      await userEvent.click(firstCard!)

      expect(mockNavigate).toHaveBeenCalledWith('/statement/bafySuggested1')
    })

    it('skips nudges whose suggested statement no longer resolves', async () => {
      mockSuggestionData(
        [
          TEST_NUDGE,
          {
          targetStatementCid: 'bafyTest123',
          suggestedStatementCid: 'bafyMissing',
          nudger: VALID_NUDGER_2 as `0x${string}`,
          reason: 'Missing statement',
          confidence: 0.4,
          publishedAt: 1_700_000_100,
          publicationCid: 'bafyPublication3',
          },
        ] as FoldedNudge[],
        {
          [TEST_NUDGE.suggestedStatementCid]: TEST_STATEMENT,
          bafyMissing: null,
        },
      )

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Related Statement 1' })).toBeInTheDocument()
      })
      expect(screen.queryByText('Missing statement')).not.toBeInTheDocument()
    })
  })

  describe('API integration', () => {
    it('calls getStatementNudges with undefined trustedNudgers when none configured', async () => {
      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(getStatementNudges).toHaveBeenCalledWith(
          mockMachinery,
          'bafyTest123',
          undefined
        )
      })
    })

    it('passes trustedNudgers from the hook to getStatementNudges', async () => {
      vi.mocked(useTrustedNudgers).mockReturnValue([VALID_NUDGER_1, VALID_NUDGER_2])

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(getStatementNudges).toHaveBeenCalledWith(
          mockMachinery,
          'bafyTest123',
          [VALID_NUDGER_1, VALID_NUDGER_2]
        )
      })
    })

    it('passes undefined when trustedNudgers list is empty', async () => {
      vi.mocked(useTrustedNudgers).mockReturnValue([])

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(getStatementNudges).toHaveBeenCalledWith(
          mockMachinery,
          'bafyTest123',
          undefined
        )
      })
    })

    it('refetches suggestions when statementCid changes', async () => {
      const { rerender } = renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(getStatementNudges).toHaveBeenCalledTimes(1)
      })

      rerender(
        <BrowserRouter>
          <StatementSuggestions statementCid="bafyTest456" />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(getStatementNudges).toHaveBeenCalledTimes(2)
        expect(getStatementNudges).toHaveBeenLastCalledWith(
          mockMachinery,
          'bafyTest456',
          undefined
        )
      })
    })
  })

  describe('Loading state transitions', () => {
    it('transitions from loading to success state', async () => {
      mockSuggestionData(
        [TEST_NUDGE],
        {
          [TEST_NUDGE.suggestedStatementCid]: {
            statement: {
              id: 'stmt456',
              cid: 'bafySuggested1',
              believerCount: 10,
              disbelieverCount: 1,
              createdAt: '2024-01-01T00:00:00Z',
            },
            content: {
              format: 'text/plain',
              content: 'Test Statement',
            },
          },
        },
      )

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show content after loading
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Test Statement' })).toBeInTheDocument()
      })
    })

    it('transitions from loading to error state', async () => {
      vi.mocked(getStatementNudges).mockRejectedValue(new Error('API Error'))

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
