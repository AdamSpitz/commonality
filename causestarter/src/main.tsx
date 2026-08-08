import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import type { PaletteMode, Theme } from '@mui/material'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { config, createMockConfig } from './wagmi'
import { loadRuntimeConfig as loadUiSharedRuntimeConfig } from '@ui/shared'
import { loadRuntimeConfig } from './lib/runtimeConfig'
import { ThemeModeContext } from './lib/themeMode'
import App from './App'
import './index.css'

const queryClient = new QueryClient()
const colorModeStorageKey = 'causestarter.colorMode'
const TOUCH_TARGET_MIN = 44

function getSystemColorMode(): PaletteMode {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialColorMode(): PaletteMode {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(colorModeStorageKey)
  if (stored === 'light' || stored === 'dark') return stored
  return getSystemColorMode()
}

function createAppTheme(mode: PaletteMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#0f766e' : '#2dd4bf',
        light: mode === 'light' ? '#14b8a6' : '#5eead4',
        dark: mode === 'light' ? '#115e59' : '#0f766e',
        contrastText: mode === 'light' ? '#ffffff' : '#042f2e',
      },
      secondary: {
        main: mode === 'light' ? '#c2410c' : '#fb923c',
      },
      background: {
        default: mode === 'light' ? '#fffaf4' : '#0a1018',
        paper: mode === 'light' ? '#ffffff' : '#121a24',
      },
    },
    typography: {
      fontFamily: "'Avenir Next', 'Segoe UI', system-ui, sans-serif",
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          sizeSmall: {
            '@media (pointer: coarse)': {
              minHeight: TOUCH_TARGET_MIN,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          sizeSmall: {
            '@media (pointer: coarse)': {
              minWidth: TOUCH_TARGET_MIN,
              minHeight: TOUCH_TARGET_MIN,
            },
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: (themeParam) => ({
          body: {
            color: themeParam.palette.text.primary,
            background: themeParam.palette.mode === 'light'
              ? 'radial-gradient(circle at top, rgba(20,184,166,0.14), transparent 40%), linear-gradient(180deg, #fff7ed 0%, #fffaf4 45%, #f0fdfa 100%)'
              : 'radial-gradient(circle at top, rgba(45,212,191,0.12), transparent 40%), linear-gradient(180deg, #071018 0%, #0a1018 50%, #111827 100%)',
          },
        }),
      },
    },
  })
}

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
    toggleMode: () => setMode((current) => (current === 'light' ? 'dark' : 'light')),
  }), [mode])

  useEffect(() => {
    window.localStorage.setItem(colorModeStorageKey, mode)
    document.documentElement.dataset.colorMode = mode
  }, [mode])

  const setupTestWallet = useCallback(
    (...args: Parameters<typeof createMockConfig>) => {
      const next = createMockConfig(...args)
      setWagmiConfig(next)
      return next
    },
    [],
  )

  if (typeof window !== 'undefined') {
    window._setupTestWallet = setupTestWallet
  }

  return (
    <ThemeModeContext.Provider value={themeModeContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <ConnectKitProvider>
              <Box sx={{ minHeight: '100vh' }}>
                <App />
              </Box>
            </ConnectKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

// Cause board reuses ui/fundingportals, which reads contracts/URLs via ui/shared
// runtime config. Load both stores from the same config.json.
Promise.all([loadRuntimeConfig(), loadUiSharedRuntimeConfig()])
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Root />
      </StrictMode>,
    )
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    document.getElementById('root')!.textContent = message
  })
