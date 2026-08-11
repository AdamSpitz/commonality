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

import {
  foldAlignedProjectFunding,
  getAllAlignedProjectsForCause,
} from '@commonality/sdk/fundingportals'

const CID = 'bafytest'

describe('useCauseProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
