import type { ReactNode } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets'
import { WagmiProvider as PrivyWagmiProvider, createConfig as createPrivyConfig } from '@privy-io/wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { privyAppId, privyClientId, wagmiChains, wagmiTransports } from '../wagmi'

const privyWagmiConfig = createPrivyConfig({
  chains: wagmiChains,
  transports: wagmiTransports,
})

// Privy reads smart-wallet networks (bundler URL, paymaster URL, chains) from the
// Privy dashboard's app config, NOT from client code — the `smartWallets` field is
// not part of the public PrivyClientConfig, so passing `configuredNetworks` here is
// silently ignored. Configure Base Sepolia (84532) / Base (8453) with the Pimlico
// bundler + paymaster URLs in the dashboard instead. We only pick the default chain.
const privySmartWalletChain = import.meta.env.COMMONALITY_ENVIRONMENT === 'mainnet' ? base : baseSepolia

interface PrivyAppProviderProps {
  children: ReactNode
}

export default function PrivyAppProvider({ children }: PrivyAppProviderProps) {
  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#14213d',
          walletList: ['detected_wallets', 'metamask', 'coinbase_wallet', 'rainbow', 'wallet_connect'],
          loginMessage: 'Sign in with email or a wallet to start taking onchain actions.',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: privySmartWalletChain,
        supportedChains: [...wagmiChains],
      }}
    >
      <PrivyWagmiProvider config={privyWagmiConfig}>
        <SmartWalletsProvider>{children}</SmartWalletsProvider>
      </PrivyWagmiProvider>
    </PrivyProvider>
  )
}
