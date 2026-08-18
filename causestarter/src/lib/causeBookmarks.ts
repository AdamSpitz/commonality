/**
 * Durable published-cause bookmarks: wallet MutableRef `bookmarked-causes`.
 *
 * Distinct from statement bookmarks (`bookmarks`), which are statement CIDs.
 * Unpublished drafts stay in localStorage only.
 *
 * The ref is last-write-wins JSON. `removed` is a tombstone list so a stale
 * device that still has a keep cannot union-sync a deletion back onto the
 * wallet. A later keep for the same identity drops that tombstone.
 */

import { MutableRefUpdaterAbi } from '@commonality/sdk/abis'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import {
  getUserRef,
  updateRef,
  type MutableRefUpdaterContract,
} from '@commonality/sdk/mutable-refs'
import type { WriteClients } from '@commonality/sdk/utils'
import { bookmarkCause, listCauses, publishedBookmarkIds, unbookmarkCause, type CauseDraft } from './causeStore'
import { applyPlankTexts, loadPlankTexts, loadRosterDocument, resolveRosterCid } from './causeRoster'
import { getRuntimeConfigValue } from './runtimeConfig'

export const CAUSE_BOOKMARKS_REF = 'bookmarked-causes'
export const CAUSE_BOOKMARKS_SCHEMA_VERSION = 2 as const
const REMOVED_STORAGE_KEY = 'causestarter.bookmark-removed.v1'
const KEPT_STORAGE_KEY = 'causestarter.bookmark-kept.v1'

export interface CauseBookmarkId {
  owner: string
  slug: string
  updatedAt?: string
}

export interface CauseBookmarkDocument {
  version: number
  causes: CauseBookmarkId[]
  removed: CauseBookmarkId[]
}

export function bookmarkKey(id: CauseBookmarkId): string {
  return `${id.owner.toLowerCase()}:${id.slug}`
}

function stampMs(id: CauseBookmarkId): number {
  if (!id.updatedAt) return 0
  const ms = Date.parse(id.updatedAt)
  return Number.isFinite(ms) ? ms : 0
}

function normalizeId(id: CauseBookmarkId, fallbackStamp?: string): CauseBookmarkId | null {
  const owner = id.owner.toLowerCase()
  const slug = id.slug
  if (!/^0x[0-9a-f]{40}$/.test(owner) || !slug) return null
  const updatedAt = id.updatedAt && Number.isFinite(Date.parse(id.updatedAt))
    ? id.updatedAt
    : fallbackStamp
  return updatedAt ? { owner, slug, updatedAt } : { owner, slug }
}

function parseIdList(value: unknown, fallbackStamp?: string): CauseBookmarkId[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const ids: CauseBookmarkId[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const parsed = normalizeId(item as CauseBookmarkId, fallbackStamp)
    if (!parsed) continue
    const key = bookmarkKey(parsed)
    if (seen.has(key)) continue
    seen.add(key)
    ids.push(parsed)
  }
  return ids
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStoredIds(key: string): CauseBookmarkId[] {
  if (!canUseStorage()) return []
  try {
    return parseIdList(JSON.parse(window.localStorage.getItem(key) ?? '[]'))
  } catch {
    return []
  }
}

function writeStoredIds(key: string, ids: CauseBookmarkId[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, JSON.stringify(ids))
}

export function readLocalBookmarkRemovals(): CauseBookmarkId[] {
  return readStoredIds(REMOVED_STORAGE_KEY)
}

export function readLocalBookmarkKeeps(): CauseBookmarkId[] {
  return readStoredIds(KEPT_STORAGE_KEY)
}

function writeLocalBookmarkRemovals(ids: CauseBookmarkId[]): void {
  writeStoredIds(REMOVED_STORAGE_KEY, ids)
}

function writeLocalBookmarkKeeps(ids: CauseBookmarkId[]): void {
  writeStoredIds(KEPT_STORAGE_KEY, ids)
}

function dropStoredId(ids: CauseBookmarkId[], id: CauseBookmarkId): CauseBookmarkId[] {
  const key = bookmarkKey(id)
  return ids.filter((row) => bookmarkKey(row) !== key)
}

export function rememberBookmarkRemoved(id: CauseBookmarkId, at = new Date().toISOString()): void {
  const next = normalizeId({ ...id, updatedAt: at })
  if (!next) return
  writeLocalBookmarkRemovals([...dropStoredId(readLocalBookmarkRemovals(), next), next])
  writeLocalBookmarkKeeps(dropStoredId(readLocalBookmarkKeeps(), next))
}

export function rememberBookmarkKept(id: CauseBookmarkId, at = new Date().toISOString()): void {
  const next = normalizeId({ ...id, updatedAt: at })
  if (!next) return
  writeLocalBookmarkKeeps([...dropStoredId(readLocalBookmarkKeeps(), next), next])
  writeLocalBookmarkRemovals(dropStoredId(readLocalBookmarkRemovals(), next))
}

export function parseCauseBookmarkDocument(value: string | null | undefined): CauseBookmarkDocument | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) {
    return { version: CAUSE_BOOKMARKS_SCHEMA_VERSION, causes: [], removed: [] }
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { version: CAUSE_BOOKMARKS_SCHEMA_VERSION, causes: [], removed: [] }
    }
    const record = parsed as { version?: unknown; causes?: unknown; removed?: unknown }
    return {
      version: typeof record.version === 'number' ? record.version : CAUSE_BOOKMARKS_SCHEMA_VERSION,
      causes: parseIdList(record.causes),
      removed: parseIdList(record.removed),
    }
  } catch {
    return { version: CAUSE_BOOKMARKS_SCHEMA_VERSION, causes: [], removed: [] }
  }
}

