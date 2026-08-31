import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import type { LlmJsonRequest } from '@commonality/attester-core'
import { critiqueTriple, draftBridgePlank, draftModifiedPlank, draftStandInSliver } from './bridgeClusterAssist.js'
import { BRIDGE_STATEMENT_GUIDANCE, STATEMENT_QUALITY_GUIDANCE } from './statementGuidance.js'
import type { CauseAssistConfig } from './types.js'

const config: CauseAssistConfig = {
  apiKey: 'key', apiBaseUrl: 'https://example.test/v1', suggestModel: 'model',
  safetyModel: 'model', implicationModel: 'model', coherenceModel: 'test', port: 0,
}

describe('statement guidance routing', () => {
  it('keeps signer-annoyance routing on bridge drafts, not ordinary cause verbs', () => {
    assert.doesNotMatch(STATEMENT_QUALITY_GUIDANCE, /annoyed at being asked/)
    assert.doesNotMatch(STATEMENT_QUALITY_GUIDANCE, /must imply "I want more CSA in Ontario"/)
    assert.match(STATEMENT_QUALITY_GUIDANCE, /board inclusion rule/)
    assert.match(BRIDGE_STATEMENT_GUIDANCE, /annoyed at being asked to also sign the shared plank/)
  })
})

describe('bridge cluster wording verbs', () => {
  it('drafts a modified plank from parent texts without writing a strategy prompt', async () => {
    const result = await draftModifiedPlank({
      parentPlanks: ['Marriage is a covenant and children are a blessing.'],
      sideLabel: 'practising Christians',
      mustNotConcede: 'Do not reduce this to outcome data.',
      intendedBridge: 'It should be easier to marry and raise children.',
    }, config, async <T>(request: LlmJsonRequest) => {
      assert.match(request.systemPrompt, /human remains the publisher/i)
      assert.doesNotMatch(request.systemPrompt, /strategy prompt you should write/i)
      assert.match(request.systemPrompt, /Containment is a check after drafting/i)
      assert.match(request.userPrompt, /must_not_concede/)
      assert.match(request.userPrompt, /intended_bridge/)
      return { plank: 'Marriage and children are among the best things God gives us, and I want family formation to be a normal, achievable thing.', rationale: 'Keeps covenant language.', warnings: [] } as T
    })
    assert.equal(result.source, 'llm')
    assert.match(result.plank, /God/)
  })

  it('drafts a bridge plank from two modified sides', async () => {
    const result = await draftBridgePlank({
      modifiedSides: [
        { label: 'Christians', planks: ['God gives marriage; make family formation achievable.'] },
        { label: 'secular conservatives', planks: ['The data on two-parent households is not close.'] },
      ],
    }, config, async <T>(request: LlmJsonRequest) => {
      assert.match(request.systemPrompt, /justifications/i)
      assert.match(request.systemPrompt, /coalition caption/i)
      return { plank: 'It should be easier than it currently is for people to marry and raise children.', rationale: 'Conclusion only.', warnings: [] } as T
    })
    assert.equal(result.source, 'llm')
    assert.match(result.plank, /easier/)
  })

  it('critiques a triple without rewriting', async () => {
    const result = await critiqueTriple({
      modifiedPlanks: [
        'Marriage is a covenant God gives us.',
        'Kids do better with two committed parents.',
      ],
      bridgePlank: 'Marriage is a gift from God and also the data says so.',
      parentPlanks: ['Marriage is a covenant.', 'Kids do better with two parents.'],
    }, config, async <T>(request: LlmJsonRequest) => {
      assert.match(request.systemPrompt, /Do not rewrite/)
      assert.match(request.systemPrompt, /routing:/)
      assert.match(request.systemPrompt, /shape:/)
      assert.match(request.systemPrompt, /Containment is the intended modified → bridge relationship/)
      assert.match(request.systemPrompt, /Never call a bridge "decorative"/)
      assert.match(request.systemPrompt, /Semantic containment expressed in genuinely camp-specific prose is the desired shape/)
      assert.match(request.systemPrompt, /Parent\/natural → modified is intentionally a nudge, not an implication/)
      assert.match(request.systemPrompt, /Distilling that committed conclusion from the surrounding reasons is legitimate implication/)
      assert.match(request.systemPrompt, /first-person willingness to accept a non-ideal policy/)
      assert.match(request.systemPrompt, /arrays contain failures only/)
      assert.match(request.userPrompt, /parent_planks/)
      return {
        objections: [
          'routing: This is the intended shape and is not an objection.',
          'Shared plank requires a theological premise.',
        ],
        leakWarnings: ['God-talk leaked into the bridge plank.'],
      } as T
    })
    assert.equal(result.source, 'llm')
    assert.equal(result.objections.length, 1)
    assert.equal(result.leakWarnings.length, 1)
  })

  it('drafts a stand-in sliver without treating it as a modified parent', async () => {
    const result = await draftStandInSliver({
      sideLabel: 'secular conservatives',
      bullets: ['Two-parent households have better measured outcomes.'],
      mustNotCaricature: 'Do not write this as anti-religion.',
    }, config, async <T>(request: LlmJsonRequest) => {
      assert.match(request.systemPrompt, /NOT a modified plank/i)
      assert.match(request.userPrompt, /must_not_caricature/)
      return {
        title: 'Family formation without a creed',
        summary: 'Outcomes and order, not theology.',
        planks: ['Kids do better with two committed parents.'],
        rationale: 'Sounds like that camp.',
        warnings: [],
      } as T
    })
    assert.equal(result.source, 'llm')
    assert.equal(result.planks.length, 1)
  })

  it('falls back without an API key', async () => {
    const bare: CauseAssistConfig = { ...config, apiKey: undefined }
    const modified = await draftModifiedPlank({ parentPlanks: ['A.'], currentDraft: 'Keep me.' }, bare)
    assert.equal(modified.source, 'fallback')
    assert.equal(modified.plank, 'Keep me.')
    const critique = await critiqueTriple({ modifiedPlanks: ['A.', 'B.'], bridgePlank: 'C.' }, bare)
    assert.equal(critique.source, 'fallback')
    assert.ok(critique.objections.length > 0)
    const standIn = await draftStandInSliver({
      sideLabel: 'secular conservatives',
      currentDraft: { title: 'Keep title', planks: ['Keep plank.'] },
    }, bare)
    assert.equal(standIn.source, 'fallback')
    assert.equal(standIn.title, 'Keep title')
    assert.equal(standIn.planks[0], 'Keep plank.')
  })
})
