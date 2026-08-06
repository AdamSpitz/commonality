import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { heuristicCheckItem } from './heuristicSafety.js'

describe('heuristicSafety', () => {
  it('allows ordinary public-goods text', () => {
    const result = heuristicCheckItem({
      text: 'We will fund evening library hours for working families.',
    })
    assert.equal(result, null)
  })

  it('flags email PII', () => {
    const result = heuristicCheckItem({
      text: 'Contact the organizer at jane@example.com for details.',
    })
    assert.ok(result)
    assert.equal(result!.allowed, false)
    assert.equal(result!.category, 'doxxing_or_pii')
  })

  it('flags obvious scam language', () => {
    const result = heuristicCheckItem({
      text: 'Join our ponzi for guaranteed 50% return every week.',
    })
    assert.ok(result)
    assert.equal(result!.category, 'fraud_or_scam')
  })
})
