import { Alert, Button } from '@mui/material'
import { useSwitchChain } from 'wagmi'
import { getExpectedChainId, getExpectedChainLabel } from '../config/expectedChain'
import { useIsWrongChain } from '../hooks/useIsWrongChain'

/**
 * Minimal "wrong network" surface: when the connected wallet is on an
 * unsupported/mismatched chain, prompt the user to switch instead of silently
 * letting them submit a transaction that would hit the wrong chain. Renders
 * nothing when the wallet is disconnected or already on the expected chain.
 */
export function NetworkSwitchPrompt() {
  const wrongChain = useIsWrongChain()
  const { switchChain, isPending } = useSwitchChain()
  const expectedChainId = getExpectedChainId()

  if (!wrongChain) return null

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button
          color="inherit"
          size="small"
          disabled={isPending}
          onClick={() => switchChain?.({ chainId: expectedChainId })}
        >
          {isPending ? 'Switching…' : 'Switch network'}
        </Button>
      }
    >
      Wrong network. Switch your wallet to {getExpectedChainLabel()} to continue.
    </Alert>
  )
}
