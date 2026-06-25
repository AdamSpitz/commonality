import type { Note, NoteIntentAttestation } from '@commonality/sdk/delegation'
import { formatCurrencyAmount, getCurrencyForNote } from '../shared'

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

export function isEthNote(note: Note): boolean {
  return note.token.toLowerCase() === ETH_ADDRESS.toLowerCase() && note.tokenType === 0
}

export function formatNoteAmount(note: Note): string {
  return formatCurrencyAmount(note.amount, getCurrencyForNote(note))
}

export { truncateAddress } from '../shared'

export function isDelegate(note: Note): boolean {
  return note.owner.toLowerCase() !== note.rootOwner.toLowerCase()
}

export function noteScopedKey(note: Pick<Note, 'contractAddress' | 'id'>): string {
  return `${note.contractAddress.toLowerCase()}:${note.id}`
}

export function noteDetailPathFor(contractAddress: string, id: string | bigint): string {
  return `/delegation/notes/${encodeURIComponent(`${contractAddress.toLowerCase()}:${id.toString()}`)}`
}

export function noteDetailPath(note: Pick<Note, 'contractAddress' | 'id'>): string {
  return noteDetailPathFor(note.contractAddress, note.id)
}

export function parseNoteRouteId(routeId: string): { noteId: string; noteContract: string } | null {
  const decoded = decodeURIComponent(routeId)
  const [maybeContract, maybeNoteId] = decoded.split(':')
  const hasScopedContract = /^0x[0-9a-fA-F]{40}$/.test(maybeContract ?? '') && maybeNoteId !== undefined
  if (!hasScopedContract) return null
  return { noteContract: maybeContract, noteId: maybeNoteId }
}

export function noteIntentLookupKey(attestation: Pick<NoteIntentAttestation, 'noteContract' | 'noteId'>): string {
  return `${attestation.noteContract.toLowerCase()}:${attestation.noteId}`
}
