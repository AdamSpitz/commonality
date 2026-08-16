import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCauseProjects } from './useCauseProjects'

const mockMachinery = {}
vi.mock('../lib/useMachinery', () => ({
  useMachinery: () => mockMachinery,
}))

vi.mock('@commonality/sdk/fundingportals', () => ({
  getAllAlignedProjectsForCause: vi.fn(),
  foldAlignedProjectFunding: vi.fn(),
}))

const contentState = {
  channels: [] as unknown[],
  contentAttestations: new Map(),
  loading: false,
}
vi.mock('@ui/content-funding', async () => {
  const actual = await vi.importActual<typeof import('@ui/content-funding')>('@ui/content-funding')
  return {
    ...actual,
    useContentFundingState: () => contentState,
  }
})

const trustedContentState = { addresses: [] as string[] }
vi.mock('@ui/shared', async () => {
  const actual = await vi.importActual<typeof import('@ui/shared')>('@ui/shared')
  return {
    ...actual,
    useTrustedContentAttesters: () =>
      trustedContentState.addresses.map((address) => ({ address, kind: 'content-attester' as const })),
  }
})

import {
  foldAlignedProjectFunding,
  getAllAlignedProjectsForCause,
} from '@commonality/sdk/fundingportals'

const CID = 'bafytest'

describe('useCauseProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    contentState.channels = []
    contentState.contentAttestations = new Map()
    contentState.loading = false
    trustedContentState.addresses = []
    vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([])
    vi.mocked(foldAlignedProjectFunding).mockResolvedValue({
      totalReceived: [],
      remainingToThreshold: [],
      totalUnreimbursed: [],
    } as any)
  })

  it('passes normalized implication and alignment trust sets to the SDK query', async () => {
    renderHook(() => useCauseProjects(
      [CID],
      ['0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'],
      new Set(['0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA']),
    ))

    await waitFor(() => expect(getAllAlignedProjectsForCause).toHaveBeenCalledWith(
      mockMachinery,
      CID,
      ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
      ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    ))
  })

  it('does not query while trust inputs are not ready', async () => {
    renderHook(() => useCauseProjects([CID], undefined, undefined, false))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getAllAlignedProjectsForCause).not.toHaveBeenCalled()
  })

  it('keeps prior projects when temporarily disabled instead of blanking the list', async () => {
    vi.mocked(getAllAlignedProjectsForCause).mockResolvedValue([
      {
        projectAddress: '0x1111111111111111111111111111111111111111',
        alignmentType: 'direct',
      },
    ] as any)
    vi.mocked(foldAlignedProjectFunding).mockResolvedValue({
      totalReceived: [],
      remainingToThreshold: [],
      totalUnreimbursed: [],
    } as any)

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useCauseProjects([CID], undefined, undefined, enabled),
      { initialProps: { enabled: true } },
    )

    await waitFor(() => expect(result.current.projects).toHaveLength(1))
    expect(getAllAlignedProjectsForCause).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.projects).toHaveLength(1)
    expect(getAllAlignedProjectsForCause).toHaveBeenCalledTimes(1)
  })

  it('keeps configured-empty trust inputs unfiltered', async () => {
    renderHook(() => useCauseProjects([CID], [], new Set()))

    await waitFor(() => expect(getAllAlignedProjectsForCause).toHaveBeenCalledWith(
      mockMachinery,
      CID,
      undefined,
      undefined,
    ))
  })

  it('adds content-funding contracts that contain posts attested to a plank', async () => {
    contentState.channels = [{
      contracts: [{
        contractAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
        contentItems: [
          { canonicalId: 'twitter:uid:1:111' },
          { canonicalId: 'twitter:uid:1:222' },
        ],
        project: {
          totalReceived: '10',
          threshold: '100',
          deadline: '1',
          fundingCurrency: { symbol: 'ETH', decimals: 18 },
        },
      }],
    }]
    contentState.contentAttestations = new Map([
      ['twitter:uid:1:111', [{
        canonicalId: 'twitter:uid:1:111',
        attested: true,
        statementCid: CID,
        attester: '0x1',
        subjectId: 'x',
      }]],
    ])

    const { result } = renderHook(() => useCauseProjects([CID], [], new Set()))

    await waitFor(() => expect(result.current.projects).toHaveLength(1))
    expect(result.current.projects[0]?.projectAddress).toBe('0xcccccccccccccccccccccccccccccccccccccccc')
    expect(result.current.projects[0]?.alignedContentItemCount).toBe(1)
    expect(result.current.projects[0]?.contentItemCount).toBe(2)
  })

  it('excludes content contracts attested only by untrusted wallets', async () => {
    trustedContentState.addresses = ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']
    contentState.channels = [{
      contracts: [{
        contractAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
        contentItems: [{ canonicalId: 'twitter:uid:1:111' }],
        project: {
          totalReceived: '10',
          threshold: '100',
          deadline: '1',
          fundingCurrency: { symbol: 'ETH', decimals: 18 },
        },
      }],
    }]
    contentState.contentAttestations = new Map([
      ['twitter:uid:1:111', [{
        canonicalId: 'twitter:uid:1:111',
        attested: true,
        statementCid: CID,
        attester: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        subjectId: 'x',
      }]],
    ])

    const { result } = renderHook(() => useCauseProjects([CID], [], new Set()))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.projects).toHaveLength(0)
  })
})
