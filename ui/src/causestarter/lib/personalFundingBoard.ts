export interface PersonalFundingBoard {
  statementCids: string[]
  geographicWithin?: string[]
}

const KEY_PREFIX = 'causestarter.personal-funding-board.v1'

function key(address: string) {
  return `${KEY_PREFIX}:${address.toLowerCase()}`
}

export function readPersonalFundingBoard(address: string | undefined): PersonalFundingBoard | null {
  if (!address) return null
  try {
    const value = JSON.parse(window.localStorage.getItem(key(address)) ?? 'null') as unknown
    if (!value || typeof value !== 'object') return null
    const row = value as Record<string, unknown>
    if (!Array.isArray(row.statementCids) || !row.statementCids.every((cid) => typeof cid === 'string')) return null
    const geographicWithin = Array.isArray(row.geographicWithin)
      && row.geographicWithin.every((part) => typeof part === 'string')
      ? row.geographicWithin as string[]
      : undefined
    return { statementCids: [...new Set(row.statementCids)], ...(geographicWithin?.length ? { geographicWithin } : {}) }
  } catch {
    return null
  }
}

export function writePersonalFundingBoard(address: string, board: PersonalFundingBoard) {
  window.localStorage.setItem(key(address), JSON.stringify(board))
}
