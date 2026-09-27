import { describe, expect, it } from 'vitest'
import { formatPendingSpendDeadline, hoursInputToSeconds, isSuspiciousClass, secondsToHourInput, spendClassLabel } from './spendClass'

describe('spend class labels', () => {
  it('names a listed payee, everyone else, and a class no rule produces yet', () => {
    expect(spendClassLabel(0)).toBe('Not on your list')
    expect(spendClassLabel(1)).toBe('On your list')
    expect(spendClassLabel(2)).toBe('Needs attention')
    expect(isSuspiciousClass(2)).toBe(true)
    expect(isSuspiciousClass(0)).toBe(false)
  })

  it('converts a delay between hours and seconds', () => {
    expect(secondsToHourInput(7200n)).toBe('2')
    expect(secondsToHourInput(5400n)).toBe('1.50')
    expect(hoursInputToSeconds('2')).toBe(7200n)
    expect(hoursInputToSeconds('1.5')).toBe(5400n)
    expect(hoursInputToSeconds('soon')).toBeNull()
    expect(hoursInputToSeconds('9'.repeat(309))).toBeNull()
    expect(hoursInputToSeconds('9'.repeat(306))).toBeNull()
  })

  it('describes a pending deadline as cancellable money, not raised', () => {
    const text = formatPendingSpendDeadline(1_700_000_000n, 1_600_000_000)
    expect(text).toContain('not counted as raised')
    expect(text).toContain('cancelled')
  })
})
