import { beforeEach, describe, expect, it, vi } from 'vitest'

const getStatementBelieverSets = vi.fn()

vi.mock('@commonality/sdk/conceptspace', () => ({
  getStatementBelieverSets: (...args: unknown[]) => getStatementBelieverSets(...args),
}))

const { invalidateBelieverSets, loadBelieverSets } = await import('./believerSetsCache')

const machinery = {} as never

function sets(cid: string) {
  return {
    statementCid: cid,
    directBelieverIds: new Set<string>(),
    indirectBelieverIds: new Set<string>(),
    disbelieverIds: new Set<string>(),
  }
}

describe('believer sets cache', () => {
  beforeEach(() => {
    invalidateBelieverSets()
    getStatementBelieverSets.mockReset()
    getStatementBelieverSets.mockImplementation(async (_m: unknown, cid: string) => sets(cid))
  })

  it('serves a second read for the same statement from cache', async () => {
    await loadBelieverSets(machinery, 'cid-a', undefined, '', 1000)
    await loadBelieverSets(machinery, 'cid-a', undefined, '', 1500)
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight query between concurrent callers', async () => {
    const [first, second] = await Promise.all([
      loadBelieverSets(machinery, 'cid-a', undefined, '', 1000),
      loadBelieverSets(machinery, 'cid-a', undefined, '', 1000),
    ])
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
  })

  it('refetches once the entry is older than the TTL', async () => {
    await loadBelieverSets(machinery, 'cid-a', undefined, '', 1000)
    await loadBelieverSets(machinery, 'cid-a', undefined, '', 1000 + 60_001)
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(2)
  })

  it('keys on the trusted attester list, because it changes the answer', async () => {
    await loadBelieverSets(machinery, 'cid-a', ['0xaa'], '0xaa', 1000)
    await loadBelieverSets(machinery, 'cid-a', ['0xbb'], '0xbb', 1000)
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failure', async () => {
    getStatementBelieverSets.mockRejectedValueOnce(new Error('indexer down'))
    await expect(loadBelieverSets(machinery, 'cid-a', undefined, '', 1000)).rejects.toThrow('indexer down')
    await loadBelieverSets(machinery, 'cid-a', undefined, '', 1000)
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(2)
  })

  it('invalidates only the named statements', async () => {
    await loadBelieverSets(machinery, 'cid-a', undefined, '', 1000)
    await loadBelieverSets(machinery, 'cid-b', undefined, '', 1000)
    invalidateBelieverSets(['cid-a'])
    await loadBelieverSets(machinery, 'cid-a', undefined, '', 1000)
    await loadBelieverSets(machinery, 'cid-b', undefined, '', 1000)
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(3)
  })

  it('invalidates a statement across every attester key it was cached under', async () => {
    await loadBelieverSets(machinery, 'cid-a', ['0xaa'], '0xaa', 1000)
    await loadBelieverSets(machinery, 'cid-a', ['0xbb'], '0xbb', 1000)
    invalidateBelieverSets(['cid-a'])
    await loadBelieverSets(machinery, 'cid-a', ['0xaa'], '0xaa', 1000)
    expect(getStatementBelieverSets).toHaveBeenCalledTimes(3)
  })
})
