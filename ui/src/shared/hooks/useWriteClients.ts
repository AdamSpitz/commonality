import { usePublicClient, useWalletClient } from 'wagmi'
import type { Address } from 'viem'
import type { WriteClients } from '@commonality/sdk'

function toAddress(value: string | undefined): Address | null {
  return value?.startsWith('0x') ? (value as Address) : null
}

function getWalletAddress(walletClient: unknown): Address | null {
  const account = (walletClient as { account?: Address | { address?: Address } }).account
  if (!account) return null
  return typeof account === 'string' ? toAddress(account) : account.address ?? null
}

export function useWriteClients(fallbackAddress?: string): WriteClients | null {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  if (!walletClient || !publicClient) return null

  const address = getWalletAddress(walletClient) ?? toAddress(fallbackAddress)
  if (!address) return null

  return {
    walletClient: walletClient as WriteClients['walletClient'],
    publicClient: publicClient as WriteClients['publicClient'],
    account: address,
  }
}
