import { describe, it, expect } from 'vitest'
import { getProjectStatus, formatRelativeDeadline, computeUserTokenBalance, computeContributorStats, STATUS_COLORS, STATUS_LABELS } from './utils'
import type { Contribution, Refund, TokenBurn } from '@commonality/sdk/lazy-giving'
import { ETH_CURRENCY } from '@commonality/sdk/utils'

describe('getProjectStatus', () => {
  it('returns succeeded when totalReceived >= threshold', () => {
    expect(getProjectStatus({ totalReceived: '100', threshold: '100', deadline: '9999999999' })).toBe('succeeded')
    expect(getProjectStatus({ totalReceived: '200', threshold: '100', deadline: '9999999999' })).toBe('succeeded')
  })

  it('returns refunding when deadline passed and threshold not met', () => {
    const pastDeadline = Math.floor(Date.now() / 1000) - 100
    expect(getProjectStatus({ totalReceived: '50', threshold: '100', deadline: String(pastDeadline) })).toBe('refunding')
  })

  it('returns active when deadline not passed and threshold not met', () => {
    const futureDeadline = Math.floor(Date.now() / 1000) + 86400
    expect(getProjectStatus({ totalReceived: '50', threshold: '100', deadline: String(futureDeadline) })).toBe('active')
  })

  it('handles bigint inputs for totalReceived and threshold', () => {
    expect(getProjectStatus({ totalReceived: 100n, threshold: 100n, deadline: 9999999999n })).toBe('succeeded')
  })

  it('handles deadline exactly at now as active (uses < not <=)', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(getProjectStatus({ totalReceived: '50', threshold: '100', deadline: String(now) })).toBe('active')
  })
})

describe('STATUS_COLORS', () => {
  it('maps active to info', () => {
    expect(STATUS_COLORS.active).toBe('info')
  })

  it('maps succeeded to success', () => {
    expect(STATUS_COLORS.succeeded).toBe('success')
  })

  it('maps refunding to warning', () => {
    expect(STATUS_COLORS.refunding).toBe('warning')
  })
})

describe('STATUS_LABELS', () => {
  it('maps active to Funding', () => {
    expect(STATUS_LABELS.active).toBe('Funding')
  })

  it('maps succeeded to Succeeded', () => {
    expect(STATUS_LABELS.succeeded).toBe('Succeeded')
  })

  it('maps refunding to Refunding', () => {
    expect(STATUS_LABELS.refunding).toBe('Refunding')
  })
})

describe('formatRelativeDeadline', () => {
  it('returns Ended when deadline is in the past', () => {
    const past = Math.floor(Date.now() / 1000) - 100
    expect(formatRelativeDeadline(String(past))).toBe('Ended')
  })

  it('returns Ended when deadline is now', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(formatRelativeDeadline(String(now))).toBe('Ended')
  })

  it('returns minutes for deadlines under 1 hour', () => {
    const future = Math.floor(Date.now() / 1000) + 45 * 60
    expect(formatRelativeDeadline(String(future))).toBe('45m left')
  })

  it('returns hours and minutes for deadlines under 1 day', () => {
    const future = Math.floor(Date.now() / 1000) + 3 * 3600 + 20 * 60
    expect(formatRelativeDeadline(String(future))).toBe('3h 20m left')
  })

  it('returns days and hours for deadlines over 1 day', () => {
    const future = Math.floor(Date.now() / 1000) + 5 * 86400 + 3 * 3600
    expect(formatRelativeDeadline(String(future))).toBe('5d 3h left')
  })

  it('handles exactly 1 hour left', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    expect(formatRelativeDeadline(String(future))).toBe('1h 0m left')
  })

  it('handles exactly 1 day left', () => {
    const future = Math.floor(Date.now() / 1000) + 86400
    expect(formatRelativeDeadline(String(future))).toBe('1d 0h left')
  })
})

