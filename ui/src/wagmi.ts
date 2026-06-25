import { http, createConfig } from 'wagmi'
import { mainnet, base, baseSepolia, hardhat } from 'wagmi/chains'
import { getDefaultConfig } from 'connectkit'
import { mock } from 'wagmi/connectors'
import { isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { MockParameters } from 'wagmi/connectors'

export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''
export const privyAppId = import.meta.env.VITE_PRIVY_APP_ID?.trim() || ''
export const privyClientId = import.meta.env.VITE_PRIVY_CLIENT_ID?.trim() || undefined
export const isPrivyEnabled = privyAppId.length > 0
export const isE2E = import.meta.env.VITE_E2E === 'true'

const mainnetRpcUrl = import.meta.env.VITE_MAINNET_RPC_URL || 'https://ethereum-rpc.publicnode.com'
const baseRpcUrl = import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org'
const baseSepoliaRpcUrl = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://baseSepolia.base.org'
const hardhatRpcUrl = import.meta.env.VITE_ETH_RPC_URL || 'http://127.0.0.1:8545'

// Ethereum L1 (`mainnet`) is kept for L1-only reads such as ENS; the app's
// production contracts live on Base (L2). See shared/config/expectedChain.ts.
export const wagmiChains = [mainnet, base, baseSepolia, hardhat] as const

export const wagmiTransports = {
  [mainnet.id]: http(mainnetRpcUrl),
  [base.id]: http(baseRpcUrl),
  [baseSepolia.id]: http(baseSepoliaRpcUrl),
  [hardhat.id]: http(hardhatRpcUrl),
}

/**
 * Create a wagmi config with mock connector for E2E testing.
 * This allows Playwright tests to inject specific Hardhat test accounts.
 *
 * @param addressOrPkey - Either an address or private key
 * @param features - Optional mock connector features
 * @returns Wagmi config with mock connector
 */
export function createMockConfig(
  addressOrPkey: `0x${string}` = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  features?: MockParameters['features']
) {
  // Convert private key to account if needed
  const account = isAddress(addressOrPkey)
    ? addressOrPkey
    : privateKeyToAccount(addressOrPkey)

  const address = typeof account === 'string' ? account : account.address

  return createConfig({
    chains: [hardhat, mainnet, baseSepolia],
    transports: wagmiTransports,
    // Use only wagmi's mock connector in E2E. ConnectKit's default connector
    // set pulls in wallet SDKs (for example Coinbase) that perform external
    // browser checks and can emit console errors unrelated to the app under test.
    connectors: [mock({ accounts: [address], features })],
  })
}

export const config = isE2E
  ? createMockConfig()
  : createConfig(
    getDefaultConfig({
      chains: wagmiChains,
      transports: wagmiTransports,
      walletConnectProjectId,
      appName: 'Commonality',
      appDescription: 'Fund projects and content around shared values',
      appUrl: 'https://commonality.app',
    }),
  )
