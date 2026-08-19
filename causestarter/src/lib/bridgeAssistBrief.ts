import { newPlank } from './causeStore'
import type { BridgeDraft, BridgeParentDraft } from './bridgeStore'

export const BRIDGE_CLUSTER_PATCH_SCHEMA = 'commonality.bridge-cluster-patch.v1'

export const FAMILY_FORMATION_EXAMPLE = {
  topic: 'family-formation (format example only — not your sides)',
  parentChristianSliver: 'Marriage and children are a covenant and a blessing.',
  parentSecularSliver: 'Stable two-parent households have better measured outcomes; birth rates are a civilizational problem.',
  modifiedChristian:
    'Marriage and children are among the best things God gives us, and I want to live in a country where forming a family is a normal, achievable thing rather than a luxury. I\'d rather have that be easy for everyone than argue about whose reasons for wanting it are the right ones.',
  modifiedSecular:
    'I\'m not religious, but the data on this isn\'t close: kids do better with two committed parents, and a country that has stopped forming families is storing up a problem it can\'t buy its way out of. I don\'t need a theological reason to think making family formation affordable and normal should be a priority.',
  bridge:
    'It should be easier than it currently is for people to marry and raise children — housing, cost, and working hours included. We come to this from different places, and neither of us needs the other\'s reasons to agree that a society where family formation has become impractical for ordinary people has a problem worth fixing.',
} as const

export interface BridgeClusterPatch {
  schema: typeof BRIDGE_CLUSTER_PATCH_SCHEMA
  parents?: Array<{
    index: number
    modifiedTitle?: string
    modifiedSummary?: string
    planks: string[]
  }>
  bridge?: {
    title?: string
    summary?: string
    planks: string[]
  }
  notes?: string
}

export function parentTexts(parent: BridgeParentDraft): string[] {
  return parent.parentPlanks.map((plank) => plank.text.trim()).filter(Boolean)
}

export function modifiedTexts(parent: BridgeParentDraft): string[] {
  return parent.modified.planks.map((plank) => plank.text.trim()).filter(Boolean)
}

