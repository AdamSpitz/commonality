import { StrictMode, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { config, createMockConfig } from './wagmi'
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
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider>
            <App />
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
