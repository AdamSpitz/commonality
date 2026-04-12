import {
  ETH_CURRENCY,
  getNoteIntentAttestationsByStatement,
  getNote,
  type SDKMachinery,
  type Note,
  type CurrencyAmountBigInt,
} from '@commonality/sdk'
import { isEthNote } from '../delegation/utils'

/**
 * Computes the total available delegatable funding for a statement by summing
 * the amounts of all active ETH notes with NoteIntent attestations pointing to it.
 */
export async function computeAvailableDelegatableFunding(
  machinery: SDKMachinery,
  statementCid: string
): Promise<CurrencyAmountBigInt[]> {
  const attests = await getNoteIntentAttestationsByStatement(machinery, statementCid)
  if (attests.length === 0) return []

  const noteResults = await Promise.all(
    attests.map((a) => getNote(machinery, a.noteId).catch(() => null))
  )

  const activeEthNotes = noteResults.filter(
    (n): n is Note => n !== null && n.active && isEthNote(n)
  )
  const total = activeEthNotes.reduce((sum, n) => sum + BigInt(n.amount), 0n)
  return [{ currency: ETH_CURRENCY, amount: total }]
}
