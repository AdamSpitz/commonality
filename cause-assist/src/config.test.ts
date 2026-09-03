import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { loadConfigFromEnv } from './config.js'

describe('loadConfigFromEnv', () => {
  it('defaults to xAI base URL and models when only an XAI key is set', () => {
    const config = loadConfigFromEnv({
      XAI_API_KEY: 'xai-test-key',
    })
    assert.equal(config.apiKey, 'xai-test-key')
    assert.equal(config.apiBaseUrl, 'https://api.x.ai/v1')
    assert.equal(config.suggestModel, 'grok-4.5')
    assert.equal(config.safetyModel, 'grok-4.5')
    assert.equal(config.implicationModel, 'grok-4.5')
  })

  it('pairs OPENROUTER_API_KEY with OpenRouter base URL and production model ids', () => {
    const config = loadConfigFromEnv({
      OPENROUTER_API_KEY: 'or-test-key',
    })
    assert.equal(config.apiKey, 'or-test-key')
    assert.equal(config.apiBaseUrl, 'https://openrouter.ai/api/v1')
    assert.equal(config.suggestModel, 'deepseek/deepseek-v4-flash-0731')
    assert.equal(config.safetyModel, 'deepseek/deepseek-v4-flash-0731')
    assert.equal(config.implicationModel, 'deepseek/deepseek-v4-flash-0731')
  })

  it('prefers OpenRouter when both keys are set', () => {
    const config = loadConfigFromEnv({
      XAI_API_KEY: 'xai-test-key',
      OPENROUTER_API_KEY: 'or-test-key',
    })
    assert.equal(config.apiKey, 'or-test-key')
    assert.equal(config.apiBaseUrl, 'https://openrouter.ai/api/v1')
    assert.equal(config.suggestModel, 'deepseek/deepseek-v4-flash-0731')
  })

  it('uses the xAI key when an explicit xAI base is set even if both keys exist', () => {
    const config = loadConfigFromEnv({
      XAI_API_KEY: 'xai-test-key',
      OPENROUTER_API_KEY: 'or-test-key',
      CAUSE_ASSIST_API_BASE_URL: 'https://api.x.ai/v1',
    })
    assert.equal(config.apiKey, 'xai-test-key')
    assert.equal(config.apiBaseUrl, 'https://api.x.ai/v1')
    assert.equal(config.suggestModel, 'grok-4.5')
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

  it('loads optional coherence attester chain config', () => {
    const config = loadConfigFromEnv({
      XAI_API_KEY: 'xai-test-key',
      CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY: `0x${'11'.repeat(32)}`,
      ETHEREUM_RPC_URL: 'http://hardhat-node:8545',
      ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: '0x00000000000000000000000000000000000000aa',
    })
    assert.equal(config.ethereumPrivateKey, `0x${'11'.repeat(32)}`)
    assert.equal(config.ethereumRpcUrl, 'http://hardhat-node:8545')
    assert.equal(
      config.alignmentAttestationsContractAddress,
      '0x00000000000000000000000000000000000000aa',
    )
  })
})
