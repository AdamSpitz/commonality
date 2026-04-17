import { useState } from 'react'

export const TRUSTED_ATTESTERS_KEY = 'commonality:trustedAttesters'

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export function loadTrustedAttesters(): string[] {
  try {
    const stored = localStorage.getItem(TRUSTED_ATTESTERS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed.filter(isValidAddress)
    }
  } catch {
    // Ignore parse errors
  }

  const envDefault = import.meta.env.VITE_DEFAULT_TRUSTED_ATTESTERS
  if (typeof envDefault === 'string' && envDefault.trim()) {
    return envDefault
      .split(',')
      .map((addr) => addr.trim())
      .filter(isValidAddress)
  }

  return []
}

/**
 * Returns the list of trusted implication attester addresses from localStorage.
 * Read once on mount. Navigating away and back re-mounts the component, picking up changes.
 */
export function useTrustedAttesters(): string[] {
  const [attesters] = useState<string[]>(loadTrustedAttesters)
  return attesters
}

export function saveTrustedAttesters(attesters: string[]): void {
  localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify(attesters))
}
