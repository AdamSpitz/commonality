import { describe, expect, it } from 'vitest'
import { spendClassLabel } from '../spendClass'

describe('spendClassLabel', () => {
  it('names the two classes the contract can return', () => {
    expect(spendClassLabel(1)).toBe('Unsuspicious')
    expect(spendClassLabel(0)).toBe('Unmarked')
  })
})