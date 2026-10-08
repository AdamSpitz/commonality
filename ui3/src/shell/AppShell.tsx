import type { ReactNode } from 'react'
import {
  AppBar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Button,
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
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useThemeMode } from '../lib/themeMode'
import { createCausePath } from '../lib/causeModel'
import { useSession } from '../lib/session'

const navItems = [
  { label: 'Home', path: '/', icon: <HomeOutlinedIcon /> },
  { label: 'Causes', path: '/causes', icon: <FlagOutlinedIcon /> },
  { label: 'Bundles', path: '/aggregates', icon: <LayersOutlinedIcon /> },
  { label: 'You', path: '/member', icon: <PersonOutlineIcon /> },
  { label: 'Tools', path: '/tools', icon: <HandymanOutlinedIcon /> },
] as const

function activeNavPath(pathname: string): string {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/cause') || pathname.startsWith('/start')) return '/causes'
  if (pathname.startsWith('/aggregate')) return '/aggregates'
  if (pathname.startsWith('/member') || pathname.startsWith('/project')) return '/member'
  const match = navItems.find((item) => item.path !== '/' && pathname.startsWith(item.path))
  return match?.path ?? pathname
}

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const { mode, toggleMode } = useThemeMode()
  const { isLoggedIn, user } = useSession()
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
              ui3
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 1, display: { xs: 'none', sm: 'inline' }, fontWeight: 600 }}
            >
              Causes · Goals · Beliefs
            </Typography>
          </Box>

          {isDesktop && (
            <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
              {navItems.map((item) => (
                <Box
                  key={item.path}
                  component={Link}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 999,
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
              ))}
              <Box
                component="button"
                type="button"
                data-testid="nav-start"
                onClick={() => navigate(createCausePath())}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: 'primary.main',
                  cursor: 'pointer',
                  font: 'inherit',
                  bgcolor: 'transparent',
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: 14,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                Launch
              </Box>
            </Box>
          )}

          <IconButton
            onClick={toggleMode}
            aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            size="small"
          >
            {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
          </IconButton>
          <Button
            component={Link}
            to="/member"
            size="small"
            variant={isLoggedIn ? 'outlined' : 'contained'}
            data-testid="nav-profile"
            sx={{
              minHeight: 40,
              borderRadius: 999,
              px: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {isLoggedIn && user ? `@${user.username}` : 'Log in'}
          </Button>
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
          className="ui3-safe-bottom"
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
            onChange={(_, value: string) => navigate(value)}
            sx={{
              height: 64,
              bgcolor: 'background.paper',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                px: 0.25,
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
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
