import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCause, isLive, listCauses, newPlank, updateCause } from './causeStore'
import { listUserCauses, supportedCause } from './userCauses'

vi.mock('@commonality/sdk/conceptspace', () => ({
  getUserBeliefs: vi.fn(),
}))

import { getUserBeliefs, type StatementListItem } from '@commonality/sdk/conceptspace'

function belief(cid: string, title = cid): StatementListItem {
  return {
    id: cid,
    cid: cid as `b${string}`,
    statementType: '',
    title,
    excerpt: `${title} goal`,
    believerCount: 1,
    disbelieverCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

/** CIDs of the planks a cause row is built from. */
function plankCids(cause: { planks: Array<{ cid?: string }> }): Array<string | undefined> {
  return cause.planks.map((plank) => plank.cid)
}

function localCauseWith(cids: string[]) {
  const created = createCause()
  return updateCause(created.id, {
    planks: cids.map((cid) => ({ ...newPlank(`Plank ${cid}`), cid })),
  })!
}

describe('userCauses', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(getUserBeliefs).mockReset()
  })

  it('returns only local causes when no wallet address', async () => {
    localCauseWith([])

    const result = await listUserCauses({} as any, undefined)
    expect(result).toHaveLength(1)
    expect(getUserBeliefs).not.toHaveBeenCalled()
  })

  it('unions on-chain beliefs ephemerally without persisting them', async () => {
    const machinery = {} as any
    vi.mocked(getUserBeliefs).mockResolvedValue([belief('bafy-onchain', 'Onchain cause')])

    const result = await listUserCauses(machinery, '0xabc')
    expect(getUserBeliefs).toHaveBeenCalledWith(machinery, '0xabc')
    expect(result.some((cause) => plankCids(cause).includes('bafy-onchain'))).toBe(true)
    expect(listCauses()).toEqual([])
  })

  it('does not leak one wallet beliefs into another wallet union', async () => {
    vi.mocked(getUserBeliefs)
      .mockResolvedValueOnce([belief('bafy-wallet-a')])
      .mockResolvedValueOnce([belief('bafy-wallet-b')])

    const walletA = await listUserCauses({} as any, '0xaaa')
    const walletB = await listUserCauses({} as any, '0xbbb')

    expect(walletA.flatMap(plankCids)).toEqual(['bafy-wallet-a'])
    expect(walletB.flatMap(plankCids)).toEqual(['bafy-wallet-b'])
    expect(listCauses()).toEqual([])
  })

  it('dedupes beliefs against every plank of a local cause', async () => {
    localCauseWith(['bafy-first', 'bafy-second'])
    vi.mocked(getUserBeliefs).mockResolvedValue([
      belief('bafy-first'),
      belief('bafy-second'),
      belief('bafy-new'),
      belief('bafy-new'),
    ])

    const result = await listUserCauses({} as any, '0xabc')
    // The local cause covers both of its planks; only the unrelated statement
    // becomes a separate row, and the duplicate of it collapses.
    expect(result).toHaveLength(2)
    expect(result.filter((cause) => plankCids(cause).includes('bafy-new'))).toHaveLength(1)
    expect(listCauses()).toHaveLength(1)
  })

  it('builds a supported statement as a one-plank cause without storage writes', () => {
    const result = supportedCause(belief('bafy-supported', 'Supported title'))

    expect(result.id).toBe('supported:bafy-supported')
    expect(plankCids(result)).toEqual(['bafy-supported'])
    expect(isLive(result)).toBe(true)
    expect(listCauses()).toEqual([])
  })
})
