import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { StatementSuggestions } from './StatementSuggestions'
import type { FoldedNudge, StatementWithContent } from '@commonality/sdk'

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    getStatementNudges: vi.fn(),
    getStatementWithContent: vi.fn(),
  }
})

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

vi.mock('../../shared/hooks/useNudgeIntensity', () => ({
  useNudgeIntensity: vi.fn(() => ({ intensity: 'low', setIntensity: vi.fn() })),
}))

const MUTED_TOPICS_MOCK = { mutedTopics: [] as string[], addTopic: vi.fn(), removeTopic: vi.fn() }

vi.mock('../../shared/hooks/useMutedTopics', () => ({
  useMutedTopics: vi.fn(() => MUTED_TOPICS_MOCK),
}))

const MUTED_NUDGERS_MOCK = {
  mutedNudgers: [] as string[],
  muteNudger: vi.fn(),
  unmuteNudger: vi.fn(),
  isMuted: vi.fn(() => false),
}

vi.mock('../../shared/hooks/useMutedNudgers', () => ({
  useMutedNudgers: vi.fn(() => MUTED_NUDGERS_MOCK),
}))

vi.mock('../../shared/nudgeStore', () => ({
  dismissNudge: vi.fn().mockResolvedValue(undefined),
  getDismissedNudges: vi.fn().mockResolvedValue([]),
}))

import { getStatementNudges, getStatementWithContent } from '@commonality/sdk'
import { useNavigate } from 'react-router-dom'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedNudgers } from '../../shared/hooks/useTrustedNudgers'
import { useNudgeIntensity } from '../../shared/hooks/useNudgeIntensity'
import { useMutedTopics } from '../../shared/hooks/useMutedTopics'
import { useMutedNudgers } from '../../shared/hooks/useMutedNudgers'
import { dismissNudge, getDismissedNudges } from '../../shared/nudgeStore'

