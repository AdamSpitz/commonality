import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StatementPage } from './StatementPage'
import type { Statement, DisplayableDocument } from '@commonality/sdk'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
}))

// Mock the SDK functions
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getStatementWithContent: vi.fn(),
    getUserBelief: vi.fn(),
  }
})

// Mock child components
vi.mock('../components/StatementRenderer', () => ({
  StatementRenderer: vi.fn(({ statementCid, content, error }) => (
    <div data-testid="statement-renderer">
      StatementRenderer: {statementCid}
      {content && <div>Content present</div>}
      {error && <div>Error: {error}</div>}
    </div>
  )),
}))

vi.mock('../components/BeliefControls', () => ({
  BeliefControls: vi.fn(({ statementCid, currentBeliefState, onBeliefChanged }) => (
    <div data-testid="belief-controls">
      BeliefControls: {statementCid} (state: {currentBeliefState})
      <button onClick={onBeliefChanged}>Change Belief</button>
    </div>
  )),
}))

vi.mock('../components/SupportMetrics', () => ({
  SupportMetrics: vi.fn(({ directBelievers, directDisbelievers, indirectSupporters }) => (
    <div data-testid="support-metrics">
      Believers: {directBelievers}, Disbelievers: {directDisbelievers}, Indirect: {indirectSupporters}
    </div>
  )),
}))

vi.mock('../components/StatementSuggestions', () => ({
  StatementSuggestions: vi.fn(({ statementCid, userAddress }) => (
    <div data-testid="statement-suggestions">
      Suggestions for: {statementCid} (user: {userAddress || 'none'})
    </div>
  )),
}))

import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  createSDKMachinery,
  getStatementWithContent,
  getUserBelief,
} from '@commonality/sdk'

