import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { shouldPageDonor } from '../src/spendFlagNotifier.js'

describe('spend flag notifier', function () {
  it('pages once per note and schedule nonce', function () {
    const seen = new Set<string>()
    const first = { noteId: '4', nonce: '1' }
    assert.equal(shouldPageDonor(seen, first), true)
    assert.equal(shouldPageDonor(seen, first), false)
    assert.equal(shouldPageDonor(seen, { noteId: '4', nonce: '2' }), true)
    assert.equal(shouldPageDonor(seen, { noteId: '5', nonce: '1' }), true)
  })
})
