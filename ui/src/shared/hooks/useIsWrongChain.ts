import { useAccount, useChainId } from 'wagmi'
import { getExpectedChainId } from '../config/expectedChain'

/**
 * True when a wallet is connected but on a different chain than the one the
 * app's contracts are deployed on. Callers use this to block transaction
 * submission so calls are never issued against the wrong chain.
 */
export function useIsWrongChain(): boolean {
  const { isConnected } = useAccount()
  const currentChainId = useChainId()
  return isConnected && currentChainId !== getExpectedChainId()
}