const VALID_NUDGER_1 = '0xaabbccddaabbccddaabbccddaabbccdd'
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
    vi.mocked(getDismissedNudges).mockResolvedValue([])
    MUTED_TOPICS_MOCK.mutedTopics = []
    MUTED_NUDGERS_MOCK.mutedNudgers = []
    MUTED_NUDGERS_MOCK.isMuted.mockReturnValue(false)
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching suggestions', () => {
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

  describe('Dismissal', () => {
    it('shows dismiss button on each suggestion', async () => {
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Related Statement 1' })).toBeInTheDocument()
      })

      expect(screen.getAllByLabelText('Dismiss suggestion')).toHaveLength(2)
    })

    it('removes a suggestion when dismissed', async () => {
      const userEvent = (await import('@testing-library/user-event')).default
      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Related Statement 1' })).toBeInTheDocument()
      })

      const dismissButtons = screen.getAllByLabelText('Dismiss suggestion')
      await userEvent.click(dismissButtons[0])

      await waitFor(() => {
        expect(dismissNudge).toHaveBeenCalled()
      })
    })

    it('filters out previously dismissed nudges on load', async () => {
      vi.mocked(getDismissedNudges).mockResolvedValue([
        {
          key: 'bafyTest123::bafySuggested1::0xaabbccddaabbccddaabbccddaabbccdd',
          targetStatementCid: 'bafyTest123',
          suggestedStatementCid: 'bafySuggested1',
          nudger: VALID_NUDGER_1.toLowerCase(),
          state: 'dismissed',
          timestamp: Date.now(),
        },
      ])

      mockSuggestionData(
        [TEST_NUDGE, SECOND_NUDGE],
        {
          [TEST_NUDGE.suggestedStatementCid]: TEST_STATEMENT,
          [SECOND_NUDGE.suggestedStatementCid]: SECOND_STATEMENT,
        },
      )

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Related Statement 1' })).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Related Statement 2' })).toBeInTheDocument()
      })
    })
  })

  describe('Intensity filtering', () => {
    it('respects low intensity cap of 3', async () => {
      vi.mocked(useNudgeIntensity).mockReturnValue({ intensity: 'low', setIntensity: vi.fn() })

      const fiveNudges = Array.from({ length: 5 }, (_, i) => ({
        ...TEST_NUDGE,
        suggestedStatementCid: `bafySuggested${i + 1}`,
        confidence: 0.9 - i * 0.1,
      }))

      const fiveStatements: Record<string, StatementWithContent> = Object.fromEntries(
        fiveNudges.map((nudge, i) => [
          nudge.suggestedStatementCid,
          {
            statement: {
              id: `stmt${i}`,
              cid: nudge.suggestedStatementCid,
              believerCount: 10,
              disbelieverCount: 1,
              createdAt: '2024-01-01T00:00:00Z',
            },
            content: {
              format: 'text/plain',
              content: `Statement ${i + 1}`,
            },
          },
        ]),
      )

      mockSuggestionData(fiveNudges as FoldedNudge[], fiveStatements)

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 6 })
        const suggestionHeadings = headings.filter((h) => h.textContent?.startsWith('Statement'))
        expect(suggestionHeadings).toHaveLength(3)
      })
    })

    it('shows more suggestions at high intensity', async () => {
      vi.mocked(useNudgeIntensity).mockReturnValue({ intensity: 'high', setIntensity: vi.fn() })

      const fiveNudges = Array.from({ length: 5 }, (_, i) => ({
        ...TEST_NUDGE,
        suggestedStatementCid: `bafySuggested${i + 1}`,
        confidence: 0.9 - i * 0.1,
      }))

      const fiveStatements: Record<string, StatementWithContent> = Object.fromEntries(
        fiveNudges.map((nudge, i) => [
          nudge.suggestedStatementCid,
          {
            statement: {
              id: `stmt${i}`,
              cid: nudge.suggestedStatementCid,
              believerCount: 10,
              disbelieverCount: 1,
              createdAt: '2024-01-01T00:00:00Z',
            },
            content: {
              format: 'text/plain',
              content: `Statement ${i + 1}`,
            },
          },
        ]),
      )

      mockSuggestionData(fiveNudges as FoldedNudge[], fiveStatements)

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 6 })
        const suggestionHeadings = headings.filter((h) => h.textContent?.startsWith('Statement'))
        expect(suggestionHeadings).toHaveLength(5)
      })
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
      vi.mocked(useTrustedNudgers).mockReturnValue([
        { address: VALID_NUDGER_1 },
        { address: VALID_NUDGER_2 },
      ])

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

  describe('Topic filtering', () => {
    it('shows all suggestions when no topics are muted', async () => {
      vi.mocked(useMutedTopics).mockReturnValue({ mutedTopics: [], addTopic: vi.fn(), removeTopic: vi.fn() })

      const cryptoStatement: StatementWithContent = {
        statement: {
          id: 'stmtCrypto',
          cid: 'bafyCrypto1',
          believerCount: 20,
          disbelieverCount: 3,
          createdAt: '2024-01-01T00:00:00Z',
        },
        content: {
          format: 'text/plain',
          content: 'Crypto Statement',
          extras: { topic: 'crypto' },
        },
      }

      mockSuggestionData(
        [{ ...TEST_NUDGE, suggestedStatementCid: 'bafyCrypto1' }],
        { bafyCrypto1: cryptoStatement },
      )

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Crypto Statement' })).toBeInTheDocument()
      })
    })

    it('filters out nudges whose statement has a muted topic', async () => {
      vi.mocked(useMutedTopics).mockReturnValue({ mutedTopics: ['crypto'], addTopic: vi.fn(), removeTopic: vi.fn() })

      const cryptoStatement: StatementWithContent = {
        statement: {
          id: 'stmtCrypto',
          cid: 'bafyCrypto1',
          believerCount: 20,
          disbelieverCount: 3,
          createdAt: '2024-01-01T00:00:00Z',
        },
        content: {
          format: 'text/plain',
          content: 'Crypto Statement',
          extras: { topic: 'crypto' },
        },
      }

      const politicsStatement: StatementWithContent = {
        statement: {
          id: 'stmtPolitics',
          cid: 'bafyPolitics1',
          believerCount: 30,
          disbelieverCount: 5,
          createdAt: '2024-01-01T00:00:00Z',
        },
        content: {
          format: 'text/plain',
          content: 'Politics Statement',
          extras: { topic: 'politics' },
        },
      }

      mockSuggestionData(
        [
          { ...TEST_NUDGE, suggestedStatementCid: 'bafyCrypto1' },
          { ...SECOND_NUDGE, suggestedStatementCid: 'bafyPolitics1' },
        ],
        { bafyCrypto1: cryptoStatement, bafyPolitics1: politicsStatement },
      )

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Crypto Statement' })).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Politics Statement' })).toBeInTheDocument()
      })
    })

    it('shows nudges whose statement has no topic when topics are muted', async () => {
      vi.mocked(useMutedTopics).mockReturnValue({ mutedTopics: ['crypto'], addTopic: vi.fn(), removeTopic: vi.fn() })

      const noTopicStatement: StatementWithContent = {
        statement: {
          id: 'stmtNoTopic',
          cid: 'bafyNoTopic1',
          believerCount: 10,
          disbelieverCount: 1,
          createdAt: '2024-01-01T00:00:00Z',
        },
        content: {
          format: 'text/plain',
          content: 'No Topic Statement',
        },
      }

      mockSuggestionData(
        [{ ...TEST_NUDGE, suggestedStatementCid: 'bafyNoTopic1' }],
        { bafyNoTopic1: noTopicStatement },
      )

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'No Topic Statement' })).toBeInTheDocument()
      })
    })

    it('filters case-insensitively', async () => {
      vi.mocked(useMutedTopics).mockReturnValue({ mutedTopics: ['crypto'], addTopic: vi.fn(), removeTopic: vi.fn() })

      const cryptoStatement: StatementWithContent = {
        statement: {
          id: 'stmtCrypto',
          cid: 'bafyCrypto1',
          believerCount: 20,
          disbelieverCount: 3,
          createdAt: '2024-01-01T00:00:00Z',
        },
        content: {
          format: 'text/plain',
          content: 'Crypto Statement',
          extras: { topic: 'Crypto' },
        },
      }

      mockSuggestionData(
        [{ ...TEST_NUDGE, suggestedStatementCid: 'bafyCrypto1' }],
        { bafyCrypto1: cryptoStatement },
      )

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Crypto Statement' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Per-nudger mute', () => {
    it('shows all suggestions when no nudgers are muted', async () => {
      MUTED_NUDGERS_MOCK.isMuted.mockReturnValue(false)

      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Related Statement 1' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Related Statement 2' })).toBeInTheDocument()
      })
    })

    it('filters out nudges from muted nudgers', async () => {
      MUTED_NUDGERS_MOCK.isMuted.mockImplementation(
        (addr) => addr.toLowerCase() === VALID_NUDGER_1.toLowerCase(),
      )

      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Related Statement 1' })).not.toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Related Statement 2' })).toBeInTheDocument()
      })
    })

    it('applies mute filter in addition to dismissal filter', async () => {
      vi.mocked(getDismissedNudges).mockResolvedValue([
        {
          key: 'bafyTest123::bafySuggested1::0xaabbccddaabbccddaabbccddaabbccdd',
          targetStatementCid: 'bafyTest123',
          suggestedStatementCid: 'bafySuggested1',
          nudger: VALID_NUDGER_1.toLowerCase(),
          state: 'dismissed',
          timestamp: Date.now(),
        },
      ])
      MUTED_NUDGERS_MOCK.isMuted.mockImplementation(
        (addr) => addr.toLowerCase() === VALID_NUDGER_2.toLowerCase(),
      )

      mockSuggestionData()

      renderWithRouter(
        <StatementSuggestions statementCid="bafyTest123" />
      )

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Related Statement 1' })).not.toBeInTheDocument()
        expect(screen.queryByRole('heading', { name: 'Related Statement 2' })).not.toBeInTheDocument()
      })
    })
  })
})
