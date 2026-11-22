import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import type { Hex } from 'viem'
import { attestMosaicSafetyIfJudged } from './attestMosaicSafety.js'
import type { MosaicSafetyVerdict } from './mosaicSafetyCheck.js'

const yes: MosaicSafetyVerdict = {
  safe: true,
  reasoning: 'No second claim.',
  attesterId: 'cause-assist-mosaic-safety-v1',
  source: 'llm',
  promptHash: `0x${'ab'.repeat(32)}`,
  modelId: `0x${'cd'.repeat(32)}`,
}

const writeConfig = {
  apiKey: 'test-key',
  apiBaseUrl: 'https://example.test/v1',
  coherenceModel: 'test-mosaic',
  ethereumPrivateKey: `0x${'11'.repeat(32)}`,
  ethereumRpcUrl: 'http://127.0.0.1:8545',
  statementImagesContractAddress: '0x00000000000000000000000000000000000000aa',
}

describe('attestMosaicSafetyIfJudged', () => {
  it('does not write when the judgment is unavailable or unsafe', async () => {
    let wrote = false
    const writeYes = async () => {
      wrote = true
      return '0x1' as Hex
    }
    const unavailable = await attestMosaicSafetyIfJudged(
      { statementText: 'Lights.', statementCid: 'bafkrei', imageCid: 'bafyimage' },
      writeConfig,
      { check: async () => ({ ...yes, source: 'unavailable', safe: false }), writeYes },
    )
    const unsafe = await attestMosaicSafetyIfJudged(
      { statementText: 'Lights.', statementCid: 'bafkrei', imageCid: 'bafyimage' },
      writeConfig,
      { check: async () => ({ ...yes, safe: false }), writeYes },
    )
    assert.equal(wrote, false)
    assert.equal(unavailable.reason, 'judgment_unavailable')
    assert.equal(unsafe.reason, 'not_safe')
  })

  it('does not write a yes when the operator key is missing', async () => {
    const result = await attestMosaicSafetyIfJudged(
      { statementText: 'Lights.', statementCid: 'bafkrei', imageCid: 'bafyimage' },
      { ...writeConfig, ethereumPrivateKey: undefined },
      { check: async () => yes },
    )
    assert.equal(result.reason, 'attester_not_configured')
    assert.equal(result.attested, false)
  })

  it('writes a yes with the prompt hash and model id', async () => {
    const writes: string[] = []
    const result = await attestMosaicSafetyIfJudged(
      {
        statementText: 'Lights.',
        statementCid: 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m',
        imageCid: 'bafkreib6z3wp7uj3d7ct6e3efwvl7yuxtzvqhvzq2g3m5v45x7zqsc2xmi',
      },
      writeConfig,
      {
        check: async () => yes,
        createClients: () => ({ account: '0xabc', walletClient: {}, publicClient: {} }) as never,
        writeYes: async ({ promptHash, modelId }) => {
          writes.push(`${promptHash}:${modelId}`)
          return '0xyes' as Hex
        },
      },
    )
    assert.equal(result.reason, 'attested')
    assert.equal(result.txHash, '0xyes')
    assert.deepEqual(writes, [`${yes.promptHash}:${yes.modelId}`])
  })
})