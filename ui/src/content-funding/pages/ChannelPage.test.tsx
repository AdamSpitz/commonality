import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChannelPage } from './ChannelPage'

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

vi.mock('../hooks/useContentFundingState', () => ({
  useContentFundingState: vi.fn(),
}))

import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useContentFundingState } from '../hooks/useContentFundingState'

function mockContentFundingState(overrides: {
  state?: unknown
  projects?: unknown[]
  loading?: boolean
  error?: string | null
}) {
  vi.mocked(useContentFundingState).mockReturnValue({
    state: overrides.state ?? null,
    vetoedEvents: [],
    projects: overrides.projects ?? [],
    channels: [],
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

describe('ChannelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ platform: 'twitter', channelId: 'twitter%3Auid%3A12345%3A18347' })
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)
  })

  it('shows loading spinner when loading', () => {
    mockContentFundingState({ loading: true })

    render(<ChannelPage />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error alert when there is an error', () => {
    mockContentFundingState({ loading: false, error: 'Failed to load channel' })

    render(<ChannelPage />)

    expect(screen.getByText('Failed to load channel')).toBeInTheDocument()
  })

  it('shows not found alert when channel does not exist', () => {
    mockContentFundingState({ loading: false, state: null })

    render(<ChannelPage />)

    expect(screen.getByText(/Channel not found/i)).toBeInTheDocument()
  })

  it('shows custom campaign heading', () => {
    mockContentFundingState({ loading: false, state: null })

    render(<ChannelPage campaignHeading="Support Campaigns" />)

    expect(screen.queryByText('Support Campaigns')).not.toBeInTheDocument()
  })

  it('shows custom create campaign label', () => {
    mockContentFundingState({ loading: false, state: null })

    render(<ChannelPage createCampaignLabel="Start Campaign" />)

    expect(screen.queryByText('Start Campaign')).not.toBeInTheDocument()
  })

  it('shows custom empty campaign state', () => {
    mockContentFundingState({ loading: false, state: null })

    render(<ChannelPage emptyCampaignState="No campaigns yet" />)

    expect(screen.queryByText('No campaigns yet')).not.toBeInTheDocument()
  })

  it('shows custom unclaimed hero description', () => {
    mockContentFundingState({ loading: false, state: null })

    render(<ChannelPage unclaimedHeroDescription="Custom hero text" />)

    expect(screen.queryByText('Custom hero text')).not.toBeInTheDocument()
  })

  it('shows custom share heading', () => {
    mockContentFundingState({ loading: false, state: null })

    render(<ChannelPage shareHeading="Notify the creator" />)

    expect(screen.queryByText('Notify the creator')).not.toBeInTheDocument()
  })

  it('shows custom share description', () => {
    mockContentFundingState({ loading: false, state: null })

    render(<ChannelPage shareDescription="Let them know about the funds" />)

    expect(screen.queryByText('Let them know about the funds')).not.toBeInTheDocument()
  })

  it('shows custom suggested message prefix', () => {
    mockContentFundingState({ loading: false, state: null })

    render(<ChannelPage suggestedMessagePrefix="Check this out:" />)

    expect(screen.queryByText(/Check this out:/i)).not.toBeInTheDocument()
  })
})
