import { isAddress } from 'viem'
import { getRuntimeConfigValue } from './runtimeConfig'

const CAIP10_EIP155_PATTERN = /^eip155:(\d+):(0x[a-fA-F0-9]{40})$/

export interface ChainAddressRef {
  chainId: number
  address: `0x${string}`
}

export function currentDefaultChainId(): number {
  return Number(getRuntimeConfigValue('VITE_CHAIN_ID') || 31337)
}

export function formatChainAddressRef(ref: ChainAddressRef): string {
  return `eip155:${ref.chainId}:${ref.address}`
}

export function tryParseChainAddressRef(value: string | undefined | null, defaultChainId = currentDefaultChainId()): ChainAddressRef | null {
  if (!value) return null
  const decodedValue = decodeURIComponent(value)
  const match = CAIP10_EIP155_PATTERN.exec(decodedValue)
  if (match) {
    return { chainId: Number(match[1]), address: match[2] as `0x${string}` }
  }
  if (isAddress(decodedValue)) {
    return { chainId: defaultChainId, address: decodedValue as `0x${string}` }
  }
  return null
}

export function chainScopedAddressSegment(address: string, chainId: number = currentDefaultChainId()): string {
  return encodeURIComponent(formatChainAddressRef({ chainId, address: address as `0x${string}` }))
}

export function projectPathForAddress(address: string, chainId?: number): string {
  return `/projects/${chainScopedAddressSegment(address, chainId)}`
}

export function contentContractPathForAddress(address: string, chainId?: number): string {
  return `/content/contracts/${chainScopedAddressSegment(address, chainId)}`
}
