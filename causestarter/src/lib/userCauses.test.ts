import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listCauses, saveCause } from './causeStore'
import { listUserCauses, supportedCause } from './userCauses'

vi.mock('@commonality/sdk/conceptspace', () => ({
  getUserBeliefs: vi.fn(),
}))

import { getUserBeliefs, type StatementListItem } from '@commonality/sdk/conceptspace'

function belief(cid: string, title = cid): StatementListItem {
  return {
    id: cid,
    cid,
    statementType: '',
    title,
    excerpt: `${title} goal`,
    believerCount: 1,
    disbelieverCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('userCauses', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(getUserBeliefs).mockReset()
  })

  it('returns only local causes when no wallet address', async () => {
    saveCause({ goal: 'Local only goal', statements: [], levers: [], status: 'draft' })

    const result = await listUserCauses({} as any, undefined)
    expect(result).toHaveLength(1)
    expect(getUserBeliefs).not.toHaveBeenCalled()
  })

  it('unions on-chain beliefs ephemerally without persisting them', async () => {
    const machinery = {} as any
    vi.mocked(getUserBeliefs).mockResolvedValue([belief('bafy-onchain', 'Onchain cause')])

    const result = await listUserCauses(machinery, '0xabc')
    expect(getUserBeliefs).toHaveBeenCalledWith(machinery, '0xabc')
    expect(result.some((c) => c.statementCid === 'bafy-onchain')).toBe(true)
    expect(listCauses()).toEqual([])
  })

  it('does not leak one wallet beliefs into another wallet union', async () => {
    vi.mocked(getUserBeliefs)
      .mockResolvedValueOnce([belief('bafy-wallet-a')])
      .mockResolvedValueOnce([belief('bafy-wallet-b')])

    const walletA = await listUserCauses({} as any, '0xaaa')
    const walletB = await listUserCauses({} as any, '0xbbb')

    expect(walletA.map((c) => c.statementCid)).toEqual(['bafy-wallet-a'])
    expect(walletB.map((c) => c.statementCid)).toEqual(['bafy-wallet-b'])
    expect(listCauses()).toEqual([])
  })

  it('dedupes beliefs against every local primary and supporting CID', async () => {
    saveCause({
      goal: 'A local cause long enough',
      statements: [],
      levers: [],
      status: 'launched',
      statementCid: 'bafy-primary',
      statementCids: ['bafy-supporting'],
    })
    vi.mocked(getUserBeliefs).mockResolvedValue([
      belief('bafy-primary'),
      belief('bafy-supporting'),
      belief('bafy-new'),
      belief('bafy-new'),
    ])

    const result = await listUserCauses({} as any, '0xabc')
    expect(result).toHaveLength(2)
    expect(result.filter((c) => c.statementCid === 'bafy-primary')).toHaveLength(1)
    expect(result.filter((c) => c.statementCid === 'bafy-new')).toHaveLength(1)
    expect(result.some((c) => c.statementCid === 'bafy-supporting')).toBe(false)
    expect(listCauses()).toHaveLength(1)
  })

  it('builds stable synthetic entries without storage writes', () => {
    const result = supportedCause(belief('bafy-supported', 'Supported title'))

    expect(result.id).toBe('supported:bafy-supported')
    expect(result.statementCid).toBe('bafy-supported')
    expect(result.status).toBe('launched')
    expect(listCauses()).toEqual([])
  })
})
