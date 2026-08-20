import { describe, expect, it } from 'vitest'
import { mapWithConcurrency } from './concurrency'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('mapWithConcurrency', () => {
  it('returns results in input order regardless of completion order', async () => {
    const results = await mapWithConcurrency([30, 10, 20], 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms))
      return ms
    })
    expect(results).toEqual([30, 10, 20])
  })

  it('never runs more than the limit at once', async () => {
    let inFlight = 0
    let peak = 0
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 3, async (i) => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
      return i
    })
    expect(peak).toBe(3)
  })

  it('starts a queued item as soon as a slot frees up', async () => {
    const gates = [deferred<number>(), deferred<number>(), deferred<number>()]
    const started: number[] = []
    const all = mapWithConcurrency([0, 1, 2], 2, async (i) => {
      started.push(i)
      return gates[i].promise
    })

    await Promise.resolve()
    expect(started).toEqual([0, 1])

    gates[0].resolve(0)
    await Promise.resolve()
    await Promise.resolve()
    expect(started).toEqual([0, 1, 2])

    gates[1].resolve(1)
    gates[2].resolve(2)
    expect(await all).toEqual([0, 1, 2])
  })

  it('rejects if any item rejects', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom')
        return n
      }),
    ).rejects.toThrow('boom')
  })

  it('handles an empty list and a limit wider than the list', async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([])
    expect(await mapWithConcurrency([1, 2], 99, async (n) => n * 2)).toEqual([2, 4])
  })
})
