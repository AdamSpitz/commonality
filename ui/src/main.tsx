import { StrictMode, Suspense, lazy, useState, useCallback, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { Box, CircularProgress, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import type { PaletteMode, Theme } from '@mui/material'
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
import { loadRuntimeConfig } from './shared'
import { installStaleBuildRecovery } from './shared'
import { ThemeModeContext } from './shared'

const queryClient = new QueryClient()

const colorModeStorageKey = 'commonality.colorMode'

function getSystemColorMode(): PaletteMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialColorMode(): PaletteMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedMode = window.localStorage.getItem(colorModeStorageKey)

  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode
  }

  return getSystemColorMode()
}

function createAppTheme(mode: PaletteMode): Theme {
  return createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
          background: {
            default: '#fffdf8',
            paper: '#ffffff',
          },
        }
        : {
          primary: {
            main: '#93c5fd',
            light: '#bfdbfe',
            dark: '#1d4ed8',
            contrastText: '#0b1020',
          },
          background: {
            default: '#0b1020',
            paper: '#121a2c',
          },
        }),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          containedPrimary: ({ theme }) => theme.palette.mode === 'dark'
            ? {
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1e40af',
                },
              }
            : {},
        },
      },
      MuiCssBaseline: {
        styleOverrides: (themeParam) => ({
          body: {
            color: themeParam.palette.text.primary,
            background: themeParam.palette.mode === 'light'
              ? 'radial-gradient(circle at top, rgba(216, 243, 220, 0.55), transparent 36%), linear-gradient(180deg, #f7f5ef 0%, #fffdf8 42%, #f4f8f2 100%)'
              : 'radial-gradient(circle at top, rgba(25, 118, 210, 0.22), transparent 38%), linear-gradient(180deg, #08111f 0%, #0b1020 48%, #111827 100%)',
          },
        }),
      },
    },
  })
}

const PrivyAppProvider = lazy(() => import('./privy/PrivyAppProvider'))

installStaleBuildRecovery()

// Global type declaration for E2E test helper
declare global {
  interface Window {
    _setupTestWallet: typeof createMockConfig
  }
}

export function Root() {
  const [mode, setMode] = useState<PaletteMode>(getInitialColorMode)
  const [wagmiConfig, setWagmiConfig] = useState(config)

  const theme = useMemo(() => createAppTheme(mode), [mode])
  const themeModeContextValue = useMemo(() => ({
    mode,
    toggleMode: () => setMode((currentMode) => currentMode === 'light' ? 'dark' : 'light'),
  }), [mode])

  useEffect(() => {
    window.localStorage.setItem(colorModeStorageKey, mode)
    document.documentElement.dataset.colorMode = mode
  }, [mode])

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
    <ThemeModeContext.Provider value={themeModeContextValue}>
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
    </ThemeModeContext.Provider>
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
