import { MutableRefUpdaterAbi } from '@commonality/sdk/abis'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { getUserRef, updateRef, type MutableRefUpdaterContract } from '@commonality/sdk/mutable-refs'
import type { WriteClients } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from '../../shared'

export interface PreferredMoneySource {
  noteContract: string
  noteId: string
}

export interface PersonalFundingBoard {
  statementCids: string[]
  geographicWithin?: string[]
  preferredMoneySource?: PreferredMoneySource
}

export const PERSONAL_FUNDING_BOARD_REF = 'personal-funding-board'
export const PERSONAL_FUNDING_BOARD_SCHEMA_VERSION = 1 as const
const KEY_PREFIX = 'causestarter.personal-funding-board.v1'

function key(address: string) {
  return `${KEY_PREFIX}:${address.toLowerCase()}`
}

export function parsePersonalFundingBoard(value: string | null | undefined): PersonalFundingBoard | null {
  try {
    const parsed = JSON.parse(value ?? 'null') as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const row = parsed as Record<string, unknown>
    if (!Array.isArray(row.statementCids) || !row.statementCids.every((cid) => typeof cid === 'string')) return null
    const geographicWithin = Array.isArray(row.geographicWithin)
      && row.geographicWithin.every((part) => typeof part === 'string')
      ? row.geographicWithin as string[]
      : undefined
    const source = row.preferredMoneySource
    const preferredMoneySource = source && typeof source === 'object'
      && typeof (source as Record<string, unknown>).noteContract === 'string'
      && typeof (source as Record<string, unknown>).noteId === 'string'
      ? source as unknown as PreferredMoneySource
      : undefined
    return {
      statementCids: [...new Set(row.statementCids)],
      ...(geographicWithin?.length ? { geographicWithin } : {}),
      ...(preferredMoneySource ? { preferredMoneySource } : {}),
    }
  } catch {
    return null
  }
}

export function serializePersonalFundingBoard(board: PersonalFundingBoard): string {
  return JSON.stringify({ version: PERSONAL_FUNDING_BOARD_SCHEMA_VERSION, ...board })
}

export function readPersonalFundingBoard(address: string | undefined): PersonalFundingBoard | null {
  if (!address) return null
  return parsePersonalFundingBoard(window.localStorage.getItem(key(address)))
}

export function writePersonalFundingBoard(address: string, board: PersonalFundingBoard) {
  window.localStorage.setItem(key(address), serializePersonalFundingBoard(board))
  window.dispatchEvent(new CustomEvent('causestarter:personal-funding-board', { detail: address.toLowerCase() }))
}

export async function readRemotePersonalFundingBoard(machinery: SDKMachinery, address: string) {
  const ref = await getUserRef(machinery, address, PERSONAL_FUNDING_BOARD_REF)
  return parsePersonalFundingBoard(ref?.value)
}

export async function persistPersonalFundingBoard(clients: WriteClients, board: PersonalFundingBoard) {
  const address = getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') as `0x${string}` | undefined
  if (!address) throw new Error('MutableRefUpdater is not configured')
  const contract: MutableRefUpdaterContract = { address, abi: MutableRefUpdaterAbi }
  await updateRef(clients, contract, PERSONAL_FUNDING_BOARD_REF, serializePersonalFundingBoard(board))
}
