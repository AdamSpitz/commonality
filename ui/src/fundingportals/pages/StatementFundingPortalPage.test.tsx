import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StatementFundingPortalPage } from './StatementFundingPortalPage'

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
    getMonthlyPledgedByCause: vi.fn(),
    getStatementWithContent: vi.fn(),
    getTotalFundingForCause: vi.fn(),
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

vi.mock('../utils', () => ({
  computeAvailableDelegatableFunding: vi.fn(),
}))

vi.mock('../components/AlignedProjectsList', () => ({
  AlignedProjectsList: vi.fn(() => <div>Aligned Projects List</div>),
}))

vi.mock('../components/SuccessfulProjectsTab', () => ({
  SuccessfulProjectsTab: vi.fn(({ statementCid, trustedImplicationAttesters }) => (
    <div>
      Successful Projects Tab
      <span data-testid="tab-statement-cid">{statementCid}</span>
      <span data-testid="tab-implication-attesters">
        {trustedImplicationAttesters ? Array.from(trustedImplicationAttesters).join(',') : 'undefined'}
      </span>
    </div>
  )),
}))

vi.mock('../components/AttestAlignmentForm', () => ({
  AttestAlignmentForm: vi.fn(() => <div>Attest Alignment Form</div>),
}))

vi.mock('../components/DelegatableNotesSection', () => ({
  DelegatableNotesSection: vi.fn(() => <div>Delegatable Notes Section</div>),
}))

import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getMonthlyPledgedByCause, getStatementWithContent, getTotalFundingForCause } from '@commonality/sdk'
import { useMachinery } from '../../shared'
import { useTrustedSet } from '../../shared'
import { useTrustedAttesters } from '../../shared'
import { computeAvailableDelegatableFunding } from '../utils'
import { AlignedProjectsList } from '../components/AlignedProjectsList'
import { SuccessfulProjectsTab } from '../components/SuccessfulProjectsTab'

const STATEMENT_CID = 'bafysubjectivstatement'
const USER_ADDRESS = '0x1111111111111111111111111111111111111111'
const TRUSTED_ADDRESS = '0x2222222222222222222222222222222222222222'
const OTHER_TRUSTED_ADDRESS = '0x3333333333333333333333333333333333333333'
const TRUSTED_IMPLICATION_ATTESTER = '0x4444444444444444444444444444444444444444'
const OTHER_TRUSTED_IMPLICATION_ATTESTER = '0x5555555555555555555555555555555555555555'

const mockMachinery = {
  contractAddresses: {
    recurringPledges: '0x9999999999999999999999999999999999999999',
  },
} as any

