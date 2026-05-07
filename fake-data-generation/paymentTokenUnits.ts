import { parseUnits } from 'viem';

const DEFAULT_PAYMENT_TOKEN_DECIMALS = 6;

export function getPaymentTokenDecimals(): number {
  const raw = process.env.PAYMENT_TOKEN_DECIMALS;
  if (!raw) return DEFAULT_PAYMENT_TOKEN_DECIMALS;

  const decimals = Number(raw);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error(`Invalid PAYMENT_TOKEN_DECIMALS: ${raw}`);
  }

  return decimals;
}

export function parsePaymentTokenUnits(value: string): bigint {
  return parseUnits(value, getPaymentTokenDecimals());
}
