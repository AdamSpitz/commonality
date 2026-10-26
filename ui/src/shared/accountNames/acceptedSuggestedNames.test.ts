import { beforeEach, describe, expect, it } from 'vitest'
import { acceptSuggestedName, loadAcceptedSuggestedName } from './acceptedSuggestedNames'

const address = '0x1234567890abcdef1234567890abcdef12345678'

describe('accepted suggested names', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores a trimmed name for the address on this browser', () => {
    acceptSuggestedName(address, '  Ada Lovelace  ')
    expect(loadAcceptedSuggestedName(address.toUpperCase())).toBe('Ada Lovelace')
  })

  it('ignores a blank name and corrupt storage', () => {
    acceptSuggestedName(address, '   ')
    expect(loadAcceptedSuggestedName(address)).toBeNull()
    localStorage.setItem('commonality:acceptedSuggestedNames', 'not-json')
    expect(loadAcceptedSuggestedName(address)).toBeNull()
  })
})
