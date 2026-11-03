import type { Address } from 'viem'
import { getRuntimeConfigValue } from './runtimeConfig'

export function sponsoredBeliefOptions(): {
  paymasterUrl?: string
  statementGasTankAddress?: Address
} {
  const paymasterUrl = getRuntimeConfigValue('VITE_SPONSORED_GAS_PAYMASTER_URL')
  const statementGasTankAddress = getRuntimeConfigValue('VITE_STATEMENT_GAS_TANK_ADDRESS') as Address | undefined
  return { paymasterUrl, statementGasTankAddress }
}
