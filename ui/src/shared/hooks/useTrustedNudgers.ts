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

function isValidAddress(addr: string): boolean {
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
          .filter((e) => isValidAddress(e.address))
      }
    } catch {
      // Fall through to comma-separated parsing
    }
  }

  return trimmed
    .split(',')
    .map((addr) => addr.trim())
    .filter(isValidAddress)
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
          .filter((e) => isValidAddress(e.address))
      }
    }
  } catch {
    // Ignore parse errors
  }

  return loadDefaultNudgers()
}

export function saveTrustedNudgers(entries: TrustedNudgerEntry[]): void {
  localStorage.setItem(TRUSTED_NUDGERS_KEY, JSON.stringify(entries))
}

export function useTrustedNudgers(): TrustedNudgerEntry[] {
  const [entries] = useState<TrustedNudgerEntry[]>(loadTrustedNudgers)
  return entries
}
