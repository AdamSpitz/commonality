import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import type { LlmJsonRequest } from '@commonality/attester-core'
import {
  attesterRoutingObjections,
  filterSignablePlanks,
  gateSharpenedPlank,
  qualityFailures,
} from './statementQualityGate.js'
import type { CauseAssistConfig } from './types.js'

const config: CauseAssistConfig = {
  apiKey: 'key', apiBaseUrl: 'https://example.test/v1', suggestModel: 'model',
  safetyModel: 'model', implicationModel: 'model', coherenceModel: 'test', port: 0,
}

describe('statement quality gate', () => {
  it('drops taxonomy, pay-the-work, and slogan planks', () => {
    assert.ok(qualityFailures('Neighborhood gardens are a public good.').length > 0)
    assert.ok(qualityFailures('I want people who write docs to get paid.').length > 0)
    assert.ok(qualityFailures('Material support is a legitimate way to keep Linux available.').length > 0)
    assert.ok(qualityFailures('I am pro-choice.').length > 0)
    assert.equal(qualityFailures('I want more CSA in Grey County, Ontario.').length, 0)
  })

  it('filters atomize candidates', () => {
    const kept = filterSignablePlanks([
      { text: 'Open-source libraries are a public good.', rationale: 'taxonomy' },
      { text: 'I want widely used library L to stay maintained and well-documented.', rationale: 'want' },
    ])
    assert.equal(kept.length, 1)
    assert.match(kept[0].text, /library L/)
  })

  it('withholds a sharpened plank that fails the bar', () => {
    const gated = gateSharpenedPlank(
      'Better parks',
      'Parks are a worthwhile local public good.',
      ['Define parks.'],
    )
    assert.equal(gated.plank, 'Better parks')
    assert.equal(gated.withheld, true)
    assert.ok(gated.warnings.some((w) => /withheld/.test(w)))
  })

  it('adds attester routing objections when modified does not imply the bridge', async () => {
    const objections = await attesterRoutingObjections(
      ['I want late abortion available.', 'I want abortion banned.'],
      'Legal elective abortion until 12–16 weeks, then only for health exceptions.',
      config,
      async <T>(_request: LlmJsonRequest) => ({
        implies: false,
        confidence: 'high',
        reasoning: 'Parents do not contain the gestational compromise.',
      } as T),
    )
    assert.equal(objections.length, 2)
    assert.match(objections[0], /^routing: attester/)
  })
})
