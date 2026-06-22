import { describe, expect, it } from 'vitest'
import { KEEP_ACCEPTING_DEFAULT_SUPPLY, formatCurrencyAmount, formatTokenCapacityPreviewRows, hasOneUnitDonationOption, parseDecimalAmount, suggestGivingLevels, summarizeProjectTokenCapacity } from './projectCreation'

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

  it('suggests giving levels and sizes the $1 supply to exactly stop at the goal', () => {
    const suggested = suggestGivingLevels([
      { tokenId: '0', supply: '', price: '1', name: '$1 Donation' },
    ], '250', true, 6)

    expect(suggested).toMatchObject([
      { tokenId: '0', supply: '75', price: '1', name: '$1 Donation' },
      { tokenId: '1', supply: '1', price: '25', name: '$25 Supporter' },
      { tokenId: '2', supply: '1', price: '50', name: '$50 Supporter' },
      { tokenId: '3', supply: '1', price: '100', name: '$100 Supporter' },
    ])
    expect(summarizeProjectTokenCapacity(suggested, 6).totalCapacity).toBe(250_000_000n)
  })

  it('omits suggested tiers that would make stop-at-goal capacity exceed a small goal', () => {
    const suggested = suggestGivingLevels([
      { tokenId: '0', supply: '', price: '1', name: '$1 Donation' },
    ], '100', true, 6)

    expect(suggested).toMatchObject([
      { tokenId: '0', supply: '25', price: '1', name: '$1 Donation' },
      { tokenId: '1', supply: '1', price: '25', name: '$25 Supporter' },
      { tokenId: '2', supply: '1', price: '50', name: '$50 Supporter' },
    ])
    expect(summarizeProjectTokenCapacity(suggested, 6).totalCapacity).toBe(100_000_000n)
  })

  it('uses high visible supplies when the creator keeps accepting after the goal', () => {
    const suggested = suggestGivingLevels([
      { tokenId: '0', supply: '', price: '1', name: '$1 Donation' },
    ], '250', false, 6)

    expect(suggested.map(token => token.supply)).toEqual([
      KEEP_ACCEPTING_DEFAULT_SUPPLY,
      KEEP_ACCEPTING_DEFAULT_SUPPLY,
      KEEP_ACCEPTING_DEFAULT_SUPPLY,
      KEEP_ACCEPTING_DEFAULT_SUPPLY,
    ])
  })

  it('detects whether a small $1 denomination is present', () => {
    expect(hasOneUnitDonationOption([{ tokenId: '0', supply: '1', price: '1' }], 6)).toBe(true)
    expect(hasOneUnitDonationOption([{ tokenId: '0', supply: '1', price: '25' }], 6)).toBe(false)
  })
})
