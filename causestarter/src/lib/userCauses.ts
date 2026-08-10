/**
 * Causes visible for the connected user: local drafts unioned ephemerally with
 * on-chain statements they have publicly supported.
 */

import { getUserBeliefs, type StatementListItem } from '@commonality/sdk/conceptspace'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { listCauses, realPlanks, type CauseDraft } from './causeStore'

/**
 * Build an in-memory cause card for an on-chain belief without writing
 * localStorage. A statement someone merely supports is a one-plank cause: the
 * plank is the statement itself.
 */
export function supportedCause(statement: StatementListItem): CauseDraft {
  const text =
    statement.excerpt?.trim()
    || statement.title?.trim()
    || `Supported statement ${statement.cid.slice(0, 12)}…`
  const now = statement.createdAt || new Date().toISOString()

  return {
    id: `supported:${statement.cid}`,
    planks: [{
      id: `supported-plank:${statement.cid}`,
      text,
      origin: 'user',
      cid: statement.cid,
    }],
    createdAt: now,
    updatedAt: now,
  }
}

function causeStatementCids(cause: CauseDraft): string[] {
  return realPlanks(cause)
    .map((plank) => plank.cid)
    .filter((cid): cid is string => Boolean(cid))
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
