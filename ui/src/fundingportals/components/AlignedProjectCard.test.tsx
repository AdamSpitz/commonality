import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AlignedProjectCard, type AlignedProject } from './AlignedProjectCard'

vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>{children}</a>
  )),
}))

vi.mock('../../content-funding/hooks/useContentFundingState', () => ({
  useContentFundingState: vi.fn(),
}))

vi.mock('../../lazy-giving/utils', async () => {
  const actual = await vi.importActual('../../lazy-giving/utils')
  return {
    ...(actual as any),
    getProjectStatus: vi.fn(),
  }
})

import { useContentFundingState } from '../../content-funding'
import { getProjectStatus } from '../../lazy-giving'

const NOW_SECS = Math.floor(Date.now() / 1000)
const FAR_FUTURE = String(NOW_SECS + 86400 * 365 * 10)
const PROJECT_ADDR = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

function makeChannelEntry(overrides: {
  canonicalChannelId?: string
  channelState?: string
  contractAddress?: string
  isThirdParty?: boolean
  status?: string
  contentItems?: any[]
} = {}) {
  return {
    canonicalChannelId: overrides.canonicalChannelId ?? 'twitter:user:alice',
    channel: {
      channelId: '0xabc',
      owner: null,
      controlTakenAt: null,
      state: (overrides.channelState ?? 'verified') as any,
    },
    escrow: { balance: 0n, totalDeposited: 0n, totalWithdrawn: 0n },
    contentItems: overrides.contentItems ?? [],
    contracts: [
      {
        contractAddress: overrides.contractAddress ?? PROJECT_ADDR,
        channelId: '0xabc',
        creator: '0x0000000000000000000000000000000000000001',
        isThirdParty: overrides.isThirdParty ?? false,
        project: null,
        fundingProgress: null,
        status: (overrides.status ?? 'active') as any,
        contentItems: overrides.contentItems ?? [],
      },
    ],
  }
}

function makeProject(overrides: {
  projectAddress?: string
  alignmentType?: 'direct' | 'indirect'
  totalReceived?: string
  threshold?: string
  deadline?: string
  fundingCurrency?: AlignedProject['fundingCurrency']
} = {}): AlignedProject {
  return {
    projectAddress: PROJECT_ADDR,
    alignmentType: 'direct',
    fundingCurrency: { symbol: 'ETH', decimals: 18, address: '0x0000000000000000000000000000000000000000' } as any,
    totalReceived: '0',
    threshold: '1000000000000000000',
    deadline: FAR_FUTURE,
    ...overrides,
  }
}

