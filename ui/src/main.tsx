import { StrictMode, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider as PrivyWagmiProvider } from '@privy-io/wagmi'
import {
  config,
  createMockConfig,
  isPrivyEnabled,
  privyAppId,
  privyClientId,
  privyWagmiConfig,
  wagmiChains,
} from './wagmi'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

const theme = createTheme({
  palette: {
    mode: 'light',
  },
})

// Global type declaration for E2E test helper
declare global {
  interface Window {
    _setupTestWallet: typeof createMockConfig
  }
}

export function Root() {
  const [wagmiConfig, setWagmiConfig] = useState(config)

  // Expose wallet setup function for E2E tests
  const setupTestWallet = useCallback(
    (...args: Parameters<typeof createMockConfig>) => {
      const newConfig = createMockConfig(...args)
      setWagmiConfig(newConfig)
      return newConfig
    },
    []
  )

  // Make function available to Playwright tests
  if (typeof window !== 'undefined') {
    window._setupTestWallet = setupTestWallet
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        {isPrivyEnabled ? (
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
            <PrivyWagmiProvider config={privyWagmiConfig}>
              <App />
            </PrivyWagmiProvider>
          </PrivyProvider>
        ) : (
          <WagmiProvider config={wagmiConfig}>
            <ConnectKitProvider>
              <App />
            </ConnectKitProvider>
          </WagmiProvider>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
