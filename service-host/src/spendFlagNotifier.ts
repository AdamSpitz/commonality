/** One off-app page per scheduled spend. Later flags for the same nonce do not page again. */

export interface SpendFlagNotice {
  noteId: string
  nonce: string
}

export function shouldPageDonor(seen: Set<string>, notice: SpendFlagNotice): boolean {
  const key = `${notice.noteId}:${notice.nonce}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
}