describe('StatementPage', () => {
  const mockExecutor = {} as any
  const mockStatement = {
    id: 'stmt123',
    cid: 'bafyTest123',
    believerCount: 42,
    disbelieverCount: 5,
    statementType: 'conceptspace',
    title: 'Test Statement',
    excerpt: 'Test excerpt',
  }
  const mockContent = {
    title: 'Test Statement',
    content: 'Test content',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockExecutor)
    // Default: wallet not connected
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      isConnected: false,
    } as any)
  })

  describe('Loading state', () => {
    it('displays loading spinner while fetching statement data', () => {
      // Mock a never-resolving promise to keep loading state
      vi.mocked(getStatementWithContent).mockReturnValue(new Promise(() => {}))
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })

      render(<StatementPage />)

      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error states', () => {
    it('displays error message when no statement CID is provided', async () => {
      vi.mocked(useParams).mockReturnValue({})

      render(<StatementPage />)

      await waitFor(() => {
        expect(screen.getByText('No statement CID provided')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('displays error message when statement is not found', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'nonexistent' })
      vi.mocked(getStatementWithContent).mockResolvedValue(null)

      render(<StatementPage />)

      await waitFor(() => {
        expect(screen.getByText('Statement not found')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('displays error message when API call fails', async () => {
      const errorMessage = 'Network error'
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockRejectedValue(new Error(errorMessage))

      render(<StatementPage />)

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('displays generic error message for non-Error exceptions', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockRejectedValue('string error')

      render(<StatementPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load statement')).toBeInTheDocument()
      })
    })

    it('logs errors to console when API call fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockRejectedValue(error)

      render(<StatementPage />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading statement:', error)
      })

      consoleErrorSpy.mockRestore()
    })

    it('displays error when getStatementWithContent returns null result', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue(null)

      render(<StatementPage />)

      await waitFor(() => {
        expect(screen.getByText('Statement not found')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })

  describe('Content error handling', () => {
    it('passes content error to StatementRenderer when IPFS load fails', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: null,
        metrics: { indirectSupporters: 10 },
      })

      render(<StatementPage />)

      await waitFor(() => {
        const renderer = screen.getByTestId('statement-renderer')
        expect(renderer.textContent).toContain('Error: Failed to load statement content from IPFS')
      })
    })

    it('does not set content error when statement has no CID', async () => {
      const statementNoCid = { ...mockStatement, cid: null }
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: statementNoCid,
        content: null,
        metrics: null,
      })

      render(<StatementPage />)

      await waitFor(() => {
        const renderer = screen.getByTestId('statement-renderer')
        expect(renderer.textContent).not.toContain('Error:')
      })
    })
  })

  describe('Successful rendering', () => {
    beforeEach(() => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: { indirectSupporters: 15 },
      })
      vi.mocked(getUserBelief).mockResolvedValue({ beliefState: 1 })
    })

    it('displays the page title', async () => {
      render(<StatementPage />)


      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Statement' })).toBeInTheDocument()
      })
    })

    it('renders StatementRenderer with correct props', async () => {
      render(<StatementPage />)


      await waitFor(() => {
        const renderer = screen.getByTestId('statement-renderer')
        expect(renderer.textContent).toContain('StatementRenderer: stmt123')
        expect(renderer.textContent).toContain('Content present')
      })
    })

    it('renders SupportMetrics with correct metrics', async () => {
      render(<StatementPage />)


      await waitFor(() => {
        const metrics = screen.getByTestId('support-metrics')
        expect(metrics.textContent).toContain('Believers: 42')
        expect(metrics.textContent).toContain('Disbelievers: 5')
        expect(metrics.textContent).toContain('Indirect: 15')
      })
    })

    it('renders SupportMetrics with zero indirect supporters when metrics not available', async () => {
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: null,
      })

      render(<StatementPage />)


      await waitFor(() => {
        const metrics = screen.getByTestId('support-metrics')
        expect(metrics.textContent).toContain('Indirect: 0')
      })
    })

    it('renders BeliefControls with correct props', async () => {
      render(<StatementPage />)


      await waitFor(() => {
        const controls = screen.getByTestId('belief-controls')
        expect(controls.textContent).toContain('BeliefControls: bafyTest123')
        expect(controls.textContent).toContain('state: 0')
      })
    })

    it('uses statement ID as fallback for BeliefControls when CID is null', async () => {
      const statementNoCid = { ...mockStatement, cid: null }
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: statementNoCid,
        content: mockContent,
        metrics: null,
      })

      render(<StatementPage />)


      await waitFor(() => {
        const controls = screen.getByTestId('belief-controls')
        expect(controls.textContent).toContain('BeliefControls: stmt123')
      })
    })

    it('renders StatementSuggestions with correct props', async () => {
      render(<StatementPage />)


      await waitFor(() => {
        const suggestions = screen.getByTestId('statement-suggestions')
        expect(suggestions.textContent).toContain('Suggestions for: stmt123')
        expect(suggestions.textContent).toContain('user: none')
      })
    })

    it('displays "Your Opinion" section header', async () => {
      render(<StatementPage />)


      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Your Opinion' })).toBeInTheDocument()
      })
    })
  })

  describe('Wallet connection states', () => {
    beforeEach(() => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: null,
      })
    })

    it('does not load user belief when wallet is not connected', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as any)

      render(<StatementPage />)


      await waitFor(() => {
        expect(screen.getByTestId('belief-controls')).toBeInTheDocument()
      })

      expect(getUserBelief).not.toHaveBeenCalled()
    })

    it('loads user belief when wallet is connected', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890'
      vi.mocked(useAccount).mockReturnValue({
        address: walletAddress,
        isConnected: true,
      } as any)
      vi.mocked(getUserBelief).mockResolvedValue({ beliefState: 2 })

      render(<StatementPage />)


      await waitFor(() => {
        expect(getUserBelief).toHaveBeenCalledWith(
          mockExecutor,
          walletAddress,
          'stmt123'
        )
      })
    })

    it('sets belief state to 0 when getUserBelief returns null', async () => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      } as any)
      vi.mocked(getUserBelief).mockResolvedValue(null)

      render(<StatementPage />)


      await waitFor(() => {
        const controls = screen.getByTestId('belief-controls')
        expect(controls.textContent).toContain('state: 0')
      })
    })

    it('passes user address to StatementSuggestions when wallet is connected', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890'
      vi.mocked(useAccount).mockReturnValue({
        address: walletAddress,
        isConnected: true,
      } as any)

      render(<StatementPage />)


      await waitFor(() => {
        const suggestions = screen.getByTestId('statement-suggestions')
        expect(suggestions.textContent).toContain(`user: ${walletAddress}`)
      })
    })
  })

  describe('Data refetching', () => {
    beforeEach(() => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: { indirectSupporters: 15 },
      })
    })

    it('refetches data when belief is changed', async () => {
      const userEvent = (await import('@testing-library/user-event')).default

      render(<StatementPage />)


      await waitFor(() => {
        expect(screen.getByTestId('belief-controls')).toBeInTheDocument()
      })

      expect(getStatementWithContent).toHaveBeenCalledTimes(1)

      const changeButton = screen.getByText('Change Belief')
      await userEvent.click(changeButton)

      await waitFor(() => {
        expect(getStatementWithContent).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('API integration', () => {
    it('calls createSDKMachinery with correct URL from environment', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: null,
      })

      render(<StatementPage />)


      await waitFor(() => {
        expect(createSDKMachinery).toHaveBeenCalledWith(
          expect.stringContaining('graphql'),
          expect.any(Object)
        )
      })
    })

    it('calls getStatementWithContent with correct parameters', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: null,
      })

      render(<StatementPage />)


      await waitFor(() => {
        expect(getStatementWithContent).toHaveBeenCalledWith(
          mockExecutor,
          'stmt123',
          { includeMetrics: true }
        )
      })
    })

    it('refetches data when statementId changes', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: null,
      })

      const { rerender } = render(<StatementPage />)

      await waitFor(() => {
        expect(getStatementWithContent).toHaveBeenCalledTimes(1)
      })

      // Change statement ID
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt456' })
      rerender(<StatementPage />)

      await waitFor(() => {
        expect(getStatementWithContent).toHaveBeenCalledTimes(2)
      })
    })

    it('refetches data when wallet address changes', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: null,
      })

      const { rerender } = render(<StatementPage />)

      await waitFor(() => {
        expect(getStatementWithContent).toHaveBeenCalledTimes(1)
      })

      // Simulate wallet connection
      vi.mocked(useAccount).mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      } as any)

      rerender(<StatementPage />)

      await waitFor(() => {
        expect(getStatementWithContent).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('State transitions', () => {
    it('transitions from loading to success state', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: null,
      })

      render(<StatementPage />)


      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show content after loading
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(screen.getByTestId('statement-renderer')).toBeInTheDocument()
        expect(screen.getByTestId('support-metrics')).toBeInTheDocument()
        expect(screen.getByTestId('belief-controls')).toBeInTheDocument()
        expect(screen.getByTestId('statement-suggestions')).toBeInTheDocument()
      })
    })

    it('transitions from loading to error state', async () => {
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockRejectedValue(new Error('API Error'))

      render(<StatementPage />)


      // Should show loading initially
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Should show error after loading fails
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('API Error')).toBeInTheDocument()
      })
    })

    it('clears previous errors when refetching data', async () => {
      // First call fails
      vi.mocked(useParams).mockReturnValue({ statementCid: 'stmt123' })
      vi.mocked(getStatementWithContent).mockRejectedValueOnce(new Error('First error'))

      const { rerender } = render(<StatementPage />)

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second call succeeds
      vi.mocked(getStatementWithContent).mockResolvedValue({
        statement: mockStatement,
        content: mockContent,
        metrics: null,
      })

      // Trigger refetch by changing address
      vi.mocked(useAccount).mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      } as any)

      rerender(<StatementPage />)

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
        expect(screen.getByTestId('statement-renderer')).toBeInTheDocument()
      })
    })
  })
})
