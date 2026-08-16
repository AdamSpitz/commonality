import { useCallback, useSyncExternalStore } from 'react'
import { DISCOVERY_LEVELS, type DiscoveryLevel } from '../components/discoveryLevels'

export const DISCOVERY_LEVEL_STORAGE_KEY = 'commonality.discoveryLevel'
const CHANGE_EVENT = 'commonality-discovery-level'

function isDiscoveryLevel(value: string | null): value is DiscoveryLevel {
  return DISCOVERY_LEVELS.includes(value as DiscoveryLevel)
}

export function readStoredDiscoveryLevel(): DiscoveryLevel {
  if (typeof window === 'undefined') return 'network'
  const raw = window.localStorage.getItem(DISCOVERY_LEVEL_STORAGE_KEY)
  return isDiscoveryLevel(raw) ? raw : 'network'
}

export function writeStoredDiscoveryLevel(level: DiscoveryLevel): void {
  window.localStorage.setItem(DISCOVERY_LEVEL_STORAGE_KEY, level)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(CHANGE_EVENT, onStoreChange)
  }
}

/** Persisted cause-board discovery scope, edited from trust settings. */
export function useDiscoveryLevel(): [DiscoveryLevel, (level: DiscoveryLevel) => void] {
  const level = useSyncExternalStore(subscribe, readStoredDiscoveryLevel, () => 'network' as const)
  const setLevel = useCallback((next: DiscoveryLevel) => {
    writeStoredDiscoveryLevel(next)
  }, [])
  return [level, setLevel]
}
