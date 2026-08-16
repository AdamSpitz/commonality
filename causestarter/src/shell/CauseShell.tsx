import type { ReactNode } from 'react'
import {
  AppBar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Container,
  IconButton,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import GitHubIcon from '@mui/icons-material/GitHub'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { WalletButton } from '../components/WalletButton'
import { useThemeMode } from '../lib/themeMode'

const GITHUB_REPO_URL = 'https://github.com/AdamSpitz/commonality'

const navItems = [
  { label: 'Causes', path: '/causes', icon: <FlagOutlinedIcon /> },
  { label: 'Docs', path: '/docs', icon: <MenuBookOutlinedIcon /> },
] as const

function activeNavPath(pathname: string): string {
  const match = navItems.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
  if (match) return match.path
  if (
    pathname.startsWith('/cause')
    || pathname.startsWith('/statement')
    || pathname.startsWith('/projects')
  ) {
    return '/causes'
  }
  return pathname
}

interface CauseShellProps {
  children: ReactNode
}

export function CauseShell({ children }: CauseShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const { mode, toggleMode } = useThemeMode()
  const current = activeNavPath(location.pathname)

  return (
    <Box
      sx={{
        minHeight: { xs: '100vh', '@supports (height: 100dvh)': '100dvh' },
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(12px)',
          bgcolor: (t) =>
            t.palette.mode === 'light' ? 'rgba(255,252,247,0.88)' : 'rgba(10,16,24,0.88)',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 }, px: { xs: 1.5, sm: 2 } }}>
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
              flexGrow: 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              CauseStarter
            </Typography>
          </Box>

          {isDesktop && (
            <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
              {navItems.map((item) => {
                return (
                  <Box
                    key={item.path}
                    component={Link}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      font: 'inherit',
                      textDecoration: 'none',
                      color: current === item.path ? 'primary.main' : 'text.secondary',
                      bgcolor: 'transparent',
                      fontWeight: current === item.path ? 700 : 600,
                      fontSize: 14,
                      '&:hover': {
                        bgcolor: 'action.hover',
                        color: current === item.path ? 'primary.main' : 'text.primary',
                      },
                    }}
                  >
                    {item.label}
                  </Box>
                )
              })}
            </Box>
          )}

          {isDesktop && (
            <IconButton
              component="a"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the GitHub repository"
              size="small"
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          )}

          <IconButton
            component={Link}
            to="/settings"
            aria-label="Trust settings"
            size="small"
          >
            <SettingsOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton
            onClick={toggleMode}
            aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            size="small"
          >
            {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          </IconButton>
          <WalletButton />
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pb: { xs: 'calc(72px + env(safe-area-inset-bottom, 0px))', md: 4 },
        }}
      >
        <Container maxWidth="sm" sx={{ pt: { xs: 2, sm: 3 }, px: { xs: 1.75, sm: 2 } }}>
          {children}
        </Container>
      </Box>

      {!isDesktop && (
        <Paper
          className="cs-safe-bottom"
          elevation={8}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: (t) => t.zIndex.appBar,
          }}
        >
          <BottomNavigation
            showLabels
            value={current}
            onChange={(_, value: string) => {
              if (value === 'github-repo') return
              navigate(value)
            }}
            sx={{
              height: 64,
              bgcolor: 'background.paper',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                px: 0.5,
                color: 'text.secondary',
              },
              '& .Mui-selected': {
                color: 'primary.main',
              },
            }}
          >
            {navItems.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                value={item.path}
                icon={item.icon}
              />
            ))}
            <BottomNavigationAction
              label="GitHub"
              value="github-repo"
              icon={<GitHubIcon />}
              component="a"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the GitHub repository"
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
