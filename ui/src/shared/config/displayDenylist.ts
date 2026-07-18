import { getRuntimeConfigValue } from './runtimeConfig'

export interface DisplayDenylist {
  /** Content/image CIDs the live UI must not render. */
  deniedCids: readonly string[]
}

let cachedDenylist: Promise<DisplayDenylist> | null = null

function normalizeCid(value: string): string {
  return value.trim().replace(/^ipfs:\/\//i, '').split('/')[0].toLowerCase()
}

function parseDenylistPayload(payload: unknown): DisplayDenylist {
  const rawCids = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { deniedCids?: unknown }).deniedCids)
      ? (payload as { deniedCids: unknown[] }).deniedCids
      : []

  return {
    deniedCids: [...new Set(rawCids.filter((cid): cid is string => typeof cid === 'string').map(normalizeCid).filter(Boolean))],
  }
}

export async function loadDisplayDenylist(): Promise<DisplayDenylist> {
  if (!cachedDenylist) {
    cachedDenylist = (async () => {
      const url = getRuntimeConfigValue('VITE_DISPLAY_DENYLIST_URL')
      if (!url) return { deniedCids: [] }

      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Failed to load display denylist: HTTP ${response.status}`)
      return parseDenylistPayload(await response.json())
    })().catch((error) => {
      console.warn('Display denylist unavailable; rendering without additional CID suppression:', error)
      return { deniedCids: [] }
    })
  }
  return cachedDenylist
}

export function isCidDeniedByDisplayDenylist(cidOrUri: string | null | undefined, denylist: DisplayDenylist): boolean {
  if (!cidOrUri) return false
  return denylist.deniedCids.includes(normalizeCid(cidOrUri))
}
