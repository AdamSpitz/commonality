import { http, createConfig } from 'wagmi'
import { mainnet, base, baseSepolia, hardhat } from 'wagmi/chains'
import { getDefaultConfig, getDefaultConnectors } from 'connectkit'
import { injected, mock } from 'wagmi/connectors'
import { isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { MockParameters } from 'wagmi/connectors'
import { HARDHAT_DEV_ACCOUNTS, isLocalDevHost } from './lib/hardhatAccounts'
import { hardhatLocalConnector } from './lib/hardhatLocalConnector'

export const walletConnectProjectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '').trim()
export const isE2E = import.meta.env.VITE_E2E === 'true'
export const useLocalHardhatWallets = !isE2E && isLocalDevHost()

const mainnetRpcUrl = import.meta.env.VITE_MAINNET_RPC_URL || 'https://ethereum-rpc.publicnode.com'
const baseRpcUrl = import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org'
const baseSepoliaRpcUrl = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://baseSepolia.base.org'
const hardhatRpcUrl = import.meta.env.VITE_ETH_RPC_URL || 'http://127.0.0.1:8545'

export const wagmiChains = [mainnet, base, baseSepolia, hardhat] as const

export const wagmiTransports = {
  [mainnet.id]: http(mainnetRpcUrl),
  [base.id]: http(baseRpcUrl),
  [baseSepolia.id]: http(baseSepoliaRpcUrl),
  [hardhat.id]: http(hardhatRpcUrl),
}

export function createMockConfig(
  addressOrPkey: `0x${string}` = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  features?: MockParameters['features'],
) {
  const account = isAddress(addressOrPkey)
    ? addressOrPkey
    : privateKeyToAccount(addressOrPkey)

  const address = typeof account === 'string' ? account : account.address

  return createConfig({
    chains: [hardhat, mainnet, baseSepolia],
    transports: wagmiTransports,
    connectors: [mock({ accounts: [address], features })],
  })
}

function buildLocalHardhatConfig() {
  return createConfig({
    chains: [hardhat],
    transports: {
      [hardhat.id]: http(hardhatRpcUrl),
    },
    connectors: HARDHAT_DEV_ACCOUNTS.map((account) => hardhatLocalConnector(account)),
    multiInjectedProviderDiscovery: false,
    ssr: false,
  })
}

function buildWagmiConfig() {
  if (!walletConnectProjectId && typeof console !== 'undefined') {
    console.warn(
      '[ui3] VITE_WALLETCONNECT_PROJECT_ID is not set. '
      + 'Browser-injected wallets still work; WalletConnect QR / mobile wallets will not.',
    )
  }

  const defaultConnectors = getDefaultConnectors({
    app: {
      name: 'ui3',
      description: 'Causes, Goals, Beliefs, Projects, Members',
      url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5175',
    },
    walletConnectProjectId: walletConnectProjectId || '',
    enableAaveAccount: false,
  })

  const connectors = [
    injected({ shimDisconnect: true }),
    ...defaultConnectors,
  ]

  return createConfig(
    getDefaultConfig({
      chains: wagmiChains,
      transports: wagmiTransports,
      connectors: connectors as never,
      walletConnectProjectId: walletConnectProjectId || '',
      appName: 'ui3',
      appDescription: 'Causes, Goals, Beliefs, Projects, Members',
      appUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5175',
      enableAaveAccount: false,
    }),
  )
}

export const config = isE2E
  ? createMockConfig()
  : useLocalHardhatWallets
    ? buildLocalHardhatConfig()
    : buildWagmiConfig()
