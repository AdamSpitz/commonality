import { Alert, Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useAccount } from 'wagmi'

interface NeedLoginProps {
  /** What action requires login / wallet. */
  action?: string
  /** If true, also require a linked+connected wallet. */
  needWallet?: boolean
}

/**
 * Gentle prompt: log in on profile; connect wallet only there.
 */
export function NeedLogin({ action = 'continue', needWallet = false }: NeedLoginProps) {
  const { isLoggedIn, user } = useSession()
  const { isConnected, address } = useAccount()

  if (!isLoggedIn) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        <Stack spacing={1}>
          <Typography variant="body2">
            Log in with your username to {action}.
          </Typography>
          <Button
            component={RouterLink}
            to="/member"
            size="small"
            variant="contained"
            sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
          >
            Go to profile
          </Button>
        </Stack>
      </Alert>
    )
  }

  if (needWallet) {
    const linked = user?.walletAddress
    const ready = Boolean(
      linked && isConnected && address && linked.toLowerCase() === address.toLowerCase(),
    )
    if (!ready) {
      return (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">
              {!linked
                ? `Link and connect your wallet on your profile to ${action}.`
                : `Connect your linked wallet on your profile to ${action}.`}
            </Typography>
            <Button
              component={RouterLink}
              to="/member"
              size="small"
              variant="outlined"
              sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
            >
              Open profile
            </Button>
          </Stack>
        </Alert>
      )
    }
  }

  return null
}

/** True when session can sign chain txs (logged in, wallet linked, wagmi connected to same address). */
export function useCanSignChain(): boolean {
  const { user, isLoggedIn } = useSession()
  const { isConnected, address } = useAccount()
  if (!isLoggedIn || !user?.walletAddress || !isConnected || !address) return false
  return user.walletAddress.toLowerCase() === address.toLowerCase()
}
