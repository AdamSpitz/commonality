import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { attestCoherenceIfJudged } from './attestCoherence.js'
import type { CauseAssistConfig } from './types.js'

const baseConfig: CauseAssistConfig = {
  apiBaseUrl: 'https://api.example.test/v1',
  suggestModel: 'test',
  safetyModel: 'test',
  implicationModel: 'test',
  coherenceModel: 'test',
  port: 0,
}

describe('attestCoherenceIfJudged', () => {
  it('stays silent when not coherent (no chain write path)', async () => {
    const result = await attestCoherenceIfJudged(
      {
        rosterCid: 'bafytestroster',
        title: '',
        summary: 'short',
        planks: ['An issue'],
      },
      baseConfig,
    )
    assert.equal(result.attested, false)
    assert.equal(result.reason, 'not_coherent')
    assert.equal(result.verdict.coherent, false)
    assert.equal(result.txHash, undefined)
  })

  it('reports attester_not_configured when coherent but no operator key', async () => {
    const result = await attestCoherenceIfJudged(
      {
        rosterCid: 'bafytestroster',
        title: 'Neighborhood parks',
        summary: 'We want more local parks and green space for families.',
        planks: ['Our city should fund neighborhood parks.'],
      },
      baseConfig,
    )
    assert.equal(result.attested, false)
    assert.equal(result.reason, 'attester_not_configured')
    assert.equal(result.verdict.coherent, true)
  })
})
