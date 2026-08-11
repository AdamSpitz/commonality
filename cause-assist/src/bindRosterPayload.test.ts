import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { bindRosterPayload } from './bindRosterPayload.js'
import { previewRosterCid } from './rosterDocument.js'

describe('bindRosterPayload', () => {
  const plankCid = 'bafkreiplankabc'
  const fields = {
    title: 'Oak Street lights',
    summary: 'Neighbors funding working lights on Oak Street.',
    plankCids: [plankCid],
    mediatorBlurb: 'Local mediator note',
  }
  const rosterCid = previewRosterCid(fields)

  it('returns a payload with statement texts loaded by plank CID', async () => {
    const result = await bindRosterPayload(
      { rosterCid, ...fields },
      async (cid) => (cid === plankCid ? '  Repair broken streetlights.  ' : null),
    )
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.payload.rosterCid, rosterCid)
    assert.deepEqual(result.payload.planks, ['Repair broken streetlights.'])
    assert.equal(result.payload.title, fields.title)
    assert.equal(result.payload.mediatorBlurb, fields.mediatorBlurb)
  })

  it('fails closed on CID mismatch (coherent text cannot badge an unrelated roster)', async () => {
    const result = await bindRosterPayload(
      {
        rosterCid: 'bafkreisomeotherroster',
        ...fields,
      },
      async () => 'Repair lights.',
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, 'roster_mismatch')
  })

  it('fails closed when any plank document is missing', async () => {
    const result = await bindRosterPayload(
      { rosterCid, ...fields },
      async () => null,
    )
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, 'roster_unavailable')
  })
})
