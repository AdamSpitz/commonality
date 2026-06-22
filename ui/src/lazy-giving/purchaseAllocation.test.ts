import { describe, expect, it } from 'vitest'
import { allocatePurchaseAmount } from './purchaseAllocation'

const UNIT = 1_000_000_000_000_000_000n
const dollars = (amount: number) => BigInt(amount) * UNIT

describe('allocatePurchaseAmount', () => {
  it('allocates an exact arbitrary amount when a $1 option is present', () => {
    const result = allocatePurchaseAmount([
      { tokenId: '1', price: dollars(1) },
      { tokenId: '2', price: dollars(25) },
      { tokenId: '3', price: dollars(100) },
    ], dollars(37))

    expect(result.status).toBe('exact')
    expect(result.totalCost).toBe(dollars(37))
    expect(result.tokenIds).toEqual([2n, 1n])
    expect(result.tokenCounts).toEqual([1n, 12n])
  })

  it('snaps down to a reachable fixed-tier amount when exact allocation is impossible', () => {
    const result = allocatePurchaseAmount([
      { tokenId: '10', price: dollars(20) },
      { tokenId: '11', price: dollars(50) },
    ], dollars(35))

    expect(result.status).toBe('snapped')
    expect(result.totalCost).toBe(dollars(20))
    expect(result.tokenIds).toEqual([10n])
    expect(result.tokenCounts).toEqual([1n])
    expect(result.message).toMatch(/snapped/i)
  })

  it('adds selected reward tiers first and fills the remaining amount with the small token', () => {
    const result = allocatePurchaseAmount([
      { tokenId: '1', price: dollars(1) },
      { tokenId: '2', price: dollars(25) },
      { tokenId: '3', price: dollars(100) },
    ], dollars(137), { addOns: { '3': 1 } })

    expect(result.status).toBe('exact')
    expect(result.totalCost).toBe(dollars(137))
    expect(result.tokenIds).toEqual([3n, 2n, 1n])
    expect(result.tokenCounts).toEqual([1n, 1n, 12n])
  })

  it('respects sold-out or zero-availability token types', () => {
    const result = allocatePurchaseAmount([
      { tokenId: '1', price: dollars(1), availableCount: 0 },
      { tokenId: '2', price: dollars(25), availableCount: 2 },
      { tokenId: '3', price: dollars(100), availableCount: 0 },
    ], dollars(60))

    expect(result.status).toBe('snapped')
    expect(result.totalCost).toBe(dollars(50))
    expect(result.tokenIds).toEqual([2n])
    expect(result.tokenCounts).toEqual([2n])
  })

  it('returns impossible when no available option can fit the requested amount', () => {
    const result = allocatePurchaseAmount([
      { tokenId: '1', price: dollars(20), availableCount: 0 },
      { tokenId: '2', price: dollars(50) },
    ], dollars(10))

    expect(result.status).toBe('impossible')
    expect(result.totalCost).toBe(0n)
    expect(result.tokenIds).toEqual([])
    expect(result.message).toMatch(/No available contribution option/i)
  })
})
