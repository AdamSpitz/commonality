import { useState, useCallback } from 'react'

export const MUTED_NUDGERS_KEY = 'commonality:mutedNudgers'

const DEFAULT_NUDGERS: string[] = []

export function loadMutedNudgers(): string[] {
  try {
    const stored = localStorage.getItem(MUTED_NUDGERS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.every((a) => typeof a === 'string')) {
        return parsed.map((a) => a.toLowerCase())
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_NUDGERS
}

export function saveMutedNudgers(nudgers: string[]): void {
  localStorage.setItem(MUTED_NUDGERS_KEY, JSON.stringify(nudgers))
}

export function useMutedNudgers(): {
  mutedNudgers: string[]
  muteNudger: (address: string) => void
  unmuteNudger: (address: string) => void
  isMuted: (address: string) => boolean
} {
  const [mutedNudgers, setMutedNudgers] = useState<string[]>(loadMutedNudgers)

  const muteNudger = useCallback((address: string) => {
    const normalized = address.trim().toLowerCase()
    if (!normalized) return
    setMutedNudgers((prev) => {
      if (prev.includes(normalized)) return prev
      const next = [...prev, normalized]
      saveMutedNudgers(next)
      return next
    })
  }, [])

  const unmuteNudger = useCallback((address: string) => {
    const normalized = address.trim().toLowerCase()
    setMutedNudgers((prev) => {
      const next = prev.filter((a) => a !== normalized)
      saveMutedNudgers(next)
      return next
    })
  }, [])

  const isMuted = useCallback(
    (address: string) => mutedNudgers.includes(address.trim().toLowerCase()),
    [mutedNudgers],
  )

  return { mutedNudgers, muteNudger, unmuteNudger, isMuted }
}
