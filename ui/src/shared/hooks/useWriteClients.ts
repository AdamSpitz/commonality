import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import type { WriteClients } from '@commonality/sdk'

export function useWriteClients(): WriteClients | null {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  if (!walletClient || !publicClient || !address) return null

  return {
    walletClient: walletClient as WriteClients['walletClient'],
    publicClient: publicClient as WriteClients['publicClient'],
    account: address,
  }
}
