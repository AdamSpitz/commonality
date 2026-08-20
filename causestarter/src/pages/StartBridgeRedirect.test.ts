import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetSeededBridgePathReuse, seededBridgePath } from './StartBridgeRedirect'

const createBridgePath = vi.hoisted(() => vi.fn())

vi.mock('../lib/bridgeStore', () => ({
  createBridgePath: (...args: unknown[]) => createBridgePath(...args),
}))

describe('seededBridgePath', () => {
  afterEach(() => {
    resetSeededBridgePathReuse()
    createBridgePath.mockReset()
    vi.useRealTimers()
  })

  it('reuses a mint for the same seed inside the StrictMode remount window', () => {
    createBridgePath.mockReturnValueOnce('/bridge/first').mockReturnValueOnce('/bridge/second')
    const seed = { owner: '0xabc', slug: 'neighbors', title: 'Neighbors' }
    expect(seededBridgePath(seed)).toBe('/bridge/first')
    expect(seededBridgePath(seed)).toBe('/bridge/first')
    expect(createBridgePath).toHaveBeenCalledTimes(1)
  })

  it('mints again after the reuse window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    createBridgePath.mockReturnValueOnce('/bridge/first').mockReturnValueOnce('/bridge/second')
    const seed = { owner: '0xabc', slug: 'neighbors', title: 'Neighbors' }
    expect(seededBridgePath(seed)).toBe('/bridge/first')
    vi.setSystemTime(1_000 + 501)
    expect(seededBridgePath(seed)).toBe('/bridge/second')
    expect(createBridgePath).toHaveBeenCalledTimes(2)
  })
})
