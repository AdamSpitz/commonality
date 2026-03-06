import type { Note } from '@commonality/sdk'
import { formatEther } from 'viem'

const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

export function isEthNote(note: Note): boolean {
  return note.token.toLowerCase() === ETH_ADDRESS.toLowerCase() && note.tokenType === 0
}

export function formatNoteAmount(note: Note): string {
  if (isEthNote(note)) {
    return `${formatEther(BigInt(note.amount))} ETH`
  }
  return `${note.amount} tokens`
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function isDelegate(note: Note): boolean {
  return note.owner.toLowerCase() !== note.rootOwner.toLowerCase()
}
