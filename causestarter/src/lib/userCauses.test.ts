import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listCauses } from './causeStore'
import { bookmarkSupportedCause, listUserCauses } from './userCauses'

vi.mock('@commonality/sdk/conceptspace', () => ({
  getUserBeliefs: vi.fn(),
}))

import { getUserBeliefs } from '@commonality/sdk/conceptspace'

describe('userCauses', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(getUserBeliefs).mockReset()
  })

  it('returns only local causes when no wallet address', async () => {
    const machinery = {} as any
    bookmarkSupportedCause({
      id: 'bafy1',
      cid: 'bafy1',
      statementType: '',
      title: 'Local only',
      excerpt: 'Local only goal',
      believerCount: 1,
      disbelieverCount: 0,
      createdAt: '',
    })

    const result = await listUserCauses(machinery, undefined)
    expect(result).toHaveLength(1)
    expect(getUserBeliefs).not.toHaveBeenCalled()
  })

  it('bookmarks on-chain beliefs not already local', async () => {
    const machinery = {} as any
    vi.mocked(getUserBeliefs).mockResolvedValue([
      {
        id: 'bafy-onchain',
        cid: 'bafy-onchain',
        statementType: '',
        title: 'Onchain cause',
        excerpt: 'I support safer streets.',
        believerCount: 3,
        disbelieverCount: 0,
        createdAt: '',
      },
    ])

    const result = await listUserCauses(machinery, '0xabc')
    expect(getUserBeliefs).toHaveBeenCalledWith(machinery, '0xabc')
    expect(result.some((c) => c.statementCid === 'bafy-onchain')).toBe(true)
    expect(listCauses().some((c) => c.statementCid === 'bafy-onchain')).toBe(true)
  })

  it('does not duplicate a local cause that already has the statementCid', async () => {
    const machinery = {} as any
    bookmarkSupportedCause({
      id: 'bafy-shared',
      cid: 'bafy-shared',
      statementType: '',
      title: 'Shared',
      excerpt: 'Already bookmarked',
      believerCount: 1,
      disbelieverCount: 0,
      createdAt: '',
    })
    const before = listCauses().length

    vi.mocked(getUserBeliefs).mockResolvedValue([
      {
        id: 'bafy-shared',
        cid: 'bafy-shared',
        statementType: '',
        title: 'Shared',
        excerpt: 'Already bookmarked',
        believerCount: 2,
        disbelieverCount: 0,
        createdAt: '',
      },
    ])

    const result = await listUserCauses(machinery, '0xabc')
    expect(result.filter((c) => c.statementCid === 'bafy-shared')).toHaveLength(1)
    expect(listCauses()).toHaveLength(before)
  })
})
