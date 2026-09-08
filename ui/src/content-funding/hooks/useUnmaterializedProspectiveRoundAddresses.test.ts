import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUnmaterializedProspectiveRoundAddresses } from './useUnmaterializedProspectiveRoundAddresses'

vi.mock('@commonality/sdk/content-funding', async () => {
  const actual = await vi.importActual<typeof import('@commonality/sdk/content-funding')>(
    '@commonality/sdk/content-funding',
  )
  return {
    ...actual,
    getProspectiveRounds: vi.fn(),
  }
})

vi.mock('../../shared', async () => {
  const actual = await vi.importActual<typeof import('../../shared')>('../../shared')
  return { ...actual, useMachinery: () => ({}) }
})

import { getProspectiveRounds } from '@commonality/sdk/content-funding'

describe('useUnmaterializedProspectiveRoundAddresses', () => {
  beforeEach(() => {
    vi.mocked(getProspectiveRounds).mockResolvedValue([
      {
        round: '0x1111111111111111111111111111111111111111',
        channelIdHash: '0x00',
        receiptToken: '0x2222222222222222222222222222222222222222',
        receiptTokenId: 0n,
        condition: '0x3333333333333333333333333333333333333333',
        materializedToken: null,
        content: [],
      },
      {
        round: '0x4444444444444444444444444444444444444444',
        channelIdHash: '0x00',
        receiptToken: '0x5555555555555555555555555555555555555555',
        receiptTokenId: 0n,
        condition: '0x6666666666666666666666666666666666666666',
        materializedToken: '0x7777777777777777777777777777777777777777',
        content: [],
      },
    ] as Awaited<ReturnType<typeof getProspectiveRounds>>)
  })

  it('returns only rounds that have not materialized', async () => {
    const { result } = renderHook(() => useUnmaterializedProspectiveRoundAddresses())
    await waitFor(() => {
      expect(result.current).toEqual(['0x1111111111111111111111111111111111111111'])
    })
  })
})
