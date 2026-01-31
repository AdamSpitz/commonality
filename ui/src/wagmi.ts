import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'
import { mock } from 'wagmi/connectors'
import { isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { MockParameters } from 'wagmi/connectors'

// Default production config
export const config = createConfig(
  getDefaultConfig({
    chains: [mainnet, sepolia, hardhat],
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [hardhat.id]: http('http://127.0.0.1:8545'),
    },
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
    appName: 'Commonality',
    appDescription: 'Coordination platform for aligned people to track their numbers and crowdfund projects',
    appUrl: 'https://commonality.app',
  }),
)

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
      chains: [mainnet, sepolia, hardhat],
      transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
        [hardhat.id]: http('http://127.0.0.1:8545'),
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
