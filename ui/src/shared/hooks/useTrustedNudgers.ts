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

  const envDefault = import.meta.env.VITE_DEFAULT_NUDGERS
  if (typeof envDefault === 'string' && envDefault.trim()) {
    return envDefault
      .split(',')
      .map((addr) => addr.trim())
      .filter(isValidAddress)
      .map((addr) => ({ address: addr }))
  }

  return []
}

export function saveTrustedNudgers(entries: TrustedNudgerEntry[]): void {
  localStorage.setItem(TRUSTED_NUDGERS_KEY, JSON.stringify(entries))
}

export function useTrustedNudgers(): TrustedNudgerEntry[] {
  const [entries] = useState<TrustedNudgerEntry[]>(loadTrustedNudgers)
  return entries
}
