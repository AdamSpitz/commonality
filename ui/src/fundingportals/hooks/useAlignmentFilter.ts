import { useCallback, useSyncExternalStore } from 'react'
import { ALIGNMENT_FILTERS, type AlignmentFilter } from '../components/alignmentFilter'

export const ALIGNMENT_FILTER_STORAGE_KEY = 'commonality.alignmentFilter'
const CHANGE_EVENT = 'commonality-alignment-filter'

function isAlignmentFilter(value: string | null): value is AlignmentFilter {
  return ALIGNMENT_FILTERS.includes(value as AlignmentFilter)
}

export function readStoredAlignmentFilter(): AlignmentFilter {
  if (typeof window === 'undefined') return 'all'
  const raw = window.localStorage.getItem(ALIGNMENT_FILTER_STORAGE_KEY)
  return isAlignmentFilter(raw) ? raw : 'all'
}

export function writeStoredAlignmentFilter(filter: AlignmentFilter): void {
  window.localStorage.setItem(ALIGNMENT_FILTER_STORAGE_KEY, filter)
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

/** Persisted cause-board alignment filter, edited from trust settings. */
export function useAlignmentFilter(): [AlignmentFilter, (filter: AlignmentFilter) => void] {
  const filter = useSyncExternalStore(subscribe, readStoredAlignmentFilter, () => 'all' as const)
  const setFilter = useCallback((next: AlignmentFilter) => {
    writeStoredAlignmentFilter(next)
  }, [])
  return [filter, setFilter]
}
