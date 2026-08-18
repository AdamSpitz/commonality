import { afterEach, describe, expect, it } from 'vitest'
import {
  createBridge,
  forgetUnsavedBridges,
  getBridge,
  isEmptyBridgeDraft,
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
      parents: [...draft.parents, {
        id: 'third',
        owner: '',
        slug: '',
        title: '',
        parentPlanks: [],
        modified: { title: '', summary: '', slug: '', planks: [] },
      }],
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
})
