import { describe, it, expect } from 'vitest'
import { isEthNote, formatNoteAmount, truncateAddress, isDelegate } from './utils'

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    chainHash: '0xabc',
    amount: '1000000000000000000',
    token: ETH_ADDRESS,
    tokenType: 0,
    tokenId: '0',
    owner: '0x1111111111111111111111111111111111111111',
    rootOwner: '0x1111111111111111111111111111111111111111',
    active: true,
    createdAt: '1700000000',
    createdAtBlock: '100',
    updatedAt: '1700000000',
    ...overrides,
  } as any
}

describe('isEthNote', () => {
  it('returns true for zero-address token with tokenType 0', () => {
    expect(isEthNote(makeNote())).toBe(true)
  })

  it('returns true when token address is mixed case', () => {
    expect(isEthNote(makeNote({ token: '0x0000000000000000000000000000000000000000' }))).toBe(true)
  })

  it('returns false when token is not the zero address', () => {
    expect(isEthNote(makeNote({ token: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }))).toBe(false)
  })

  it('returns false when tokenType is not 0', () => {
    expect(isEthNote(makeNote({ tokenType: 1 }))).toBe(false)
  })

  it('returns false when both token and tokenType are wrong', () => {
    expect(isEthNote(makeNote({ token: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', tokenType: 1 }))).toBe(false)
  })
})

describe('formatNoteAmount', () => {
  it('formats ETH note as "<amount> ETH"', () => {
    expect(formatNoteAmount(makeNote({ amount: '1000000000000000000' }))).toBe('1 ETH')
  })

  it('formats fractional ETH correctly', () => {
    expect(formatNoteAmount(makeNote({ amount: '500000000000000000' }))).toBe('0.5 ETH')
  })

  it('formats zero ETH', () => {
    expect(formatNoteAmount(makeNote({ amount: '0' }))).toBe('0 ETH')
  })

  it('formats non-ETH note as "<amount> tokens"', () => {
    const note = makeNote({ token: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', amount: '42' })
    expect(formatNoteAmount(note)).toBe('42 tokens')
  })

  it('formats ERC-1155 note (tokenType 1) as tokens even with zero address', () => {
    const note = makeNote({ tokenType: 1, amount: '10' })
    expect(formatNoteAmount(note)).toBe('10 tokens')
  })
})

describe('truncateAddress', () => {
  it('truncates a standard 42-char address', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678'
    expect(truncateAddress(addr)).toBe('0x1234...5678')
  })

  it('preserves the first 6 characters', () => {
    const addr = '0xABCDEF1234567890abcdef1234567890abcdef12'
    expect(truncateAddress(addr).startsWith('0xABCD')).toBe(true)
  })

  it('preserves the last 4 characters', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678'
    expect(truncateAddress(addr).endsWith('5678')).toBe(true)
  })

  it('inserts "..." in the middle', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678'
    expect(truncateAddress(addr)).toContain('...')
  })
})

describe('isDelegate', () => {
  it('returns false when owner equals rootOwner', () => {
    const addr = '0x1111111111111111111111111111111111111111'
    expect(isDelegate(makeNote({ owner: addr, rootOwner: addr }))).toBe(false)
  })

  it('returns true when owner differs from rootOwner', () => {
    expect(isDelegate(makeNote({
      owner: '0x2222222222222222222222222222222222222222',
      rootOwner: '0x1111111111111111111111111111111111111111',
    }))).toBe(true)
  })

  it('is case-insensitive', () => {
    const lower = '0xabcdef1234567890abcdef1234567890abcdef12'
    const upper = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'
    expect(isDelegate(makeNote({ owner: lower, rootOwner: upper }))).toBe(false)
  })
})