describe('computeUserTokenBalance', () => {
  const makeContribution = (overrides: Partial<Contribution> = {}): Contribution =>
    ({
      participant: '0xaaa',
      tokenIds: JSON.stringify(['1', '2']),
      tokenCounts: JSON.stringify(['10', '20']),
      currency: '0x0000000000000000000000000000000000000000',
      totalCost: '100',
      ...overrides,
    } as Contribution)

  const makeRefund = (overrides: Partial<Refund> = {}): Refund =>
    ({
      participant: '0xaaa',
      tokenIds: JSON.stringify(['1']),
      tokenCounts: JSON.stringify(['5']),
      currency: '0x0000000000000000000000000000000000000000',
      totalRefund: '50',
      ...overrides,
    } as Refund)

  const makeBurn = (overrides: Partial<TokenBurn> = {}): TokenBurn =>
    ({
      tokenIds: JSON.stringify(['2']),
      tokenCounts: JSON.stringify(['10']),
      ...overrides,
    } as TokenBurn)

  it('returns empty array when address is undefined', () => {
    expect(computeUserTokenBalance(undefined, [], [])).toEqual([])
  })

  it('returns empty array when address is empty string', () => {
    expect(computeUserTokenBalance('', [], [])).toEqual([])
  })

  it('returns empty array with no contributions', () => {
    expect(computeUserTokenBalance('0xaaa', [], [])).toEqual([])
  })

  it('computes balance from contributions', () => {
    const contributions = [makeContribution()]
    const result = computeUserTokenBalance('0xaaa', contributions, [])
    expect(result).toContainEqual({ tokenId: '1', count: 10n })
    expect(result).toContainEqual({ tokenId: '2', count: 20n })
  })

  it('reduces balance from refunds', () => {
    const contributions = [makeContribution()]
    const refunds = [makeRefund()]
    const result = computeUserTokenBalance('0xaaa', contributions, refunds)
    expect(result).toContainEqual({ tokenId: '1', count: 5n })
    expect(result).toContainEqual({ tokenId: '2', count: 20n })
  })

  it('reduces balance from burns', () => {
    const contributions = [makeContribution()]
    const burns = [makeBurn()]
    const result = computeUserTokenBalance('0xaaa', contributions, [], burns)
    expect(result).toContainEqual({ tokenId: '1', count: 10n })
    expect(result).toContainEqual({ tokenId: '2', count: 10n })
  })

  it('filters out tokens with zero balance', () => {
    const contributions = [makeContribution({ tokenIds: JSON.stringify(['1']), tokenCounts: JSON.stringify(['10']) })]
    const refunds = [makeRefund({ tokenIds: JSON.stringify(['1']), tokenCounts: JSON.stringify(['10']) })]
    const result = computeUserTokenBalance('0xaaa', contributions, refunds)
    expect(result).toEqual([])
  })

  it('filters out tokens with negative balance', () => {
    const contributions = [makeContribution({ tokenIds: JSON.stringify(['1']), tokenCounts: JSON.stringify(['5']) })]
    const refunds = [makeRefund({ tokenIds: JSON.stringify(['1']), tokenCounts: JSON.stringify(['10']) })]
    const result = computeUserTokenBalance('0xaaa', contributions, refunds)
    expect(result).toEqual([])
  })

  it('ignores contributions from other addresses', () => {
    const contributions = [makeContribution({ participant: '0xbbb' })]
    const result = computeUserTokenBalance('0xaaa', contributions, [])
    expect(result).toEqual([])
  })

  it('ignores refunds from other addresses', () => {
    const contributions = [makeContribution()]
    const refunds = [makeRefund({ participant: '0xbbb' })]
    const result = computeUserTokenBalance('0xaaa', contributions, refunds)
    expect(result).toContainEqual({ tokenId: '1', count: 10n })
    expect(result).toContainEqual({ tokenId: '2', count: 20n })
  })

  it('normalizes address to lowercase for matching', () => {
    const contributions = [makeContribution({ participant: '0xAAA' })]
    const result = computeUserTokenBalance('0xaaa', contributions, [])
    expect(result).toContainEqual({ tokenId: '1', count: 10n })
  })

  it('aggregates multiple contributions for same token', () => {
    const contributions = [
      makeContribution({ tokenIds: JSON.stringify(['1']), tokenCounts: JSON.stringify(['10']) }),
      makeContribution({ tokenIds: JSON.stringify(['1']), tokenCounts: JSON.stringify(['5']) }),
    ]
    const result = computeUserTokenBalance('0xaaa', contributions, [])
    expect(result).toContainEqual({ tokenId: '1', count: 15n })
  })

  it('handles empty burns array (default parameter)', () => {
    const contributions = [makeContribution()]
    const result = computeUserTokenBalance('0xaaa', contributions, [])
    expect(result).toContainEqual({ tokenId: '1', count: 10n })
    expect(result).toContainEqual({ tokenId: '2', count: 20n })
  })
})

