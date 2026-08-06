import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { suggestStatements } from './statementSuggester.js'
import type { CauseAssistConfig } from './types.js'

const baseConfig: CauseAssistConfig = {
  apiBaseUrl: 'https://api.x.ai/v1',
  suggestModel: 'grok-4.5',
  safetyModel: 'grok-4.5',
  port: 3002,
}

describe('suggestStatements', () => {
  it('returns fallback suggestions without an API key', async () => {
    const result = await suggestStatements(
      { goal: 'Make night walks safer on Oak Street', count: 3 },
      baseConfig,
    )
    assert.equal(result.source, 'fallback')
    assert.ok(result.suggestions.length >= 1)
    assert.ok(result.suggestions.length <= 3)
  })

  it('uses LLM results when available', async () => {
    const result = await suggestStatements(
      { goal: 'Clean the creek', count: 2 },
      { ...baseConfig, apiKey: 'test-key' },
      async <T>() => ({
        suggestions: [
          { text: 'Clean water matters for every family nearby.', rationale: 'Beneficiary framing', role: 'beneficiary' },
          { text: 'We will publish cleanup results monthly.', rationale: 'Transparency driver', role: 'driver' },
        ],
      }) as T,
    )
    assert.equal(result.source, 'llm')
    assert.equal(result.suggestions.length, 2)
  })
})
