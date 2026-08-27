export const MINIMUM_ATTESTER_BALANCE = 10_000_000_000_000_000n;

import type { AttesterBalanceInfo } from './http.js';

export async function checkAttesterBalance(
  getBalance: () => Promise<bigint>,
  minimumRequired = MINIMUM_ATTESTER_BALANCE,
): Promise<AttesterBalanceInfo> {
  const balance = await getBalance();
  return { balance, hasSufficientFunds: balance >= minimumRequired, minimumRequired };
}
