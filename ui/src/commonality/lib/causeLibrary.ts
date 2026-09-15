import type { CauseDraft } from './causeStore'

const STORAGE_KEY = 'causestarter.cause-library.v1'

interface CauseLibraryEntry {
  lastOpenedAt?: string
  archived?: boolean
}

export type CauseLibrary = Record<string, CauseLibraryEntry>

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function causeLibraryKey(cause: CauseDraft): string {
  if (cause.founderAddress && cause.slug) return `${cause.founderAddress.toLowerCase()}:${cause.slug}`
  return `draft:${cause.id}`
}

export function readCauseLibrary(): CauseLibrary {
  if (!canUseStorage()) return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as CauseLibrary : {}
  } catch {
    return {}
  }
}

function patchEntry(cause: CauseDraft, patch: CauseLibraryEntry): CauseLibrary {
  const library = readCauseLibrary()
  const key = causeLibraryKey(cause)
  const next = { ...library, [key]: { ...library[key], ...patch } }
  if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function rememberCauseOpened(cause: CauseDraft, at = new Date().toISOString()): void {
  patchEntry(cause, { lastOpenedAt: at })
}

export function setCauseArchived(cause: CauseDraft, archived: boolean): CauseLibrary {
  return patchEntry(cause, { archived })
}

export function causeLastOpenedAt(cause: CauseDraft, library = readCauseLibrary()): string {
  return library[causeLibraryKey(cause)]?.lastOpenedAt ?? cause.updatedAt
}

export function isCauseArchived(cause: CauseDraft, library = readCauseLibrary()): boolean {
  return library[causeLibraryKey(cause)]?.archived === true
}
