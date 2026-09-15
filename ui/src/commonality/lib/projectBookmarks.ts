/**
 * Project bookmarks: wallet MutableRef `bookmarked-projects`, merged across
 * devices with keep/removed tombstones (same idea as cause bookmarks).
 *
 * Distinct from cause bookmarks (`bookmarked-causes`) and statement bookmarks
 * (`bookmarks`).
 */

import { MutableRefUpdaterAbi } from '@commonality/sdk/abis'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import {
  getUserRef,
  updateRef,
  type MutableRefUpdaterContract,
} from '@commonality/sdk/mutable-refs'
import type { WriteClients } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from '../../shared'

export const PROJECT_BOOKMARKS_REF = 'bookmarked-projects'
export const PROJECT_BOOKMARKS_SCHEMA_VERSION = 2 as const
const STORAGE_KEY = 'causestarter.bookmarked-projects.v1'

export interface ProjectBookmarkId {
  address: string
  updatedAt?: string
}

export interface ProjectBookmarkDocument {
  version: number
  projects: ProjectBookmarkId[]
  removed: ProjectBookmarkId[]
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeAddress(value: string): string | null {
  const address = value.trim().toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(address)) return null
  return address
}

function stampMs(id: ProjectBookmarkId): number {
  if (!id.updatedAt) return 0
  const ms = Date.parse(id.updatedAt)
  return Number.isFinite(ms) ? ms : 0
}

function normalizeId(id: ProjectBookmarkId, fallbackStamp?: string): ProjectBookmarkId | null {
  const address = normalizeAddress(id.address)
  if (!address) return null
  const updatedAt = id.updatedAt && Number.isFinite(Date.parse(id.updatedAt))
    ? id.updatedAt
    : fallbackStamp
  return updatedAt ? { address, updatedAt } : { address }
}

function parseIdList(value: unknown, fallbackStamp?: string): ProjectBookmarkId[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const ids: ProjectBookmarkId[] = []
  for (const item of value) {
    let parsed: ProjectBookmarkId | null = null
    if (typeof item === 'string') {
      parsed = normalizeId({ address: item }, fallbackStamp)
    } else if (item && typeof item === 'object' && typeof (item as { address?: unknown }).address === 'string') {
      parsed = normalizeId(item as ProjectBookmarkId, fallbackStamp)
    }
    if (!parsed) continue
    if (seen.has(parsed.address)) continue
    seen.add(parsed.address)
    ids.push(parsed)
  }
  return ids
}

function emptyDocument(): ProjectBookmarkDocument {
  return { version: PROJECT_BOOKMARKS_SCHEMA_VERSION, projects: [], removed: [] }
}

export function parseProjectBookmarkDocument(value: string | null | undefined): ProjectBookmarkDocument {
  if (value == null || !value.trim()) return emptyDocument()
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyDocument()
    const record = parsed as { projects?: unknown; removed?: unknown }
    return {
      version: PROJECT_BOOKMARKS_SCHEMA_VERSION,
      projects: parseIdList(record.projects),
      removed: parseIdList(record.removed),
    }
  } catch {
    return emptyDocument()
  }
}

export function serializeProjectBookmarkDocument(document: ProjectBookmarkDocument): string {
  return JSON.stringify({
    version: PROJECT_BOOKMARKS_SCHEMA_VERSION,
    projects: mergeProjectBookmarkIds(document.projects),
    removed: mergeProjectBookmarkIds(document.removed),
  })
}

export function mergeProjectBookmarkIds(
  ...lists: Array<readonly ProjectBookmarkId[]>
): ProjectBookmarkId[] {
  const byKey = new Map<string, ProjectBookmarkId>()
  for (const list of lists) {
    for (const id of list) {
      const next = normalizeId(id)
      if (!next) continue
      const existing = byKey.get(next.address)
      if (!existing || stampMs(next) >= stampMs(existing)) byKey.set(next.address, next)
    }
  }
  return [...byKey.values()]
}

