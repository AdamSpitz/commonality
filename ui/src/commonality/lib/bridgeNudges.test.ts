import { describe, expect, it } from 'vitest'
import { buildNudgeBatchDocument, parentToModifiedNudges } from './bridgeNudges'
import type { IntendedPair } from './bridgeCluster'

const pairs: IntendedPair[] = [
  { fromCid: 'bafymod1', toCid: 'bafybridge1', role: 'modified-to-bridge' },
  { fromCid: 'bafymod1', toCid: 'bafyparent1', role: 'modified-to-parent' },
]

describe('parentToModifiedNudges', () => {
  it('inverts modified→parent pairs and ignores modified→bridge', () => {
    expect(parentToModifiedNudges(pairs)).toEqual([
      {
        targetStatementCid: 'bafyparent1',
        suggestedStatementCid: 'bafymod1',
        reason: 'Mediator wording of your side. Signing it still implies the parent plank.',
        confidence: 0.8,
      },
    ])
  })

  it('does not invent nudges when there are no modified→parent pairs', () => {
    expect(parentToModifiedNudges(pairs.filter((p) => p.role === 'modified-to-bridge'))).toEqual([])
  })
})

describe('buildNudgeBatchDocument', () => {
  it('is a schemaVersion 1 nudge-batch under the mediator address', () => {
    const doc = buildNudgeBatchDocument({
      nudger: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      nudges: parentToModifiedNudges(pairs),
      publishedAt: 1_700_000_000,
    })
    expect(doc).toMatchObject({
      kind: 'nudge-batch',
      schemaVersion: 1,
      nudger: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      publishedAt: 1_700_000_000,
      revocations: [],
    })
    expect((doc.nudges as { targetStatementCid: string }[])[0]?.targetStatementCid).toBe('bafyparent1')
  })
})
