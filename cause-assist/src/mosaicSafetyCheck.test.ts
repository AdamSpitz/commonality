import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import type { LlmJsonRequest, RequestJsonCompletionFn } from '@commonality/attester-core'
import { keccak256, stringToBytes } from 'viem'
import {
  MOSAIC_SAFETY_SYSTEM_PROMPT,
  checkMosaicSafety,
  mosaicSafetyPromptHash,
} from './mosaicSafetyCheck.js'

const config = {
  apiKey: 'test-key',
  apiBaseUrl: 'https://example.test/v1',
  coherenceModel: 'test-mosaic',
}

describe('checkMosaicSafety', () => {
  it('fails closed without a sentence, an image id, or an API key', async () => {
    const missing = await checkMosaicSafety(
      { statementText: '  ', imageCid: 'bafyimage' },
      config,
    )
    assert.equal(missing.safe, false)
    assert.equal(missing.source, 'unavailable')

    const noKey = await checkMosaicSafety(
      { statementText: 'Streetlights on Oak Street should work.', imageCid: 'bafyimage' },
      { ...config, apiKey: undefined },
    )
    assert.equal(noKey.source, 'unavailable')
    assert.equal(noKey.safe, false)
  })

  it('records the prompt hash and withholds a yes when the model cannot classify', async () => {
    const calls: LlmJsonRequest[] = []
    const requestJson: RequestJsonCompletionFn = async <T>(request: LlmJsonRequest) => {
      calls.push(request)
      return { safe: 'maybe' } as T
    }

    const verdict = await checkMosaicSafety(
      { statementText: 'Streetlights on Oak Street should work.', imageCid: 'bafyimage' },
      config,
      requestJson,
    )

    assert.equal(calls[0]?.systemPrompt, MOSAIC_SAFETY_SYSTEM_PROMPT)
    assert.equal(verdict.promptHash, mosaicSafetyPromptHash())
    assert.equal(verdict.promptHash, keccak256(stringToBytes(MOSAIC_SAFETY_SYSTEM_PROMPT)))
    assert.equal(verdict.modelId, keccak256(stringToBytes('test-mosaic')))
    assert.equal(verdict.source, 'llm')
    assert.equal(verdict.safe, false)
  })

  it('accepts only an explicit true from the model', async () => {
    const requestJson: RequestJsonCompletionFn = async <T>() => ({
      safe: true,
      reasoning: 'A street photo, no second claim.',
    }) as T
    const verdict = await checkMosaicSafety(
      { statementText: 'Streetlights on Oak Street should work.', imageCid: 'bafyimage' },
      config,
      requestJson,
    )
    assert.equal(verdict.safe, true)
    assert.equal(verdict.source, 'llm')
  })

  it('fails closed when the model call throws', async () => {
    const requestJson: RequestJsonCompletionFn = async <T>() => {
      throw new Error('down')
      return undefined as T
    }
    const verdict = await checkMosaicSafety(
      { statementText: 'Streetlights on Oak Street should work.', imageCid: 'bafyimage' },
      config,
      requestJson,
    )
    assert.equal(verdict.safe, false)
    assert.equal(verdict.source, 'unavailable')
  })
})
