import { createContext, useContext } from 'react'
import type { PaletteMode } from '@mui/material'

export interface ThemeModeContextValue {
  mode: PaletteMode
  toggleMode: () => void
}

const defaultThemeModeContextValue: ThemeModeContextValue = {
  mode: 'light',
  toggleMode: () => {},
}

export const ThemeModeContext = createContext<ThemeModeContextValue>(defaultThemeModeContextValue)

export function useThemeMode() {
  return useContext(ThemeModeContext)
}
