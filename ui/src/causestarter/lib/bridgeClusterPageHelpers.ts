import { implicationSourcePlanks, STAND_IN_CAUSE_NOTICE, type BridgeDraft, type BridgeParentDraft } from './bridgeStore'
import { normalizeSlug } from './causeRoster'

export function slugOrEmpty(raw: string): string {
  return raw.trim() ? normalizeSlug(raw) : ''
}

/**
 * Which side a plank belongs to. With two parents the pair dropdowns otherwise
 * show two similar-looking truncated sentences and no way to tell them apart.
 */
export function sideLabel(parent: BridgeParentDraft, index: number): string {
  return parent.title.trim() || parent.slug.trim() || `Parent ${index + 1}`
}

export function truncate(text: string): string {
  const trimmed = text.trim()
  return trimmed.length > 72 ? `${trimmed.slice(0, 72)}\u2026` : trimmed
}

export function parentSlotUsed(parent: BridgeParentDraft): boolean {
  return Boolean(
    parent.kind === 'stand-in'
    || parent.owner.trim()
    || parent.slug.trim()
    || parent.title.trim()
    || parent.summary.trim()
    || parent.parentPlanks.some((plank) => plank.text.trim())
    || parent.modified.title.trim()
    || parent.modified.slug.trim()
    || parent.modified.planks.some((plank) => plank.text.trim())
  )
}

export function withStandInNotice(summary: string): string {
  const trimmed = summary.trim()
  if (trimmed.includes(STAND_IN_CAUSE_NOTICE)) return trimmed
  return trimmed ? `${STAND_IN_CAUSE_NOTICE} ${trimmed}` : STAND_IN_CAUSE_NOTICE
}

export function nextImplicationPair(
  draft: BridgeDraft,
  role: 'modified-to-bridge' | 'modified-to-parent' | 'parent-to-bridge',
): { fromPlankId: string; toPlankId: string; role: typeof role } | null {
  const usedParents = draft.parents.filter(parentSlotUsed)
  const pairedFrom = new Set(draft.pairs.filter((pair) => pair.role === role).map((pair) => pair.fromPlankId))
  const sources = (item: BridgeParentDraft) => (
    role === 'parent-to-bridge' ? item.parentPlanks : implicationSourcePlanks(item)
  )
  const parent = usedParents.find((item) => sources(item).some((plank) => plank.text.trim() && !pairedFrom.has(plank.id)))
    ?? usedParents.find((item) => sources(item).some((plank) => plank.text.trim()))
    ?? draft.parents[0]
  const from = parent ? sources(parent).find((p) => p.text.trim() && !pairedFrom.has(p.id))
    ?? sources(parent).find((p) => p.text.trim())
    : undefined
  const to = role === 'modified-to-parent'
    ? parent?.parentPlanks.find((p) => p.text.trim()) ?? parent?.parentPlanks[0]
    : draft.bridge.planks.find((p) => p.text.trim())
  if (!from || !to) return null
  return { fromPlankId: from.id, toPlankId: to.id, role }
}
