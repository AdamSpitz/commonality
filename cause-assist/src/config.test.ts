import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { loadConfigFromEnv } from './config.js'

describe('loadConfigFromEnv', () => {
  it('defaults to xAI base URL and models when XAI key is set', () => {
    const config = loadConfigFromEnv({
      XAI_API_KEY: 'xai-test-key',
    })
    assert.equal(config.apiKey, 'xai-test-key')
    assert.equal(config.apiBaseUrl, 'https://api.x.ai/v1')
    assert.equal(config.suggestModel, 'grok-4.5')
    assert.equal(config.safetyModel, 'grok-4.5')
  })

  it('pairs OPENROUTER_API_KEY with OpenRouter base URL and model ids', () => {
    const config = loadConfigFromEnv({
      OPENROUTER_API_KEY: 'or-test-key',
    })
    assert.equal(config.apiKey, 'or-test-key')
    assert.equal(config.apiBaseUrl, 'https://openrouter.ai/api/v1')
    assert.equal(config.suggestModel, 'x-ai/grok-4.5')
    assert.equal(config.safetyModel, 'x-ai/grok-4.5')
  })

  it('prefers xAI key over OpenRouter and keeps xAI defaults', () => {
    const config = loadConfigFromEnv({
      XAI_API_KEY: 'xai-test-key',
      OPENROUTER_API_KEY: 'or-test-key',
    })
    assert.equal(config.apiKey, 'xai-test-key')
    assert.equal(config.apiBaseUrl, 'https://api.x.ai/v1')
  })

  it('honors explicit base URL even with only OpenRouter key', () => {
    const config = loadConfigFromEnv({
      OPENROUTER_API_KEY: 'or-test-key',
      CAUSE_ASSIST_API_BASE_URL: 'https://example.test/v1',
      CAUSE_ASSIST_MODEL: 'custom-model',
    })
    assert.equal(config.apiBaseUrl, 'https://example.test/v1')
    assert.equal(config.suggestModel, 'custom-model')
    assert.equal(config.safetyModel, 'custom-model')
  })
})
