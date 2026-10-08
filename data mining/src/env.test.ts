import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  googleCseConfigured,
  normalizeKeyAliases,
  xaiApiKey,
  xBearerToken,
} from './env.js'

describe('normalizeKeyAliases', () => {
  it('maps grok_api_key onto XAI_API_KEY', () => {
    const env: NodeJS.ProcessEnv = { grok_api_key: 'from-grok-file' }
    normalizeKeyAliases(env)
    assert.equal(env.XAI_API_KEY, 'from-grok-file')
  })

  it('maps GROK_API_KEY onto XAI_API_KEY', () => {
    const env: NodeJS.ProcessEnv = { GROK_API_KEY: 'upper' }
    normalizeKeyAliases(env)
    assert.equal(env.XAI_API_KEY, 'upper')
  })

  it('does not override an existing XAI_API_KEY', () => {
    const env: NodeJS.ProcessEnv = { XAI_API_KEY: 'already-set', grok_api_key: 'from-file' }
    normalizeKeyAliases(env)
    assert.equal(env.XAI_API_KEY, 'already-set')
  })

  it('maps X_API_BEARER_TOKEN onto X_BEARER_TOKEN', () => {
    const env: NodeJS.ProcessEnv = { X_API_BEARER_TOKEN: 'x-token' }
    normalizeKeyAliases(env)
    assert.equal(env.X_BEARER_TOKEN, 'x-token')
  })
})

describe('key helpers', () => {
  it('reads xAI key from any alias without mutating', () => {
    assert.equal(xaiApiKey({ grok_api_key: 'alias' }), 'alias')
    assert.equal(xaiApiKey({}), undefined)
  })

  it('reads X bearer from either name', () => {
    assert.equal(xBearerToken({ X_API_BEARER_TOKEN: 'tok' }), 'tok')
    assert.equal(xBearerToken({}), undefined)
  })

  it('requires both Google CSE vars', () => {
    assert.equal(googleCseConfigured({ GOOGLE_API_KEY: 'k' }), false)
    assert.equal(googleCseConfigured({ GOOGLE_API_KEY: 'k', GOOGLE_CSE_ID: 'cx' }), true)
  })
})
