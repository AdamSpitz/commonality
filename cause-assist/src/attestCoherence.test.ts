import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { attestCoherenceIfJudged } from './attestCoherence.js'
import { previewRosterCid } from './rosterDocument.js'
import type { CauseAssistConfig } from './types.js'
import type { CoherenceVerdict } from './coherenceCheck.js'

const baseConfig: CauseAssistConfig = {
  apiBaseUrl: 'https://api.example.test/v1',
  suggestModel: 'test',
  safetyModel: 'test',
  implicationModel: 'test',
  coherenceModel: 'test',
  port: 0,
}

const plankCid = 'bafkreiplank1'
const fields = {
  title: 'Neighborhood parks',
  summary: 'We want more local parks and green space for families.',
  plankCids: [plankCid],
  mediatorBlurb: '',
}
const rosterCid = previewRosterCid(fields)
const plankText = 'Our city should fund neighborhood parks.'

const loadOk = async (cid: string) => (cid === plankCid ? plankText : null)

function llmVerdict(overrides: Partial<CoherenceVerdict> = {}): CoherenceVerdict {
  return {
    coherent: true,
    reasoning: 'Issues match the summary.',
    attesterId: 'cause-assist-coherence-v1',
    rosterCid,
    source: 'llm',
    ...overrides,
  }
}

describe('attestCoherenceIfJudged', () => {
  it('rejects when client fields do not recompute to the claimed rosterCid', async () => {
    const result = await attestCoherenceIfJudged(
      {
        rosterCid: 'bafywrongcid',
        title: fields.title,
        summary: fields.summary,
        plankCids: fields.plankCids,
      },
      baseConfig,
      { loadStatementText: loadOk },
    )
    assert.equal(result.attested, false)
    assert.equal(result.reason, 'roster_mismatch')
    assert.equal(result.verdict, undefined)
  })

  it('rejects when plank text cannot be loaded for a bound CID', async () => {
    const result = await attestCoherenceIfJudged(
      {
        rosterCid,
        title: fields.title,
        summary: fields.summary,
        plankCids: fields.plankCids,
      },
      baseConfig,
      { loadStatementText: async () => null },
    )
    assert.equal(result.attested, false)
    assert.equal(result.reason, 'roster_unavailable')
  })

  it('stays silent when LLM judges not coherent (no chain write)', async () => {
    const result = await attestCoherenceIfJudged(
      {
        rosterCid,
        title: fields.title,
        summary: fields.summary,
        plankCids: fields.plankCids,
      },
      baseConfig,
      {
        loadStatementText: loadOk,
        checkCoherenceFn: async () => llmVerdict({ coherent: false, reasoning: 'Riders.' }),
      },
    )
    assert.equal(result.attested, false)
    assert.equal(result.reason, 'not_coherent')
    assert.equal(result.verdict?.coherent, false)
    assert.equal(result.txHash, undefined)
  })

  it('does not mint a badge when only the heuristic fallback is available', async () => {
    const result = await attestCoherenceIfJudged(
      {
        rosterCid,
        title: fields.title,
        summary: fields.summary,
        plankCids: fields.plankCids,
      },
      baseConfig,
      {
        loadStatementText: loadOk,
        // No apiKey → real checkCoherence uses heuristic; force it explicitly:
        checkCoherenceFn: async (req) => ({
          coherent: true,
          reasoning: 'heuristic pass',
          attesterId: 'cause-assist-coherence-v1',
          rosterCid: req.rosterCid,
          source: 'heuristic',
        }),
      },
    )
    assert.equal(result.attested, false)
    assert.equal(result.reason, 'judgment_unavailable')
    assert.equal(result.verdict?.source, 'heuristic')
  })

  it('reports attester_not_configured when LLM-coherent but no operator key', async () => {
    const result = await attestCoherenceIfJudged(
      {
        rosterCid,
        title: fields.title,
        summary: fields.summary,
        plankCids: fields.plankCids,
      },
      baseConfig,
      {
        loadStatementText: loadOk,
        checkCoherenceFn: async () => llmVerdict(),
      },
    )
    assert.equal(result.attested, false)
    assert.equal(result.reason, 'attester_not_configured')
    assert.equal(result.verdict?.coherent, true)
    assert.equal(result.verdict?.source, 'llm')
  })

  it('judges loaded plank text, not client-supplied free-form strings', async () => {
    let seenPlanks: string[] | undefined
    await attestCoherenceIfJudged(
      {
        rosterCid,
        title: fields.title,
        summary: fields.summary,
        plankCids: fields.plankCids,
      },
      baseConfig,
      {
        loadStatementText: async () => 'Loaded from CID, not the client body.',
        checkCoherenceFn: async (req) => {
          seenPlanks = req.planks
          return llmVerdict({ rosterCid: req.rosterCid })
        },
      },
    )
    assert.deepEqual(seenPlanks, ['Loaded from CID, not the client body.'])
  })
})