describe('computeContributorStats', () => {
  const makeContribution = (overrides: Partial<Contribution> = {}): Contribution =>
    ({
      participant: '0xaaa',
      totalCost: '100',
      currency: '0x0000000000000000000000000000000000000000',
      ...overrides,
    } as Contribution)

  const makeRefund = (overrides: Partial<Refund> = {}): Refund =>
    ({
      participant: '0xaaa',
      totalRefund: '50',
      currency: '0x0000000000000000000000000000000000000000',
      ...overrides,
    } as Refund)

  it('returns empty array with no contributions', () => {
    expect(computeContributorStats([], [])).toEqual([])
  })

  it('aggregates contributions per address', () => {
    const contributions = [
      makeContribution({ totalCost: '100' }),
      makeContribution({ totalCost: '200' }),
    ]
    const result = computeContributorStats(contributions, [])
    expect(result).toHaveLength(1)
    expect(result[0].address).toBe('0xaaa')
    expect(result[0].contributed).toBe(300n)
    expect(result[0].refunded).toBe(0n)
    expect(result[0].net).toBe(300n)
  })

  it('aggregates refunds per address', () => {
    const contributions = [makeContribution({ totalCost: '100' })]
    const refunds = [
      makeRefund({ totalRefund: '30' }),
      makeRefund({ totalRefund: '20' }),
    ]
    const result = computeContributorStats(contributions, refunds)
    expect(result).toHaveLength(1)
    expect(result[0].refunded).toBe(50n)
    expect(result[0].net).toBe(50n)
  })

  it('filters out contributors with zero net (fully refunded)', () => {
    const contributions = [makeContribution({ totalCost: '100' })]
    const refunds = [makeRefund({ totalRefund: '100' })]
    const result = computeContributorStats(contributions, refunds)
    expect(result).toEqual([])
  })

  it('filters out contributors with negative net (over-refunded)', () => {
    const contributions = [makeContribution({ totalCost: '100' })]
    const refunds = [makeRefund({ totalRefund: '150' })]
    const result = computeContributorStats(contributions, refunds)
    expect(result).toEqual([])
  })

  it('sorts by net descending', () => {
    const contributions = [
      makeContribution({ participant: '0xaaa', totalCost: '100' }),
      makeContribution({ participant: '0xbbb', totalCost: '300' }),
      makeContribution({ participant: '0xccc', totalCost: '200' }),
    ]
    const result = computeContributorStats(contributions, [])
    expect(result.map(r => r.address)).toEqual(['0xbbb', '0xccc', '0xaaa'])
  })

  it('normalizes address to lowercase', () => {
    const contributions = [makeContribution({ participant: '0xAAA' })]
    const result = computeContributorStats(contributions, [])
    expect(result[0].address).toBe('0xaaa')
  })

  it('defaults currency to ETH_CURRENCY when null', () => {
    const contributions = [makeContribution({ currency: null as unknown as string })]
    const result = computeContributorStats(contributions, [])
    expect(result[0].currency).toEqual(ETH_CURRENCY)
  })

  it('handles multiple addresses separately', () => {
    const contributions = [
      makeContribution({ participant: '0xaaa', totalCost: '100' }),
      makeContribution({ participant: '0xbbb', totalCost: '200' }),
    ]
    const result = computeContributorStats(contributions, [])
    expect(result).toHaveLength(2)
    expect(result.find(r => r.address === '0xaaa')?.contributed).toBe(100n)
    expect(result.find(r => r.address === '0xbbb')?.contributed).toBe(200n)
  })

  it('handles refunds for different addresses', () => {
    const contributions = [
      makeContribution({ participant: '0xaaa', totalCost: '100' }),
      makeContribution({ participant: '0xbbb', totalCost: '200' }),
    ]
    const refunds = [makeRefund({ participant: '0xaaa', totalRefund: '50' })]
    const result = computeContributorStats(contributions, refunds)
    expect(result).toHaveLength(2)
    expect(result.find(r => r.address === '0xaaa')?.net).toBe(50n)
    expect(result.find(r => r.address === '0xbbb')?.net).toBe(200n)
  })
})
