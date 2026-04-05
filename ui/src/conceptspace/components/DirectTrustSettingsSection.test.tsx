import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DirectTrustSettingsSection } from './DirectTrustSettingsSection'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    TrustRegistryAbi: [],
    getDirectTrustMapping: vi.fn(),
    setTrust: vi.fn(),
  }
})

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: vi.fn(),
}))

vi.mock('../../shared/hooks/useTrustedSet', () => ({
  useTrustedSet: vi.fn(),
}))

vi.mock('../../shared/subjectivTrust', async () => {
  const actual = await vi.importActual('../../shared/subjectivTrust')
  return {
    ...actual,
    notifySubjectivTrustNetworkInvalidated: vi.fn(),
  }
})

import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { getDirectTrustMapping, setTrust } from '@commonality/sdk'
import { useMachinery } from '../../shared/hooks/useMachinery'
import { useTrustedSet } from '../../shared/hooks/useTrustedSet'
import { notifySubjectivTrustNetworkInvalidated } from '../../shared/subjectivTrust'

const USER_ADDRESS = '0x1111111111111111111111111111111111111111'
const TRUSTEE_ADDRESS = '0x2222222222222222222222222222222222222222'
const OTHER_TRUSTEE_ADDRESS = '0x3333333333333333333333333333333333333333'
const TRUST_REGISTRY_ADDRESS = '0x4444444444444444444444444444444444444444'

const mockMachinery = { eventCacheUrl: '/api', contractAddresses: { trustRegistry: TRUST_REGISTRY_ADDRESS } } as any
const mockRefreshTrustedSet = vi.fn()

describe('DirectTrustSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_TRUST_REGISTRY_CONTRACT_ADDRESS', TRUST_REGISTRY_ADDRESS)
    vi.mocked(useMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useAccount).mockReturnValue({
      address: USER_ADDRESS,
      isConnected: true,
    } as any)
    vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set<string>(),
      isLoading: false,
      error: null,
      refreshTrustedSet: mockRefreshTrustedSet,
    })
    vi.mocked(getDirectTrustMapping).mockResolvedValue(new Map())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('loads saved direct trust entries and shows current trust-network progress', async () => {
    vi.mocked(getDirectTrustMapping).mockResolvedValue(
      new Map([
        [TRUSTEE_ADDRESS, 90],
        [OTHER_TRUSTEE_ADDRESS, 40],
      ])
    )
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: new Set([TRUSTEE_ADDRESS, OTHER_TRUSTEE_ADDRESS]),
      isLoading: true,
      error: null,
      refreshTrustedSet: mockRefreshTrustedSet,
    })

    render(<DirectTrustSettingsSection />)

    await waitFor(() => {
      expect(screen.getByText(TRUSTEE_ADDRESS)).toBeInTheDocument()
      expect(screen.getByText(OTHER_TRUSTEE_ADDRESS)).toBeInTheDocument()
    })

    expect(screen.getByText('Trust score: 90')).toBeInTheDocument()
    expect(screen.getByText('Trust score: 40')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Building your transitive trust network... 2 trusted accounts found so far.'
      )
    ).toBeInTheDocument()
  })

  it('saves direct trust, invalidates the network, and reloads the entry list', async () => {
    const user = userEvent.setup()

    vi.mocked(getDirectTrustMapping)
      .mockResolvedValueOnce(new Map())
      .mockResolvedValueOnce(new Map([[TRUSTEE_ADDRESS, 75]]))

    render(<DirectTrustSettingsSection />)

    await waitFor(() => {
      expect(getDirectTrustMapping).toHaveBeenCalledTimes(1)
    })

    await user.type(screen.getByLabelText(/trusted user address/i), TRUSTEE_ADDRESS)
    await user.clear(screen.getByLabelText(/score/i))
    await user.type(screen.getByLabelText(/score/i), '75')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(setTrust).toHaveBeenCalledWith(
        expect.objectContaining({ account: USER_ADDRESS }),
        expect.objectContaining({ address: TRUST_REGISTRY_ADDRESS }),
        TRUSTEE_ADDRESS,
        75
      )
    })

    await waitFor(() => {
      expect(getDirectTrustMapping).toHaveBeenCalledTimes(2)
      expect(screen.getByText(TRUSTEE_ADDRESS)).toBeInTheDocument()
    })

    expect(screen.getByText('Direct trust updated')).toBeInTheDocument()
    expect(notifySubjectivTrustNetworkInvalidated).toHaveBeenCalledTimes(1)
  })

  it('supports refreshing and removing trust entries from the settings flow', async () => {
    const user = userEvent.setup()

    vi.mocked(getDirectTrustMapping).mockResolvedValue(
      new Map([[TRUSTEE_ADDRESS, 60]])
    )

    render(<DirectTrustSettingsSection />)

    await waitFor(() => {
      expect(screen.getByText(TRUSTEE_ADDRESS)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /refresh network/i }))
    expect(mockRefreshTrustedSet).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: `remove ${TRUSTEE_ADDRESS}` }))

    await waitFor(() => {
      expect(setTrust).toHaveBeenCalledWith(
        expect.objectContaining({ account: USER_ADDRESS }),
        expect.objectContaining({ address: TRUST_REGISTRY_ADDRESS }),
        TRUSTEE_ADDRESS,
        0
      )
    })

    expect(screen.getByText('Direct trust removed')).toBeInTheDocument()
    expect(notifySubjectivTrustNetworkInvalidated).toHaveBeenCalledTimes(1)
  })
})