describe('AlignedProjectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useContentFundingState).mockReturnValue({
      state: null,
      channels: [],
      loading: false,
      error: null,
      projects: [],
      contentAttestations: new Map(),
      channelDisplayMetadata: new Map(),
      vetoedEvents: [],
      machinery: {} as any,
    })
    vi.mocked(getProjectStatus).mockReturnValue('active')
  })

  describe('Project display', () => {
    it('shows project name from metadata when available', () => {
      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={{ name: 'My Awesome Project', description: 'A great project' }}
        />,
      )

      expect(screen.getByText('My Awesome Project')).toBeInTheDocument()
    })

    it('shows truncated address when no metadata available', () => {
      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('Project 0xAAAAAA...')).toBeInTheDocument()
    })

    it('uses the content-funding channel name when project metadata has no title', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ canonicalChannelId: 'substack:commontable' })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map([
          ['substack:commontable', { displayName: 'Common Table creator content fund' }],
        ]),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByRole('link', { name: /Common Table creator content fund/ })).toBeInTheDocument()
      expect(screen.queryByText('Project 0xAAAAAA...')).not.toBeInTheDocument()
    })

    it('prefers published metadata name over the channel name', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ canonicalChannelId: 'substack:commontable' })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map([
          ['substack:commontable', { displayName: 'Common Table creator content fund' }],
        ]),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={{ name: 'Essay fund round 1' }}
        />,
      )

      expect(screen.getByText('Essay fund round 1')).toBeInTheDocument()
    })

    it('links to project detail page', () => {
      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      const links = screen.getAllByRole('link')
      const fundLink = links.find(l => l.getAttribute('aria-label')?.includes('Open project'))
      expect(fundLink).toHaveAttribute('href', `/projects/eip155%3A31337%3A${PROJECT_ADDR}`)
    })

    it('uses local project copy and RouterLink path when projectLinks is local', () => {
      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={{ name: 'Local Hosted Project' }}
          projectLinks="local"
        />,
      )

      expect(screen.queryByText('Fund this project')).not.toBeInTheDocument()
      expect(screen.queryByText(/Contribute, refund, and withdraw here/i)).not.toBeInTheDocument()
      const fundLink = screen.getByRole('link', { name: /Open project: Local Hosted Project/i })
      // Local mode must use in-app route path (RouterLink), not a full-page external href.
      expect(fundLink).toHaveAttribute('href', `/projects/eip155%3A31337%3A${PROJECT_ADDR}`)
      fireEvent.click(screen.getByTestId('alignment-chip'))
      const vouchLink = screen.getByRole('menuitem', { name: /Vouch for this project/i })
      expect(vouchLink).toHaveAttribute('href', `/projects/eip155%3A31337%3A${PROJECT_ADDR}`)
    })
  })

  describe('Alignment type', () => {
    it('shows "Direct" chip for direct alignment', () => {
      render(
        <AlignedProjectCard
          project={makeProject({ alignmentType: 'direct' })}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('Direct')).toBeInTheDocument()
    })

    it('shows "Indirect" chip for indirect alignment', () => {
      render(
        <AlignedProjectCard
          project={makeProject({ alignmentType: 'indirect' })}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('Indirect')).toBeInTheDocument()
    })

    it('explains direct and indirect alignment instead of relying on raw labels', () => {
      const { rerender } = render(
        <AlignedProjectCard
          project={makeProject({ alignmentType: 'direct' })}
          metadata={undefined}
        />,
      )

      expect(screen.queryByText(/Direct alignment: someone vouched that this project serves this cause/i)).not.toBeInTheDocument()
      expect(screen.getByLabelText(/Direct alignment: someone vouched/i)).toBeInTheDocument()

      rerender(
        <AlignedProjectCard
          project={makeProject({ alignmentType: 'indirect' })}
          metadata={undefined}
        />,
      )

      expect(screen.queryByText(/Indirect alignment: this project is connected through implication links/i)).not.toBeInTheDocument()
      expect(screen.getByLabelText(/Indirect alignment: this project is connected/i)).toBeInTheDocument()
    })
  })

  describe('Funding progress', () => {
    it('formats funding amounts using the project settlement token', () => {
      render(
        <AlignedProjectCard
          project={makeProject({
            fundingCurrency: {
              kind: 'erc20',
              symbol: 'USDZZZ',
              decimals: 6,
              tokenAddress: '0x0000000000000000000000000000000000000001',
              tokenType: 0,
            },
            totalReceived: '700000',
            threshold: '3790000',
          })}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('0.7 / 3.79 USDZZZ')).toBeInTheDocument()
      expect(screen.queryByText(/ETH/)).not.toBeInTheDocument()
    })

    it('shows 0% progress when no funds received', () => {
      render(
        <AlignedProjectCard
          project={makeProject({ totalReceived: '0', threshold: '1000000000000000000' })}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('shows 50% progress when half funded', () => {
      render(
        <AlignedProjectCard
          project={makeProject({ totalReceived: '500000000000000000', threshold: '1000000000000000000' })}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('shows 100% progress when fully funded', () => {
      render(
        <AlignedProjectCard
          project={makeProject({ totalReceived: '1000000000000000000', threshold: '1000000000000000000' })}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('caps progress bar at 100% when overfunded (text shows actual)', () => {
      render(
        <AlignedProjectCard
          project={makeProject({ totalReceived: '2000000000000000000', threshold: '1000000000000000000' })}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('200%')).toBeInTheDocument()
      const bar = screen.getByRole('progressbar')
      expect(bar).toHaveAttribute('aria-valuenow', '100')
    })

    it('labels threshold-zero projects as having no minimum', () => {
      render(
        <AlignedProjectCard
          project={makeProject({ totalReceived: '1000000000000000000', threshold: '0' })}
          metadata={undefined}
        />,
      )

      expect(screen.getAllByText(/No minimum/).length).toBeGreaterThan(0)
    })
  })

  describe('Content funding badge', () => {
    it('shows no content funding badge when project is not a content funding contract', () => {
      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.queryByText('Content Funding')).not.toBeInTheDocument()
    })

    it('shows "Content Funding" badge when project has content funding info', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry()],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('Content Funding')).toBeInTheDocument()
    })

    it('shows "Fan-created" chip for third-party contracts', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ isThirdParty: true })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('Fan-created')).toBeInTheDocument()
    })

    it('shows channel display name for Twitter channels', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ canonicalChannelId: 'twitter:user:alice' })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getAllByText('@alice').length).toBeGreaterThan(0)
    })

    it('shows channel display name for YouTube channels', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ canonicalChannelId: 'youtube:channel:UC123456' })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getAllByText('UC123456').length).toBeGreaterThan(0)
    })

    it('shows channel display name for Substack channels', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ canonicalChannelId: 'substack:alice:UC123456' })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getAllByText('alice.substack.com').length).toBeGreaterThan(0)
    })

    it('shows content item count when greater than zero', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ contentItems: [{} as any, {} as any, {} as any] })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows contract status chip', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ status: 'active' })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('shows channel status label', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [makeChannelEntry({ channelState: 'unclaimed' })],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        channelDisplayMetadata: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('Unclaimed')).toBeInTheDocument()
    })
  })
})
