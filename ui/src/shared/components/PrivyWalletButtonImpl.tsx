import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { Button, CircularProgress, Menu, MenuItem, ListItemText } from '@mui/material'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import type { ConnectedWallet } from '@privy-io/react-auth'
import { useSetActiveWallet } from '@privy-io/wagmi'
import { useAccount } from 'wagmi'
import { truncateAddress } from '../utils/address'

function getPreferredWalletAddress(wallets: ConnectedWallet[]) {
  const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy')
  return embeddedWallet ?? wallets[0]
}

export default function PrivyWalletButtonImpl() {
  const { ready, authenticated, connectOrCreateWallet, linkWallet, logout } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const { setActiveWallet } = useSetActiveWallet()
  const { address } = useAccount()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  useEffect(() => {
    if (!ready || !authenticated || !walletsReady || address || wallets.length === 0) {
      return
    }

    const preferredWallet = getPreferredWalletAddress(wallets)
    void setActiveWallet(preferredWallet).catch((error) => {
      console.warn('Failed to set active Privy wallet for wagmi', error)
    })
  }, [address, authenticated, ready, setActiveWallet, wallets, walletsReady])

  const connectedAddress = useMemo(() => {
    if (address) {
      return address
    }

    return wallets[0]?.address
  }, [address, wallets])

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLinkWallet = () => {
    handleMenuClose()
    linkWallet()
  }

  const handleLogout = () => {
    handleMenuClose()
    void logout()
  }

  if (!ready || (authenticated && !walletsReady)) {
    return (
      <Button
        color="inherit"
        variant="outlined"
        disabled
        startIcon={<CircularProgress size={16} color="inherit" />}
      >
        Wallet
      </Button>
    )
  }

  if (!authenticated) {
    return (
      <Button color="inherit" variant="outlined" onClick={() => connectOrCreateWallet()}>
        Sign In / Wallet
      </Button>
    )
  }

  if (!connectedAddress) {
    return (
      <Button color="inherit" variant="outlined" onClick={() => connectOrCreateWallet()}>
        Create Wallet
      </Button>
    )
  }

  return (
    <>
      <Button color="inherit" variant="outlined" onClick={handleMenuOpen}>
        {truncateAddress(connectedAddress)}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem disabled>
          <ListItemText
            primary={truncateAddress(connectedAddress)}
            secondary={connectedAddress}
          />
        </MenuItem>
        <MenuItem onClick={handleLinkWallet}>
          Link Another Wallet
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          Log Out
        </MenuItem>
      </Menu>
    </>
  )
}
