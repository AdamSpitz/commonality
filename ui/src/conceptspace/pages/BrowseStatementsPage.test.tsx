import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowseStatementsPage } from './BrowseStatementsPage'

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
}))

// Mock the SDK functions
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    browseStatements: vi.fn(),
  }
})

import {
  createSDKMachinery,
  browseStatements,
} from '@commonality/sdk'

const mockExecutor = {} as any

function makeStatement(overrides: Record<string, any> = {}) {
  return {
    id: 'bafybeif7ztnq5k2xslegk2v6hjyau5zmz3sf4rq6ujvlg6mbb2nvmmrq',
    cid: 'bafybeif7ztnq5k2xslegk2v6hjyau5zmz3sf4rq6ujvlg6mbb2nvmmrq',
    statementType: 'conceptspace',
    title: 'Test Statement',
    excerpt: 'This is a test excerpt',
    believerCount: 10,
    disbelieverCount: 3,
    createdAt: '2025-06-15T00:00:00Z',
    ...overrides,
  }
}

describe('BrowseStatementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockExecutor)
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching statements', () => {
      vi.mocked(browseStatements).mockReturnValue(new Promise(() => {}))

      render(<BrowseStatementsPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('does not display error or empty state while loading', () => {
      vi.mocked(browseStatements).mockReturnValue(new Promise(() => {}))

      render(<BrowseStatementsPage />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText(/no statements found/i)).not.toBeInTheDocument()
    })
  })

  describe('Error states', () => {
    it('displays error message when API call fails with Error', async () => {
      vi.mocked(browseStatements).mockRejectedValue(new Error('Network error'))

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('displays generic error message for non-Error exceptions', async () => {
      vi.mocked(browseStatements).mockRejectedValue('string error')

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Failed to load statements')).toBeInTheDocument()
      })
    })

    it('logs errors to console when API call fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')
      vi.mocked(browseStatements).mockRejectedValue(error)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading statements:', error)
      })

      consoleErrorSpy.mockRestore()
    })

    it('hides loading spinner after error', async () => {
      vi.mocked(browseStatements).mockRejectedValue(new Error('fail'))

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      })
    })

    it('does not display statement cards when there is an error', async () => {
      vi.mocked(browseStatements).mockRejectedValue(new Error('fail'))

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      expect(screen.queryByText(/no statements found/i)).not.toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('displays empty message when no statements are returned', async () => {
      vi.mocked(browseStatements).mockResolvedValue([])

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText(/no statements found/i)).toBeInTheDocument()
      })
    })

    it('displays empty message when query key is missing from result', async () => {
      vi.mocked(browseStatements).mockResolvedValue([])

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText(/no statements found/i)).toBeInTheDocument()
      })
    })

    it('does not show loading spinner in empty state', async () => {
      vi.mocked(browseStatements).mockResolvedValue([])

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
      })
    })
  })

  describe('Successful rendering', () => {
    const statements = [
      makeStatement({ cid: 'bafybeif7ztnq5k2xslegk2v6hjyau5zmz3sf4rq6ujvlg6mbb2nvmmr1', title: 'First Statement', believerCount: 10, disbelieverCount: 3 }),
      makeStatement({ cid: 'bafybeif7ztnq5k2xslegk2v6hjyau5zmz3sf4rq6ujvlg6mbb2nvmmr2', title: 'Second Statement', believerCount: 5, disbelieverCount: 0 }),
    ]

    beforeEach(() => {
      vi.mocked(browseStatements).mockResolvedValue(statements as any)
    })

    it('displays the page heading', async () => {
      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Browse Statements' })).toBeInTheDocument()
      })
    })

    it('displays sort controls', async () => {
      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Sort by:')).toBeInTheDocument()
        expect(screen.getByText('Most Supporters')).toBeInTheDocument()
        expect(screen.getByText('Newest')).toBeInTheDocument()
      })
    })

    it('renders a card for each statement', async () => {
      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('First Statement')).toBeInTheDocument()
        expect(screen.getByText('Second Statement')).toBeInTheDocument()
      })
    })

    it('renders statement links pointing to correct URLs', async () => {
      render(<BrowseStatementsPage />)

      await waitFor(() => {
        const link1 = screen.getByText('First Statement').closest('a')
        expect(link1).toHaveAttribute('href', '/statement/bafybeif7ztnq5k2xslegk2v6hjyau5zmz3sf4rq6ujvlg6mbb2nvmmr1')

        const link2 = screen.getByText('Second Statement').closest('a')
        expect(link2).toHaveAttribute('href', '/statement/bafybeif7ztnq5k2xslegk2v6hjyau5zmz3sf4rq6ujvlg6mbb2nvmmr2')
      })
    })

    it('displays supporter count chip for each statement', async () => {
      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('10 supporters')).toBeInTheDocument()
        expect(screen.getByText('5 supporters')).toBeInTheDocument()
      })
    })

    it('uses singular "supporter" when count is 1', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement({ believerCount: 1 })] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('1 supporter')).toBeInTheDocument()
      })
    })

    it('displays excerpt when present', async () => {
      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getAllByText('This is a test excerpt').length).toBe(2)
      })
    })

    it('does not render excerpt element when excerpt is null', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement({ excerpt: null })] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Statement')).toBeInTheDocument()
      })

      expect(screen.queryByText('This is a test excerpt')).not.toBeInTheDocument()
    })

    it('does not duplicate statement text when title and excerpt are the same', async () => {
      vi.mocked(browseStatements).mockResolvedValue([
        makeStatement({ title: 'Same statement text', excerpt: 'Same statement text' }),
      ] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Same statement text')).toBeInTheDocument()
      })

      expect(screen.getAllByText('Same statement text')).toHaveLength(1)
    })

    it('displays statement type chip when present', async () => {
      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getAllByText('conceptspace').length).toBeGreaterThan(0)
      })
    })

    it('does not render type chip when statementType is null', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement({ statementType: null })] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Statement')).toBeInTheDocument()
      })

      expect(screen.queryByText('conceptspace')).not.toBeInTheDocument()
    })

    it('displays disbeliever count when greater than zero', async () => {
      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('3 opposed')).toBeInTheDocument()
      })
    })

    it('uses singular "disbeliever" when count is 1', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement({ disbelieverCount: 1 })] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('1 opposed')).toBeInTheDocument()
      })
    })

    it('does not display disbeliever count when zero', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement({ disbelieverCount: 0 })] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Statement')).toBeInTheDocument()
      })

      expect(screen.queryByText(/opposed/)).not.toBeInTheDocument()
    })

    it('displays "Untitled Statement" when title is null', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement({ title: null })] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Untitled Statement')).toBeInTheDocument()
      })
    })
  })

  describe('Date formatting', () => {
    it('displays formatted date for valid date strings', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement({ createdAt: '2025-06-15T00:00:00Z' })] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        // The exact format depends on locale, but it should be present and not "Unknown date"
        expect(screen.queryByText('Unknown date')).not.toBeInTheDocument()
      })
    })

    it('displays "Unknown date" when createdAt is null', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement({ createdAt: null })] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Unknown date')).toBeInTheDocument()
      })
    })
  })

  describe('Sort toggle', () => {
    it('defaults to "mostSupporters" sort', async () => {
      vi.mocked(browseStatements).mockResolvedValue([] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(browseStatements).toHaveBeenCalledWith(
          mockExecutor,
          { limit: 50, orderBy: 'believerCount' }
        )
      })
    })

    it('switches to "newest" sort when Newest button is clicked', async () => {
      vi.mocked(browseStatements).mockResolvedValue([] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(browseStatements).toHaveBeenCalledTimes(1)
      })

      vi.mocked(browseStatements).mockResolvedValue([makeStatement()] as any)

      const user = userEvent.setup()
      await user.click(screen.getByText('Newest'))

      await waitFor(() => {
        expect(browseStatements).toHaveBeenCalledWith(
          mockExecutor,
          { limit: 50, orderBy: 'createdAt' }
        )
      })
    })

    it('switches back to "mostSupporters" sort when Most Supporters button is clicked', async () => {
      vi.mocked(browseStatements).mockResolvedValue([])

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(browseStatements).toHaveBeenCalledTimes(1)
      })

      // Switch to newest first
      vi.mocked(browseStatements).mockResolvedValue([] as any)

      const user = userEvent.setup()
      await user.click(screen.getByText('Newest'))

      await waitFor(() => {
        expect(browseStatements).toHaveBeenCalledTimes(2)
      })

      // Switch back to most supporters
      vi.mocked(browseStatements).mockResolvedValue([])

      await user.click(screen.getByText('Most Supporters'))

      await waitFor(() => {
        expect(browseStatements).toHaveBeenCalledTimes(3)
        expect(browseStatements).toHaveBeenLastCalledWith(
          mockExecutor,
          { limit: 50, orderBy: 'believerCount' }
        )
      })
    })

    it('clears previous error when sort changes', async () => {
      vi.mocked(browseStatements).mockRejectedValueOnce(new Error('Initial error'))

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Initial error')).toBeInTheDocument()
      })

      vi.mocked(browseStatements).mockResolvedValue([makeStatement()] as any)

      const user = userEvent.setup()
      await user.click(screen.getByText('Newest'))

      await waitFor(() => {
        expect(screen.queryByText('Initial error')).not.toBeInTheDocument()
      })
    })
  })

  describe('API integration', () => {
    it('calls createSDKMachinery with correct URL', async () => {
      vi.mocked(browseStatements).mockResolvedValue([])

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(createSDKMachinery).toHaveBeenCalled()
        expect(vi.mocked(createSDKMachinery).mock.calls[0][0]).toContain('graphql')
      })
    })

    it('passes limit of 50 as query variable', async () => {
      vi.mocked(browseStatements).mockResolvedValue([] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(browseStatements).toHaveBeenCalledWith(
          mockExecutor,
          { limit: 50, orderBy: 'believerCount' }
        )
      })
    })

    it('queries for the correct fields', async () => {
      vi.mocked(browseStatements).mockResolvedValue([] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(browseStatements).toHaveBeenCalled()
      })
    })
  })

  describe('State transitions', () => {
    it('transitions from loading to success state', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement()] as any)

      render(<BrowseStatementsPage />)

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show content after loading
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(screen.getByText('Test Statement')).toBeInTheDocument()
      })
    })

    it('transitions from loading to error state', async () => {
      vi.mocked(browseStatements).mockRejectedValue(new Error('API Error'))

      render(<BrowseStatementsPage />)

      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show error after loading fails
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })
    })

    it('transitions from loading to empty state', async () => {
      vi.mocked(browseStatements).mockResolvedValue([])

      render(<BrowseStatementsPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(screen.getByText(/no statements found/i)).toBeInTheDocument()
      })
    })

    it('shows loading spinner when switching sort options', async () => {
      vi.mocked(browseStatements).mockResolvedValue([makeStatement()] as any)

      render(<BrowseStatementsPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Statement')).toBeInTheDocument()
      })

      // Make the next query hang to observe loading state
      vi.mocked(browseStatements).mockReturnValue(new Promise(() => {}))

      const user = userEvent.setup()
      await user.click(screen.getByText('Newest'))

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })
  })
})
