import type { SxProps, Theme } from '@mui/material'

export function landingHeroPaperSx(marginBottom: number): SxProps<Theme> {
  return (theme) => ({
    p: { xs: 3, md: 4 },
    mb: marginBottom,
    borderRadius: 4,
    color: theme.palette.mode === 'light' ? '#14213d' : theme.palette.text.primary,
    background: theme.palette.mode === 'light'
      ? 'linear-gradient(135deg, rgba(216, 243, 220, 0.96) 0%, rgba(247, 201, 72, 0.92) 100%)'
      : 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.96) 58%, rgba(54, 48, 18, 0.82) 100%)',
    border: theme.palette.mode === 'dark' ? '1px solid rgba(148, 163, 184, 0.24)' : undefined,
    boxShadow: theme.palette.mode === 'dark' ? '0 24px 72px rgba(0, 0, 0, 0.35)' : undefined,
  })
}

export const landingHeroContainedButtonSx: SxProps<Theme> = (theme) => ({
  bgcolor: theme.palette.mode === 'light' ? '#14213d' : 'rgba(226, 232, 240, 0.14)',
  color: theme.palette.mode === 'light' ? '#fff' : theme.palette.text.primary,
  border: theme.palette.mode === 'dark' ? '1px solid rgba(226, 232, 240, 0.22)' : undefined,
  '&:hover': {
    bgcolor: theme.palette.mode === 'light' ? '#0f172a' : 'rgba(226, 232, 240, 0.22)',
  },
})
