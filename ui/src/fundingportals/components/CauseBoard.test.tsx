import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CauseBoard } from './CauseBoard'

vi.mock('react-router-dom', () => {
  function Link({ to, children, ...props }: any) {
    return <a href={to} {...props}>{children}</a>
  }
  return { Link, RouterLink: Link }
})

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

vi.mock('@commonality/sdk/conceptspace', async () => {
  const actual = await vi.importActual('@commonality/sdk/conceptspace')
  return {
    ...actual,
    getStatementWithContent: vi.fn(),
  }
})

vi.mock('@commonality/sdk/delegation', async () => {
  const actual = await vi.importActual('@commonality/sdk/delegation')
  return {
    ...actual,
    getMonthlyPledgedByCause: vi.fn(),
  }
})

vi.mock('@commonality/sdk/fundingportals', async () => {
  const actual = await vi.importActual('@commonality/sdk/fundingportals')
  return {
    ...actual,
    getAllAlignedProjectsForCause: vi.fn(),
    foldAlignedProjectFunding: vi.fn(),
  }
})

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: vi.fn(),
}))

vi.mock('../../shared/hooks/useTrustedSet', () => ({
  useTrustedSet: vi.fn(),
}))

vi.mock('../../shared/hooks/useTrustedAttesters', () => ({
  useTrustedAttesters: vi.fn(),
}))

vi.mock('../../shared/hooks/useTrustedContentAttesters', () => ({
  useTrustedContentAttesters: vi.fn(() => []),
}))

vi.mock('../../shared/stores/foldCache', async () => {
  const actual = await vi.importActual<typeof import('../../shared/stores/foldCache')>(
    '../../shared/stores/foldCache',
  )
  return {
    ...actual,
    loadBoardMetricsSnapshot: vi.fn(async () => null),
    saveBoardMetricsSnapshot: vi.fn(async () => {}),
  }
})

vi.mock('../../content-funding', async () => {
  const actual = await vi.importActual<typeof import('../../content-funding')>('../../content-funding')
  return {
    ...actual,
    useContentFundingState: vi.fn(() => ({
      state: null,
      channels: [],
      contentAttestations: new Map(),
      loading: false,
    })),
  }
})

vi.mock('./AlignedProjectsList', () => ({
  AlignedProjectsList: vi.fn(() => <div>Aligned Projects List</div>),
}))

vi.mock('./SuccessfulProjectsTab', () => ({
  SuccessfulProjectsTab: vi.fn(() => <div>Successful Projects Tab</div>),
}))

vi.mock('./AttestAlignmentForm', () => ({
  AttestAlignmentForm: vi.fn(() => <div>Attest Alignment Form</div>),
}))

import { getStatementWithContent } from '@commonality/sdk/conceptspace'
import { getMonthlyPledgedByCause } from '@commonality/sdk/delegation'
import { foldAlignedProjectFunding, getAllAlignedProjectsForCause } from '@commonality/sdk/fundingportals'
import { loadBoardMetricsSnapshot, useMachinery, useTrustedAttesters, useTrustedSet } from '../../shared'
import { useAccount } from 'wagmi'

const USER_ADDRESS = '0x1111111111111111111111111111111111111111'

const mockMachinery = {
  eventCacheUrl: 'http://localhost:42069/api',
  contractAddresses: {
    recurringPledges: '0x9999999999999999999999999999999999999999',
    assuranceContractFactory: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
} as any

describe('CauseBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAccount).mockReturnValue({ address: USER_ADDRESS } as any)
    vi.mocked(useMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([USER_ADDRESS]),
      isLoading: false,
    } as any)
    vi.mocked(useTrustedAttesters).mockReturnValue([])
    vi.mocked(loadBoardMetricsSnapshot).mockResolvedValue(null)
    vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])
    vi.mocked(foldAlignedProjectFunding).mockResolvedValue({
      totalRaisedAcrossProjects: [],
      remainingToThreshold: [],
      totalUnreimbursed: [],
      projectCount: 0,
    } as any)
    vi.mocked(getMonthlyPledgedByCause).mockResolvedValue(new Map())
    vi.mocked(getStatementWithContent).mockResolvedValue({
      statement: { title: 'Live title', excerpt: 'Live excerpt' },
      content: null,
    } as any)
  })

  it('paints cached metrics immediately while the live fold is in flight', async () => {
    vi.mocked(loadBoardMetricsSnapshot).mockResolvedValue({
      snapshotVersion: 1,
      title: 'Cached cause',
      summary: 'From last visit',
      totalRaised: [],
      remainingToThreshold: [],
      totalUnreimbursed: [],
      monthlyPledged: '0',
      projectCount: 4,
    })
    let resolveFold: (value: unknown) => void = () => {}
    vi.mocked(foldAlignedProjectFunding).mockReturnValue(
      new Promise((resolve) => {
        resolveFold = resolve
      }) as any,
    )

    render(<CauseBoard statementCid="QmTest" />)

    expect(await screen.findByText('Cached cause')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByTestId('trust-network-refresh')).toHaveAttribute(
      'aria-label',
      'Updating this fundable-projects board from the latest events.',
    )

    resolveFold({
      totalRaisedAcrossProjects: [],
      remainingToThreshold: [],
      totalUnreimbursed: [],
      projectCount: 1,
    })

    await waitFor(() => {
      expect(screen.getByText('Live title')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })
})