export function parseCauseBookmarkList(value: string | null | undefined): CauseBookmarkId[] | null {
  const document = parseCauseBookmarkDocument(value)
  return document ? document.causes : null
}

export function serializeCauseBookmarkDocument(document: CauseBookmarkDocument): string {
  return JSON.stringify({
    version: CAUSE_BOOKMARKS_SCHEMA_VERSION,
    causes: mergeBookmarkIds(document.causes),
    removed: mergeBookmarkIds(document.removed),
  })
}

export function serializeCauseBookmarkList(ids: CauseBookmarkId[]): string {
  return serializeCauseBookmarkDocument({
    version: CAUSE_BOOKMARKS_SCHEMA_VERSION,
    causes: ids,
    removed: [],
  })
}

export function mergeBookmarkIds(
  ...lists: Array<readonly CauseBookmarkId[]>
): CauseBookmarkId[] {
  const byKey = new Map<string, CauseBookmarkId>()
  for (const list of lists) {
    for (const id of list) {
      const next = normalizeId(id)
      if (!next) continue
      const key = bookmarkKey(next)
      const existing = byKey.get(key)
      if (!existing || stampMs(next) >= stampMs(existing)) byKey.set(key, next)
    }
  }
  return [...byKey.values()]
}

/** Equal stamps prefer remove so a keep cannot undo a same-instant delete. */
export function mergeBookmarkDocuments(
  ...documents: Array<CauseBookmarkDocument | null | undefined>
): CauseBookmarkDocument {
  type Kind = 'keep' | 'remove'
  const byKey = new Map<string, { id: CauseBookmarkId; kind: Kind }>()

  const consider = (id: CauseBookmarkId, kind: Kind) => {
    const next = normalizeId(id)
    if (!next) return
    const key = bookmarkKey(next)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { id: next, kind })
      return
    }
    const nextMs = stampMs(next)
    const existingMs = stampMs(existing.id)
    if (nextMs > existingMs || (nextMs === existingMs && kind === 'remove')) {
      byKey.set(key, { id: next, kind })
    }
  }

  for (const document of documents) {
    if (!document) continue
    for (const id of document.causes) consider(id, 'keep')
    for (const id of document.removed) consider(id, 'remove')
  }

  const causes: CauseBookmarkId[] = []
  const removed: CauseBookmarkId[] = []
  for (const row of byKey.values()) {
    if (row.kind === 'remove') removed.push(row.id)
    else causes.push(row.id)
  }
  return { version: CAUSE_BOOKMARKS_SCHEMA_VERSION, causes, removed }
}

export function sameBookmarkList(a: readonly CauseBookmarkId[], b: readonly CauseBookmarkId[]): boolean {
  if (a.length !== b.length) return false
  const stamps = new Map(a.map((id) => [bookmarkKey(id), stampMs(id)]))
  return b.every((id) => stamps.get(bookmarkKey(id)) === stampMs(id))
}

export function sameBookmarkDocument(a: CauseBookmarkDocument, b: CauseBookmarkDocument): boolean {
  return sameBookmarkList(a.causes, b.causes) && sameBookmarkList(a.removed, b.removed)
}

export function localBookmarkDocument(): CauseBookmarkDocument {
  const keepByKey = new Map(readLocalBookmarkKeeps().map((id) => [bookmarkKey(id), id]))
  const causes = publishedBookmarkIds().map((id) => keepByKey.get(bookmarkKey(id)) ?? normalizeId(id) ?? id)
  return {
    version: CAUSE_BOOKMARKS_SCHEMA_VERSION,
    causes,
    removed: readLocalBookmarkRemovals(),
  }
}

