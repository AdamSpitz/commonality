import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { checkImplications } from './implicationCheck.js'
import type { CauseAssistConfig } from './types.js'
import type { LlmJsonRequest } from '@commonality/attester-core'

const baseConfig: CauseAssistConfig = {
  apiBaseUrl: 'https://api.x.ai/v1',
  suggestModel: 'grok-4.5',
  safetyModel: 'grok-4.5',
  implicationModel: 'grok-4.5', coherenceModel: 'test',
  port: 3002,
}

describe('checkImplications', () => {
  it('returns empty results without supporting statements', async () => {
    const result = await checkImplications(
      { mainStatement: 'I support universal healthcare', supportingStatements: [] },
      baseConfig,
    )
    assert.deepEqual(result.results, [])
  })

  it('uses heuristic passthrough without API key', async () => {
    const result = await checkImplications(
      {
        mainStatement: 'I support universal healthcare and free college',
        supportingStatements: ['I support universal healthcare'],
      },
      baseConfig,
    )
    assert.equal(result.source, 'heuristic')
    assert.equal(result.results.length, 1)
    assert.equal(result.results[0]!.confidence, 'low')
  })

  it('uses implication attester prompt with LLM', async () => {
    let seenSystem = ''
    const result = await checkImplications(
      {
        mainStatement: 'I support universal healthcare and free college tuition',
        supportingStatements: ['I support universal healthcare'],
      },
      { ...baseConfig, apiKey: 'test-key' },
      async <T>(request: LlmJsonRequest) => {
        seenSystem = request.systemPrompt
        return {
          implies: true,
          confidence: 'high',
          reasoning: 'Strict subset — S2 drops one of S1\'s two claims.',
        } as T
      },
    )
    assert.equal(result.source, 'llm')
    assert.equal(result.results[0]!.implies, true)
    assert.ok(seenSystem.includes('You are the Implication Attester'))
    assert.ok(seenSystem.includes('be conservative'))
  })
})
