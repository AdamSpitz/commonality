import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { ExplorerPage } from './ExplorerPage'
import type { FoldedCuratedCollection, Statement } from '@commonality/sdk'

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    getCuratedCollections: vi.fn(),
    getStatement: vi.fn(),
    getUserBelief: vi.fn(),
    believeStatement: vi.fn(),
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

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(() => ({ data: undefined })),
  usePublicClient: vi.fn(() => undefined),
}))

import { getCuratedCollections, getStatement, getUserBelief, believeStatement } from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedNudgers } from '../../shared/hooks/useTrustedNudgers'
import { useAccount } from 'wagmi'

const VALID_NUDGER = '0x1234567890123456789012345678901234567890'
const VALID_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

const TEST_COLLECTION: FoldedCuratedCollection = {
  nudger: VALID_NUDGER as `0x${string}`,
  stream: 'fundable-project-explorer',
  publishedAt: 1_700_000_000,
  publicationCid: 'bafyPublication1',
  entries: [
    {
      cid: 'bafyEntry1' as any,
      label: 'Housing Affordability',
      topicArea: 'Economic Policy',
    },
    {
      cid: 'bafyEntry2' as any,
      label: 'Healthcare Access',
      topicArea: 'Economic Policy',
    },
    {
      cid: 'bafyEntry3' as any,
      label: 'Education Reform',
      topicArea: 'Social Policy',
    },
  ],
}

const SINGLE_ENTRY_COLLECTION: FoldedCuratedCollection = {
  nudger: VALID_NUDGER as `0x${string}`,
  stream: 'fundable-project-explorer',
  publishedAt: 1_700_000_000,
  publicationCid: 'bafyPublication1',
  entries: [
    {
      cid: 'bafyEntry1' as any,
      label: 'Housing Affordability',
      topicArea: 'Economic Policy',
    },
  ],
}

const TEST_STATEMENT: Statement = {
  id: 'stmt1',
  cid: 'bafyEntry1' as any,
  believerCount: 42,
  disbelieverCount: 5,
  createdAt: '2024-01-01T00:00:00Z',
}

function mockExplorerData(
  collection: FoldedCuratedCollection | null = TEST_COLLECTION,
  _statement: Statement | null = TEST_STATEMENT,
  beliefState: number = 0,
) {
  vi.mocked(getCuratedCollections).mockResolvedValue(collection ? [collection] : [])
  vi.mocked(getStatement).mockImplementation(async (machinery, cid) => {
    if (cid === 'bafyEntry1') return TEST_STATEMENT
    return {
      id: 'stmt-other',
      cid: cid as any,
      believerCount: 10,
      disbelieverCount: 2,
      createdAt: '2024-01-01T00:00:00Z',
    }
  })
  vi.mocked(getUserBelief).mockResolvedValue({ statementCid: 'bafyEntry1' as any, beliefState })
}

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('ExplorerPage', () => {
  const mockMachinery = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(useMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useTrustedNudgers).mockReturnValue([VALID_NUDGER])
    vi.mocked(useAccount).mockReturnValue({ address: VALID_ADDRESS, isConnected: true })
    vi.mocked(getCuratedCollections).mockResolvedValue([])
    vi.mocked(getStatement).mockResolvedValue(null)
    vi.mocked(getUserBelief).mockResolvedValue({ statementCid: 'bafyEntry1' as any, beliefState: 0 })
    vi.mocked(believeStatement).mockResolvedValue('0xtxhash' as any)
  })

  describe('loading state', () => {
    it('shows a loading indicator while fetching data', () => {
      vi.mocked(getCuratedCollections).mockImplementation(
        () => new Promise(() => {}),
      )

      renderWithRouter(<ExplorerPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows a message when no curated collection is available', async () => {
      mockExplorerData(null)

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText(/no curated collection/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('link', { name: /browse statements/i })).toHaveAttribute('href', '/statements')
    })
  })

  describe('with collection data', () => {
    it('renders entries grouped by topic area', async () => {
      mockExplorerData()

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('Economic Policy')).toBeInTheDocument()
        expect(screen.getByText('Social Policy')).toBeInTheDocument()
      })

      expect(screen.getByText('Housing Affordability')).toBeInTheDocument()
      expect(screen.getByText('Healthcare Access')).toBeInTheDocument()
      expect(screen.getByText('Education Reform')).toBeInTheDocument()
    })

    it('shows supporter counts for each entry', async () => {
      mockExplorerData()

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        const supporterChips = screen.getAllByText(/supporters?/)
        expect(supporterChips.length).toBeGreaterThan(0)
      })
    })

    it('shows Sign buttons for entries the user has not signed', async () => {
      mockExplorerData()

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        const signButtons = screen.getAllByRole('button', { name: 'Sign' })
        expect(signButtons.length).toBeGreaterThan(0)
      })
    })

    it('shows Navigate and Funding Portal links', async () => {
      mockExplorerData()

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        const navigateLinks = screen.getAllByRole('link', { name: 'Navigate' })
        expect(navigateLinks.length).toBeGreaterThan(0)
        expect(navigateLinks[0]).toHaveAttribute('href', '/statement/bafyEntry1')

        const portalLinks = screen.getAllByRole('link', { name: 'Funding Portal' })
        expect(portalLinks.length).toBeGreaterThan(0)
        expect(portalLinks[0]).toHaveAttribute('href', '/portal/bafyEntry1')
      })
    })

    it('shows "You signed" chip when user has already signed', async () => {
      mockExplorerData(SINGLE_ENTRY_COLLECTION, TEST_STATEMENT, 1)

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('You signed')).toBeInTheDocument()
      })
    })

    it('shows "You opposed" chip when user has disbelieved', async () => {
      mockExplorerData(SINGLE_ENTRY_COLLECTION, TEST_STATEMENT, 2)

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('You opposed')).toBeInTheDocument()
      })
    })

    it('does not show Sign button when user has already signed', async () => {
      mockExplorerData(SINGLE_ENTRY_COLLECTION, TEST_STATEMENT, 1)

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Sign' })).not.toBeInTheDocument()
      })
    })
  })

  describe('error state', () => {
    it('shows an error message when fetching fails', async () => {
      vi.mocked(getCuratedCollections).mockRejectedValue(new Error('Network error'))

      renderWithRouter(<ExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })
})
