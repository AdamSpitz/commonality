import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentFundingProjectSection } from './ContentFundingProjectSection'

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

vi.mock('../hooks/useContentFundingState', () => ({
  useContentFundingState: vi.fn(),
}))

import { useContentFundingState } from '../hooks/useContentFundingState'

function mockContentFundingState(overrides: {
  channels?: unknown[]
  loading?: boolean
  contentAttestations?: Map<string, unknown[]>
  state?: unknown
}) {
  vi.mocked(useContentFundingState).mockReturnValue({
    state: overrides.state ?? {},
    vetoedEvents: [],
    projects: [],
    channels: overrides.channels ?? [],
    contentAttestations: overrides.contentAttestations ?? new Map(),
    loading: overrides.loading ?? false,
    error: null,
    machinery: {
      indexerUrl: 'http://localhost:3000/graphql',
      ipfsConfig: { gatewayUrl: 'https://ipfs.io/ipfs', apiUrl: '', shouldUseMock: false, debugIpfs: false },
      testConfig: { areWeJustRunningTests: true },
    },
  } as any)
}

const mockChannel = (contractAddress: string, overrides: {
  canonicalChannelId?: string
  state?: string
  escrowBalance?: bigint
  contentItems?: unknown[]
  isThirdParty?: boolean
  contractStatus?: string
} = {}) => ({
  canonicalChannelId: overrides.canonicalChannelId ?? 'twitter:uid:123:456',
  contracts: [{
    contractAddress,
    isThirdParty: overrides.isThirdParty ?? false,
    status: overrides.contractStatus ?? 'active',
    contentItems: overrides.contentItems ?? [],
  }],
  channel: {
    state: overrides.state ?? 'unclaimed',
  },
  escrow: {
    balance: overrides.escrowBalance ?? 0n,
  },
})

describe('ContentFundingProjectSection', () => {
  const projectAddress = '0xproject123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when loading', () => {
    mockContentFundingState({ channels: [mockChannel(projectAddress)], loading: true })

    const { container } = render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when no matching project found', () => {
    mockContentFundingState({ channels: [mockChannel('0xother')] })

    const { container } = render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders content funding section with matching project', () => {
    mockContentFundingState({ channels: [mockChannel(projectAddress)] })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Content Funding')).toBeInTheDocument()
  })

  it('shows channel display name for Twitter channel', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { canonicalChannelId: 'twitter:uid:123:456' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('@123')).toBeInTheDocument()
  })

  it('shows channel display name for YouTube channel', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { canonicalChannelId: 'youtube:channel:abc:UCxyz123' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('abc')).toBeInTheDocument()
  })

  it('shows channel display name for Substack channel', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { canonicalChannelId: 'substack:mysub/post-slug' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('mysub/post-slug.substack.com')).toBeInTheDocument()
  })

  it('shows channel status chip', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { state: 'verified' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('shows unclaimed channel status', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { state: 'unclaimed' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Unclaimed')).toBeInTheDocument()
  })

  it('shows creator-controlled channel status', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { state: 'creator-controlled' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Creator-Controlled')).toBeInTheDocument()
  })

  it('shows contract status chip', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { contractStatus: 'active' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows successful contract status', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { contractStatus: 'successful' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Succeeded')).toBeInTheDocument()
  })

  it('shows failed contract status', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { contractStatus: 'failed' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('shows vetoed contract status', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { contractStatus: 'vetoed' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Vetoed')).toBeInTheDocument()
  })

  it('shows "Fan-created" chip for third-party contracts', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { isThirdParty: true })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Fan-created')).toBeInTheDocument()
  })

  it('does not show "Fan-created" chip for non-third-party contracts', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { isThirdParty: false })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.queryByText('Fan-created')).not.toBeInTheDocument()
  })

  it('shows escrowed balance when balance is greater than zero', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { escrowBalance: 500000000000000000n })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('0.5 ETH')).toBeInTheDocument()
  })

  it('does not show escrowed balance when balance is zero', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { escrowBalance: 0n })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.queryByText('0 ETH')).not.toBeInTheDocument()
  })

  it('shows channel ID as caption', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { canonicalChannelId: 'twitter:uid:123:456' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('twitter:uid:123:456')).toBeInTheDocument()
  })

  it('renders content items list when present', () => {
    const contentItems = [
      { contentId: 1n, canonicalId: 'twitter:uid:123:456', status: 'released' },
    ]
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { contentItems })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Content Items (1)')).toBeInTheDocument()
  })

  it('shows "Released" chip for released content items', () => {
    const contentItems = [
      { contentId: 1n, canonicalId: 'twitter:uid:123:456', status: 'released' },
    ]
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { contentItems })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.getByText('Released')).toBeInTheDocument()
  })

  it('does not show content items section when no content items', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { contentItems: [] })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    expect(screen.queryByText('Content Items (0)')).not.toBeInTheDocument()
  })

  it('renders channel link when channel page URL can be constructed', () => {
    mockContentFundingState({
      channels: [mockChannel(projectAddress, { canonicalChannelId: 'twitter:uid:123:456' })],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress} />)

    const link = screen.getByRole('link', { name: '@123' })
    expect(link).toHaveAttribute('href', '/content/twitter/twitter%3Auid%3A123%3A456')
  })

  it('case-insensitive project address matching', () => {
    mockContentFundingState({
      channels: [mockChannel('0XPROJECT123')],
    })

    render(<ContentFundingProjectSection projectAddress={projectAddress.toLowerCase()} />)

    expect(screen.getByText('Content Funding')).toBeInTheDocument()
  })
})
