import { afterEach, describe, expect, it } from 'vitest'
import {
  createBridge,
  emptyParent,
  findBridgeByStable,
  forgetUnsavedBridges,
  getBridge,
  isEmptyBridgeDraft,
  listBridges,
  rememberPublishedCluster,
  updateBridge,
} from './bridgeStore'

describe('bridgeStore', () => {
  afterEach(() => {
    forgetUnsavedBridges()
    window.localStorage.clear()
  })

  it('starts with two parent slots but does not freeze that count', () => {
    const draft = createBridge()
    expect(draft.parents).toHaveLength(2)
    const next = updateBridge(draft.id, {
      parents: [...draft.parents, { ...emptyParent(), id: 'third' }],
    })
    expect(next?.parents).toHaveLength(3)
    expect(isEmptyBridgeDraft(next!)).toBe(true)
  })

  it('persists once the mediator names the cluster', () => {
    const draft = createBridge()
    updateBridge(draft.id, { mediatorName: 'Ada' })
    forgetUnsavedBridges()
    expect(getBridge(draft.id)?.mediatorName).toBe('Ada')
  })

  it('persists a parent seeded from a cause page so reload does not blank the slot', () => {
    const draft = createBridge({
      owner: '0x1111111111111111111111111111111111111111',
      slug: 'faithful-neighbors',
      title: 'Faithful Neighbors',
    })
    forgetUnsavedBridges()
    const saved = getBridge(draft.id)
    expect(saved?.parents[0]?.owner).toBe('0x1111111111111111111111111111111111111111')
    expect(saved?.parents[0]?.slug).toBe('faithful-neighbors')
    expect(saved?.parents[0]?.title).toBe('Faithful Neighbors')
  })

  it('remembers a published cluster so a parent cause can list the citation', () => {
    rememberPublishedCluster({
      owner: '0x1111111111111111111111111111111111111111',
      slug: 'neighbors-localists',
      clusterCid: 'bafycluster',
      mediatorName: 'Neighbors and Localists',
      parents: [{
        owner: '0x2222222222222222222222222222222222222222',
        slug: 'faithful-neighbors',
      }],
    })
    const saved = findBridgeByStable('0x1111111111111111111111111111111111111111', 'neighbors-localists')
    expect(saved?.clusterCid).toBe('bafycluster')
    expect(saved?.parents[0]?.slug).toBe('faithful-neighbors')
    expect(listBridges()).toHaveLength(1)
    rememberPublishedCluster({
      owner: '0x1111111111111111111111111111111111111111',
      slug: 'neighbors-localists',
      clusterCid: 'bafycluster2',
      mediatorName: 'Neighbors and Localists',
      parents: [{
        owner: '0x2222222222222222222222222222222222222222',
        slug: 'faithful-neighbors',
      }],
    })
    expect(listBridges()).toHaveLength(1)
    expect(findBridgeByStable('0x1111111111111111111111111111111111111111', 'neighbors-localists')?.clusterCid)
      .toBe('bafycluster2')
  })
})
