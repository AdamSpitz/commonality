import type { Currency } from '../../utils/currency.js';
import type { FundingSummary } from '../../utils/funding-summary.js';

export interface ThresholdFundingSnapshot {
  totalReceived: string;
  threshold: string;
  deadline: string;
}

/** Threshold presentation only; custom conditions need their own adapter.
 * This is not an onchain success check or transaction authorization. */
export function classifyAlignedProjectStatus(
  project: ThresholdFundingSnapshot,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): 'active' | 'succeeded' | 'refunding' {
  if (BigInt(project.totalReceived) >= BigInt(project.threshold)) return 'succeeded';
  if (Number(project.deadline) < nowSeconds) return 'refunding';
  return 'active';
}

export function remainingToThresholdForProject(
  project: ThresholdFundingSnapshot,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): bigint {
  if (classifyAlignedProjectStatus(project, nowSeconds) !== 'active') return 0n;
  const remaining = BigInt(project.threshold) - BigInt(project.totalReceived);
  return remaining > 0n ? remaining : 0n;
}

/** Adapt the existing threshold/reimbursement product to shared presentation.
 * Pass reimbursement only when supplied by a known supporting implementation. */
export function summarizeThresholdFunding(
  project: ThresholdFundingSnapshot & { fundingCurrency: Currency },
  nowSeconds: number,
  reimbursement?: { outstanding: bigint },
): FundingSummary {
  const status = classifyAlignedProjectStatus(project, nowSeconds);
  return {
    fundingCurrency: project.fundingCurrency,
    totalReceived: BigInt(project.totalReceived),
    contribution: {
      seekingFunding: status === 'active',
      remainingToGoal: remainingToThresholdForProject(project, nowSeconds),
    },
    refund: { available: status === 'refunding' },
    ...(reimbursement === undefined ? {} : { reimbursement }),
  };
}
