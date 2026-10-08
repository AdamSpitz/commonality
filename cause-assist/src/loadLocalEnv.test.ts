import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, it } from 'mocha'
import { loadLocalEnv, normalizeGrokApiKeyAliases } from './loadLocalEnv.js'

describe('loadLocalEnv', () => {
  it('loads grok_api_key from .env.grok and normalizes to XAI_API_KEY', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cause-assist-env-'))
    writeFileSync(path.join(root, '.env.grok'), 'grok_api_key=secret-from-grok-file\n')
    const env: NodeJS.ProcessEnv = {}
    const { loaded } = loadLocalEnv({ env, root, includeRootEnv: false })
    assert.ok(loaded.some((p) => p.endsWith('.env.grok')))
    assert.equal(env.grok_api_key, 'secret-from-grok-file')
    assert.equal(env.XAI_API_KEY, 'secret-from-grok-file')
  })

  it('does not override an existing XAI_API_KEY', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cause-assist-env-'))
    writeFileSync(path.join(root, '.env.grok'), 'grok_api_key=from-file\n')
    const env: NodeJS.ProcessEnv = { XAI_API_KEY: 'already-set' }
    loadLocalEnv({ env, root, includeRootEnv: false })
    assert.equal(env.XAI_API_KEY, 'already-set')
  })

  it('normalizeGrokApiKeyAliases maps GROK_API_KEY', () => {
    const env: NodeJS.ProcessEnv = { GROK_API_KEY: 'upper' }
    normalizeGrokApiKeyAliases(env)
    assert.equal(env.XAI_API_KEY, 'upper')
  })
})
