import { createContext, useContext } from 'react'
import type { PaletteMode } from '@mui/material'

export interface ThemeModeContextValue {
  mode: PaletteMode
  toggleMode: () => void
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  toggleMode: () => {},
})

export function useThemeMode(): ThemeModeContextValue {
  return useContext(ThemeModeContext)
}
