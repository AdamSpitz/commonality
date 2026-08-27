import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateBelieverSets } from '../lib/believerSetsCache'
import { useViewCounts } from './useViewCounts'

const mockMachinery = {}
vi.mock('@ui/shared', () => ({
  useMachinery: () => mockMachinery,
}))

vi.mock('@commonality/sdk/conceptspace', () => ({
  getStatementBelieverSets: vi.fn(),
  computeViewCounts: vi.fn(() => ({
    union: { direct: 0, indirect: 0, total: 0 },
    conjunction: { signedAll: 0, noneDisagreed: 0 },
  })),
}))

import { getStatementBelieverSets } from '@commonality/sdk/conceptspace'

const CID = 'bafytest'
const EMPTY_SETS = {
  statementCid: CID,
  directBelieverIds: new Set(),
  indirectBelieverIds: new Set(),
  disbelieverIds: new Set(),
}

describe('useViewCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // The believer-set cache outlives any one hook mount by design, so each
    // test has to start from an empty one or it reads the previous test's sets.
    invalidateBelieverSets()
    vi.mocked(getStatementBelieverSets).mockResolvedValue(EMPTY_SETS as any)
  })

  it('passes normalized trusted implication attesters to each SDK query', async () => {
    renderHook(() => useViewCounts(
      [CID],
      [CID],
      ['0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    ))

    await waitFor(() => expect(getStatementBelieverSets).toHaveBeenCalledWith(
      mockMachinery,
      CID,
      [
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      ],
    ))
  })

  it('does not query while trust inputs are not ready', async () => {
    renderHook(() => useViewCounts([CID], [CID], undefined, false))

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getStatementBelieverSets).not.toHaveBeenCalled()
  })

  it('keeps prior sets when temporarily disabled instead of blanking the UI', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useViewCounts([CID], [CID], undefined, enabled),
      { initialProps: { enabled: true } },
    )

    await waitFor(() => expect(result.current.perPlank.size).toBe(1))
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.perPlank.size).toBe(1)
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(1)
  })

  it('clears stale sets and exposes SDK query failures', async () => {
    vi.mocked(getStatementBelieverSets).mockRejectedValue(new Error('event cache unavailable'))
    const { result } = renderHook(() => useViewCounts([CID], [CID]))

    await waitFor(() => expect(result.current.error).toBe('event cache unavailable'))
    expect(result.current.counts).toBeUndefined()
    expect(result.current.perPlank.size).toBe(0)
  })
})
