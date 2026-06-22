import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TRUSTED_CONTENT_ATTESTERS_KEY } from '../../shared/hooks/useTrustedContentAttesters'
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
  useWalletClient: vi.fn(() => ({ data: undefined })),
  usePublicClient: vi.fn(() => undefined),
}))

vi.mock('../hooks/useContentFundingState', () => ({
  useContentFundingState: vi.fn(),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    getChannelOverview: vi.fn(),
    hashCanonicalId: vi.fn(() => '0xchannel'),
  }
})

import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getChannelOverview } from '@commonality/sdk'
import { useContentFundingState } from '../hooks/useContentFundingState'

function mockContentFundingState(overrides: {
  state?: unknown
  projects?: unknown[]
  loading?: boolean
  error?: string | null
  contentAttestations?: Map<string, unknown[]>
  channelDisplayMetadata?: Map<string, unknown>
}) {
  vi.mocked(useContentFundingState).mockReturnValue({
    state: overrides.state ?? null,
    vetoedEvents: [],
    projects: overrides.projects ?? [],
    channels: [],
    contentAttestations: overrides.contentAttestations ?? new Map(),
    channelDisplayMetadata: overrides.channelDisplayMetadata ?? new Map(),
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    machinery: {
      ipfsConfig: { gatewayUrl: 'https://ipfs.io/ipfs', apiUrl: '', shouldUseMock: false, debugIpfs: false },
      testConfig: { areWeJustRunningTests: true },
    },
  } as any)
}

