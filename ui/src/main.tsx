import { StrictMode, Suspense, lazy, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { Box, CircularProgress, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import {
  config,
  createMockConfig,
  isPrivyEnabled,
} from './wagmi'
import './index.css'
import App from './App.tsx'
import { loadRuntimeConfig } from './shared/runtimeConfig'

const queryClient = new QueryClient()

const theme = createTheme({
  palette: {
    mode: 'light',
  },
})

const PrivyAppProvider = lazy(() => import('./privy/PrivyAppProvider'))

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
          <Suspense
            fallback={(
              <Box
                sx={{
                  minHeight: '100vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress />
              </Box>
            )}
          >
            <PrivyAppProvider>
              <App />
            </PrivyAppProvider>
          </Suspense>
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

loadRuntimeConfig().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  )
}).catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  document.getElementById('root')!.textContent = message
})