export async function readCauseBookmarkDocument(
  machinery: SDKMachinery,
  address: string,
): Promise<CauseBookmarkDocument | null> {
  const ref = await getUserRef(machinery, address, CAUSE_BOOKMARKS_REF)
  if (!ref) return null
  return parseCauseBookmarkDocument(ref.value)
}

export async function readCauseBookmarkList(
  machinery: SDKMachinery,
  address: string,
): Promise<CauseBookmarkId[] | null> {
  const document = await readCauseBookmarkDocument(machinery, address)
  return document ? document.causes : null
}

function mutableRefContract(): MutableRefUpdaterContract | null {
  const address = getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') as `0x${string}` | undefined
  if (!address) return null
  return { address, abi: MutableRefUpdaterAbi }
}

export async function writeCauseBookmarkDocument(
  clients: WriteClients,
  document: CauseBookmarkDocument,
): Promise<void> {
  const contract = mutableRefContract()
  if (!contract) throw new Error('MutableRefUpdater is not configured')
  await updateRef(clients, contract, CAUSE_BOOKMARKS_REF, serializeCauseBookmarkDocument(document))
}

export async function writeCauseBookmarkList(
  clients: WriteClients,
  ids: CauseBookmarkId[],
): Promise<void> {
  await writeCauseBookmarkDocument(clients, {
    version: CAUSE_BOOKMARKS_SCHEMA_VERSION,
    causes: ids,
    removed: readLocalBookmarkRemovals(),
  })
}

/** Merge this device's keeps/tombstones with the wallet document, then write. */
export async function persistCauseBookmarks(
  machinery: SDKMachinery,
  address: string,
  clients: WriteClients,
): Promise<void> {
  const remote = await readCauseBookmarkDocument(machinery, address)
  const merged = mergeBookmarkDocuments(remote, localBookmarkDocument())
  writeLocalBookmarkRemovals(merged.removed)
  writeLocalBookmarkKeeps(merged.causes)
  await writeCauseBookmarkDocument(clients, merged)
}

export async function hydrateCauseBookmark(
  machinery: SDKMachinery,
  id: CauseBookmarkId,
): Promise<CauseDraft> {
  const owner = id.owner.toLowerCase()
  const stamp = id.updatedAt && Number.isFinite(Date.parse(id.updatedAt))
    ? id.updatedAt
    : new Date().toISOString()
  const stub: CauseDraft = {
    id: `remote:${owner}:${id.slug}`,
    planks: [],
    slug: id.slug,
    founderAddress: owner,
    createdAt: stamp,
    updatedAt: stamp,
  }
  try {
    const rosterCid = await resolveRosterCid(machinery, owner, id.slug)
    if (!rosterCid) return bookmarkCause(stub)
    const loaded = await loadRosterDocument(machinery, rosterCid)
    if (!loaded) return bookmarkCause({ ...stub, rosterCid })
    const texts = await loadPlankTexts(machinery, loaded.fields.plankCids)
    const planks = applyPlankTexts(
      loaded.fields.plankCids.map((cid) => ({
        id: `plank:${cid}`,
        text: cid,
        origin: 'user' as const,
        cid,
      })),
      texts,
    )
    return bookmarkCause({
      ...stub,
      rosterCid,
      title: loaded.fields.title,
      summary: loaded.fields.summary,
      planks,
    })
  } catch {
    return bookmarkCause(stub)
  }
}

function dropLocalBookmark(id: CauseBookmarkId): void {
  const existing = listCauses().find(
    (cause) => cause.slug === id.slug && cause.founderAddress?.toLowerCase() === id.owner.toLowerCase(),
  )
  if (existing) unbookmarkCause(existing)
}

/**
 * Union the wallet ref with local published keeps, hydrate missing rows,
 * drop locally cached rows that a tombstone still covers, and push the
 * merged document if the ref is missing or behind local.
 */
export async function syncCauseBookmarks(
  machinery: SDKMachinery,
  address: string,
  clients?: WriteClients | null,
): Promise<CauseDraft[]> {
  const remote = await readCauseBookmarkDocument(machinery, address)
  const merged = mergeBookmarkDocuments(remote, localBookmarkDocument())

  writeLocalBookmarkRemovals(merged.removed)
  writeLocalBookmarkKeeps(merged.causes)

  for (const id of merged.removed) dropLocalBookmark(id)

  for (const id of merged.causes) {
    const existing = publishedBookmarkIds().find(
      (row) => row.owner === id.owner && row.slug === id.slug,
    )
    if (!existing) await hydrateCauseBookmark(machinery, id)
  }

  if (clients && (remote == null ? merged.causes.length + merged.removed.length > 0 : !sameBookmarkDocument(remote, merged))) {
    try {
      await writeCauseBookmarkDocument(clients, merged)
    } catch (err) {
      console.warn('syncCauseBookmarks: could not write wallet list', err)
    }
  }

  return listCauses()
}
