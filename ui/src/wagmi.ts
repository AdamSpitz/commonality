import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'
import { createConfig as createPrivyConfig } from '@privy-io/wagmi'
import { mock } from 'wagmi/connectors'
import { isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { MockParameters } from 'wagmi/connectors'

export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''
export const privyAppId = import.meta.env.VITE_PRIVY_APP_ID?.trim() || ''
export const privyClientId = import.meta.env.VITE_PRIVY_CLIENT_ID?.trim() || undefined
export const isPrivyEnabled = privyAppId.length > 0

export const wagmiChains = [mainnet, sepolia, hardhat] as const

export const wagmiTransports = {
  [mainnet.id]: http(),
  [sepolia.id]: http(),
  [hardhat.id]: http('http://127.0.0.1:8545'),
}

export const config = createConfig(
  getDefaultConfig({
    chains: wagmiChains,
    transports: wagmiTransports,
    walletConnectProjectId,
    appName: 'Commonality',
    appDescription: 'Fund projects and content around shared values',
    appUrl: 'https://commonality.app',
  }),
)

export const privyWagmiConfig = createPrivyConfig({
  chains: wagmiChains,
  transports: wagmiTransports,
})

/**
 * Create a wagmi config with mock connector for E2E testing.
 * This allows Playwright tests to inject specific Hardhat test accounts.
 *
 * @param addressOrPkey - Either an address or private key
 * @param features - Optional mock connector features
 * @returns Wagmi config with mock connector
 */
export function createMockConfig(
  addressOrPkey: `0x${string}`,
  features?: MockParameters['features']
) {
  // Convert private key to account if needed
  const account = isAddress(addressOrPkey)
    ? addressOrPkey
    : privateKeyToAccount(addressOrPkey)

  const address = typeof account === 'string' ? account : account.address

  return createConfig(
    getDefaultConfig({
      chains: [hardhat, mainnet, sepolia],
      transports: {
        [hardhat.id]: http('http://127.0.0.1:8545'),
        [mainnet.id]: http(),
        [sepolia.id]: http(),
      },
      walletConnectProjectId: '',
      appName: 'Commonality',
      appDescription: 'Coordination platform for aligned people',
      appUrl: 'https://commonality.app',
      // Add mock connector for testing
      connectors: [mock({ accounts: [address], features })],
    }),
  )
}
