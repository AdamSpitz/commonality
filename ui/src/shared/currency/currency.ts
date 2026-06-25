import type { Note } from '@commonality/sdk/delegation'
import { ETH_CURRENCY, getCurrencyForTokenValue, type Currency, type CurrencyAmountBigInt } from '@commonality/sdk/utils'
import { formatUnits } from 'viem'
import { getRuntimeConfig } from '../config/runtimeConfig'

export const DEFAULT_PAYMENT_CURRENCY: Currency = Object.freeze({
  kind: 'erc20',
  symbol: 'USDZZZ',
  decimals: 6,
  tokenAddress: null,
  tokenType: 0,
})

export function getConfiguredPaymentCurrency(): Currency | null {
  const config = getRuntimeConfig()
  const tokenAddress = config.VITE_PAYMENT_TOKEN_ADDRESS
  if (!tokenAddress) return null

  return {
    kind: 'erc20',
    symbol: config.VITE_PAYMENT_TOKEN_SYMBOL ?? DEFAULT_PAYMENT_CURRENCY.symbol,
    decimals: Number(config.VITE_PAYMENT_TOKEN_DECIMALS ?? String(DEFAULT_PAYMENT_CURRENCY.decimals)),
    tokenAddress,
    tokenType: 0,
  }
}

export function getCurrencyForNote(note: Pick<Note, 'token' | 'tokenType' | 'tokenId'>): Currency {
  const paymentCurrency = getConfiguredPaymentCurrency()
  if (
    paymentCurrency &&
    note.tokenType === paymentCurrency.tokenType &&
    note.token.toLowerCase() === paymentCurrency.tokenAddress?.toLowerCase()
  ) {
    return paymentCurrency
  }

  return getCurrencyForTokenValue(note)
}

export function formatCurrencyAmount(amount: bigint | string, currency: Currency = ETH_CURRENCY): string {
  const value = typeof amount === 'bigint' ? amount : BigInt(amount)
  return `${formatUnits(value, currency.decimals)} ${currency.symbol}`
}

export function formatCurrencyTotals(
  totals: CurrencyAmountBigInt[] | bigint,
  fallbackCurrency: Currency = ETH_CURRENCY,
): string {
  if (typeof totals === 'bigint') {
    return formatCurrencyAmount(totals, fallbackCurrency)
  }
  if (totals.length === 0) return `0 ${fallbackCurrency.symbol}`
  return totals.map((entry) => formatCurrencyAmount(entry.amount, entry.currency)).join(' + ')
}

export function formatCurrencyProgress(
  current: bigint | string,
  target: bigint | string,
  currency: Currency = ETH_CURRENCY,
): string {
  const currentValue = typeof current === 'bigint' ? current : BigInt(current)
  const targetValue = typeof target === 'bigint' ? target : BigInt(target)
  if (targetValue === 0n) {
    return `${formatUnits(currentValue, currency.decimals)} ${currency.symbol} / No minimum`
  }
  return `${formatUnits(currentValue, currency.decimals)} / ${formatUnits(targetValue, currency.decimals)} ${currency.symbol}`
}

export function formatCurrencyRaised(
  current: bigint | string,
  target: bigint | string,
  currency: Currency = ETH_CURRENCY,
): string {
  const currentValue = typeof current === 'bigint' ? current : BigInt(current)
  const targetValue = typeof target === 'bigint' ? target : BigInt(target)
  if (targetValue === 0n) {
    return `${formatUnits(currentValue, currency.decimals)} ${currency.symbol} raised · No minimum`
  }
  return `${formatUnits(currentValue, currency.decimals)} of ${formatUnits(targetValue, currency.decimals)} ${currency.symbol} raised`
}
