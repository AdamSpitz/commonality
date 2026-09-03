import { describe, expect, it } from 'vitest'
import {
  buildClusterDocument,
  nudgeTargets,
  parseClusterDocument,
  previewClusterCid,
  validateClusterFields,
  type BridgeClusterFields,
} from './bridgeCluster'

const parentA = {
  owner: '0x1111111111111111111111111111111111111111' as const,
  slug: 'natural-left',
}
const parentB = {
  owner: '0x2222222222222222222222222222222222222222' as const,
  slug: 'natural-right',
}

function fields(partial: Partial<BridgeClusterFields> = {}): BridgeClusterFields {
  return {
    mediatorName: 'Ada Mediator',
    mediatorNote: 'Hand-authored settlement.',
    mediatorAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    parents: [parentA, parentB],
    modified: [
      { owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', slug: 'left-modified', parentOwner: parentA.owner, parentSlug: parentA.slug },
      { owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', slug: 'right-modified', parentOwner: parentB.owner, parentSlug: parentB.slug },
    ],
    bridge: { owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', slug: 'shared-bridge' },
    pairs: [
      { fromCid: 'bafyfrom1', toCid: 'bafyto1', role: 'modified-to-bridge' },
      { fromCid: 'bafyfrom1', toCid: 'bafyparent1', role: 'modified-to-parent' },
    ],
    ...partial,
  }
}

describe('bridgeCluster', () => {
  it('does not hard-code two parents: n modified + one bridge is valid', () => {
    const three = fields({
      parents: [
        parentA,
        parentB,
        { owner: '0x3333333333333333333333333333333333333333', slug: 'natural-third' },
      ],
      modified: [
        { owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', slug: 'left-modified', parentOwner: parentA.owner, parentSlug: parentA.slug },
        { owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', slug: 'right-modified', parentOwner: parentB.owner, parentSlug: parentB.slug },
        {
          owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          slug: 'third-modified',
          parentOwner: '0x3333333333333333333333333333333333333333',
          parentSlug: 'natural-third',
        },
      ],
    })
    expect(validateClusterFields(three)).toBeNull()
    expect(three.modified.length).toBe(three.parents.length)
  })

  it('rejects a cluster with no plank pairs (causes do not imply each other)', () => {
    expect(validateClusterFields(fields({ pairs: [] }))).toMatch(/plank pair/i)
  })

  it('allows a stand-in parent to skip modified and use parent→bridge pairs', () => {
    expect(validateClusterFields(fields({
      parents: [parentA],
      modified: [],
      pairs: [{ fromCid: 'bafyfrom1', toCid: 'bafyto1', role: 'parent-to-bridge' }],
    }))).toBeNull()
  })

  it('rejects a modified cause that does not match a listed parent', () => {
    expect(validateClusterFields(fields({
      modified: [
        { owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', slug: 'left-modified', parentOwner: parentA.owner, parentSlug: parentA.slug },
        {
          owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          slug: 'orphan-modified',
          parentOwner: '0x9999999999999999999999999999999999999999',
          parentSlug: 'missing',
        },
      ],
    }))).toMatch(/not in this cluster/)
  })

  it('round-trips a cluster document and keeps CIDs stable', () => {
    const doc = buildClusterDocument(fields())
    const parsed = parseClusterDocument(doc)
    expect(parsed?.mediatorName).toBe('Ada Mediator')
    expect(parsed?.parents).toHaveLength(2)
    expect(parsed?.modified).toHaveLength(2)
    expect(parsed?.pairs[0]?.role).toBe('modified-to-bridge')
    expect(previewClusterCid(fields())).toBe(previewClusterCid(fields()))
  })

  it('nudge targets are parent → modified, never parent → bridge', () => {
    const targets = nudgeTargets(fields())
    expect(targets).toEqual([
      { from: parentA, to: { owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', slug: 'left-modified' } },
      { from: parentB, to: { owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', slug: 'right-modified' } },
    ])
    expect(targets.every((t) => t.to.slug !== 'shared-bridge')).toBe(true)
  })
})
