/**
 * Causes visible for the connected user: local drafts/bookmarks unioned with
 * on-chain main statements they have publicly supported.
 */

import { getUserBeliefs, type StatementListItem } from '@commonality/sdk/conceptspace'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import {
  listCauses,
  saveCause,
  type CauseDraft,
  type MomentumLever,
} from './causeStore'

const DEFAULT_LEVERS: MomentumLever[] = [
  'supporters',
  'volunteers',
  'collaborators',
  'funding',
  'content',
]

function displayNameFromText(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return 'Untitled cause'
  if (trimmed.length <= 48) return trimmed
  return `${trimmed.slice(0, 45).trim()}…`
}

/**
 * Upsert a launched bookmark for an on-chain statement the user supports.
 * Matches by primary statementCid so we do not duplicate local founders' causes.
 */
export function bookmarkSupportedCause(statement: StatementListItem): CauseDraft {
  const existing = listCauses().find((c) => c.statementCid === statement.cid)
  if (existing) return existing

  const goal =
    statement.excerpt?.trim()
    || statement.title?.trim()
    || `Supported statement ${statement.cid.slice(0, 12)}…`

  return saveCause({
    goal,
    name: displayNameFromText(statement.title || goal),
    statements: [],
    levers: DEFAULT_LEVERS,
    status: 'launched',
    statementCid: statement.cid,
  })
}

/**
 * Local causes plus any on-chain statements this address currently believes.
 * Supported statements not already in localStorage are bookmarked as launched causes.
 */
export async function listUserCauses(
  machinery: SDKMachinery,
  address: string | undefined,
): Promise<CauseDraft[]> {
  const local = listCauses()
  if (!address) return local

  let beliefs: StatementListItem[] = []
  try {
    beliefs = await getUserBeliefs(machinery, address)
  } catch (err) {
    console.warn('listUserCauses: on-chain beliefs unavailable', err)
    return local
  }

  const byStatementCid = new Map(
    local
      .filter((c) => c.statementCid)
      .map((c) => [c.statementCid!, c] as const),
  )

  const extra: CauseDraft[] = []
  for (const statement of beliefs) {
    if (byStatementCid.has(statement.cid)) continue
    // Also skip if already bookmarked earlier in this pass
    if (extra.some((c) => c.statementCid === statement.cid)) continue
    extra.push(bookmarkSupportedCause(statement))
  }

  // Re-read so bookmarks from this pass are included with stable order.
  return listCauses()
}
