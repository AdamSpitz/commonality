import { useEffect, useState } from 'react'
import { usePublicClient, useWalletClient } from 'wagmi'
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets'
import type { Address } from 'viem'
import type { WriteClients } from '@commonality/sdk/utils'

const hasPrivyAppId = (import.meta.env.VITE_PRIVY_APP_ID?.trim() || '').length > 0
const hasPrivySmartWalletBundler = (import.meta.env.VITE_PRIVY_SMART_WALLET_BUNDLER_URL?.trim() || '').length > 0

function toAddress(value: string | undefined): Address | null {
  return value?.startsWith('0x') ? (value as Address) : null
}

function getWalletAddress(walletClient: unknown): Address | null {
  const account = (walletClient as { account?: Address | { address?: Address } }).account
  if (!account) return null
  return typeof account === 'string' ? toAddress(account) : account.address ?? null
}

const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID || '') || undefined

export function useWriteClients(fallbackAddress?: string): WriteClients | null {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient({ chainId: configuredChainId })
  const { client: smartWalletClient, getClientForChain } = useSmartWallets()
  const [configuredSmartWalletClient, setConfiguredSmartWalletClient] = useState<typeof smartWalletClient>()

  useEffect(() => {
    if (!hasPrivyAppId || !hasPrivySmartWalletBundler || !configuredChainId) {
      setConfiguredSmartWalletClient(undefined)
      return
    }

    let cancelled = false
    void getClientForChain({ id: configuredChainId }).then((client) => {
      if (!cancelled) setConfiguredSmartWalletClient(client as typeof smartWalletClient)
    }).catch((error) => {
      console.warn('Failed to get Privy smart-wallet client for configured chain', error)
      if (!cancelled) setConfiguredSmartWalletClient(undefined)
    })

    return () => { cancelled = true }
  }, [getClientForChain])

  const activeSmartWalletClient = hasPrivyAppId && hasPrivySmartWalletBundler && configuredChainId
    ? configuredSmartWalletClient
    : smartWalletClient

  if (!publicClient) return null

  if (hasPrivyAppId && hasPrivySmartWalletBundler) {
    if (!activeSmartWalletClient) return null
    const smartWalletAddress = activeSmartWalletClient.account.address
    if (!smartWalletAddress) return null

    return {
      walletClient: activeSmartWalletClient as unknown as WriteClients['walletClient'],
      publicClient: publicClient as WriteClients['publicClient'],
      account: smartWalletAddress,
      isSmartAccount: true,
    }
  }

  if (!walletClient) return null

  const address = getWalletAddress(walletClient) ?? toAddress(fallbackAddress)
  if (!address) return null

  return {
    walletClient: walletClient as WriteClients['walletClient'],
    publicClient: publicClient as WriteClients['publicClient'],
    account: address,
  }
}