export function buildBridgeAssistBrief(draft: BridgeDraft): string {
  const parents = draft.parents.map((parent, index) => ({
    index,
    title: parent.title.trim() || parent.slug.trim() || `Parent ${index + 1}`,
    owner: parent.owner.trim(),
    slug: parent.slug.trim(),
    parentPlanks: parentTexts(parent),
    currentModifiedTitle: parent.modified.title.trim(),
    currentModifiedSummary: parent.modified.summary.trim(),
    currentModifiedPlanks: modifiedTexts(parent),
  }))

  const payload = {
    task: 'Propose wording patches for a human-authored Commonality bridge cluster. The human remains the publisher. Do not invent implication arrows. Do not write a standing mediator strategy prompt.',
    rules: [
      'A modified cause is a thinner sliver of its parent, not a full rewrite of that movement.',
      'Each modified plank must still sound like that camp and keep that camp\'s reasons.',
      'The bridge plank is a shared conclusion. It must not require either side\'s justification (no theology a secular signer must affirm; no reduction of faith to "studies show").',
      'Implication is plank-to-plank and must be obvious: anyone who signs the modified wording is already committed to the bridge wording.',
      'Silence is allowed. If the only bridge deletes a real conviction, return notes saying so and omit those planks.',
      'Return only the JSON object specified below. No markdown around it.',
    ],
    formatExample: FAMILY_FORMATION_EXAMPLE,
    currentDraft: {
      mediatorName: draft.mediatorName.trim(),
      mediatorNote: draft.mediatorNote.trim(),
      parents,
      bridge: {
        title: draft.bridge.title.trim(),
        summary: draft.bridge.summary.trim(),
        planks: draft.bridge.planks.map((plank) => plank.text.trim()).filter(Boolean),
      },
    },
    returnShape: {
      schema: BRIDGE_CLUSTER_PATCH_SCHEMA,
      parents: [
        { index: 0, modifiedTitle: 'optional', modifiedSummary: 'optional', planks: ['modified plank texts for parent 0'] },
      ],
      bridge: { title: 'optional', summary: 'optional', planks: ['shared plank texts'] },
      notes: 'optional: what you refused to invent',
    },
  }

  return [
    'Copy everything below this line into your own Claude, ChatGPT, or Grok chat.',
    'Paste the JSON it returns back into CauseStarter. Review before applying.',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
}

export function parseBridgeClusterPatch(raw: string): { patch: BridgeClusterPatch } | { error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { error: 'Paste the JSON your assistant returned.' }
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let parsed: unknown
  try {
    parsed = JSON.parse(fenced)
  } catch {
    const start = fenced.indexOf('{')
    const end = fenced.lastIndexOf('}')
    if (start < 0 || end <= start) return { error: 'Could not parse JSON from that paste.' }
    try {
      parsed = JSON.parse(fenced.slice(start, end + 1))
    } catch {
      return { error: 'Could not parse JSON from that paste.' }
    }
  }
  if (!parsed || typeof parsed !== 'object') return { error: 'Patch must be a JSON object.' }
  const record = parsed as Record<string, unknown>
  if (record.schema !== BRIDGE_CLUSTER_PATCH_SCHEMA) {
    return { error: `Expected schema ${BRIDGE_CLUSTER_PATCH_SCHEMA}.` }
  }
  const parentsRaw = Array.isArray(record.parents) ? record.parents : []
  const parents: NonNullable<BridgeClusterPatch['parents']> = []
  for (const item of parentsRaw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (!Number.isInteger(row.index) || (row.index as number) < 0) {
      return { error: 'Each parent patch needs a non-negative integer index.' }
    }
    const planks = asStringArray(row.planks)
    if (planks.length === 0) return { error: `Parent ${String(row.index)} needs at least one plank.` }
    parents.push({
      index: row.index as number,
      modifiedTitle: typeof row.modifiedTitle === 'string' ? row.modifiedTitle.trim() : undefined,
      modifiedSummary: typeof row.modifiedSummary === 'string' ? row.modifiedSummary.trim() : undefined,
      planks,
    })
  }
  let bridge: BridgeClusterPatch['bridge']
  if (record.bridge && typeof record.bridge === 'object') {
    const row = record.bridge as Record<string, unknown>
    const planks = asStringArray(row.planks)
    if (planks.length === 0) return { error: 'Bridge patch needs at least one plank.' }
    bridge = {
      title: typeof row.title === 'string' ? row.title.trim() : undefined,
      summary: typeof row.summary === 'string' ? row.summary.trim() : undefined,
      planks,
    }
  }
  if (parents.length === 0 && !bridge) {
    return { error: 'Patch has no parent or bridge wording to apply.' }
  }
  return {
    patch: {
      schema: BRIDGE_CLUSTER_PATCH_SCHEMA,
      parents,
      bridge,
      notes: typeof record.notes === 'string' ? record.notes.trim() : undefined,
    },
  }
}

export function applyBridgeClusterPatch(draft: BridgeDraft, patch: BridgeClusterPatch): BridgeDraft {
  const parents = draft.parents.map((parent, index) => {
    const update = patch.parents?.find((item) => item.index === index)
    if (!update) return parent
    return {
      ...parent,
      modified: {
        ...parent.modified,
        title: update.modifiedTitle || parent.modified.title,
        summary: update.modifiedSummary ?? parent.modified.summary,
        planks: update.planks.map((text) => newPlank(text, 'suggested')),
      },
    }
  })
  const bridge = patch.bridge
    ? {
      ...draft.bridge,
      title: patch.bridge.title || draft.bridge.title,
      summary: patch.bridge.summary ?? draft.bridge.summary,
      planks: patch.bridge.planks.map((text) => newPlank(text, 'suggested')),
    }
    : draft.bridge
  return { ...draft, parents, bridge }
}
