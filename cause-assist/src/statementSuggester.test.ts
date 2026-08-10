import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { suggestStatements } from './statementSuggester.js'
import type { CauseAssistConfig } from './types.js'
import type { LlmJsonRequest } from '@commonality/attester-core'

const baseConfig: CauseAssistConfig = {
  apiBaseUrl: 'https://api.x.ai/v1',
  suggestModel: 'grok-4.5',
  safetyModel: 'grok-4.5',
  implicationModel: 'grok-4.5', coherenceModel: 'test',
  port: 3002,
}

describe('suggestStatements', () => {
  it('returns fallback suggestions without an API key', async () => {
    const result = await suggestStatements(
      { goal: 'Night walks on Oak Street should feel safe within a year.', count: 3 },
      baseConfig,
    )
    assert.equal(result.source, 'fallback')
    assert.ok(result.suggestions.length >= 1)
    assert.ok(result.suggestions.length <= 3)
  })

  it('uses LLM results when available and keeps only implied suggestions', async () => {
    const result = await suggestStatements(
      { goal: 'The local creek should be cleaned of litter this year.', count: 2 },
      { ...baseConfig, apiKey: 'test-key' },
      async <T>(request: LlmJsonRequest) => {
        // Evaluator prompt starts with this role line; suggester only mentions the bar.
        if (request.systemPrompt.includes('You are the Implication Attester')) {
          // Approve only the rephrase; reject the extra claim.
          const isExtra = request.userPrompt.includes('every family nearby')
          return {
            implies: !isExtra,
            confidence: 'high',
            reasoning: isExtra ? 'S2 adds a beneficiary claim not in S1.' : 'Rephrase of same claim.',
            key_difference: isExtra ? 'Added beneficiary claim' : undefined,
          } as T
        }
        return {
          suggestions: [
            {
              text: 'The local creek should be cleaned of litter this year.',
              rationale: 'Same claim rephrased',
              role: 'rephrase',
            },
            {
              text: 'Clean water matters for every family nearby.',
              rationale: 'Beneficiary framing',
              role: 'beneficiary',
            },
          ],
        } as T
      },
    )
    assert.equal(result.source, 'llm')
    assert.equal(result.suggestions.length, 1)
    assert.match(result.suggestions[0]!.text, /creek/i)
    assert.equal(result.suggestions[0]!.implication?.implies, true)
  })
})
