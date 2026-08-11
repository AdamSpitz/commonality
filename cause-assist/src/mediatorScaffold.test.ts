import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { suggestMediatorScaffold } from './mediatorScaffold.js'
import type { CauseAssistConfig } from './types.js'
import type { LlmJsonRequest, RequestJsonCompletionFn } from '@commonality/attester-core'

const config: CauseAssistConfig = {
  apiKey: 'test', apiBaseUrl: 'https://example.test/v1', suggestModel: 'test',
  safetyModel: 'test', implicationModel: 'test', coherenceModel: 'test', port: 0,
}

describe('mediator scaffold suggestions', () => {
  it('normalizes complete editable clusters and does not return a strategy prompt', async () => {
    const requestCompletion: RequestJsonCompletionFn = async <T>(request: LlmJsonRequest) => {
      assert.match(request.systemPrompt, /never write or suggest a strategy prompt/i)
      return {
        identity: { name: 'Housing bridge', description: 'Bridges housing constituencies.' },
        labels: { sideA: 'renters', sideB: 'homeowners' },
        anchorClusters: [{
          topicTag: 'repairs', sideA: 'Renters need timely repairs.',
          sideB: 'Owners should keep homes in good repair.',
          commonGround: 'Rental homes should receive timely repairs.', rationale: 'Shared upkeep goal.',
        }],
        strategyPrompt: 'must be discarded',
      } as T
    }
    const result = await suggestMediatorScaffold(
      { foundingStatement: 'Make rental housing work for everyone.' }, config,
      requestCompletion,
    )
    assert.equal(result.source, 'llm')
    assert.equal(result.labels.sideA, 'renters')
    assert.equal(result.anchorClusters.length, 1)
    assert.equal('strategyPrompt' in result, false)
  })
})
