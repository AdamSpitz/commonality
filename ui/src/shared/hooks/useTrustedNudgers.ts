import { useState } from 'react'

export const TRUSTED_NUDGERS_KEY = 'commonality:trustedNudgers'

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export function loadTrustedNudgers(): string[] {
  try {
    const stored = localStorage.getItem(TRUSTED_NUDGERS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed.filter(isValidAddress)
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
  }

  return []
}

export function saveTrustedNudgers(nudgers: string[]): void {
  localStorage.setItem(TRUSTED_NUDGERS_KEY, JSON.stringify(nudgers))
}

export function useTrustedNudgers(): string[] {
  const [nudgers] = useState<string[]>(loadTrustedNudgers)
  return nudgers
}