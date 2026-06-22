import { describe, expect, it } from 'vitest'
import { formatCurrencyAmount, formatTokenCapacityPreviewRows, parseDecimalAmount, summarizeProjectTokenCapacity } from './projectCreation'

describe('project creation token capacity helpers', () => {
  it('parses decimal payment amounts exactly at the configured precision', () => {
    expect(parseDecimalAmount('12.34', 6)).toBe(12_340_000n)
    expect(parseDecimalAmount('0.000001', 6)).toBe(1n)
    expect(parseDecimalAmount('1.0000001', 6)).toBeNull()
    expect(parseDecimalAmount('abc', 6)).toBeNull()
  })

  it('sums capacity across multiple token types without floating point rounding', () => {
    const summary = summarizeProjectTokenCapacity([
      { tokenId: '0', supply: '3', price: '0.10', name: 'Small gift' },
      { tokenId: '1', supply: '2', price: '1.25', name: 'Supporter' },
      { tokenId: '2', supply: '10', price: '0.05' },
    ], 6)

    expect(summary.totalCapacity).toBe(3_300_000n)
    expect(summary.rows.map(row => row.capacity)).toEqual([300_000n, 2_500_000n, 500_000n])
  })

  it('detects the smallest positive denomination', () => {
    const summary = summarizeProjectTokenCapacity([
      { tokenId: '0', supply: '100', price: '25' },
      { tokenId: '1', supply: '100', price: '1' },
      { tokenId: '2', supply: '100', price: '5' },
    ], 6)

    expect(summary.smallestPrice).toBe(1_000_000n)
  })

  it('ignores incomplete rows in totals while preserving preview rows', () => {
    const summary = summarizeProjectTokenCapacity([
      { tokenId: '0', supply: '', price: '1' },
      { tokenId: '1', supply: '10', price: '' },
      { tokenId: '2', supply: '2', price: '2.50' },
    ], 6)

    expect(summary.totalCapacity).toBe(5_000_000n)
    expect(summary.rows[0].capacity).toBeNull()
    expect(summary.rows[1].capacity).toBeNull()
    expect(summary.rows[2].capacity).toBe(5_000_000n)
  })

  it('formats preview rows for display', () => {
    expect(formatTokenCapacityPreviewRows([
      { tokenId: '0', supply: '3', price: '1.50', name: 'Donation' },
      { tokenId: '1', supply: '', price: 'bad' },
    ], 6, 'USDC')).toEqual([
      'Donation: 3 × 1.5 USDC = 4.5 USDC',
      'Token #1: — × — = —',
    ])
  })

  it('formats currency amounts without unnecessary trailing zeroes', () => {
    expect(formatCurrencyAmount(10_000_000n, 6, 'USDC')).toBe('10 USDC')
    expect(formatCurrencyAmount(10_500_000n, 6, 'USDC')).toBe('10.5 USDC')
    expect(formatCurrencyAmount(1n, 6, 'USDC')).toBe('0.000001 USDC')
  })
})
