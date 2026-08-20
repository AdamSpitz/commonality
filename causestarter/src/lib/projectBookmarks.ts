/**
 * Project bookmarks: device-local list, overwritten onto the wallet
 * `bookmarked-projects` ref when a write client is available.
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
import { getRuntimeConfigValue } from './runtimeConfig'

export const PROJECT_BOOKMARKS_REF = 'bookmarked-projects'
export const PROJECT_BOOKMARKS_SCHEMA_VERSION = 1 as const
const STORAGE_KEY = 'causestarter.bookmarked-projects.v1'

export interface ProjectBookmarkDocument {
  version: number
  projects: string[]
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeAddress(value: string): string | null {
  const address = value.trim().toLowerCase()
  if (!/^0x[0-9a-f]{40}$/.test(address)) return null
  return address
}

function uniqueAddresses(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []
  for (const value of values) {
    const address = normalizeAddress(value)
    if (!address || seen.has(address)) continue
    seen.add(address)
    next.push(address)
  }
  return next
}

export function parseProjectBookmarkDocument(value: string | null | undefined): ProjectBookmarkDocument {
  if (value == null || !value.trim()) {
    return { version: PROJECT_BOOKMARKS_SCHEMA_VERSION, projects: [] }
  }
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { version: PROJECT_BOOKMARKS_SCHEMA_VERSION, projects: [] }
    }
    const record = parsed as { projects?: unknown }
    return {
      version: PROJECT_BOOKMARKS_SCHEMA_VERSION,
      projects: Array.isArray(record.projects) ? uniqueAddresses(record.projects.filter((item): item is string => typeof item === 'string')) : [],
    }
  } catch {
    return { version: PROJECT_BOOKMARKS_SCHEMA_VERSION, projects: [] }
  }
}

export function serializeProjectBookmarkDocument(document: ProjectBookmarkDocument): string {
  return JSON.stringify({
    version: PROJECT_BOOKMARKS_SCHEMA_VERSION,
    projects: uniqueAddresses(document.projects),
  })
}

export function listProjectBookmarks(): string[] {
  if (!canUseStorage()) return []
  try {
    return parseProjectBookmarkDocument(window.localStorage.getItem(STORAGE_KEY) ?? '').projects
  } catch {
    return []
  }
}

function writeProjectBookmarks(addresses: string[]): string[] {
  const projects = uniqueAddresses(addresses)
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, serializeProjectBookmarkDocument({
      version: PROJECT_BOOKMARKS_SCHEMA_VERSION,
      projects,
    }))
  }
  return projects
}

export function isProjectBookmarked(address: string): boolean {
  const normalized = normalizeAddress(address)
  if (!normalized) return false
  return listProjectBookmarks().includes(normalized)
}

export function bookmarkProject(address: string): string[] {
  const normalized = normalizeAddress(address)
  if (!normalized) return listProjectBookmarks()
  return writeProjectBookmarks([...listProjectBookmarks(), normalized])
}

export function unbookmarkProject(address: string): string[] {
  const normalized = normalizeAddress(address)
  if (!normalized) return listProjectBookmarks()
  return writeProjectBookmarks(listProjectBookmarks().filter((item) => item !== normalized))
}

function mutableRefContract(): MutableRefUpdaterContract | null {
  const address = getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') as `0x${string}` | undefined
  if (!address) return null
  return { address, abi: MutableRefUpdaterAbi }
}

function hasLocalDocument(): boolean {
  return canUseStorage() && window.localStorage.getItem(STORAGE_KEY) !== null
}

export async function hydrateProjectBookmarks(
  machinery: SDKMachinery,
  address: string,
): Promise<string[]> {
  if (hasLocalDocument()) return listProjectBookmarks()
  const ref = await getUserRef(machinery, address, PROJECT_BOOKMARKS_REF).catch(() => null)
  const projects = parseProjectBookmarkDocument(ref?.value).projects
  // An empty chain ref must not write a local document. `hasLocalDocument`
  // treats any key as authoritative, so a first visit with no bookmarks would
  // lock this device out of a later persist from another session.
  if (projects.length === 0) return []
  return writeProjectBookmarks(projects)
}

export async function persistProjectBookmarks(
  clients: WriteClients,
): Promise<void> {
  const contract = mutableRefContract()
  if (!contract) return
  await updateRef(clients, contract, PROJECT_BOOKMARKS_REF, serializeProjectBookmarkDocument({
    version: PROJECT_BOOKMARKS_SCHEMA_VERSION,
    projects: listProjectBookmarks(),
  }))
}
