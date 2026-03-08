import {
  getNoteIntentAttestationsByStatement,
  getNote,
  type SDKMachinery,
  type Note,
} from '@commonality/sdk'
import { isEthNote } from '../delegation/utils'

/**
 * Computes the total available delegatable funding for a statement by summing
 * the amounts of all active ETH notes with NoteIntent attestations pointing to it.
 */
export async function computeAvailableDelegatableFunding(
  machinery: SDKMachinery,
  statementCid: string
): Promise<bigint> {
  const attests = await getNoteIntentAttestationsByStatement(machinery, statementCid)
  if (attests.length === 0) return 0n

  const noteResults = await Promise.all(
    attests.map((a) => getNote(machinery, a.noteId).catch(() => null))
  )

  const activeEthNotes = noteResults.filter(
    (n): n is Note => n !== null && n.active && isEthNote(n)
  )
  return activeEthNotes.reduce((sum, n) => sum + BigInt(n.amount), 0n)
}
