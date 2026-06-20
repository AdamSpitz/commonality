import type { Note, NoteIntentAttestation } from '@commonality/sdk'
import { formatCurrencyAmount, getCurrencyForNote } from '../shared/currency'

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

export function isEthNote(note: Note): boolean {
  return note.token.toLowerCase() === ETH_ADDRESS.toLowerCase() && note.tokenType === 0
}

export function formatNoteAmount(note: Note): string {
  return formatCurrencyAmount(note.amount, getCurrencyForNote(note))
}

export { truncateAddress } from '../shared/utils/address'

export function isDelegate(note: Note): boolean {
  return note.owner.toLowerCase() !== note.rootOwner.toLowerCase()
}

export function noteScopedKey(note: Pick<Note, 'contractAddress' | 'id'>): string {
  return `${note.contractAddress.toLowerCase()}:${note.id}`
}

export function noteIntentLookupKey(attestation: Pick<NoteIntentAttestation, 'noteContract' | 'noteId'>): string {
  return `${attestation.noteContract.toLowerCase()}:${attestation.noteId}`
}
