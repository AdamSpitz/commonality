import { base, baseSepolia, hardhat } from 'wagmi/chains'
import { getRuntimeConfig } from './runtimeConfig'

/**
 * The single chain the app's contracts are deployed on for the current
 * environment. Transactions must only be issued against this chain; if the
 * connected wallet is on a different chain we prompt the user to switch
 * rather than sending calls against the wrong network (see NetworkSwitchPrompt).
 */
function expectedChain() {
  switch (getRuntimeConfig().COMMONALITY_ENVIRONMENT) {
    case 'mainnet':
      // Production runs on Base (L2), not Ethereum L1.
      return base
    case 'testnet':
      return baseSepolia
    default:
      // Local development / unspecified: the contracts live on the hardhat node.
      return hardhat
  }
}

export function getExpectedChainId(): number {
  return expectedChain().id
}

export function getExpectedChainLabel(): string {
  return expectedChain().name
}
