/**
 * Local/testnet projects settle in the FreeERC20 payment token (USDZZZ, 6
 * decimals), not native ETH. Aggregation tests that look up `symbol === 'ETH'`
 * therefore read back `0n` even when the fold is correct.
 */
export function amountInPaymentToken(
  totals: ReadonlyArray<{ amount: bigint; currency: { symbol: string } }>,
): bigint {
  const symbol = process.env.PAYMENT_TOKEN_SYMBOL || 'USDZZZ';
  const match = totals.find((entry) => entry.currency.symbol === symbol);
  if (match) return match.amount;
  if (totals.length === 1) return totals[0]!.amount;
  return 0n;
}
