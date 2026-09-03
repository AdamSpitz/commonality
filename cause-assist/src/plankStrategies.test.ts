import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import type { LlmJsonRequest } from '@commonality/attester-core'
import { atomizeCause, draftDisjunctiveAnchor, sharpenPlank } from './plankStrategies.js'
import type { CauseAssistConfig } from './types.js'

const config: CauseAssistConfig = {
  apiKey: 'key', apiBaseUrl: 'https://example.test/v1', suggestModel: 'model',
  safetyModel: 'model', implicationModel: 'model', coherenceModel: 'test', port: 0,
}

describe('plank-first strategies', () => {
  it('atomizes a rough bundle without imposing main-to-supporting implications', async () => {
    const result = await atomizeCause({ description: 'local resilience', count: 2 }, config, async <T>(request: LlmJsonRequest) => {
      assert.match(request.systemPrompt, /coalition unbundling/i)
      assert.match(request.systemPrompt, /Want more of the thing, do not classify it/)
      assert.match(request.systemPrompt, /Do not write "I want people who do X to get paid"/)
      assert.match(request.systemPrompt, /Prefer earmark grain/)
      assert.match(request.systemPrompt, /board inclusion rule/)
      assert.doesNotMatch(request.userPrompt, /mainStatement/)
      return { planks: [
        { text: 'Our neighborhood should maintain a shared emergency food pantry.', rationale: 'food resilience' },
        { text: 'Our neighborhood should train volunteer emergency responders.', rationale: 'response resilience' },
      ] } as T
    })
    assert.equal(result.source, 'llm')
    assert.equal(result.planks.length, 2)
  })

  it('does not return atomize planks that fail seed quality checks', async () => {
    const result = await atomizeCause({ description: 'open source', count: 2 }, config, async <T>() => ({
      planks: [
        { text: 'Open source is a public good.', rationale: 'taxonomy' },
        { text: 'I want widely used library L to stay maintained.', rationale: 'want' },
      ],
    } as T))
    assert.equal(result.planks.length, 1)
    assert.match(result.planks[0].text, /library L/)
  })

  it('sharpens against attestable and signable criteria', async () => {
    const result = await sharpenPlank({ plank: 'Better parks' }, config, async <T>(request: LlmJsonRequest) => {
      assert.match(request.systemPrompt, /Hedge explicitly/i)
      return { plank: 'The city should keep neighborhood parks clean and safe to use.', rationale: 'Makes the desired condition explicit.', warnings: ['Define “safe” if a later implication depends on it.'] } as T
    })
    assert.equal(result.source, 'llm')
    assert.match(result.plank, /parks/)
    assert.equal(result.warnings.length, 1)
  })

  it('withholds a sharpened plank that is still taxonomy', async () => {
    const result = await sharpenPlank({ plank: 'Better parks' }, config, async <T>() => ({
      plank: 'Parks are a worthwhile local public good.',
      rationale: 'More specific.',
      warnings: [],
    } as T))
    assert.equal(result.plank, 'Better parks')
    assert.ok(result.warnings.some((warning) => /withheld/.test(warning)))
  })

  it('drafts a disjunctive anchor with verbatim planks and correct implication direction', () => {
    const planks = ['The creek should be clean.', 'Oak Street should be safe at night.']
    const result = draftDisjunctiveAnchor(planks)
    assert.deepEqual(result.disjuncts, planks)
    for (const plank of planks) assert.ok(result.anchor.includes(plank))
    assert.deepEqual(result.implicationChecks, planks.map((plank) => ({
      mainStatement: plank,
      supportingStatements: [result.anchor],
    })))
  })
})
