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

export interface BridgeParentDraft {
  id: string
  owner: string
  slug: string
  title: string
  parentPlanks: CausePlank[]
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
    owner: '',
    slug: '',
    title: '',
    parentPlanks: [],
    modified: emptyCause(),
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
    return Array.isArray(parsed) ? parsed : []
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

export function createBridge(): BridgeDraft {
  const now = new Date().toISOString()
  const draft: BridgeDraft = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    mediatorName: '',
    mediatorNote: '',
    parents: [emptyParent(), emptyParent()],
    bridge: emptyCause(),
    pairs: [],
  }
  unsaved.set(draft.id, draft)
  return draft
}

export function createBridgePath(): string {
  return `/bridge/${createBridge().id}`
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
