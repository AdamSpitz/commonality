import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCombinatorStatement } from '@commonality/sdk/displayable-documents'
import { StatementPage } from './StatementPage'

const getStatementWithContent = vi.fn()

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
  CauseFundingSummary: () => null,
}))

vi.mock('@ui/fundingportals', () => ({
  CauseBoard: () => null,
  CauseLeaderboard: () => null,
}))

vi.mock('../components/StarterNetworkFilterNotice', () => ({
  StarterNetworkFilterCopy: () => null,
}))

describe('StatementPage combinator operands', () => {
  const operandA = 'bafyoperandaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const operandB = 'bafyoperandbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/statement/stmt123']}>
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
})
