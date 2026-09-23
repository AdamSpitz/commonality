import {
  addCurrencyAmount,
  currencyTotalsToArray,
  type Currency,
  type CurrencyAmountBigInt,
} from './currency.js';

/** Presentation data supplied by a known funding implementation, not inferred
 * from ERC-1155 support. Absence of a capability differs from a zero balance.
 * This describes funding, not permission to execute transactions. */
export interface FundingSummary {
  fundingCurrency: Currency;
  totalReceived: bigint;
  contribution?: {
    /** Whether to count this mechanism as needing contributions. A contract
     * may still accept purchases after its displayed funding need is met. */
    seekingFunding: boolean;
    /** Absent for ongoing funding without a target. */
    remainingToGoal?: bigint;
  };
  refund?: { available: boolean };
  reimbursement?: { outstanding: bigint };
}

export interface FundingSummaryTotals {
  totalRaisedAcrossProjects: CurrencyAmountBigInt[];
  remainingToGoal: CurrencyAmountBigInt[];
  totalUnreimbursed: CurrencyAmountBigInt[];
  projectCount: number;
  projectsNeedingFunding: number;
  projectsNeedingReimbursement: number;
}

/** Pure aggregation: callers discover, deduplicate and adapt funding mechanisms
 * before this boundary. No contract addresses, event formats or chain reads. */
export function summarizeFunding(summaries: readonly FundingSummary[]): FundingSummaryTotals {
  const raised = new Map<string, CurrencyAmountBigInt>();
  const remaining = new Map<string, CurrencyAmountBigInt>();
  const unreimbursed = new Map<string, CurrencyAmountBigInt>();
  let projectsNeedingFunding = 0;
  let projectsNeedingReimbursement = 0;

  for (const summary of summaries) {
    addCurrencyAmount(raised, summary.fundingCurrency, summary.totalReceived);
    const contribution = summary.contribution;
    if (contribution?.seekingFunding &&
        (contribution.remainingToGoal === undefined || contribution.remainingToGoal > 0n)) {
      projectsNeedingFunding++;
      if (contribution.remainingToGoal !== undefined) {
        addCurrencyAmount(remaining, summary.fundingCurrency, contribution.remainingToGoal);
      }
    }
    const outstanding = summary.reimbursement?.outstanding ?? 0n;
    if (outstanding > 0n) {
      projectsNeedingReimbursement++;
      addCurrencyAmount(unreimbursed, summary.fundingCurrency, outstanding);
    }
  }

  return {
    totalRaisedAcrossProjects: currencyTotalsToArray(raised),
    remainingToGoal: currencyTotalsToArray(remaining),
    totalUnreimbursed: currencyTotalsToArray(unreimbursed),
    projectCount: summaries.length,
    projectsNeedingFunding,
    projectsNeedingReimbursement,
  };
}
