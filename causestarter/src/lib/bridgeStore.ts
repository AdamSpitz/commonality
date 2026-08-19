/**
 * Local drafts for a human-authored bridge cluster.
 *
 * The published artifact lives in PublishedData (see bridgeCluster.ts). This
 * store is only the in-progress editor: natural parents, modified slivers,
 * the bridge cause, and intended plank pairs.
 */

import { newPlank, type CausePlank } from './causeStore'
import type { ImplicationPairRole } from './bridgeCluster'

export interface BridgeCauseDraft {
  title: string
  summary: string
  slug: string
  founderAddress?: string
  rosterCid?: string
  planks: CausePlank[]
}

export const STAND_IN_CAUSE_NOTICE =
  'Mediator-authored stand-in. This is not an official publication of that camp.'

export type BridgeParentKind = 'published' | 'stand-in'

export interface BridgeParentDraft {
  id: string
  /** published = load someone else's cause; stand-in = mediator writes the parent sliver. */
  kind: BridgeParentKind
  owner: string
  slug: string
  title: string
  summary: string
  parentPlanks: CausePlank[]
  /** Skip C_im when the parent is already a thin stand-in the mediator just wrote. */
  skipModified: boolean
  modified: BridgeCauseDraft
}

export interface BridgePairDraft {
  id: string
  fromPlankId: string
  toPlankId: string
  role: ImplicationPairRole
}

export interface BridgeDraft {
  id: string
  createdAt: string
  updatedAt: string
  mediatorName: string
  mediatorNote: string
  slug?: string
  founderAddress?: string
  clusterCid?: string
  parents: BridgeParentDraft[]
  bridge: BridgeCauseDraft
  pairs: BridgePairDraft[]
}

const STORAGE_KEY = 'causestarter.bridges.v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emptyCause(): BridgeCauseDraft {
  return { title: '', summary: '', slug: '', planks: [newPlank()] }
}

export function emptyParent(): BridgeParentDraft {
  return {
    id: crypto.randomUUID(),
    kind: 'published',
    owner: '',
    slug: '',
    title: '',
    summary: '',
    parentPlanks: [],
    skipModified: false,
    modified: emptyCause(),
  }
}

export function emptyStandInParent(): BridgeParentDraft {
  return {
    ...emptyParent(),
    kind: 'stand-in',
    skipModified: true,
    parentPlanks: [newPlank()],
  }
}

/** Planks that imply the bridge for this parent: modified, or stand-in parent when skipped. */
export function implicationSourcePlanks(parent: BridgeParentDraft): CausePlank[] {
  const modifiedEmpty = parent.modified.planks.every((plank) => !plank.text.trim())
  if (parent.skipModified || (parent.kind === 'stand-in' && modifiedEmpty)) {
    return parent.parentPlanks
  }
  return parent.modified.planks
}

function normalizeParent(raw: Partial<BridgeParentDraft> & { id?: string }): BridgeParentDraft {
  const base = emptyParent()
  return {
    ...base,
    ...raw,
    id: raw.id ?? base.id,
    kind: raw.kind === 'stand-in' ? 'stand-in' : 'published',
    summary: raw.summary ?? '',
    skipModified: raw.skipModified ?? raw.kind === 'stand-in',
    parentPlanks: Array.isArray(raw.parentPlanks) ? raw.parentPlanks : [],
    modified: raw.modified ?? emptyCause(),
  }
}

function persistable(drafts: BridgeDraft[]): BridgeDraft[] {
  return drafts.filter((draft) => !isEmptyBridgeDraft(draft))
}

export function isEmptyBridgeDraft(draft: BridgeDraft): boolean {
  return !draft.mediatorName.trim()
    && !draft.mediatorNote.trim()
    && !draft.clusterCid
    && !draft.slug?.trim()
    && draft.parents.every((parent) => (
      !parent.owner.trim()
      && !parent.slug.trim()
      && !parent.title.trim()
      && !parent.summary.trim()
      && parent.parentPlanks.every((plank) => !plank.text.trim())
      && !parent.modified.title.trim()
      && parent.modified.planks.every((plank) => !plank.text.trim())
    ))
    && !draft.bridge.title.trim()
    && draft.bridge.planks.every((plank) => !plank.text.trim())
    && draft.pairs.length === 0
}

const unsaved = new Map<string, BridgeDraft>()

export function forgetUnsavedBridges(): void {
  unsaved.clear()
}

