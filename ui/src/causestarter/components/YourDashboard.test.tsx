import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YourDashboard } from './YourDashboard'

const { useUserStatements, useAlignmentTrust } = vi.hoisted(() => ({
  useUserStatements: vi.fn(),
  useAlignmentTrust: vi.fn(),
}))

vi.mock('../hooks/useUserStatements', () => ({
  useUserStatements,
}))

vi.mock('../hooks/useAlignmentTrust', () => ({
  useAlignmentTrust,
}))

vi.mock('@ui/fundingportals', () => ({
  CauseBoard: ({
    statementCids,
    preview,
  }: {
    statementCids: string[]
    preview?: { limit: number; fullPageTo: string }
  }) => (
    <div data-testid="fundable-projects">
      {preview ? `preview:${preview.limit}:${preview.fullPageTo}:` : 'full:'}
      {statementCids.join(',')}
    </div>
  ),
}))

vi.mock('@ui/shared', () => ({
  TrustNetworkRefreshIndicator: () => null,
}))

vi.mock('./AlignmentTrustGate', () => ({
  AlignmentTrustGate: () => <div data-testid="alignment-trust-gate" />,
}))

vi.mock('./ConnectWalletHint', () => ({
  ConnectWalletHint: ({ children }: { children: string }) => <div>{children}</div>,
}))

vi.mock('./StarterNetworkFilterNotice', () => ({
  StarterNetworkFilterCopy: () => null,
}))

describe('YourDashboard', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useAlignmentTrust.mockReturnValue({
      trustedAlignmentAttesters: new Set<string>(),
      alignmentTrustUnavailable: false,
      showInitialTrustLoad: false,
      trustError: null,
    })
  })

  it('asks to connect when there is no wallet', () => {
    useUserStatements.mockReturnValue({
      statements: [],
      loading: false,
      connected: false,
      error: null,
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter>
        <YourDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText(/connect a wallet/i)).toBeInTheDocument()
    expect(screen.queryByTestId('fundable-projects')).toBeNull()
  })

  it('shows an empty state when the wallet has not signed anything', () => {
    useUserStatements.mockReturnValue({
      statements: [],
      loading: false,
      connected: true,
      error: null,
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter>
        <YourDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-dashboard-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('fundable-projects')).toBeNull()
  })

  it('unions signed statement CIDs into the fundable-projects board', () => {
    useUserStatements.mockReturnValue({
      statements: [
        { cid: 'bafy1' },
        { cid: 'bafy2' },
      ],
      loading: false,
      connected: true,
      error: null,
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter>
        <YourDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('fundable-projects')).toHaveTextContent('preview:3:/dashboard:bafy1,bafy2')
    expect(screen.queryByTestId('home-dashboard-see-all')).toBeNull()
  })

  it('renders the uncapped board on the dedicated page', () => {
    useUserStatements.mockReturnValue({
      statements: [{ cid: 'bafy1' }],
      loading: false,
      connected: true,
      error: null,
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter>
        <YourDashboard layout="page" />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('personal-dashboard-page')).toBeInTheDocument()
    expect(screen.getByTestId('fundable-projects')).toHaveTextContent('full:bafy1')
    expect(screen.queryByTestId('home-dashboard-see-all')).toBeNull()
  })
})
