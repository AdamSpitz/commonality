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
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined'
import GitHubIcon from '@mui/icons-material/GitHub'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { WalletButton } from '../components/WalletButton'
import { createCausePath } from '../lib/causeStore'
import { useThemeMode } from '../lib/themeMode'

const GITHUB_ISSUES_URL = 'https://github.com/AdamSpitz/commonality/issues'

const navItems = [
  { label: 'Home', path: '/', icon: <HomeOutlinedIcon /> },
  { label: 'Start', path: '/start', icon: <FlagOutlinedIcon /> },
  { label: 'Momentum', path: '/momentum', icon: <TrendingUpOutlinedIcon /> },
  { label: 'Tools', path: '/tools', icon: <HandymanOutlinedIcon /> },
] as const

function activeNavPath(pathname: string): string {
  if (pathname === '/') return '/'
  const match = navItems.find((item) => item.path !== '/' && pathname.startsWith(item.path))
  if (match) return match.path
  if (
    pathname.startsWith('/cause')
    || pathname.startsWith('/statement')
    || pathname.startsWith('/projects')
  ) {
    return '/momentum'
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

  const goStartCause = () => {
    navigate(createCausePath())
  }

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
                const isStart = item.path === '/start'
                return (
                  <Box
                    key={item.path}
                    component={isStart ? 'button' : Link}
                    {...(isStart
                      ? { type: 'button', onClick: goStartCause }
                      : { to: item.path })}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      font: 'inherit',
                      textDecoration: 'none',
                      color: current === item.path ? 'primary.contrastText' : 'text.primary',
                      bgcolor: current === item.path ? 'primary.main' : 'transparent',
                      fontWeight: 600,
                      fontSize: 14,
                      '&:hover': {
                        bgcolor: current === item.path ? 'primary.dark' : 'action.hover',
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
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GitHub issues for this project"
              size="small"
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          )}

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
              if (value === 'github-issues') return
              if (value === '/start') {
                goStartCause()
                return
              }
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
              label="Issues"
              value="github-issues"
              icon={<GitHubIcon />}
              component="a"
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GitHub issues for this project"
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