/** Equal stamps prefer remove so a keep cannot undo a same-instant delete. */
export function mergeProjectBookmarkDocuments(
  ...documents: Array<ProjectBookmarkDocument | null | undefined>
): ProjectBookmarkDocument {
  type Kind = 'keep' | 'remove'
  const byKey = new Map<string, { id: ProjectBookmarkId; kind: Kind }>()

  const consider = (id: ProjectBookmarkId, kind: Kind) => {
    const next = normalizeId(id)
    if (!next) return
    const existing = byKey.get(next.address)
    if (!existing) {
      byKey.set(next.address, { id: next, kind })
      return
    }
    const nextMs = stampMs(next)
    const existingMs = stampMs(existing.id)
    if (nextMs > existingMs || (nextMs === existingMs && kind === 'remove')) {
      byKey.set(next.address, { id: next, kind })
    }
  }

  for (const document of documents) {
    if (!document) continue
    for (const id of document.projects) consider(id, 'keep')
    for (const id of document.removed) consider(id, 'remove')
  }

  const projects: ProjectBookmarkId[] = []
  const removed: ProjectBookmarkId[] = []
  for (const row of byKey.values()) {
    if (row.kind === 'remove') removed.push(row.id)
    else projects.push(row.id)
  }
  return { version: PROJECT_BOOKMARKS_SCHEMA_VERSION, projects, removed }
}

function readLocalDocument(): ProjectBookmarkDocument {
  if (!canUseStorage()) return emptyDocument()
  try {
    return parseProjectBookmarkDocument(window.localStorage.getItem(STORAGE_KEY) ?? '')
  } catch {
    return emptyDocument()
  }
}

function writeLocalDocument(document: ProjectBookmarkDocument): ProjectBookmarkDocument {
  const next = mergeProjectBookmarkDocuments(document)
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, serializeProjectBookmarkDocument(next))
  }
  return next
}

export function listProjectBookmarks(): string[] {
  return readLocalDocument().projects.map((id) => id.address)
}

export function isProjectBookmarked(address: string): boolean {
  const normalized = normalizeAddress(address)
  if (!normalized) return false
  return listProjectBookmarks().includes(normalized)
}

export function bookmarkProject(address: string, at = new Date().toISOString()): string[] {
  const normalized = normalizeAddress(address)
  if (!normalized) return listProjectBookmarks()
  const next = mergeProjectBookmarkDocuments(readLocalDocument(), {
    version: PROJECT_BOOKMARKS_SCHEMA_VERSION,
    projects: [{ address: normalized, updatedAt: at }],
    removed: [],
  })
  writeLocalDocument(next)
  return listProjectBookmarks()
}

export function unbookmarkProject(address: string, at = new Date().toISOString()): string[] {
  const normalized = normalizeAddress(address)
  if (!normalized) return listProjectBookmarks()
  const next = mergeProjectBookmarkDocuments(readLocalDocument(), {
    version: PROJECT_BOOKMARKS_SCHEMA_VERSION,
    projects: [],
    removed: [{ address: normalized, updatedAt: at }],
  })
  writeLocalDocument(next)
  return listProjectBookmarks()
}

function mutableRefContract(): MutableRefUpdaterContract | null {
  const address = getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') as `0x${string}` | undefined
  if (!address) return null
  return { address, abi: MutableRefUpdaterAbi }
}

export async function hydrateProjectBookmarks(
  machinery: SDKMachinery,
  address: string,
): Promise<string[]> {
  const ref = await getUserRef(machinery, address, PROJECT_BOOKMARKS_REF).catch(() => null)
  const remote = parseProjectBookmarkDocument(ref?.value)
  const merged = mergeProjectBookmarkDocuments(remote, readLocalDocument())
  writeLocalDocument(merged)
  return listProjectBookmarks()
}

export function sameProjectBookmarkList(a: readonly ProjectBookmarkId[], b: readonly ProjectBookmarkId[]): boolean {
  if (a.length !== b.length) return false
  const stamps = new Map(a.map((id) => [id.address, stampMs(id)]))
  return b.every((id) => stamps.get(id.address) === stampMs(id))
}

export function sameProjectBookmarkDocument(a: ProjectBookmarkDocument, b: ProjectBookmarkDocument): boolean {
  return sameProjectBookmarkList(a.projects, b.projects) && sameProjectBookmarkList(a.removed, b.removed)
}

export async function persistProjectBookmarks(
  machinery: SDKMachinery,
  address: string,
  clients: WriteClients,
): Promise<void> {
  const contract = mutableRefContract()
  if (!contract) return
  const ref = await getUserRef(machinery, address, PROJECT_BOOKMARKS_REF)
  const remote = ref?.value != null ? parseProjectBookmarkDocument(ref.value) : null
  const merged = mergeProjectBookmarkDocuments(remote, readLocalDocument())
  writeLocalDocument(merged)
  if (remote == null ? merged.projects.length + merged.removed.length === 0 : sameProjectBookmarkDocument(remote, merged)) {
    return
  }
  await updateRef(clients, contract, PROJECT_BOOKMARKS_REF, serializeProjectBookmarkDocument(merged))
}
