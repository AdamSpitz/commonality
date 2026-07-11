import type { ReactNode } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider as PrivyWagmiProvider, createConfig as createPrivyConfig } from '@privy-io/wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { isPrivySmartWalletEnabled, privyAppId, privyClientId, privySmartWalletBundlerUrl, privySmartWalletPaymasterUrl, wagmiChains, wagmiTransports } from '../wagmi'

const privyWagmiConfig = createPrivyConfig({
  chains: wagmiChains,
  transports: wagmiTransports,
})

const privySmartWalletChain = import.meta.env.COMMONALITY_ENVIRONMENT === 'mainnet' ? base : baseSepolia
const privySmartWalletConfig = isPrivySmartWalletEnabled
  ? {
      enabled: true,
      smartWalletType: 'kernel',
      configuredNetworks: [
        {
          chainId: String(privySmartWalletChain.id),
          bundlerUrl: privySmartWalletBundlerUrl,
          ...(privySmartWalletPaymasterUrl ? { paymasterUrl: privySmartWalletPaymasterUrl } : {}),
        },
      ],
    } as const
  : undefined

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
          loginMessage: 'Sign in to continue. Commonality creates a recoverable account for you behind the scenes.',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: wagmiChains[0],
        supportedChains: [...wagmiChains],
        ...(privySmartWalletConfig ? { smartWallets: privySmartWalletConfig } : {}),
      }}
    >
      <PrivyWagmiProvider config={privyWagmiConfig}>{children}</PrivyWagmiProvider>
    </PrivyProvider>
  )
}
