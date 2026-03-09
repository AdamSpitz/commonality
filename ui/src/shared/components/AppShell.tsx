import { useState } from 'react'
import type { ReactNode } from 'react'
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
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { ConnectKitButton } from 'connectkit'
import { Link, useLocation } from 'react-router-dom'

interface AppShellProps {
  children: ReactNode
}

const drawerWidth = 240

const navigationItems = [
  { label: 'Home', path: '/' },
  { label: 'Browse Statements', path: '/statements' },
  { label: 'My Notes', path: '/notes' },
  { label: 'My Profile', path: '/profile' },
  { label: 'Settings', path: '/settings' },
  { label: 'Refs', path: '/refs' },
]

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        Commonality
      </Typography>
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
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
        <Toolbar>
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
            }}
          >
            Commonality
          </Typography>
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  color="inherit"
                  sx={{
                    borderBottom:
                      location.pathname === item.path
                        ? '2px solid white'
                        : 'none',
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
          <ConnectKitButton />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
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
        sx={{ flexGrow: 1, py: 4, display: 'flex', flexDirection: 'column' }}
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
            Commonality - A coordination platform for aligned people
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
