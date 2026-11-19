import type { CurrencyAmountBigInt } from '@commonality/sdk/utils'
import type { ContentFundingContractSummary } from '@commonality/sdk/content-funding'
import { formatCurrencyTotals } from '../shared/funding'

export function contractFundingTotals(contracts: ContentFundingContractSummary[]): CurrencyAmountBigInt[] {
  const byToken = new Map<string, CurrencyAmountBigInt>()
  for (const contract of contracts) {
    if (!contract.project) continue
    const currency = contract.project.fundingCurrency
    const key = currency.tokenAddress?.toLowerCase() ?? currency.symbol
    const current = byToken.get(key)
    const amount = BigInt(contract.project.totalReceived)
    byToken.set(key, current
      ? { currency, amount: current.amount + amount }
      : { currency, amount })
  }
  return [...byToken.values()]
}

export function formatContractFundingTotals(contracts: ContentFundingContractSummary[]): string {
  return formatCurrencyTotals(contractFundingTotals(contracts))
}
