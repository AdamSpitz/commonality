import type { ReactNode } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider as PrivyWagmiProvider, createConfig as createPrivyConfig } from '@privy-io/wagmi'
import { privyAppId, privyClientId, wagmiChains, wagmiTransports } from '../wagmi'

const privyWagmiConfig = createPrivyConfig({
  chains: wagmiChains,
  transports: wagmiTransports,
})

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
        defaultChain: wagmiChains[0],
        supportedChains: [...wagmiChains],
      }}
    >
      <PrivyWagmiProvider config={privyWagmiConfig}>{children}</PrivyWagmiProvider>
    </PrivyProvider>
  )
}
