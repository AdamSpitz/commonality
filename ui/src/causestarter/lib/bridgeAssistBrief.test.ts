import { afterEach, describe, expect, it } from 'vitest'
import {
  applyBridgeClusterPatch,
  BRIDGE_CLUSTER_PATCH_SCHEMA,
  buildBridgeAssistBrief,
  parseBridgeClusterPatch,
} from './bridgeAssistBrief'
import { createBridge, forgetUnsavedBridges, updateBridge } from './bridgeStore'
import { newPlank } from './causeStore'

describe('bridge assist brief', () => {
  afterEach(() => {
    forgetUnsavedBridges()
    window.localStorage.clear()
  })

  it('embeds current parent texts and the required return schema', () => {
    forgetUnsavedBridges()
    const draft = createBridge()
    const parent = draft.parents[0]
    if (!parent) throw new Error('expected default parents')
    updateBridge(draft.id, {
      mediatorName: 'Parish mediator',
      parents: [{
        ...parent,
        title: 'Christianity',
        slug: 'christianity',
        parentPlanks: [newPlank('Marriage is a covenant.', 'user', 'bafy1')],
        modified: { ...parent.modified, planks: [newPlank('WIP Christian wording')] },
      }, draft.parents[1]!],
    })
    const next = updateBridge(draft.id, {}) ?? draft
    const brief = buildBridgeAssistBrief(next)
    expect(brief).toContain('human remains the publisher')
    expect(brief).toContain(BRIDGE_CLUSTER_PATCH_SCHEMA)
    expect(brief).toContain('Marriage is a covenant.')
    expect(brief).toContain('WIP Christian wording')
    expect(brief).toContain('format example only')
    expect(brief).toContain('stand-in parent')
    expect(brief).toContain('do not paste the bridge sentences')
    expect(brief).not.toContain('We come to this from different places')
  })

  it('parses fenced JSON and applies plank replacements', () => {
    forgetUnsavedBridges()
    const draft = createBridge()
    const parsed = parseBridgeClusterPatch(`
\`\`\`json
{"schema":"${BRIDGE_CLUSTER_PATCH_SCHEMA}","parents":[{"index":0,"planks":["Modified A"]}],"bridge":{"planks":["Shared C"]},"notes":"ok"}
\`\`\`
`)
    if ('error' in parsed) throw new Error(parsed.error)
    const applied = applyBridgeClusterPatch(draft, parsed.patch)
    expect(applied.parents[0]?.modified.planks[0]?.text).toBe('Modified A')
    expect(applied.bridge.planks[0]?.text).toBe('Shared C')
    expect(parsed.patch.notes).toBe('ok')
  })

  it('rejects the wrong schema', () => {
    const parsed = parseBridgeClusterPatch('{"schema":"nope","bridge":{"planks":["x"]}}')
    expect('error' in parsed).toBe(true)
  })
})
