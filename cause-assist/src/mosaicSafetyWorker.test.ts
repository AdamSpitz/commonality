import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { bytes32ToCid, cidToBytes32 } from '@commonality/sdk/utils'
import { processImageAdopted, type MosaicSafetyWorkerConfig } from './mosaicSafetyWorker.js'
import type { MosaicSafetyVerdict } from './mosaicSafetyCheck.js'

const statementCid = 'bafkreifzjut3te2nhyekklss27nh3k7232xplrvgnbo3wxj335rkr3v36m'
const imageCid = 'bafkreigdyrzt5sfp7edupa6g6csmvofsnquhcsstrmfe737k63zgla52gq'

const yes: MosaicSafetyVerdict = {
  safe: true,
  reasoning: 'No second claim.',
  attesterId: 'cause-assist-mosaic-safety-v1',
  source: 'llm',
  promptHash: `0x${'ab'.repeat(32)}`,
  modelId: `0x${'cd'.repeat(32)}`,
}

const config = {
  contentRetryCount: 1,
  contentRetryDelayMs: 0,
  causeAssist: {
    apiKey: 'test-key',
    statementImagesContractAddress: '0x00000000000000000000000000000000000000aa',
    ethereumPrivateKey: `0x${'11'.repeat(32)}`,
    ethereumRpcUrl: 'http://127.0.0.1:8545',
  },
} as MosaicSafetyWorkerConfig

describe('processImageAdopted', () => {
  it('loads the sentence and asks for a yes, without writing on silence', async () => {
    const statementId = cidToBytes32(statementCid)
    const imageId = cidToBytes32(imageCid)
    assert.equal(bytes32ToCid(statementId), statementCid)
    let attested = 0
    const missing = await processImageAdopted(
      {
        signer: '0x0000000000000000000000000000000000000001',
        statementId,
        imageId,
        transactionHash: '0x1',
        blockNumber: 1n,
        logIndex: 0,
      },
      config,
      {
        loadStatementText: async () => null,
        attest: async () => {
          attested += 1
          return { attested: true, reason: 'attested', verdict: yes }
        },
        sleep: async () => {},
      },
    )
    assert.equal(missing.status, 'unavailable')
    assert.equal(attested, 0)

    const judged = await processImageAdopted(
      {
        signer: '0x0000000000000000000000000000000000000001',
        statementId,
        imageId,
        transactionHash: '0x2',
        blockNumber: 2n,
        logIndex: 0,
      },
      config,
      {
        loadStatementText: async (cid) => (cid === statementCid ? 'Lights should stay on.' : null),
        attest: async (request) => {
          assert.equal(request.statementText, 'Lights should stay on.')
          assert.equal(request.imageCid, imageCid)
          return { attested: false, reason: 'not_safe', verdict: { ...yes, safe: false } }
        },
        sleep: async () => {},
      },
    )
    assert.equal(judged.status, 'judged')
    if (judged.status === 'judged') assert.equal(judged.result.reason, 'not_safe')
  })

  it('ignores an id that is not a CID', async () => {
    const result = await processImageAdopted(
      {
        signer: '0x0000000000000000000000000000000000000001',
        statementId: '0x1234' as `0x${string}`,
        imageId: `0x${'11'.repeat(32)}`,
        transactionHash: '0x3',
        blockNumber: 3n,
        logIndex: 0,
      },
      config,
      {
        loadStatementText: async () => 'nope',
        attest: async () => ({ attested: true, reason: 'attested', verdict: yes }),
        sleep: async () => {},
      },
    )
    assert.deepEqual(result, { status: 'ignored', reason: 'invalid_id' })
  })
})
