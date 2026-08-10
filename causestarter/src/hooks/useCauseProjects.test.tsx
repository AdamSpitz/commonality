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
