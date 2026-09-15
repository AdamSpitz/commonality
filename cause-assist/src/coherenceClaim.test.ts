import assert from 'node:assert/strict'
import { describe, it } from 'mocha'
import { ROSTER_COHERENCE_CLAIM, ROSTER_COHERENCE_TOPIC } from './coherenceClaim.js'

describe('coherenceClaim well-known CIDs', () => {
  it('matches the pinned Commonality roster coherence topic and claim', () => {
    // Keep in lockstep with ui/src/commonality/lib/causeRoster.test.ts
    assert.equal(
      ROSTER_COHERENCE_TOPIC,
      'bafkreigcuduguak3tvfltu56ggksxheukrqtbvf22zntpb7uibbpni27zm',
    )
    assert.equal(
      ROSTER_COHERENCE_CLAIM,
      'bafkreiddm4nvelu26hac2hqc6gpaegbrvcjfficxoddgnhjxedokngrv6a',
    )
  })
})
