export interface Currency {
  kind: 'native' | 'erc20' | 'erc1155';
  symbol: string;
  decimals: number;
  tokenAddress: string | null;
  tokenType: number;
  tokenId?: string;
}

export interface CurrencyAmount {
  amount: string;
  currency: Currency;
}

export interface CurrencyAmountBigInt {
  amount: bigint;
  currency: Currency;
}

export const ETH_CURRENCY: Currency = Object.freeze({
  kind: 'native',
  symbol: 'ETH',
  decimals: 18,
  tokenAddress: null,
  tokenType: 0,
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function getCurrencyForTokenValue(token: {
  token: string;
  tokenType: number;
  tokenId?: string;
}): Currency {
  if (token.tokenType === 0 && token.token.toLowerCase() === ZERO_ADDRESS) {
    return ETH_CURRENCY;
  }

  if (token.tokenType === 0) {
    return {
      kind: 'erc20',
      symbol: 'tokens',
      decimals: 18,
      tokenAddress: token.token,
      tokenType: token.tokenType,
    };
  }

  return {
    kind: 'erc1155',
    symbol: 'tokens',
    decimals: 0,
    tokenAddress: token.token,
    tokenType: token.tokenType,
    tokenId: token.tokenId,
  };
}

export function getCurrencyKey(currency: Currency): string {
  return [
    currency.kind,
    currency.symbol.toLowerCase(),
    (currency.tokenAddress ?? 'native').toLowerCase(),
    String(currency.tokenType),
    currency.tokenId ?? '',
  ].join(':');
}

export function addCurrencyAmount(
  totals: Map<string, CurrencyAmountBigInt>,
  currency: Currency,
  amount: bigint,
): void {
  const key = getCurrencyKey(currency);
  const existing = totals.get(key);
  if (existing) {
    existing.amount += amount;
    return;
  }

  totals.set(key, { currency, amount });
}

export function currencyTotalsToArray(
  totals: Map<string, CurrencyAmountBigInt>,
): CurrencyAmountBigInt[] {
  return [...totals.values()];
}
