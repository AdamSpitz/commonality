import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCombinatorStatement } from '@commonality/sdk/displayable-documents'
import { StatementPage } from './StatementPage'

const getStatementWithContent = vi.fn()
let connectedAddress: `0x${string}` | undefined = '0x1234567890123456789012345678901234567890'

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: connectedAddress }),
}))

vi.mock('@commonality/sdk/conceptspace', () => ({
  getStatementWithContent: (...args: unknown[]) => getStatementWithContent(...args),
}))

vi.mock('@ui/shared', () => ({
  useMachinery: () => ({}),
  useTrustedAttesters: () => [],
}))

vi.mock('../hooks/useAlignmentTrust', () => ({
  useAlignmentTrust: () => ({ trustedAlignmentAttesters: new Set() }),
}))

vi.mock('../hooks/useViewCounts', () => ({
  useViewCounts: () => ({
    perPlank: new Map(),
    loading: false,
    refresh: vi.fn(),
  }),
}))

vi.mock('../components/SupportButton', () => ({
  SupportButton: () => <button type="button">Sign</button>,
}))

vi.mock('../components/CauseFundingSummary', () => ({
  CauseFundingSummary: () => <div data-testid="funding-summary" />,
}))

vi.mock('@ui/fundingportals', () => ({
  CauseBoard: () => <div data-testid="fundable-projects" />,
  CauseLeaderboard: () => <div data-testid="contributor-leaderboard" />,
}))

vi.mock('../components/StarterNetworkFilterNotice', () => ({
  StarterNetworkFilterCopy: () => null,
}))

describe('StatementPage combinator operands', () => {
  const operandA = 'bafyoperandaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const operandB = 'bafyoperandbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    connectedAddress = '0x1234567890123456789012345678901234567890'
  })

  function renderPage(entry = '/statement/stmt123') {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/statement/:statementCid" element={<StatementPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('shows the combinator statement before operand bodies resolve', async () => {
    const combinatorContent = createCombinatorStatement('all', [operandA, operandB])
    getStatementWithContent.mockImplementation(async (_machinery: unknown, cid: string) => {
      if (cid === 'stmt123') {
        return {
          statement: {
            cid: 'stmt123',
            believerCount: 1,
            title: 'All of these',
          },
          content: combinatorContent,
        }
      }
      return new Promise(() => {})
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('combinator-operands')).toBeInTheDocument()
    })
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByTestId('combinator-operands')).toHaveTextContent(operandA)
    expect(screen.getByTestId('combinator-operands')).toHaveTextContent(operandB)
  })

  it('keeps signing view focused and preserves it across operand links', async () => {
    const combinatorContent = createCombinatorStatement('all', [operandA, operandB])
    getStatementWithContent.mockImplementation(async (_machinery: unknown, cid: string) => ({
      statement: { cid, believerCount: 1, title: 'Statement' },
      content: cid === 'stmt123' ? combinatorContent : { content: cid },
    }))

    renderPage('/statement/stmt123?mode=sign')

    expect(await screen.findByText('Signing view')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign' })).toBeInTheDocument()
    expect(screen.queryByTestId('fundable-projects')).not.toBeInTheDocument()
    expect(screen.queryByTestId('contributor-leaderboard')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Open statement' })[0]).toHaveAttribute(
      'href',
      `/statement/${operandA}?mode=sign`,
    )
  })

  it('adds the statement to the personal funding board without signing it', async () => {
    getStatementWithContent.mockResolvedValue({
      statement: { cid: 'stmt123', believerCount: 1, title: 'Statement' },
      content: { content: 'Fund local work' },
    })

    renderPage('/statement/stmt123?mode=sign')

    const addButton = await screen.findByRole('button', { name: 'Add to my funding board' })
    fireEvent.click(addButton)

    expect(screen.getByRole('button', { name: 'Included in my funding board' })).toBeDisabled()
    expect(screen.getByText('Added to your funding board. Signing remains unchanged.')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(
      'causestarter.personal-funding-board.v1:0x1234567890123456789012345678901234567890',
    ) ?? 'null')).toEqual({ version: 1, statementCids: ['stmt123'] })
  })

  it('keeps funding view focused and offers the complete view', async () => {
    getStatementWithContent.mockResolvedValue({
      statement: { cid: 'stmt123', believerCount: 1, title: 'Statement' },
      content: { content: 'Fund local work' },
    })

    renderPage('/statement/stmt123?mode=fund')

    expect(await screen.findByText('Funding view')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign' })).not.toBeInTheDocument()
    expect(screen.getByTestId('funding-summary')).toBeInTheDocument()
    expect(screen.getByTestId('fundable-projects')).toBeInTheDocument()
    expect(screen.getByTestId('contributor-leaderboard')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Full view' })).toHaveAttribute(
      'href',
      '/statement/stmt123',
    )
  })
})
