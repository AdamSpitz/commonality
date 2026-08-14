import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import type { LlmJsonRequest, RequestJsonCompletionFn } from '@commonality/attester-core'
import { checkCoherence } from './coherenceCheck.js'
import type { CauseAssistConfig } from './types.js'

const config: CauseAssistConfig = {
  apiBaseUrl: 'https://example.test/v1',
  suggestModel: 'test-suggest',
  safetyModel: 'test-safety',
  implicationModel: 'test-implication',
  coherenceModel: 'test-coherence',
  port: 3002,
}

describe('checkCoherence', () => {
  it('uses a separate attester id and never awards a heuristic badge', async () => {
    const verdict = await checkCoherence({
      rosterCid: 'bafkreipreview',
      title: 'Streetlights',
      summary: 'Neighbors funding working lights on Oak Street.',
      planks: ['Repair broken streetlights on Oak Street by June.'],
    }, config)

    assert.equal(verdict.source, 'heuristic')
    assert.equal(verdict.attesterId, 'cause-assist-coherence-v1')
    assert.equal(verdict.rosterCid, 'bafkreipreview')
    assert.equal(verdict.coherent, false)
  })

  it('withholds a pass when the summary is empty (badge is optional, not a gate)', async () => {
    const verdict = await checkCoherence({
      rosterCid: 'bafkreipreview',
      title: 'Streetlights',
      summary: '',
      planks: ['Repair lights.'],
    }, config)
    assert.equal(verdict.coherent, false)
  })

  it('calls the LLM with the coherence model, not the suggest model', async () => {
    let seenModel: string | undefined
    const requestFn: RequestJsonCompletionFn = async <T>(request: LlmJsonRequest) => {
      seenModel = request.model
      return { coherent: true, reasoning: 'Issues match the summary.' } as T
    }
    const verdict = await checkCoherence(
      {
        rosterCid: 'bafkreipreview',
        title: 'Streetlights',
        summary: 'Working lights.',
        planks: ['Repair lights on Oak.'],
      },
      { ...config, apiKey: 'test-key' },
      requestFn,
    )
    assert.equal(seenModel, 'test-coherence')
    assert.equal(verdict.source, 'llm')
    assert.equal(verdict.coherent, true)
  })

  it('withholds the badge for a reassuring narrative with an undisclosed roster rider', async () => {
    const verdict = await checkCoherence(
      {
        rosterCid: 'bafkreimisleading',
        title: 'Safer neighborhood walks',
        summary: 'Neighbors are improving lighting and crossings for pedestrians.',
        planks: [
          'Repair broken streetlights on Oak Street.',
          'Remove the neighborhood bus route.',
        ],
      },
      { ...config, apiKey: 'test-key' },
      async <T>() => ({ coherent: false, reasoning: 'The bus-route rider is not disclosed by the narrative.' }) as T,
    )
    assert.equal(verdict.coherent, false)
    assert.match(verdict.reasoning, /rider/i)
  })

  it('can award the narrow construction badge without endorsing a controversial roster', async () => {
    const verdict = await checkCoherence(
      {
        rosterCid: 'bafkreicontroversial',
        title: 'End the bus route',
        summary: 'This cause seeks to remove the Oak Street bus route.',
        planks: ['Remove the Oak Street bus route.'],
      },
      { ...config, apiKey: 'test-key' },
      async <T>() => ({ coherent: true, reasoning: 'The narrative plainly discloses the listed issue.' }) as T,
    )
    assert.equal(verdict.coherent, true)
    assert.doesNotMatch(verdict.reasoning, /good|worthy|merit/i)
  })
})
