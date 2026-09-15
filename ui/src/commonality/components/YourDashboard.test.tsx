import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YourDashboard } from './YourDashboard'

const { useUserStatements, useAlignmentTrust, useAccount, getStatementWithContent } = vi.hoisted(() => ({
  useUserStatements: vi.fn(),
  useAlignmentTrust: vi.fn(),
  useAccount: vi.fn(),
  getStatementWithContent: vi.fn(),
}))

vi.mock('wagmi', () => ({ useAccount }))

vi.mock('../hooks/useUserStatements', () => ({
  useUserStatements,
}))

vi.mock('../hooks/useAlignmentTrust', () => ({
  useAlignmentTrust,
}))

vi.mock('@commonality/sdk/conceptspace', () => ({ getStatementWithContent }))
vi.mock('@commonality/sdk/mutable-refs', () => ({
  getUserRef: vi.fn().mockResolvedValue(null),
  updateRef: vi.fn(),
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
  HeaderInfoTip: () => null,
  useMachinery: () => ({}),
  useWriteClients: () => null,
  getRuntimeConfigValue: () => undefined,
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
    window.localStorage.clear()
    useAccount.mockReturnValue({ address: '0xabc' })
    useAlignmentTrust.mockReturnValue({
      trustedAlignmentAttesters: new Set<string>(),
      alignmentTrustUnavailable: false,
      showInitialTrustLoad: false,
      trustError: null,
    })
    getStatementWithContent.mockResolvedValue({ cid: 'bafyarbitrary' })
  })

  it('adds an unsigned published statement to the personal board', async () => {
    useUserStatements.mockReturnValue({
      statements: [], loading: false, connected: true, error: null, refresh: vi.fn(),
    })
    render(<MemoryRouter><YourDashboard /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Add a statement by CID'), { target: { value: 'bafyarbitrary' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add statement' }))

    await waitFor(() => expect(getStatementWithContent).toHaveBeenCalledWith({}, 'bafyarbitrary'))
    expect(screen.getByTestId('funding-board-selected-statements')).toHaveTextContent('bafyarbitrary')
    fireEvent.click(screen.getByRole('button', { name: 'Save board' }))
    expect(JSON.parse(window.localStorage.getItem('causestarter.personal-funding-board.v1:0xabc')!)).toEqual({ version: 1, statementCids: ['bafyarbitrary'] })
  })

  it('keeps unsigned board statements visible and removable while editing', () => {
    window.localStorage.setItem('causestarter.personal-funding-board.v1:0xabc', JSON.stringify({ statementCids: ['bafyunsigned'] }))
    useUserStatements.mockReturnValue({
      statements: [{ cid: 'bafysigned', title: 'Signed statement' }], loading: false, connected: true, error: null, refresh: vi.fn(),
    })
    render(<MemoryRouter><YourDashboard /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: 'Edit board' }))
    expect(screen.getByTestId('funding-board-selected-statements')).toHaveTextContent('bafyunsigned')
    fireEvent.click(screen.getByTestId('CancelIcon'))
    expect(screen.queryByTestId('funding-board-selected-statements')).not.toBeInTheDocument()
  })

  it('asks to connect when there is no wallet', () => {
    useAccount.mockReturnValue({ address: undefined })
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

  it('shows board setup when no personal board has been configured and nothing is signed', () => {
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
    expect(screen.getByTestId('funding-board-setup')).toBeInTheDocument()
    expect(screen.queryByTestId('fundable-projects')).toBeNull()
  })

  it('defaults the board to all signed statements until one is saved', () => {
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
    expect(screen.queryByTestId('funding-board-setup')).toBeNull()
    expect(screen.getByText(/2 signed statements \(default\)/)).toBeInTheDocument()
    expect(screen.getByTestId('fundable-projects')).toHaveTextContent('preview:3:/dashboard:bafy1,bafy2')
    expect(screen.queryByRole('button', { name: 'Use all signed statements' })).toBeNull()
  })

  it('uses explicitly selected statement CIDs for the fundable-projects board', () => {
    window.localStorage.setItem('causestarter.personal-funding-board.v1:0xabc', JSON.stringify({ statementCids: ['bafy2'] }))
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
    expect(screen.getByTestId('fundable-projects')).toHaveTextContent('preview:3:/dashboard:bafy2')
    expect(screen.queryByTestId('home-dashboard-see-all')).toBeNull()
  })

  it('renders the uncapped board on the dedicated page', () => {
    window.localStorage.setItem('causestarter.personal-funding-board.v1:0xabc', JSON.stringify({ statementCids: ['bafy1'] }))
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
