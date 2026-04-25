import { render, screen } from '@testing-library/react'
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

vi.mock('../../pubstarter/utils', async () => {
  const actual = await vi.importActual('../../pubstarter/utils')
  return {
    ...(actual as any),
    getProjectStatus: vi.fn(),
  }
})

import { useContentFundingState } from '../../content-funding/hooks/useContentFundingState'
import { getProjectStatus } from '../../pubstarter/utils'

const NOW_SECS = Math.floor(Date.now() / 1000)
const FAR_FUTURE = String(NOW_SECS + 86400 * 365 * 10)
const PROJECT_ADDR = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

function makeProject(overrides: {
  projectAddress?: string
  alignmentType?: 'direct' | 'indirect'
  totalReceived?: string
  threshold?: string
  deadline?: string
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

    it('links to project detail page', () => {
      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', `/projects/${PROJECT_ADDR}`)
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
  })

  describe('Funding progress', () => {
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

    it('shows 0% when threshold is zero', () => {
      render(
        <AlignedProjectCard
          project={makeProject({ totalReceived: '1000000000000000000', threshold: '0' })}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('0%')).toBeInTheDocument()
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
        channels: [
          {
            canonicalChannelId: 'twitter:user:alice',
            channel: { state: 'verified' as any },
            contracts: [
              {
                contractAddress: PROJECT_ADDR,
                isThirdParty: false,
                status: 'active',
                contentItems: [],
              },
            ],
          },
        ],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
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
        channels: [
          {
            canonicalChannelId: 'twitter:user:alice',
            channel: { state: 'verified' as any },
            contracts: [
              {
                contractAddress: PROJECT_ADDR,
                isThirdParty: true,
                status: 'active',
                contentItems: [],
              },
            ],
          },
        ],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
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
        channels: [
          {
            canonicalChannelId: 'twitter:user:alice',
            channel: { state: 'verified' as any },
            contracts: [
              {
                contractAddress: PROJECT_ADDR,
                isThirdParty: false,
                status: 'active',
                contentItems: [],
              },
            ],
          },
        ],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('@alice')).toBeInTheDocument()
    })

    it('shows channel display name for YouTube channels', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [
          {
            canonicalChannelId: 'youtube:channel:UC123456',
            channel: { state: 'verified' as any },
            contracts: [
              {
                contractAddress: PROJECT_ADDR,
                isThirdParty: false,
                status: 'active',
                contentItems: [],
              },
            ],
          },
        ],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('UC123456')).toBeInTheDocument()
    })

    it('shows channel display name for Substack channels', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [
          {
            canonicalChannelId: 'substack:alice:UC123456',
            channel: { state: 'verified' as any },
            contracts: [
              {
                contractAddress: PROJECT_ADDR,
                isThirdParty: false,
                status: 'active',
                contentItems: [],
              },
            ],
          },
        ],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
        vetoedEvents: [],
        machinery: {} as any,
      })

      render(
        <AlignedProjectCard
          project={makeProject()}
          metadata={undefined}
        />,
      )

      expect(screen.getByText('alice.substack.com')).toBeInTheDocument()
    })

    it('shows content item count when greater than zero', () => {
      vi.mocked(useContentFundingState).mockReturnValue({
        state: {} as any,
        channels: [
          {
            canonicalChannelId: 'twitter:user:alice',
            channel: { state: 'verified' as any },
            contracts: [
              {
                contractAddress: PROJECT_ADDR,
                isThirdParty: false,
                status: 'active',
                contentItems: [{}, {}, {}],
              },
            ],
          },
        ],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
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
        channels: [
          {
            canonicalChannelId: 'twitter:user:alice',
            channel: { state: 'verified' as any },
            contracts: [
              {
                contractAddress: PROJECT_ADDR,
                isThirdParty: false,
                status: 'active',
                contentItems: [],
              },
            ],
          },
        ],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
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
        channels: [
          {
            canonicalChannelId: 'twitter:user:alice',
            channel: { state: 'unclaimed' as any },
            contracts: [
              {
                contractAddress: PROJECT_ADDR,
                isThirdParty: false,
                status: 'active',
                contentItems: [],
              },
            ],
          },
        ],
        loading: false,
        error: null,
        projects: [],
        contentAttestations: new Map(),
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
