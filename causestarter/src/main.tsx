import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import type { PaletteMode, Theme } from '@mui/material'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { config, createMockConfig } from './wagmi'
import {
  getRuntimeConfigValue as getUiSharedRuntimeConfigValue,
  loadRuntimeConfig as loadUiSharedRuntimeConfig,
} from '@ui/shared'
import { getRuntimeConfig, getRuntimeConfigValue, loadRuntimeConfig } from './lib/runtimeConfig'
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

// Cause board reuses ui/fundingportals, which reads contracts/URLs via
// ui/shared runtime config (separate module store from CauseStarter's own
// lib/runtimeConfig). Both must load the same config.json and stay aligned on
// shared keys until those stores are unified. Failure of either load fails boot.
// Keys cover useMachinery contract/RPC/IPFS surface, payment currency, and
// domain URLs used by embedded @ui/* board/project pages.
const SHARED_RUNTIME_KEYS = [
  'VITE_EVENT_CACHE_URL',
  'VITE_IPFS_GATEWAY',
  'VITE_IPFS_API',
  'VITE_PLATFORM_API_URL',
  'VITE_MAINNET_RPC_URL',
  'VITE_ETH_RPC_URL',
  'VITE_BELIEFS_CONTRACT_ADDRESS',
  'VITE_IMPLICATIONS_CONTRACT_ADDRESS',
  'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS',
  'VITE_ERC1155_FACTORY_ADDRESS',
  'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS',
  'VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS',
  'VITE_NOTE_INTENT_CONTRACT_ADDRESS',
  'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
  'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
  'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS',
  'VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
  'VITE_PUBLISHED_DATA_CONTRACT_ADDRESS',
  'VITE_CONTENT_REGISTRY_ADDRESS',
  'VITE_CHANNEL_REGISTRY_ADDRESS',
  'VITE_CHANNEL_ESCROW_ADDRESS',
  'VITE_CREATOR_CONTRACT_FACTORY_ADDRESS',
  'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS',
  'VITE_PAYMENT_TOKEN_ADDRESS',
  'VITE_PAYMENT_TOKEN_SYMBOL',
  'VITE_PAYMENT_TOKEN_DECIMALS',
  'VITE_CHAIN_ID',
  'VITE_COMMONALITY_URL',
  'VITE_LAZYGIVING_URL',
  'VITE_ALIGNMENT_URL',
  'VITE_TALLY_URL',
  'VITE_CONTENT_FUNDING_URL',
  'VITE_CIVILITY_URL',
  'VITE_COMMON_SENSE_MAJORITY_URL',
  'VITE_CONCEPTSPACE_URL',
] as const

/** Fail boot on dual-store drift in local/dev; warn-only elsewhere. */
function isStrictRuntimeConfigEnv(): boolean {
  if (import.meta.env.DEV) return true
  const environment =
    getRuntimeConfig().COMMONALITY_ENVIRONMENT
    ?? (import.meta.env.COMMONALITY_ENVIRONMENT as string | undefined)
  return environment === 'local'
}

function assertRuntimeConfigStoresAligned(): void {
  const mismatches: string[] = []
  for (const key of SHARED_RUNTIME_KEYS) {
    const host = getRuntimeConfigValue(key)
    const shared = getUiSharedRuntimeConfigValue(key)
    if ((host ?? '') !== (shared ?? '')) {
      mismatches.push(`${key}: host=${host ?? '(unset)'} ui/shared=${shared ?? '(unset)'}`)
    }
  }
  if (mismatches.length > 0) {
    const detail =
      '[CauseStarter] dual runtime-config stores disagree after loadRuntimeConfig; '
      + 'board/project pages may use different addresses than native pages:\n'
      + mismatches.join('\n')
    // Local/dev: fail boot so silent wrong contracts cannot ship a broken board.
    // Production dual-store drift still warns until stores are unified.
    if (isStrictRuntimeConfigEnv()) {
      throw new Error(detail)
    }
    console.warn(detail)
  } else if (import.meta.env.DEV) {
    console.info(
      '[CauseStarter] dual runtime-config stores aligned on shared keys',
      Object.fromEntries(
        SHARED_RUNTIME_KEYS.map((key) => [key, getRuntimeConfigValue(key) ?? '(unset)']),
      ),
    )
  }
}

Promise.all([loadRuntimeConfig(), loadUiSharedRuntimeConfig()])
  .then(() => {
    assertRuntimeConfigStoresAligned()
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
