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

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    getTopContributorsForCause: vi.fn(),
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
import {
  getTopContributorsForCause,
  getUserContributionRankForCause,
} from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedSet } from '../../shared/hooks/useTrustedSet'

const STATEMENT_CID = 'bafyleaderboardstatement'
const USER_ADDRESS = '0x1111111111111111111111111111111111111111'
const TRUSTED_ADDRESS = '0x2222222222222222222222222222222222222222'
const OTHER_TRUSTED_ADDRESS = '0x3333333333333333333333333333333333333333'

const mockMachinery = {} as any

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
        participant: USER_ADDRESS,
        totalContributed: 1000000000000000000n,
        projectsContributedTo: 1,
        netContribution: 1000000000000000000n,
      },
    ] as any)
    vi.mocked(getUserContributionRankForCause).mockResolvedValue({
      rank: 1,
      stats: {
        participant: USER_ADDRESS,
        totalContributed: 1000000000000000000n,
        projectsContributedTo: 1,
        netContribution: 1000000000000000000n,
      },
      totalContributors: 1,
    } as any)
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
  })

  it('shows partial trust-network progress while leaderboard filtering is still filling in', async () => {
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([TRUSTED_ADDRESS, OTHER_TRUSTED_ADDRESS]),
      isLoading: true,
    } as any)

    render(<CauseLeaderboardPage />)

    await waitFor(() => {
      expect(
        screen.getByText(
          'Building your trust network. Leaderboard results are currently using 2 trusted accounts discovered so far.'
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
        screen.getByText(
          'Building your trust network. Leaderboard results may expand as more trusted alignments are discovered.'
        )
      ).toBeInTheDocument()
    })
  })
})
