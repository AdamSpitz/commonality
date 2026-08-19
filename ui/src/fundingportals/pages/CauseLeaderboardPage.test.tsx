import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CauseLeaderboardPage } from './CauseLeaderboardPage'

vi.mock('react-router-dom', () => ({
  Link: vi.fn(({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  )),
  useParams: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

vi.mock('@commonality/sdk/delegation', async () => {
  const actual = await vi.importActual('@commonality/sdk/delegation')
  return {
    ...actual,
    getStandingPledges: vi.fn(),
  }
})

vi.mock('@commonality/sdk/fundingportals', async () => {
  const actual = await vi.importActual('@commonality/sdk/fundingportals')
  return {
    ...actual,
    getTopContributorsForCause: vi.fn(),
    getTotalFundingForCause: vi.fn(),
    getUserContributionRankForCause: vi.fn(),
  }
})

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: vi.fn(),
}))

vi.mock('../../shared/hooks/useTrustedSet', () => ({
  useTrustedSet: vi.fn(),
}))

import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getStandingPledges } from '@commonality/sdk/delegation'
import { getTopContributorsForCause, getTotalFundingForCause, getUserContributionRankForCause } from '@commonality/sdk/fundingportals'
import { useMachinery } from '../../shared'
import { useTrustedSet } from '../../shared'

const STATEMENT_CID = 'bafyleaderboardstatement'
const USER_ADDRESS = '0x1111111111111111111111111111111111111111'
const TRUSTED_ADDRESS = '0x2222222222222222222222222222222222222222'
const OTHER_TRUSTED_ADDRESS = '0x3333333333333333333333333333333333333333'

const mockMachinery = { contractAddresses: { recurringPledges: '0x9999999999999999999999999999999999999999' } } as any

describe('CauseLeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ statementCid: STATEMENT_CID })
    vi.mocked(useAccount).mockReturnValue({ address: USER_ADDRESS } as any)
    vi.mocked(useMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([TRUSTED_ADDRESS]),
      isLoading: false,
    } as any)
    vi.mocked(getTopContributorsForCause).mockResolvedValue([
      {
        contributor: USER_ADDRESS,
        totalContributed: [{ amount: 1000000000000000000n, currency: { symbol: 'ETH', decimals: 18 } }],
        projectsContributedTo: 1,
        netContribution: [{ amount: 1000000000000000000n, currency: { symbol: 'ETH', decimals: 18 } }],
      },
    ] as any)
    vi.mocked(getTotalFundingForCause).mockResolvedValue({
      totalRaisedAcrossProjects: [],
      totalAvailableFromNotes: [{ amount: 500000000000000000n, currency: { symbol: 'ETH', decimals: 18 } }],
      remainingToThreshold: [],
      totalUnreimbursed: [],
      projectCount: 1,
      noteCount: 1,
    } as any)
    vi.mocked(getUserContributionRankForCause).mockResolvedValue({
      rank: 1,
      stats: {
        contributor: USER_ADDRESS,
        totalContributed: [{ amount: 1000000000000000000n, currency: { symbol: 'ETH', decimals: 18 } }],
        projectsContributedTo: 1,
        netContribution: [{ amount: 1000000000000000000n, currency: { symbol: 'ETH', decimals: 18 } }],
      },
      totalContributors: 1,
    } as any)
    vi.mocked(getStandingPledges).mockResolvedValue([
      {
        id: '1',
        contractAddress: '0x9999999999999999999999999999999999999999',
        rootOwner: USER_ADDRESS,
        delegateTo: USER_ADDRESS,
        token: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        amountPerPeriod: '2500000',
        period: '2592000',
        causeRef: STATEMENT_CID,
        backingType: 0,
        lastExecuted: '0',
        active: true,
        createdAt: '0',
        createdAtBlock: '0',
        updatedAt: '0',
        executedNoteIds: [],
      },
    ])
  })

  it('threads the trusted set into leaderboard queries', async () => {
    const trustedSet = new Set([TRUSTED_ADDRESS, OTHER_TRUSTED_ADDRESS])
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet,
      isLoading: false,
    } as any)

    render(<CauseLeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Cause Leaderboard')).toBeInTheDocument()
    })

    expect(getTopContributorsForCause).toHaveBeenCalledWith(
      mockMachinery,
      STATEMENT_CID,
      50,
      undefined,
      trustedSet
    )
    expect(getUserContributionRankForCause).toHaveBeenCalledWith(
      mockMachinery,
      STATEMENT_CID,
      USER_ADDRESS,
      undefined,
      trustedSet
    )
    expect(getStandingPledges).toHaveBeenCalledWith(mockMachinery)
  })

  it('shows partial trust-network progress while leaderboard filtering is still filling in', async () => {
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([TRUSTED_ADDRESS, OTHER_TRUSTED_ADDRESS]),
      isLoading: true,
    } as any)

    render(<CauseLeaderboardPage />)

    await waitFor(() => {
      expect(
        screen.getByLabelText(
          'Refreshing your trust network. This leaderboard is currently using 2 accounts in your network. Results may still change as more are discovered.'
        )
      ).toBeInTheDocument()
    })
  })

  it('shows the empty-progress trust-network message before any trusted accounts are known', async () => {
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: undefined,
      isLoading: true,
    } as any)

    render(<CauseLeaderboardPage />)

    await waitFor(() => {
      expect(
        screen.getByLabelText(
          'Refreshing your trust network. Until any trusted accounts are found, this leaderboard still includes all alignment attestations.'
        )
      ).toBeInTheDocument()
    })
  })

  it('shows recurring pledges as an aggregate separate from the direct-purchase leaderboard', async () => {
    render(<CauseLeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Ongoing Monthly Pledges')).toBeInTheDocument()
    })

    expect(screen.getByText('Already Contributed')).toBeInTheDocument()
    expect(screen.getByText('2.5 USDZZZ/month')).toBeInTheDocument()
    expect(
      screen.queryByText(
        'Active standing pledges are ongoing commitments and are not ranked with one-time project purchases.'
      )
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('About Ongoing Monthly Pledges')).toBeInTheDocument()
    expect(screen.getByLabelText('About Already Contributed')).toBeInTheDocument()
    expect(screen.getByTestId('monthly-pledge-list')).toBeInTheDocument()
  })

  it('skips recurring pledge loading when the recurring contract is not configured', async () => {
    vi.mocked(useMachinery).mockReturnValue({ contractAddresses: {} } as any)

    render(<CauseLeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Ongoing Monthly Pledges')).toBeInTheDocument()
    })

    expect(screen.getByText('Already Contributed')).toBeInTheDocument()
    expect(screen.getByText('No active monthly pledges yet.')).toBeInTheDocument()
    expect(getStandingPledges).not.toHaveBeenCalled()
  })

})
