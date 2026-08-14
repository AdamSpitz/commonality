/**
 * Durable published-cause bookmarks: wallet MutableRef `bookmarked-causes`.
 *
 * Distinct from statement bookmarks (`bookmarks`), which are statement CIDs.
 * Unpublished drafts stay in localStorage only.
 */

import { MutableRefUpdaterAbi } from '@commonality/sdk/abis'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import {
  getUserRef,
  updateRef,
  type MutableRefUpdaterContract,
} from '@commonality/sdk/mutable-refs'
import type { WriteClients } from '@commonality/sdk/utils'
import { bookmarkCause, listCauses, publishedBookmarkIds, type CauseDraft } from './causeStore'
import { loadRosterDocument, resolveRosterCid } from './causeRoster'
import { getRuntimeConfigValue } from './runtimeConfig'

export const CAUSE_BOOKMARKS_REF = 'bookmarked-causes'
export const CAUSE_BOOKMARKS_SCHEMA_VERSION = 1 as const

export interface CauseBookmarkId {
  owner: string
  slug: string
}

export function bookmarkKey(id: CauseBookmarkId): string {
  return `${id.owner.toLowerCase()}:${id.slug}`
}

export function parseCauseBookmarkList(value: string | null | undefined): CauseBookmarkId[] | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    const record = parsed as { version?: unknown; causes?: unknown }
    if (!Array.isArray(record.causes)) return []
    const seen = new Set<string>()
    const ids: CauseBookmarkId[] = []
    for (const item of record.causes) {
      if (!item || typeof item !== 'object') continue
      const owner = String((item as { owner?: unknown }).owner ?? '').toLowerCase()
      const slug = String((item as { slug?: unknown }).slug ?? '')
      if (!/^0x[0-9a-f]{40}$/.test(owner) || !slug) continue
      const key = `${owner}:${slug}`
      if (seen.has(key)) continue
      seen.add(key)
      ids.push({ owner, slug })
    }
    return ids
  } catch {
    return []
  }
}

export function serializeCauseBookmarkList(ids: CauseBookmarkId[]): string {
  const seen = new Set<string>()
  const causes: CauseBookmarkId[] = []
  for (const id of ids) {
    const owner = id.owner.toLowerCase()
    if (!id.slug || seen.has(`${owner}:${id.slug}`)) continue
    seen.add(`${owner}:${id.slug}`)
    causes.push({ owner, slug: id.slug })
  }
  return JSON.stringify({
    version: CAUSE_BOOKMARKS_SCHEMA_VERSION,
    causes,
  })
}

export function mergeBookmarkIds(
  ...lists: Array<readonly CauseBookmarkId[]>
): CauseBookmarkId[] {
  const seen = new Set<string>()
  const merged: CauseBookmarkId[] = []
  for (const list of lists) {
    for (const id of list) {
      const key = bookmarkKey(id)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ owner: id.owner.toLowerCase(), slug: id.slug })
    }
  }
  return merged
}

export function sameBookmarkList(a: readonly CauseBookmarkId[], b: readonly CauseBookmarkId[]): boolean {
  if (a.length !== b.length) return false
  const keys = new Set(a.map(bookmarkKey))
  return b.every((id) => keys.has(bookmarkKey(id)))
}

export async function readCauseBookmarkList(
  machinery: SDKMachinery,
  address: string,
): Promise<CauseBookmarkId[] | null> {
  const ref = await getUserRef(machinery, address, CAUSE_BOOKMARKS_REF)
  if (!ref) return null
  return parseCauseBookmarkList(ref.value)
}

function mutableRefContract(): MutableRefUpdaterContract | null {
  const address = getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') as `0x${string}` | undefined
  if (!address) return null
  return { address, abi: MutableRefUpdaterAbi }
}

export async function writeCauseBookmarkList(
  clients: WriteClients,
  ids: CauseBookmarkId[],
): Promise<void> {
  const contract = mutableRefContract()
  if (!contract) throw new Error('MutableRefUpdater is not configured')
  await updateRef(clients, contract, CAUSE_BOOKMARKS_REF, serializeCauseBookmarkList(ids))
}

export async function hydrateCauseBookmark(
  machinery: SDKMachinery,
  id: CauseBookmarkId,
): Promise<CauseDraft> {
  const owner = id.owner.toLowerCase()
  const now = new Date().toISOString()
  const stub: CauseDraft = {
    id: `remote:${owner}:${id.slug}`,
    planks: [],
    slug: id.slug,
    founderAddress: owner,
    createdAt: now,
    updatedAt: now,
  }
  try {
    const rosterCid = await resolveRosterCid(machinery, owner, id.slug)
    if (!rosterCid) return bookmarkCause(stub)
    const loaded = await loadRosterDocument(machinery, rosterCid)
    if (!loaded) return bookmarkCause({ ...stub, rosterCid })
    return bookmarkCause({
      ...stub,
      rosterCid,
      title: loaded.fields.title,
      summary: loaded.fields.summary,
      planks: loaded.fields.plankCids.map((cid) => ({
        id: `plank:${cid}`,
        text: cid,
        origin: 'user' as const,
        cid,
      })),
    })
  } catch {
    return bookmarkCause(stub)
  }
}

/**
 * Union the wallet ref with local published keeps, hydrate missing rows,
 * and push the union if the ref is missing or behind local.
 */
export async function syncCauseBookmarks(
  machinery: SDKMachinery,
  address: string,
  clients?: WriteClients | null,
): Promise<CauseDraft[]> {
  const remote = await readCauseBookmarkList(machinery, address)
  const local = publishedBookmarkIds()
  const merged = remote == null ? local : mergeBookmarkIds(remote, local)

  for (const id of merged) {
    const existing = publishedBookmarkIds().find(
      (row) => row.owner === id.owner && row.slug === id.slug,
    )
    if (!existing) await hydrateCauseBookmark(machinery, id)
  }

  if (clients && (remote == null ? merged.length > 0 : !sameBookmarkList(remote, merged))) {
    try {
      await writeCauseBookmarkList(clients, merged)
    } catch (err) {
      console.warn('syncCauseBookmarks: could not write wallet list', err)
    }
  }

  return listCauses()
}
