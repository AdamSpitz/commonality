import { useState, useEffect } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import {
  AppBar,
  Box,
  Container,
  Toolbar,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  useTheme,
  IconButton,
  Menu,
  MenuItem,
  ListSubheader,
  Divider,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { Link, useLocation } from 'react-router-dom'
import { WalletButton } from './WalletButton'

interface DomainBranding {
  name: string
  tagline: string
}

interface DomainNavigationItem {
  label: string
  path: string
}

interface DomainShellConfig {
  primaryNavigation: DomainNavigationItem[]
  secondaryNavigation: DomainNavigationItem[]
  footerText: string
}

interface AppShellProps {
  children: ReactNode
  branding?: DomainBranding
  navigation?: DomainShellConfig
}

const drawerWidth = 240

function isPathSelected(currentPath: string, targetPath: string): boolean {
  if (targetPath === '/') {
    return currentPath === '/'
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}

export function AppShell({ children, branding, navigation }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()

  const brand = branding ?? {
    name: 'Commonality',
    tagline: 'Find common ground and fund what matters.',
  }

  useEffect(() => {
    document.title = brand.name
  }, [brand.name])

  const nav = navigation ?? {
    primaryNavigation: [
      { label: 'Start Here', path: '/docs' },
      { label: 'Statements', path: '/statements' },
      { label: 'Projects', path: '/projects' },
      { label: 'Creators', path: '/content' },
      { label: 'My Profile', path: '/profile' },
    ],
    secondaryNavigation: [
      { label: 'My Delegated Funds', path: '/notes' },
      { label: 'My Trust Network', path: '/settings' },
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
      { label: 'Saved Refs', path: '/refs' },
    ],
    footerText: 'Commonality helps people fund projects and content around shared values.',
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMoreOpen = (event: MouseEvent<HTMLElement>) => {
    setMoreAnchorEl(event.currentTarget)
  }

  const handleMoreClose = () => {
    setMoreAnchorEl(null)
  }

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, fontWeight: 700 }}>
        {brand.name}
      </Typography>
      <List>
        <ListSubheader>Start here</ListSubheader>
        {nav.primaryNavigation.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={isPathSelected(location.pathname, item.path)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <ListSubheader>More</ListSubheader>
        {nav.secondaryNavigation.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={isPathSelected(location.pathname, item.path)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 1.5 }}>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {brand.name}
          </Typography>
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
              {nav.primaryNavigation.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  color="inherit"
                  variant={item.path === '/docs' ? 'contained' : 'text'}
                  sx={{
                    bgcolor: item.path === '/docs' ? 'rgba(247, 201, 72, 0.9)' : 'transparent',
                    color: item.path === '/docs' ? '#14213d' : 'inherit',
                    px: 1.75,
                    fontWeight: isPathSelected(location.pathname, item.path) ? 700 : 500,
                    '&:hover': {
                      bgcolor:
                        item.path === '/docs' ? 'rgba(247, 201, 72, 1)' : 'rgba(255, 255, 255, 0.08)',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                color="inherit"
                endIcon={<MoreHorizIcon />}
                onClick={handleMoreOpen}
                sx={{
                  fontWeight: nav.secondaryNavigation.some((item) =>
                    isPathSelected(location.pathname, item.path)
                  )
                    ? 700
                    : 500,
                }}
              >
                More
              </Button>
              <Menu
                anchorEl={moreAnchorEl}
                open={Boolean(moreAnchorEl)}
                onClose={handleMoreClose}
              >
                {nav.secondaryNavigation.map((item) => (
                  <MenuItem
                    key={item.path}
                    component={Link}
                    to={item.path}
                    selected={isPathSelected(location.pathname, item.path)}
                    onClick={handleMoreClose}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          )}
          <WalletButton />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      <Container
        component="main"
        maxWidth="lg"
        sx={{ flexGrow: 1, py: { xs: 3, md: 5 }, display: 'flex', flexDirection: 'column' }}
      >
        {children}
      </Container>
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            {nav.footerText}
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