describe('ChannelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    vi.mocked(useParams).mockReturnValue({ platform: 'twitter', channelId: 'twitter%3Auid%3A12345%3A18347' })
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)
    vi.mocked(getChannelOverview).mockReturnValue({
      channel: { channelId: '0xchannel', owner: null, state: 'unclaimed', controlTakenAt: null },
      escrow: { balance: 0n, totalDeposited: 0n, totalWithdrawn: 0n },
      contracts: [],
      contentItems: [],
    } as any)
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

  it('shows resolver display metadata while keeping the stable channel ID visible', () => {
    mockContentFundingState({
      loading: false,
      state: {},
      channelDisplayMetadata: new Map([
        ['twitter:uid:12345:18347', { displayName: 'Renamed Creator', handle: '@newhandle' }],
      ]),
    })

    render(<ChannelPage />)

    expect(screen.getByRole('heading', { name: 'Renamed Creator' })).toBeInTheDocument()
    expect(screen.getByText('twitter:uid:12345:18347')).toBeInTheDocument()
  })

  it('shows claim affordances for unclaimed escrowed funds', () => {
    vi.mocked(getChannelOverview).mockReturnValue({
      channel: { channelId: '0xchannel', owner: null, state: 'unclaimed', controlTakenAt: null },
      escrow: {
        balance: 110000000000000000n,
        totalDeposited: 110000000000000000n,
        totalWithdrawn: 0n,
      },
      contracts: [],
      contentItems: [],
    } as any)
    mockContentFundingState({ loading: false, state: {} })

    render(<ChannelPage />)

    expect(screen.getByText('Waiting to be claimed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Claim these funds' })).toBeInTheDocument()
    expect(screen.getByText(/verify your identity and withdraw these funds/i)).toBeInTheDocument()
  })

  it('does not invite claim takeover after the channel is creator-controlled', () => {
    vi.mocked(getChannelOverview).mockReturnValue({
      channel: {
        channelId: '0xchannel',
        owner: '0x1111111111111111111111111111111111111111',
        state: 'creator-controlled',
        controlTakenAt: 123n,
      },
      escrow: {
        balance: 110000000000000000n,
        totalDeposited: 110000000000000000n,
        totalWithdrawn: 0n,
      },
      contracts: [],
      contentItems: [],
    } as any)
    mockContentFundingState({ loading: false, state: {} })

    render(<ChannelPage />)

    expect(screen.getByText('Verified Owner')).toBeInTheDocument()
    expect(screen.getByText('0x1111111111111111111111111111111111111111')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Claim these funds' })).not.toBeInTheDocument()
    expect(screen.queryByText('Share with the creator')).not.toBeInTheDocument()
  })

  it('filters channel content items to trusted attested items when requested', () => {
    window.localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      {
        address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        kind: 'beat-agent',
        name: 'US politics beat',
      },
    ]))
    vi.mocked(getChannelOverview).mockReturnValue({
      channel: { channelId: '0xchannel', owner: null, state: 'unclaimed', controlTakenAt: null },
      escrow: { balance: 0n, totalDeposited: 0n, totalWithdrawn: 0n },
      contracts: [],
      contentItems: [
        { contentId: 1n, canonicalId: 'twitter:uid:123:456', status: 'registered' },
        { contentId: 2n, canonicalId: 'twitter:uid:123:789', status: 'registered' },
      ],
    } as any)
    mockContentFundingState({
      loading: false,
      state: {},
      contentAttestations: new Map([
        ['twitter:uid:123:456', [
          {
            canonicalId: 'twitter:uid:123:456',
            subjectId: '0xsubject',
            attested: true,
            attester: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
            statementCid: 'bafy-b',
          },
        ]],
      ]),
    })

    render(<ChannelPage />)

    expect(screen.getByText('twitter:uid:123:456')).toBeInTheDocument()
    expect(screen.getByText('twitter:uid:123:789')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Trusted only'))

    expect(screen.getByText('Content Items')).toBeInTheDocument()
    expect(screen.getByText('1 trusted')).toBeInTheDocument()
    expect(screen.getByText('1 uncovered')).toBeInTheDocument()
    expect(screen.getByText('twitter:uid:123:456')).toBeInTheDocument()
    expect(screen.queryByText('twitter:uid:123:789')).not.toBeInTheDocument()
  })

  it('explains canonical content IDs and trusted-attester labels', () => {
    vi.mocked(getChannelOverview).mockReturnValue({
      channel: { channelId: '0xchannel', owner: null, state: 'unclaimed', controlTakenAt: null },
      escrow: { balance: 0n, totalDeposited: 0n, totalWithdrawn: 0n },
      contracts: [],
      contentItems: [
        { contentId: 1n, canonicalId: 'twitter:uid:123:456', status: 'registered' },
      ],
    } as any)
    mockContentFundingState({ loading: false, state: {} })

    render(<ChannelPage />)

    expect(screen.getByText(/canonical content ID/i)).toBeInTheDocument()
    expect(screen.getByText(/duplicate or renamed posts/i)).toBeInTheDocument()
    expect(screen.getByText(/Trusted attested/i)).toBeInTheDocument()
    expect(screen.getByText(/Uncovered/i)).toBeInTheDocument()
  })

  it('shows positive content-attester results beside the matching content item', () => {
    window.localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      {
        address: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
        kind: 'content-attester',
        name: 'Civility evaluator',
      },
    ]))
    vi.mocked(getChannelOverview).mockReturnValue({
      channel: { channelId: '0xchannel', owner: null, state: 'unclaimed', controlTakenAt: null },
      escrow: { balance: 0n, totalDeposited: 0n, totalWithdrawn: 0n },
      contracts: [],
      contentItems: [
        { contentId: 1n, canonicalId: 'twitter:uid:123:456', status: 'registered' },
      ],
    } as any)
    mockContentFundingState({
      loading: false,
      state: {},
      contentAttestations: new Map([
        ['twitter:uid:123:456', [
          {
            canonicalId: 'twitter:uid:123:456',
            subjectId: '0xsubject',
            attested: true,
            attester: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            statementCid: 'bafy-civility-statement',
          },
        ]],
      ]),
    })

    render(<ChannelPage />)

    expect(screen.getByText('twitter:uid:123:456')).toBeInTheDocument()
    expect(screen.getByText('Trusted attested')).toBeInTheDocument()
    expect(screen.getByText('Civility evaluator')).toBeInTheDocument()
    expect(screen.queryByText('Uncovered')).not.toBeInTheDocument()
  })

  it('uses the escrow balance in the unclaimed-channel suggested share message', () => {
    vi.mocked(getChannelOverview).mockReturnValue({
      channel: { channelId: '0xchannel', owner: null, state: 'unclaimed', controlTakenAt: null },
      escrow: {
        balance: 110000000000000000n,
        totalDeposited: 110000000000000000n,
        totalWithdrawn: 0n,
      },
      contracts: [],
      contentItems: [],
    } as any)
    mockContentFundingState({ loading: false, state: {} })

    render(<ChannelPage />)

    expect(screen.getByText(/Your supporters have pooled 0\.11 ETH/)).toBeInTheDocument()
    expect(screen.queryByText(/Your supporters have pooled 0 ETH/)).not.toBeInTheDocument()
  })
})
