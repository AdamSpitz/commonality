import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isFailedCadenceResult,
  shouldSkipLocalStackCadenceCheck,
} from './deep-cadence-local-stack.mjs'

test('does not skip local stack checks until one has failed', () => {
  assert.equal(shouldSkipLocalStackCadenceCheck('stack.restart-consistency', false), false)
})

test('skips restart-consistency after a prior local stack failure', () => {
  assert.equal(shouldSkipLocalStackCadenceCheck('stack.restart-consistency', true), true)
})

test('does not skip testnet rollups after a local stack failure', () => {
  assert.equal(shouldSkipLocalStackCadenceCheck('testnet.environment', true), false)
})

test('treats skipped results as non-failures so cadence still reports the original fail', () => {
  assert.equal(isFailedCadenceResult({ checkId: 'stack.restart-consistency', code: 0, signal: null, status: 'skipped' }), false)
  assert.equal(isFailedCadenceResult({ checkId: 'stack.fresh-seeded', code: 1, signal: null, status: 'fail' }), true)
})
