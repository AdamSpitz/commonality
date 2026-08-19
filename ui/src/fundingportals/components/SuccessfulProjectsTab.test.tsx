import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DISCOVERY_LEVEL_STORAGE_KEY } from '../hooks/useDiscoveryLevel'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}))

vi.mock('../../shared/hooks/useTrustedSet', () => ({
  useTrustedSet: vi.fn(),
}))

vi.mock('./SuccessfulProjectsList', () => ({
  SuccessfulProjectsList: vi.fn(() => <div>Successful Projects List</div>),
}))

import { useAccount } from 'wagmi'
import { useTrustedSet } from '../../shared'
import { SuccessfulProjectsList } from './SuccessfulProjectsList'
import { SuccessfulProjectsTab } from './SuccessfulProjectsTab'

const USER_ADDRESS = '0x1111111111111111111111111111111111111111'
const TRUSTED_A = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const TRUSTED_B = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'

describe('SuccessfulProjectsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.removeItem(DISCOVERY_LEVEL_STORAGE_KEY)
    vi.mocked(useAccount).mockReturnValue({ address: USER_ADDRESS } as any)
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([TRUSTED_A, TRUSTED_B]),
      trustWeights: new Map([[TRUSTED_A.toLowerCase(), 100]]),
      isLoading: false,
    } as any)
  })

  it('defaults discovery to "My network" and filters by the trusted set', async () => {
    render(<SuccessfulProjectsTab statementCid="bafyCause" trustedImplicationAttesters={new Set(['0ximpl'])} />)

    expect(screen.queryByRole('slider')).toBeNull()
    await waitFor(() => {
      expect(useTrustedSet).toHaveBeenCalledWith(USER_ADDRESS, { maxHops: 1 })
    })
    expect(vi.mocked(SuccessfulProjectsList).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        statementCid: 'bafyCause',
        trustedImplicationAttesters: new Set(['0ximpl']),
        trustedSuccessAttesters: new Set([TRUSTED_A, TRUSTED_B]),
        trustWeights: new Map([[TRUSTED_A.toLowerCase(), 100]]),
      }),
    )
  })

  it('loosens to +1 hop, re-running useTrustedSet with maxHops 2', () => {
    window.localStorage.setItem(DISCOVERY_LEVEL_STORAGE_KEY, 'one-hop')
    render(<SuccessfulProjectsTab statementCid="bafyCause" />)

    expect(useTrustedSet).toHaveBeenLastCalledWith(USER_ADDRESS, { maxHops: 2 })
    // Still passes the trusted set/weights while the filter is active.
    expect(vi.mocked(SuccessfulProjectsList).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        trustedSuccessAttesters: new Set([TRUSTED_A, TRUSTED_B]),
        trustWeights: new Map([[TRUSTED_A.toLowerCase(), 100]]),
      }),
    )
  })

  it('drops the trust filter entirely on "Anyone"', () => {
    window.localStorage.setItem(DISCOVERY_LEVEL_STORAGE_KEY, 'anyone')
    render(<SuccessfulProjectsTab statementCid="bafyCause" />)

    // Anyone does not recompute with a hop limit — it passes undefined filters.
    expect(vi.mocked(SuccessfulProjectsList).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        trustedSuccessAttesters: undefined,
        trustWeights: undefined,
      }),
    )
  })

  it('does not show the discovery slider on the board', () => {
    vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)

    render(<SuccessfulProjectsTab statementCid="bafyCause" />)

    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.queryByText(/Sign in and build a trust network/i)).toBeNull()
  })

  it('shows a trust-network progress alert while loading', async () => {
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([TRUSTED_A]),
      trustWeights: undefined,
      isLoading: true,
    } as any)

    render(<SuccessfulProjectsTab statementCid="bafyCause" />)

    expect(await screen.findByLabelText(/Success vouches are currently filtered using 1 account/i)).toBeInTheDocument()
  })

  it('shows the pre-network progress alert before any trusted accounts are known', async () => {
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: undefined,
      trustWeights: undefined,
      isLoading: true,
    } as any)

    render(<SuccessfulProjectsTab statementCid="bafyCause" />)

    expect(await screen.findByLabelText(/Until any trusted accounts are found, success vouches are not filtered/i)).toBeInTheDocument()
  })
})
