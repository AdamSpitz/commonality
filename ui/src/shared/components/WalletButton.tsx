import { Suspense, lazy } from 'react'
import { Button, CircularProgress } from '@mui/material'
import { ConnectKitButton } from 'connectkit'
import { isPrivyEnabled } from '../../wagmi'

const PrivyWalletButton = lazy(() => import('./PrivyWalletButtonImpl'))

export function WalletButtonLoadingFallback() {
  return (
    <Button
      color="inherit"
      variant="outlined"
      disabled
      startIcon={<CircularProgress size={16} color="inherit" />}
    >
      Account
    </Button>
  )
}

export function WalletButton() {
  if (isPrivyEnabled) {
    return (
      <Suspense fallback={<WalletButtonLoadingFallback />}>
        <PrivyWalletButton />
      </Suspense>
    )
  }

  return <ConnectKitButton />
}
