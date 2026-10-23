import { describe, expect, it } from 'vitest'
import type { BridgeClusterFields } from './bridgeCluster'
import { campShortName, campStories, layoutCluster, pairKey, type CauseSnapshot } from './bridgeClusterReader'

const parentA = {
  owner: '0x1111111111111111111111111111111111111111' as const,
  slug: 'camp-a',
}
const parentB = {
  owner: '0x2222222222222222222222222222222222222222' as const,
  slug: 'camp-b',
}
const mediator = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const

function snap(ref: { owner: `0x${string}`; slug: string }, plankCids: string[], title: string): CauseSnapshot {
  return {
    owner: ref.owner,
    slug: ref.slug,
    title,
    summary: '',
    plankCids,
    planks: plankCids.map((cid) => ({ cid, text: `text of ${cid}` })),
    featuredPlank: plankCids[0] ? `text of ${plankCids[0]}` : '',
  }
}

function fields(): BridgeClusterFields {
  return {
    mediatorName: 'Ada',
    mediatorNote: 'A settlement both sides can sign.',
    mediatorAddress: mediator,
    parents: [parentA, parentB],
    modified: [
      { owner: mediator, slug: 'a-wording', parentOwner: parentA.owner, parentSlug: parentA.slug },
    ],
    bridge: { owner: mediator, slug: 'shared' },
    pairs: [
      { fromCid: 'mod-a', toCid: 'bridge-1', role: 'modified-to-bridge' },
      { fromCid: 'mod-a', toCid: 'parent-a-plank', role: 'modified-to-parent' },
      { fromCid: 'parent-b-plank', toCid: 'bridge-1', role: 'parent-to-bridge' },
      { fromCid: 'unknown', toCid: 'bridge-1', role: 'modified-to-bridge' },
    ],
  }
}

describe('layoutCluster', () => {
  const snapshots = new Map<string, CauseSnapshot>([
    [`${parentA.owner}:${parentA.slug}`, snap(parentA, ['parent-a-plank'], 'Camp A')],
    [`${parentB.owner}:${parentB.slug}`, snap(parentB, ['parent-b-plank'], 'Camp B')],
    [`${mediator}:a-wording`, snap({ owner: mediator, slug: 'a-wording' }, ['mod-a'], 'Wording for A')],
    [`${mediator}:shared`, snap({ owner: mediator, slug: 'shared' }, ['bridge-1'], 'The settlement')],
  ])
  const texts = new Map([
    ['mod-a', 'Modified wording'],
    ['bridge-1', 'Shared claim'],
    ['parent-a-plank', 'Original A'],
    ['parent-b-plank', 'Original B'],
  ])

  it('groups pairs under the camp whose planks they start from', () => {
    const layout = layoutCluster(
      fields(),
      snapshots,
      texts,
      new Set([pairKey('mod-a', 'bridge-1')]),
    )
    expect(layout.bridge.title).toBe('The settlement')
    expect(layout.camps).toHaveLength(2)
    expect(layout.camps[0]?.modified?.title).toBe('Wording for A')
    expect(layout.camps[0]?.pairs.map((pair) => pair.role)).toEqual([
      'modified-to-bridge',
      'modified-to-parent',
    ])
    expect(layout.camps[0]?.pairs[0]).toMatchObject({
      fromText: 'Modified wording',
      toText: 'Shared claim',
      attested: true,
    })
    expect(layout.camps[0]?.pairs[1]?.attested).toBe(false)
    expect(layout.camps[1]?.modified).toBeNull()
    expect(layout.camps[1]?.pairs).toHaveLength(1)
    expect(layout.camps[1]?.pairs[0]?.fromText).toBe('Original B')
    expect(layout.loosePairs).toHaveLength(1)
    expect(layout.loosePairs[0]?.fromText).toBe('unknown…')
  })

  it('names camps from the slug tail and builds nudge then implication', () => {
    expect(campShortName(
      'network-societies-v1-b2-checkout-trial-bridge-left',
      'A long title that should not be the chip',
      0,
    )).toBe('Left')
    const stories = campStories(layoutCluster(fields(), snapshots, texts, new Set([pairKey('mod-a', 'bridge-1')])))
    expect(stories.map((story) => story.shortName)).toEqual(['A', 'B'])
    expect(stories[0]?.nudges).toEqual([{
      fromCid: 'parent-a-plank',
      toCid: 'mod-a',
      fromText: 'Original A',
      toText: 'Modified wording',
    }])
    expect(stories[0]?.implications[0]).toMatchObject({
      fromCid: 'mod-a',
      toCid: 'bridge-1',
      attested: true,
    })
    expect(stories[1]?.nudges).toEqual([])
    expect(stories[1]?.implications).toHaveLength(1)
  })
})