function readAll(): BridgeDraft[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BridgeDraft[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((draft) => ({
      ...draft,
      parents: Array.isArray(draft.parents) ? draft.parents.map(normalizeParent) : [],
    }))
  } catch {
    return []
  }
}

function writeAll(drafts: BridgeDraft[]): void {
  if (!canUseStorage()) return
  const kept = persistable(drafts)
  if (kept.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kept))
}

export function listBridges(): BridgeDraft[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getBridge(id: string): BridgeDraft | undefined {
  return unsaved.get(id) ?? readAll().find((draft) => draft.id === id)
}

/** The cause a bridge was started from, dropped into natural parent 1. */
export interface BridgeParentSeed {
  owner: string
  slug: string
  title?: string
}

function seededParent(seed: BridgeParentSeed): BridgeParentDraft {
  return {
    ...emptyParent(),
    owner: seed.owner.trim().toLowerCase(),
    slug: seed.slug.trim(),
    title: seed.title?.trim() ?? '',
  }
}

export function createBridge(seed?: BridgeParentSeed): BridgeDraft {
  const now = new Date().toISOString()
  const first = seed?.owner.trim() && seed.slug.trim() ? seededParent(seed) : emptyParent()
  const draft: BridgeDraft = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    mediatorName: '',
    mediatorNote: '',
    parents: [first, emptyParent()],
    bridge: emptyCause(),
    pairs: [],
  }
  unsaved.set(draft.id, draft)
  return draft
}

export function createBridgePath(seed?: BridgeParentSeed): string {
  return `/bridge/${createBridge(seed).id}`
}

export function updateBridge(
  id: string,
  patch: Partial<Omit<BridgeDraft, 'id' | 'createdAt'>>,
): BridgeDraft | undefined {
  const existing = getBridge(id)
  if (!existing) return undefined
  const updated: BridgeDraft = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  if (isEmptyBridgeDraft(updated)) {
    unsaved.set(id, updated)
    writeAll(readAll().filter((draft) => draft.id !== id))
    return updated
  }
  unsaved.delete(id)
  const drafts = readAll()
  const index = drafts.findIndex((draft) => draft.id === id)
  if (index < 0) writeAll([...drafts, updated])
  else {
    drafts[index] = updated
    writeAll(drafts)
  }
  return updated
}

export function findBridgeByStable(owner: string, slug: string): BridgeDraft | undefined {
  const needleOwner = owner.toLowerCase()
  return listBridges().find((draft) => (
    draft.founderAddress?.toLowerCase() === needleOwner && draft.slug === slug
  )) ?? [...unsaved.values()].find((draft) => (
    draft.founderAddress?.toLowerCase() === needleOwner && draft.slug === slug
  ))
}

export function markClusterPublished(
  id: string,
  args: { slug: string; founderAddress: string; clusterCid: string },
): BridgeDraft | undefined {
  return updateBridge(id, {
    slug: args.slug,
    founderAddress: args.founderAddress.toLowerCase(),
    clusterCid: args.clusterCid,
  })
}

/**
 * Persist a published cluster this client has actually loaded so the parent
 * cause page can list it later (ADR 0011: remember opened citations, do not crawl).
 */
export function rememberPublishedCluster(args: {
  owner: string
  slug: string
  clusterCid: string
  mediatorName: string
  mediatorNote?: string
  parents: Array<{ owner: string; slug: string }>
}): BridgeDraft {
  const owner = args.owner.toLowerCase()
  const existing = findBridgeByStable(owner, args.slug)
  const parents: BridgeParentDraft[] = args.parents.length > 0
    ? args.parents.map((parent) => ({
      ...emptyParent(),
      owner: parent.owner.toLowerCase(),
      slug: parent.slug,
    }))
    : [emptyParent()]
  const patch = {
    mediatorName: args.mediatorName,
    mediatorNote: args.mediatorNote ?? '',
    slug: args.slug,
    founderAddress: owner,
    clusterCid: args.clusterCid,
    parents,
  }
  if (existing) {
    return updateBridge(existing.id, patch) ?? existing
  }
  const created = createBridge()
  return updateBridge(created.id, patch) ?? created
}

export function allDraftPlanks(draft: BridgeDraft): CausePlank[] {
  return [
    ...draft.parents.flatMap((parent) => parent.modified.planks),
    ...draft.bridge.planks,
  ]
}

export function plankById(draft: BridgeDraft, plankId: string): CausePlank | undefined {
  return allDraftPlanks(draft).find((plank) => plank.id === plankId)
    ?? draft.parents.flatMap((parent) => parent.parentPlanks).find((plank) => plank.id === plankId)
}
