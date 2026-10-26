const STORAGE_KEY = 'commonality:acceptedSuggestedNames'
export const ACCEPTED_SUGGESTED_NAME_EVENT = 'commonality:accepted-suggested-name'

type AcceptedNames = Record<string, string>

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function loadAll(): AcceptedNames {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const names: AcceptedNames = {}
    for (const [address, name] of Object.entries(parsed)) {
      if (typeof name === 'string' && name.trim()) names[normalizeAddress(address)] = name.trim()
    }
    return names
  } catch {
    return {}
  }
}

export function loadAcceptedSuggestedName(address: string): string | null {
  return loadAll()[normalizeAddress(address)] ?? null
}

export function acceptSuggestedName(address: string, name: string): void {
  const trimmed = name.trim()
  if (!trimmed) return
  const names = loadAll()
  names[normalizeAddress(address)] = trimmed
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names))
  window.dispatchEvent(new CustomEvent(ACCEPTED_SUGGESTED_NAME_EVENT, {
    detail: { address: normalizeAddress(address), name: trimmed },
  }))
}
