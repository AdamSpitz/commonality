import { useState, type HTMLAttributes, type MouseEvent } from 'react'
import {
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { ConnectKitButton, useModal } from 'connectkit'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import {
  HARDHAT_DEV_ACCOUNTS,
  isLocalDevHost,
  shortAddress,
} from '../lib/hardhatAccounts'

interface WalletButtonProps {
  dense?: boolean
  testId?: string
}

function buttonSx(isConnected: boolean, dense: boolean) {
  return {
    minHeight: dense ? 32 : 40,
    borderRadius: 999,
    px: dense ? 1.25 : 1.5,
    fontSize: dense ? '0.8125rem' : undefined,
    textTransform: 'none' as const,
    fontWeight: 600,
    bgcolor: isConnected ? 'transparent' : 'primary.main',
    color: isConnected ? 'inherit' : 'primary.contrastText',
    borderColor: isConnected ? 'divider' : undefined,
    whiteSpace: 'nowrap' as const,
  }
}

function LocalHardhatWalletButton({ dense = false, testId = 'wallet-connect-button' }: WalletButtonProps) {
  const { address, isConnected, isConnecting } = useAccount()
  const { connectAsync, connectors, isPending } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [error, setError] = useState<string | null>(null)
  const open = Boolean(anchorEl)
  const busy = isConnecting || isPending

  const label = isConnected && address
    ? (() => {
        const known = HARDHAT_DEV_ACCOUNTS.find(
          (a) => a.address.toLowerCase() === address.toLowerCase(),
        )
        return known ? `${known.label} (${shortAddress(address)})` : shortAddress(address)
      })()
    : 'Connect'

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setError(null)
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => setAnchorEl(null)

  const handleSelect = async (connectorId: string) => {
    setError(null)
    const connector = connectors.find((c) => c.id === connectorId)
    if (!connector) {
      setError('Account connector not found')
      return
    }
    try {
      if (isConnected) {
        await disconnectAsync()
      }
      await connectAsync({ connector })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }

  const handleDisconnect = async () => {
    setError(null)
    try {
      await disconnectAsync()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    }
  }

  return (
    <>
      <Button
        color="inherit"
        variant={isConnected ? 'outlined' : 'contained'}
        size="small"
        onClick={handleOpen}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={testId}
        sx={buttonSx(isConnected, dense)}
      >
        {busy ? 'Connecting…' : label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { minWidth: 280, maxHeight: 420 },
          },
          // MenuList is the focusable list inside the portal — stable for agents/Playwright.
          list: {
            'data-testid': 'wallet-account-menu',
          } as HTMLAttributes<HTMLUListElement>,
        }}
      >
        <MenuItem disabled sx={{ opacity: 1 }}>
          <ListItemText
            primary="Local Hardhat accounts"
            secondary="Chain 31337 · unlocked test keys"
            primaryTypographyProps={{ variant: 'subtitle2', fontWeight: 700 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </MenuItem>
        <Divider />
        {HARDHAT_DEV_ACCOUNTS.map((account) => {
          const connector = connectors.find((c) => c.id === `hardhat-${account.index}`)
          const selected = isConnected
            && address?.toLowerCase() === account.address.toLowerCase()
          return (
            <MenuItem
              key={account.index}
              selected={selected}
              disabled={!connector || busy}
              onClick={() => void handleSelect(`hardhat-${account.index}`)}
              data-testid={`wallet-hardhat-${account.index}`}
            >
              {selected ? (
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckIcon fontSize="small" color="primary" />
                </ListItemIcon>
              ) : (
                <ListItemIcon sx={{ minWidth: 32 }} />
              )}
              <ListItemText
                primary={account.label}
                secondary={shortAddress(account.address)}
                primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }}
              />
            </MenuItem>
          )
        })}
        {isConnected ? (
          <>
            <Divider />
            <MenuItem
              onClick={() => void handleDisconnect()}
              disabled={busy}
              data-testid="wallet-disconnect"
            >
              <ListItemText primary="Disconnect" />
            </MenuItem>
          </>
        ) : null}
        {error ? (
          <MenuItem disabled sx={{ opacity: 1, whiteSpace: 'normal' }}>
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          </MenuItem>
        ) : null}
      </Menu>
    </>
  )
}

function BrowserWalletButton({ dense = false, testId = 'wallet-connect-button' }: WalletButtonProps) {
  const { setOpen, open } = useModal()

  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, truncatedAddress, ensName }) => (
        <Button
          color="inherit"
          variant={isConnected ? 'outlined' : 'contained'}
          size="small"
          onClick={() => {
            if (typeof show === 'function') {
              show()
              return
            }
            setOpen(true)
          }}
          disabled={isConnecting}
          aria-expanded={open}
          data-testid={testId}
          sx={buttonSx(isConnected, dense)}
        >
          {isConnecting ? 'Connecting…' : isConnected ? (ensName ?? truncatedAddress) : 'Connect'}
        </Button>
      )}
    </ConnectKitButton.Custom>
  )
}

export function WalletButton(props: WalletButtonProps = {}) {
  if (isLocalDevHost()) {
    return <LocalHardhatWalletButton {...props} />
  }
  return <BrowserWalletButton {...props} />
}
