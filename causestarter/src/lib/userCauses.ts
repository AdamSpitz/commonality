/**
 * Causes visible for the connected user: local drafts unioned ephemerally with
 * on-chain statements they have publicly supported.
 */

import { getUserBeliefs, type StatementListItem } from '@commonality/sdk/conceptspace'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import {
  listCauses,
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

/** Build an in-memory cause card for an on-chain belief without writing localStorage. */
export function supportedCause(statement: StatementListItem): CauseDraft {
  const goal =
    statement.excerpt?.trim()
    || statement.title?.trim()
    || `Supported statement ${statement.cid.slice(0, 12)}…`
  const now = statement.createdAt || new Date().toISOString()

  return {
    id: `supported:${statement.cid}`,
    goal,
    name: displayNameFromText(statement.title || goal),
    statements: [],
    levers: DEFAULT_LEVERS,
    createdAt: now,
    updatedAt: now,
    status: 'launched',
    statementCid: statement.cid,
  }
}

function causeStatementCids(cause: CauseDraft): string[] {
  return [cause.statementCid, ...(cause.statementCids ?? [])].filter(
    (cid): cid is string => Boolean(cid),
  )
}

/**
 * Local causes plus on-chain statements this address currently believes.
 * On-chain entries are an ephemeral, per-wallet union and are never persisted.
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

  // A belief in either a local cause's primary or supporting statement is already
  // represented by that local cause. Also dedupe duplicate rows from the indexer.
  const seenCids = new Set(local.flatMap(causeStatementCids))
  const ephemeral: CauseDraft[] = []
  for (const statement of beliefs) {
    if (!statement.cid || seenCids.has(statement.cid)) continue
    seenCids.add(statement.cid)
    ephemeral.push(supportedCause(statement))
  }

  return [...local, ...ephemeral]
}
