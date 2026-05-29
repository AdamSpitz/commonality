import { useState } from 'react'

export const TRUSTED_NUDGERS_KEY = 'commonality:trustedNudgers'

export interface TrustedNudgerEntry {
  address: string
  serviceUrl?: string
  name?: string
  description?: string
  sourceType?: string
  version?: string
}

export function isValidNudgerAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

function normalizeEntry(entry: string | TrustedNudgerEntry): TrustedNudgerEntry {
  if (typeof entry === 'string') {
    return { address: entry }
  }
  return entry
}

/**
 * Parses the VITE_DEFAULT_NUDGERS environment variable into TrustedNudgerEntry objects.
 *
 * Supports two formats:
 *   - Comma-separated addresses: "0x1234...,0x5678..."
 *   - JSON array: '[{"address":"0x1234...","serviceUrl":"http://..."},...]'
 *     Entries may be address strings or TrustedNudgerEntry objects.
 */
export function loadDefaultNudgers(): TrustedNudgerEntry[] {
  const envDefault = import.meta.env.VITE_DEFAULT_NUDGERS
  if (typeof envDefault !== 'string' || !envDefault.trim()) {
    return []
  }

  const trimmed = envDefault.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .map(normalizeEntry)
          .filter((e) => isValidNudgerAddress(e.address))
      }
    } catch {
      // Fall through to comma-separated parsing
    }
  }

  return trimmed
    .split(',')
    .map((addr) => addr.trim())
    .filter(isValidNudgerAddress)
    .map((addr) => ({ address: addr }))
}

export function loadTrustedNudgers(): TrustedNudgerEntry[] {
  try {
    const stored = localStorage.getItem(TRUSTED_NUDGERS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
          .map(normalizeEntry)
          .filter((e) => isValidNudgerAddress(e.address))
      }
    }
  } catch {
    // Ignore parse errors
  }

  return loadDefaultNudgers()
}

function dedupeNudgersByAddress(entries: TrustedNudgerEntry[]): TrustedNudgerEntry[] {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const normalized = entry.address.trim().toLowerCase()
    if (!isValidNudgerAddress(entry.address) || seen.has(normalized)) {
      return false
    }
    seen.add(normalized)
    return true
  })
}

export function saveTrustedNudgers(entries: TrustedNudgerEntry[]): void {
  localStorage.setItem(TRUSTED_NUDGERS_KEY, JSON.stringify(dedupeNudgersByAddress(entries)))
}

export function isTrustedNudger(address: string, entries = loadTrustedNudgers()): boolean {
  const normalized = address.trim().toLowerCase()
  return entries.some((entry) => entry.address.trim().toLowerCase() === normalized)
}

export function addTrustedNudger(entry: TrustedNudgerEntry): TrustedNudgerEntry[] {
  if (!isValidNudgerAddress(entry.address)) {
    return loadTrustedNudgers()
  }

  const entries = loadTrustedNudgers()
  if (isTrustedNudger(entry.address, entries)) {
    return entries
  }

  const updated = dedupeNudgersByAddress([...entries, entry])
  saveTrustedNudgers(updated)
  return updated
}

export function removeTrustedNudger(address: string): TrustedNudgerEntry[] {
  const normalized = address.trim().toLowerCase()
  const updated = loadTrustedNudgers().filter((entry) => entry.address.trim().toLowerCase() !== normalized)
  saveTrustedNudgers(updated)
  return updated
}

export function useTrustedNudgers(): TrustedNudgerEntry[] {
  const [entries] = useState<TrustedNudgerEntry[]>(loadTrustedNudgers)
  return entries
}
