import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreatorDashboardPage } from './CreatorDashboardPage'

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('../hooks/useContentFundingState', () => ({
  useContentFundingState: vi.fn(),
}))

import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { useContentFundingState } from '../hooks/useContentFundingState'

function mockContentFundingState(overrides: {
  channels?: unknown[]
  loading?: boolean
  error?: string | null
}) {
  vi.mocked(useContentFundingState).mockReturnValue({
    state: null,
    vetoedEvents: [],
    projects: [],
    channels: overrides.channels ?? [],
    contentAttestations: new Map(),
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    machinery: {
      indexerUrl: 'http://localhost:3000/graphql',
      ipfsConfig: { gatewayUrl: 'https://ipfs.io/ipfs', apiUrl: '', shouldUseMock: false, debugIpfs: false },
      testConfig: { areWeJustRunningTests: true },
    },
  } as any)
}

describe('CreatorDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)
    vi.mocked(useWalletClient).mockReturnValue({ data: undefined } as any)
    vi.mocked(usePublicClient).mockReturnValue(undefined as any)
  })

  it('renders custom title and description when connected', () => {
    mockContentFundingState({ channels: [] })
    vi.mocked(useAccount).mockReturnValue({ address: '0x123', isConnected: true } as any)

    render(<CreatorDashboardPage title="My Dashboard" description="Manage your channels" />)

    expect(screen.getByText('My Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Manage your channels')).toBeInTheDocument()
  })

  it('renders default title and description', () => {
    mockContentFundingState({ channels: [] })

    render(<CreatorDashboardPage />)

    expect(screen.getByText('Creator Dashboard')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    mockContentFundingState({ channels: [], loading: true })

    render(<CreatorDashboardPage />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error alert when there is a state error', () => {
    mockContentFundingState({ channels: [], error: 'Failed to load state' })

    render(<CreatorDashboardPage />)

    expect(screen.getByText('Failed to load state')).toBeInTheDocument()
  })

  it('shows connect prompt when wallet is not connected', () => {
    mockContentFundingState({ channels: [] })
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)

    render(<CreatorDashboardPage />)

    expect(screen.getByText('Connect your wallet to manage your channels.')).toBeInTheDocument()
  })

  it('shows custom connect prompt', () => {
    mockContentFundingState({ channels: [] })
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)

    render(<CreatorDashboardPage connectPrompt="Please connect your wallet first" />)

    expect(screen.getByText('Please connect your wallet first')).toBeInTheDocument()
  })

  it('shows empty state when connected but no channels', () => {
    mockContentFundingState({ channels: [] })
    vi.mocked(useAccount).mockReturnValue({ address: '0x123', isConnected: true } as any)

    render(<CreatorDashboardPage />)

    expect(screen.getByText(/You don't have any channels yet/i)).toBeInTheDocument()
  })

  it('shows custom empty state', () => {
    mockContentFundingState({ channels: [] })
    vi.mocked(useAccount).mockReturnValue({ address: '0x123', isConnected: true } as any)

    render(<CreatorDashboardPage emptyState="No channels found" />)

    expect(screen.getByText('No channels found')).toBeInTheDocument()
  })

  it('does not show connect prompt when wallet is connected', () => {
    mockContentFundingState({ channels: [] })
    vi.mocked(useAccount).mockReturnValue({ address: '0x123', isConnected: true } as any)

    render(<CreatorDashboardPage />)

    expect(screen.queryByText('Connect your wallet to manage your channels.')).not.toBeInTheDocument()
  })

  it('renders title when wallet is connected', () => {
    mockContentFundingState({ channels: [] })
    vi.mocked(useAccount).mockReturnValue({ address: '0x123', isConnected: true } as any)

    render(<CreatorDashboardPage />)

    expect(screen.getByRole('heading', { name: 'Creator Dashboard' })).toBeInTheDocument()
  })
})
