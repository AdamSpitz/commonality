import { describe, it, expect } from 'vitest'
import { humanizeTxError } from './txError'

describe('humanizeTxError', () => {
  it('maps a MetaMask user-denied error to a calm cancel message', () => {
    const err = new Error('MetaMask Tx Signature: User denied transaction signature.')
    expect(humanizeTxError(err, 'fallback')).toMatch(/cancelled the transaction/i)
  })

  it('recognizes viem-style ACTION_REJECTED / code 4001', () => {
    expect(humanizeTxError(new Error('User rejected the request. Details: code: 4001'), 'fallback'))
      .toMatch(/cancelled the transaction/i)
    expect(humanizeTxError({ shortMessage: 'User rejected the request.' }, 'fallback'))
      .toMatch(/cancelled the transaction/i)
  })

  it('maps insufficient-funds errors to a gas hint', () => {
    expect(humanizeTxError(new Error('insufficient funds for gas * price + value'), 'fallback'))
      .toMatch(/enough eth/i)
  })

  it('passes through an unrecognized revert reason unchanged', () => {
    expect(humanizeTxError(new Error('Tx reverted'), 'fallback')).toBe('Tx reverted')
  })

  it('prefers shortMessage, then message, on non-Error objects', () => {
    expect(humanizeTxError({ shortMessage: 'short', message: 'long' }, 'fallback')).toBe('short')
    expect(humanizeTxError({ message: 'long' }, 'fallback')).toBe('long')
  })

  it('falls back when the error carries no usable text', () => {
    expect(humanizeTxError(null, 'fallback')).toBe('fallback')
    expect(humanizeTxError({}, 'fallback')).toBe('fallback')
    expect(humanizeTxError(new Error(''), 'fallback')).toBe('fallback')
  })
})
