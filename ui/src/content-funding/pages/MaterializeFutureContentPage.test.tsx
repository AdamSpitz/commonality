import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MaterializeFutureContentPage } from './MaterializeFutureContentPage'

const ROUND = '0x1111111111111111111111111111111111111111'
const TOKEN = '0x2222222222222222222222222222222222222222'
const ACCOUNT = '0x3333333333333333333333333333333333333333'

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(() => ({ data: undefined })),
  usePublicClient: vi.fn(() => undefined),
}))

// The real useMachinery is useMemo(..., []), so the mock must be stable too --
// a fresh object per render would re-run every effect keyed on it.
const MACHINERY = {}
vi.mock('../../shared', () => ({
  useMachinery: vi.fn(() => MACHINERY),
  useWriteClients: vi.fn(() => undefined),
}))

vi.mock('../hooks/usePlatformApi', () => ({
  usePlatformApi: vi.fn(() => ({ resolveContent: vi.fn() })),
}))

vi.mock('@commonality/sdk/content-funding', async () => {
  const actual = await vi.importActual('@commonality/sdk/content-funding')
  return {
    ...actual,
    getProspectiveRoundOnchainState: vi.fn(),
    getMaterializedContentOnchain: vi.fn(),
    getMaterializedClaimStates: vi.fn(),
    hashCanonicalId: vi.fn(() => '0xchannel'),
  }
})

import { useParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import {
  getMaterializedClaimStates,
  getMaterializedContentOnchain,
  getProspectiveRoundOnchainState,
} from '@commonality/sdk/content-funding'

describe('MaterializeFutureContentPage claim state', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ platform: 'twitter', channelId: 'twitter%3Auid%3A12345', roundAddress: ROUND })
    vi.mocked(useAccount).mockReturnValue({ address: ACCOUNT, isConnected: true } as never)
    vi.mocked(getProspectiveRoundOnchainState).mockResolvedValue({ channelId: '0xchannel', materializedToken: TOKEN })
    vi.mocked(getMaterializedContentOnchain).mockResolvedValue([
      { contentId: 1n, canonicalId: 'twitter:uid:12345:111' },
      { contentId: 2n, canonicalId: 'twitter:uid:12345:222' },
    ])
  })

  it('shows the claimable remainder and a live claim button', async () => {
    vi.mocked(getMaterializedClaimStates).mockResolvedValue([
      { contentId: 1n, entitlement: 5n, claimed: 3n, claimable: 2n },
      { contentId: 2n, entitlement: 5n, claimed: 0n, claimable: 5n },
    ])

    render(<MaterializeFutureContentPage />)

    expect(await screen.findByText('2 claimable · 3 already claimed')).toBeInTheDocument()
    expect(screen.getByText('5 claimable')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Claim my content tokens' })).toHaveLength(2)
  })

  it('disables the button for a fully claimed item', async () => {
    vi.mocked(getMaterializedClaimStates).mockResolvedValue([
      { contentId: 1n, entitlement: 4n, claimed: 4n, claimable: 0n },
      { contentId: 2n, entitlement: 4n, claimed: 0n, claimable: 4n },
    ])

    render(<MaterializeFutureContentPage />)

    expect(await screen.findByText('Claimed 4 of 4')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Claimed' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Claim my content tokens' })).toBeEnabled()
  })

  it('drops the "of N" when receipts were sold after claiming', async () => {
    vi.mocked(getMaterializedClaimStates).mockResolvedValue([
      { contentId: 1n, entitlement: 2n, claimed: 4n, claimable: 0n },
      { contentId: 2n, entitlement: 2n, claimed: 0n, claimable: 2n },
    ])

    render(<MaterializeFutureContentPage />)

    expect(await screen.findByText('Claimed 4')).toBeInTheDocument()
  })

  it('says there is nothing to claim without receipts', async () => {
    vi.mocked(getMaterializedClaimStates).mockResolvedValue([
      { contentId: 1n, entitlement: 0n, claimed: 0n, claimable: 0n },
      { contentId: 2n, entitlement: 0n, claimed: 0n, claimable: 0n },
    ])

    render(<MaterializeFutureContentPage />)

    expect(await screen.findAllByText('No receipts for this round, so nothing to claim.')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Claimed' })[0]).toBeDisabled()
  })

  it('still lists the content when the claim-state read fails', async () => {
    vi.mocked(getMaterializedClaimStates).mockRejectedValue(new Error('rpc down'))

    render(<MaterializeFutureContentPage />)

    expect(await screen.findByText('twitter:uid:12345:111')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Claim my content tokens' })).toHaveLength(2)
    })
  })
})
