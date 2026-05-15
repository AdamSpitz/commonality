import { useState } from 'react'

export const TRUSTED_CONTENT_ATTESTERS_KEY = 'commonality:trustedContentAttesters'

export type TrustedContentAttesterKind = 'content-attester' | 'beat-agent'

export interface TrustedContentAttesterEntry {
  address: string
  kind: TrustedContentAttesterKind
  name?: string
  serviceUrl?: string
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

function normalizeKind(kind: unknown): TrustedContentAttesterKind {
  return kind === 'beat-agent' ? 'beat-agent' : 'content-attester'
}

function normalizeEntry(value: unknown): TrustedContentAttesterEntry | null {
  if (typeof value === 'string') {
    return isValidAddress(value) ? { address: value, kind: 'content-attester' } : null
  }

  if (!value || typeof value !== 'object') return null
  const maybeEntry = value as Partial<TrustedContentAttesterEntry>
  if (!maybeEntry.address || !isValidAddress(maybeEntry.address)) return null

  return {
    address: maybeEntry.address,
    kind: normalizeKind(maybeEntry.kind),
    name: typeof maybeEntry.name === 'string' && maybeEntry.name.trim() ? maybeEntry.name : undefined,
    serviceUrl: typeof maybeEntry.serviceUrl === 'string' && maybeEntry.serviceUrl.trim() ? maybeEntry.serviceUrl : undefined,
  }
}

function parseDefaultAddresses(raw: unknown, kind: TrustedContentAttesterKind): TrustedContentAttesterEntry[] {
  if (typeof raw !== 'string' || !raw.trim()) return []
  return raw
    .split(',')
    .map((addr) => addr.trim())
    .filter(isValidAddress)
    .map((address) => ({ address, kind }))
}

function dedupeByAddress(entries: TrustedContentAttesterEntry[]): TrustedContentAttesterEntry[] {
  const seen = new Set<string>()
  const result: TrustedContentAttesterEntry[] = []

  for (const entry of entries) {
    const key = entry.address.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(entry)
  }

  return result
}

export function loadDefaultTrustedContentAttesters(): TrustedContentAttesterEntry[] {
  return dedupeByAddress([
    ...parseDefaultAddresses(import.meta.env.VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS, 'content-attester'),
    ...parseDefaultAddresses(import.meta.env.VITE_DEFAULT_TRUSTED_BEAT_AGENTS, 'beat-agent'),
  ])
}

export function loadTrustedContentAttesters(): TrustedContentAttesterEntry[] {
  try {
    const stored = localStorage.getItem(TRUSTED_CONTENT_ATTESTERS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return dedupeByAddress(parsed.map(normalizeEntry).filter((entry): entry is TrustedContentAttesterEntry => entry !== null))
    }
  } catch {
    // Ignore parse errors
  }

  return loadDefaultTrustedContentAttesters()
}

/**
 * Returns content-attester and beat-agent identities the user explicitly trusts.
 * These are the attester wallets whose content-alignment attestations the UI may highlight or filter by.
 */
export function useTrustedContentAttesters(): TrustedContentAttesterEntry[] {
  const [attesters] = useState<TrustedContentAttesterEntry[]>(loadTrustedContentAttesters)
  return attesters
}

export function saveTrustedContentAttesters(attesters: TrustedContentAttesterEntry[]): void {
  localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify(dedupeByAddress(attesters)))
}
