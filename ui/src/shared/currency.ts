import { ETH_CURRENCY, getCurrencyForTokenValue, type Currency, type CurrencyAmountBigInt, type Note } from '@commonality/sdk'
import { formatUnits } from 'viem'

export function getCurrencyForNote(note: Pick<Note, 'token' | 'tokenType' | 'tokenId'>): Currency {
  return getCurrencyForTokenValue(note)
}

export function formatCurrencyAmount(amount: bigint | string, currency: Currency = ETH_CURRENCY): string {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount)
  return `${formatUnits(value, currency.decimals)} ${currency.symbol}`
}

export function formatCurrencyTotals(totals: CurrencyAmountBigInt[] | bigint): string {
  if (typeof totals === 'bigint') {
    return formatCurrencyAmount(totals, ETH_CURRENCY)
  }
  if (totals.length === 0) return `0 ${ETH_CURRENCY.symbol}`
  return totals.map((entry) => formatCurrencyAmount(entry.amount, entry.currency)).join(' + ')
}

export function formatCurrencyProgress(
  current: bigint | string,
  target: bigint | string,
  currency: Currency = ETH_CURRENCY,
): string {
  const currentValue = typeof current === 'bigint' ? current : BigInt(current)
  const targetValue = typeof target === 'bigint' ? target : BigInt(target)
  return `${formatUnits(currentValue, currency.decimals)} / ${formatUnits(targetValue, currency.decimals)} ${currency.symbol}`
}

export function formatCurrencyRaised(
  current: bigint | string,
  target: bigint | string,
  currency: Currency = ETH_CURRENCY,
): string {
  const currentValue = typeof current === 'bigint' ? current : BigInt(current)
  const targetValue = typeof target === 'bigint' ? target : BigInt(target)
  return `${formatUnits(currentValue, currency.decimals)} of ${formatUnits(targetValue, currency.decimals)} ${currency.symbol} raised`
}
