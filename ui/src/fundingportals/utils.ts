import {
  getNoteIntentAttestationsByStatement,
  getNote,
  type SDKMachinery,
  type CurrencyAmountBigInt,
  getCurrencyForTokenValue,
  addCurrencyAmount,
  currencyTotalsToArray,
} from '@commonality/sdk'
import { noteIntentLookupKey } from '../delegation/utils'

/**
 * Computes the total available delegatable funding for a statement by summing
 * the amounts of all active notes with NoteIntent attestations pointing to it,
 * grouped by funding currency.
 */
export async function computeAvailableDelegatableFunding(
  machinery: SDKMachinery,
  statementCid: string
): Promise<CurrencyAmountBigInt[]> {
  const attests = await getNoteIntentAttestationsByStatement(machinery, statementCid)
  if (attests.length === 0) return []

  const noteResults = await Promise.all(
    attests.map((a) => getNote(machinery, noteIntentLookupKey(a)).catch(() => null))
  )

  const totals = new Map<string, CurrencyAmountBigInt>()
  for (const note of noteResults) {
    if (!note?.active) continue
    addCurrencyAmount(totals, getCurrencyForTokenValue(note), BigInt(note.amount))
  }

  return currencyTotalsToArray(totals)
}