describe('StatementFundingPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ statementCid: STATEMENT_CID })
    vi.mocked(useAccount).mockReturnValue({ address: USER_ADDRESS } as any)
    vi.mocked(useMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([TRUSTED_ADDRESS]),
      isLoading: false,
    } as any)
    vi.mocked(useTrustedAttesters).mockReturnValue([])
    vi.mocked(getStatementWithContent).mockResolvedValue({
      statement: {
        title: 'Subjectiv Cause',
        excerpt: 'A short summary',
      },
      content: {
        content: '# Subjectiv Cause',
      },
    } as any)
    vi.mocked(getTotalFundingForCause).mockResolvedValue({
      totalRaisedAcrossProjects: [{ amount: 2000000000000000000n, currency: { kind: 'native', symbol: 'ETH', decimals: 18, tokenAddress: null, tokenType: 0 } }],
      totalAvailableFromNotes: [],
      projectCount: 4,
      noteCount: 0,
    })
    vi.mocked(getMonthlyPledgedByCause).mockResolvedValue(new Map([[STATEMENT_CID, 12340000n]]))
    vi.mocked(computeAvailableDelegatableFunding).mockResolvedValue([
      { amount: 500000000000000000n, currency: { kind: 'native', symbol: 'ETH', decimals: 18, tokenAddress: null, tokenType: 0 } },
    ])
  })

  it('threads trusted implication attesters and the trusted alignment set into funding queries and aligned-project filtering', async () => {
    const trustedSet = new Set([TRUSTED_ADDRESS, OTHER_TRUSTED_ADDRESS])
    const trustedImplicationAttesters = [TRUSTED_IMPLICATION_ATTESTER, OTHER_TRUSTED_IMPLICATION_ATTESTER]
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet,
      isLoading: false,
    } as any)
    vi.mocked(useTrustedAttesters).mockReturnValue(trustedImplicationAttesters)

    render(<StatementFundingPortalPage />)

    await waitFor(() => {
      expect(screen.getByText('Cause Board')).toBeInTheDocument()
    })

    expect(getTotalFundingForCause).toHaveBeenCalledWith(
      mockMachinery,
      STATEMENT_CID,
      trustedImplicationAttesters,
      trustedSet
    )

    const alignedProjectsProps = vi.mocked(AlignedProjectsList).mock.calls[0]?.[0]
    expect(alignedProjectsProps).toEqual(
      expect.objectContaining({
        statementCid: STATEMENT_CID,
        trustedImplicationAttesters,
        trustedAlignmentAttesters: trustedSet,
      })
    )
  })

  it('leaves implication attesters unfiltered when no trusted implication attesters are configured', async () => {
    render(<StatementFundingPortalPage />)

    await waitFor(() => {
      expect(screen.getByText('Cause Board')).toBeInTheDocument()
    })

    expect(getTotalFundingForCause).toHaveBeenCalledWith(
      mockMachinery,
      STATEMENT_CID,
      undefined,
      expect.any(Set)
    )
  })

  it('shows partial trust-network progress while filtering is still filling in', async () => {
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([TRUSTED_ADDRESS, OTHER_TRUSTED_ADDRESS]),
      isLoading: true,
    } as any)

    render(<StatementFundingPortalPage />)

    await waitFor(() => {
      expect(
        screen.getByText(
          'Refreshing your trust network. This portal is currently filtered using 2 accounts in your network. Results may still change as more are discovered.'
        )
      ).toBeInTheDocument()
    })
  })

  it('shows the empty-progress trust-network message before any trusted accounts are known', async () => {
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: undefined,
      isLoading: true,
    } as any)

    render(<StatementFundingPortalPage />)

    await waitFor(() => {
      expect(
        screen.getByText(
          'Refreshing your trust network. Until any trusted accounts are found, this portal still shows all project endorsements.'
        )
      ).toBeInTheDocument()
    })
  })

  it('shows active monthly pledge totals for this cause', async () => {
    render(<StatementFundingPortalPage />)

    await waitFor(() => {
      expect(screen.getByText('Ongoing Monthly Pledges')).toBeInTheDocument()
    })

    expect(getMonthlyPledgedByCause).toHaveBeenCalledWith(mockMachinery)
    expect(screen.getByText('12.34 USDZZZ/month')).toBeInTheDocument()
  })

  it('skips monthly pledge loading when the recurring pledge contract is not configured', async () => {
    const machineryWithoutRecurringPledges = { contractAddresses: {} } as any
    vi.mocked(useMachinery).mockReturnValue(machineryWithoutRecurringPledges)

    render(<StatementFundingPortalPage />)

    await waitFor(() => {
      expect(screen.getByText('Ongoing Monthly Pledges')).toBeInTheDocument()
    })

    expect(getMonthlyPledgedByCause).not.toHaveBeenCalled()
    expect(screen.getByText('0 USDZZZ/month')).toBeInTheDocument()
  })

  it('renders the Successful tab with the discovery slider when the Successful view is selected', async () => {
    const userEvent = (await import('@testing-library/user-event')).default
    const user = userEvent.setup()
    const trustedImplicationAttesters = [TRUSTED_IMPLICATION_ATTESTER]
    vi.mocked(useTrustedAttesters).mockReturnValue(trustedImplicationAttesters)

    render(<StatementFundingPortalPage />)

    await waitFor(() => {
      expect(screen.getByText('Cause Board')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Successful' }))

    expect(await screen.findByText('Successful Projects Tab')).toBeInTheDocument()
    expect(vi.mocked(SuccessfulProjectsTab).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        statementCid: STATEMENT_CID,
        trustedImplicationAttesters,
      }),
    )
  })
})
