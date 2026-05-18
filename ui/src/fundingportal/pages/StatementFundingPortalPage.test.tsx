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

vi.mock('../components/AttestAlignmentForm', () => ({
  AttestAlignmentForm: vi.fn(() => <div>Attest Alignment Form</div>),
}))

vi.mock('../components/DelegatableNotesSection', () => ({
  DelegatableNotesSection: vi.fn(() => <div>Delegatable Notes Section</div>),
}))

import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { getStatementWithContent, getTotalFundingForCause } from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedSet } from '../../shared/hooks/useTrustedSet'
import { useTrustedAttesters } from '../../shared/hooks/useTrustedAttesters'
import { computeAvailableDelegatableFunding } from '../utils'
import { AlignedProjectsList } from '../components/AlignedProjectsList'

const STATEMENT_CID = 'bafysubjectivstatement'
const USER_ADDRESS = '0x1111111111111111111111111111111111111111'
const TRUSTED_ADDRESS = '0x2222222222222222222222222222222222222222'
const OTHER_TRUSTED_ADDRESS = '0x3333333333333333333333333333333333333333'
const TRUSTED_IMPLICATION_ATTESTER = '0x4444444444444444444444444444444444444444'
const OTHER_TRUSTED_IMPLICATION_ATTESTER = '0x5555555555555555555555555555555555555555'

const mockMachinery = {} as any

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
      totalRaisedAcrossProjects: 2000000000000000000n,
      totalAvailableFromNotes: 0n,
      projectCount: 4,
      noteCount: 0,
    })
    vi.mocked(computeAvailableDelegatableFunding).mockResolvedValue(500000000000000000n)
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
      expect(screen.getByText('Funding Portal')).toBeInTheDocument()
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
      expect(screen.getByText('Funding Portal')).toBeInTheDocument()
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
})
