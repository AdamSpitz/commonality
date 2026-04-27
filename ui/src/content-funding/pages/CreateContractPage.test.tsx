import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseEther } from 'viem'
import { CreateContractPage } from './CreateContractPage'
import type { ContentFundingState } from '@commonality/sdk'

const VERIFIED_CHANNEL_ID = 'twitter:uid:12345678'
const OTHER_CHANNEL_ID = 'twitter:uid:87654321'
const USER_ADDRESS = '0x1111111111111111111111111111111111111111'
const FACTORY_ADDRESS = '0x2222222222222222222222222222222222222222'
const CONTRACT_ADDRESS = '0x3333333333333333333333333333333333333333'
const CONTENT_URL = 'https://x.com/alice/status/18347'

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('../hooks/useContentFundingState', () => ({
  useContentFundingState: vi.fn(),
}))

vi.mock('../hooks/usePlatformApi', () => ({
  usePlatformApi: vi.fn(),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createContentFundingContract: vi.fn(),
    getThirdPartyMinPurchase: vi.fn(),
    uploadToIPFS: vi.fn().mockResolvedValue('bafkriptest123'),
  }
})

import { useNavigate, useParams } from 'react-router-dom'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { createContentFundingContract, getThirdPartyMinPurchase, hashCanonicalId } from '@commonality/sdk'
import { useContentFundingState } from '../hooks/useContentFundingState'
import { usePlatformApi } from '../hooks/usePlatformApi'

function makeState(overrides?: {
  channelState?: 'unclaimed' | 'verified' | 'creator-controlled'
  owner?: string | null
  registeredCanonicalIds?: string[]
}): ContentFundingState {
  const channelHash = hashCanonicalId(VERIFIED_CHANNEL_ID)
  const items = new Map<bigint, { contentId: bigint; contractAddress: string; canonicalId: string; status: 'active' | 'released' }>()

  for (const canonicalId of overrides?.registeredCanonicalIds ?? []) {
    items.set(BigInt(hashCanonicalId(canonicalId)), {
      contentId: BigInt(hashCanonicalId(canonicalId)),
      canonicalId,
      contractAddress: CONTRACT_ADDRESS.toLowerCase(),
      status: 'active',
    })
  }

  return {
    contentRegistry: { items },
    channelRegistry: {
      channels: new Map([
        [channelHash, {
          channelId: channelHash,
          owner: overrides?.owner ?? USER_ADDRESS,
          state: overrides?.channelState ?? 'verified',
          controlTakenAt: null,
        }],
      ]),
    },
    channelEscrow: { balances: new Map() },
    creatorContracts: { contracts: new Map() },
  }
}

function makeResolvedContent(overrides?: Partial<{
  channelId: string
  canonicalId: string
}>): { channelId: string; canonicalId: string; metadata: Record<string, unknown> } {
  return {
    channelId: overrides?.channelId ?? VERIFIED_CHANNEL_ID,
    canonicalId: overrides?.canonicalId ?? `${VERIFIED_CHANNEL_ID}:18347`,
    metadata: { authorHandle: '@alice' },
  }
}

function futureDeadline() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

