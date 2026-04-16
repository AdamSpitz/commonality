const TWITTER_HANDLE_HINTS_KEY = 'commonality:twitterHandleHints'

type TwitterHandleHints = Record<string, string>

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function normalizeHandle(handle: string): string {
  const trimmed = handle.trim()
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

function loadAllTwitterHandleHints(): TwitterHandleHints {
  try {
    const raw = localStorage.getItem(TWITTER_HANDLE_HINTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? parsed as TwitterHandleHints : {}
  } catch {
    return {}
  }
}

export function loadTwitterHandleHint(address: string): string | null {
  return loadAllTwitterHandleHints()[normalizeAddress(address)] ?? null
}

export function saveTwitterHandleHint(address: string, handle: string): void {
  const hints = loadAllTwitterHandleHints()
  hints[normalizeAddress(address)] = normalizeHandle(handle)
  localStorage.setItem(TWITTER_HANDLE_HINTS_KEY, JSON.stringify(hints))
}
