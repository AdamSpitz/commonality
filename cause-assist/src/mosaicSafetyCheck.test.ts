import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import type { LlmJsonRequest, RequestJsonCompletionFn } from '@commonality/attester-core'
import { hexToBytes, keccak256, sha256, stringToBytes } from 'viem'
import { buildCidV1FromDigest, RAW_CID_CODEC } from '@commonality/sdk/utils'
import {
  MOSAIC_SAFETY_SYSTEM_PROMPT,
  checkMosaicSafety,
  mosaicImageCidMatches,
  mosaicSafetyPromptHash,
  type MosaicImageBytes,
} from './mosaicSafetyCheck.js'

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
])
const imageCid = buildCidV1FromDigest(RAW_CID_CODEC, hexToBytes(sha256(png)))
const image: MosaicImageBytes = { mediaType: 'image/png', bytes: png }
const fetchImage = async () => image

const config = {
  apiKey: 'test-key',
  apiBaseUrl: 'https://example.test/v1',
  coherenceModel: 'test-mosaic',
}

describe('checkMosaicSafety', () => {
  it('fails closed without a sentence, an image id, or an API key', async () => {
    const missing = await checkMosaicSafety(
      { statementText: '  ', imageCid },
      config,
      undefined,
      fetchImage,
    )
    assert.equal(missing.safe, false)
    assert.equal(missing.source, 'unavailable')

    const noKey = await checkMosaicSafety(
      { statementText: 'Streetlights on Oak Street should work.', imageCid },
      { ...config, apiKey: undefined },
      undefined,
      fetchImage,
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
      { statementText: 'Streetlights on Oak Street should work.', imageCid },
      config,
      requestJson,
      fetchImage,
    )

    assert.equal(calls[0]?.systemPrompt, MOSAIC_SAFETY_SYSTEM_PROMPT)
    assert.equal(calls[0]?.userImages?.[0]?.mediaType, 'image/png')
    assert.ok(calls[0]?.userImages?.[0]?.base64)
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
      { statementText: 'Streetlights on Oak Street should work.', imageCid },
      config,
      requestJson,
      fetchImage,
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
      { statementText: 'Streetlights on Oak Street should work.', imageCid },
      config,
      requestJson,
      fetchImage,
    )
    assert.equal(verdict.safe, false)
    assert.equal(verdict.source, 'unavailable')
  })

  it('fails closed without pixels, and does not ask the model', async () => {
    let called = 0
    const requestJson: RequestJsonCompletionFn = async <T>() => {
      called += 1
      return { safe: true, reasoning: 'should not run' } as T
    }
    const noGateway = await checkMosaicSafety(
      { statementText: 'Streetlights on Oak Street should work.', imageCid },
      config,
      requestJson,
    )
    assert.equal(noGateway.source, 'unavailable')
    assert.equal(called, 0)

    const mismatch = await checkMosaicSafety(
      { statementText: 'Streetlights on Oak Street should work.', imageCid },
      config,
      requestJson,
      async () => ({ mediaType: 'image/png', bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x01]) }),
    )
    assert.equal(mismatch.source, 'unavailable')
    assert.equal(mismatch.safe, false)
    assert.equal(called, 0)
    assert.equal(mosaicImageCidMatches(imageCid, png), true)
  })
})