describe('CreateContractPage', () => {
  const navigate = vi.fn()
  const walletClient = { account: { address: USER_ADDRESS } }
  const publicClient = {}
  const resolveContent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ platform: 'twitter', channelId: encodeURIComponent(VERIFIED_CHANNEL_ID) } as any)
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useAccount).mockReturnValue({ address: USER_ADDRESS, isConnected: true } as any)
    vi.mocked(useWalletClient).mockReturnValue({ data: walletClient } as any)
    vi.mocked(usePublicClient).mockReturnValue(publicClient as any)
    vi.mocked(useContentFundingState).mockReturnValue({
      state: makeState(),
      vetoedEvents: [],
      projects: [],
      channels: [],
      contentAttestations: new Map(),
      loading: false,
      error: null,
      machinery: {
        indexerUrl: 'http://localhost:3000/graphql',
        ipfsConfig: { gatewayUrl: 'https://ipfs.io/ipfs', apiUrl: '', shouldUseMock: false, debugIpfs: false },
        testConfig: { areWeJustRunningTests: true },
      },
    })
    vi.mocked(usePlatformApi).mockReturnValue({
      resolveChannel: vi.fn(),
      resolveContent,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
    })
    vi.mocked(createContentFundingContract).mockResolvedValue({
      contractDetails: { contractAddress: CONTRACT_ADDRESS },
    } as any)
    vi.mocked(getThirdPartyMinPurchase).mockResolvedValue(parseEther('2'))
    import.meta.env.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS = FACTORY_ADDRESS
  })

  async function fillFormWithResolvedContent(
    resolved = makeResolvedContent(),
    expectedStatusText = 'Verified author: @alice',
  ) {
    const user = userEvent.setup()
    resolveContent.mockResolvedValue(resolved)

    render(<CreateContractPage />)

    await user.clear(screen.getByLabelText('Content URL'))
    await user.type(screen.getByLabelText('Content URL'), CONTENT_URL)

    await waitFor(() => {
      expect(screen.getByText(expectedStatusText)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Deadline'), futureDeadline())
    return user
  }

  it('submits verified channels as creator contracts without third-party purchase checks', async () => {
    const user = await fillFormWithResolvedContent()

    await user.click(screen.getByRole('button', { name: 'Create Contract' }))

    await waitFor(() => {
      expect(createContentFundingContract).toHaveBeenCalledTimes(1)
    })

    expect(getThirdPartyMinPurchase).not.toHaveBeenCalled()
    expect(createContentFundingContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ address: FACTORY_ADDRESS }),
      expect.objectContaining({
        channelCanonicalId: VERIFIED_CHANNEL_ID,
        isThirdParty: false,
        contentUrls: [CONTENT_URL],
      }),
    )

    expect(await screen.findByText('Contract created successfully!')).toBeInTheDocument()
  }, 10000)

  it('blocks submission when resolved content belongs to a different channel', async () => {
    const user = await fillFormWithResolvedContent(makeResolvedContent({
      channelId: OTHER_CHANNEL_ID,
      canonicalId: `${OTHER_CHANNEL_ID}:18347`,
    }))

    await user.click(screen.getByRole('button', { name: 'Create Contract' }))

    expect(await screen.findByText(`Some content items belong to different channels. All content must belong to @12345678.`)).toBeInTheDocument()
    expect(createContentFundingContract).not.toHaveBeenCalled()
  }, 10000)

  it('blocks submission when the content item is already registered in an active contract', async () => {
    const registeredCanonicalId = `${VERIFIED_CHANNEL_ID}:18347`
    vi.mocked(useContentFundingState).mockReturnValue({
      state: makeState({ registeredCanonicalIds: [registeredCanonicalId] }),
      vetoedEvents: [],
      projects: [],
      channels: [],
      contentAttestations: new Map(),
      loading: false,
      error: null,
      machinery: {
        indexerUrl: 'http://localhost:3000/graphql',
        ipfsConfig: { gatewayUrl: 'https://ipfs.io/ipfs', apiUrl: '', shouldUseMock: false, debugIpfs: false },
        testConfig: { areWeJustRunningTests: true },
      },
    })

    const user = await fillFormWithResolvedContent(
      makeResolvedContent({
        canonicalId: registeredCanonicalId,
      }),
      'Already registered in an active contract',
    )

    await user.click(screen.getByRole('button', { name: 'Create Contract' }))

    expect(
      await screen.findByText(`The following content items are already registered in active contracts: ${CONTENT_URL}`),
    ).toBeInTheDocument()
    expect(createContentFundingContract).not.toHaveBeenCalled()
  }, 10000)

  it('enforces the third-party minimum purchase for unclaimed channels', async () => {
    vi.mocked(useContentFundingState).mockReturnValue({
      state: makeState({ channelState: 'unclaimed', owner: null }),
      vetoedEvents: [],
      projects: [],
      channels: [],
      contentAttestations: new Map(),
      loading: false,
      error: null,
      machinery: {
        indexerUrl: 'http://localhost:3000/graphql',
        ipfsConfig: { gatewayUrl: 'https://ipfs.io/ipfs', apiUrl: '', shouldUseMock: false, debugIpfs: false },
        testConfig: { areWeJustRunningTests: true },
      },
    })

    const user = await fillFormWithResolvedContent()

    await user.click(screen.getByRole('button', { name: 'Create Contract' }))

    expect(await screen.findByText('Third-party contracts require at least 2 ETH initial purchase')).toBeInTheDocument()
    expect(getThirdPartyMinPurchase).toHaveBeenCalledTimes(1)
    expect(createContentFundingContract).not.toHaveBeenCalled()
  }, 10000)
})
