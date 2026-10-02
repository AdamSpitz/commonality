import { parseUnits } from 'viem';
import type { PlannedAction } from './campaignPlanner.js';

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

/** Each campaign fund-project write currently buys this payment-token amount. */
export const CAMPAIGN_FUND_PROJECT_TOKEN = '0.01';

export function campaignFundProjectCost(): bigint {
  return parsePaymentTokenUnits(CAMPAIGN_FUND_PROJECT_TOKEN);
}

/** V2 amounts are whole cents, matching the project's 0.01 and 0.10 receipt prices. */
export function campaignActionFundingCost(action: PlannedAction): bigint {
  if (!action.funding) return campaignFundProjectCost();
  if (!Number.isSafeInteger(action.amount) || !action.amount || action.amount <= 0) throw new Error(`invalid funding amount for ${action.id}`);
  return parsePaymentTokenUnits((action.amount / 100).toFixed(2));
}
