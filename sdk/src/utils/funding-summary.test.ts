import assert from 'node:assert/strict';
import { ETH_CURRENCY } from './currency.js';
import { summarizeFunding, type FundingSummary } from './funding-summary.js';
import { summarizeThresholdFunding } from '../subsystems/lazy-giving/funding-summary.js';

describe('funding presentation boundaries', () => {
  const now = 100;
  const thresholdProject = {
    fundingCurrency: ETH_CURRENCY,
    totalReceived: '25',
    threshold: '100',
    deadline: '200',
  };

  it('combines ongoing donations and threshold funding without inventing a donation target', () => {
    const donation: FundingSummary = {
      fundingCurrency: ETH_CURRENCY,
      totalReceived: 10n,
      contribution: { seekingFunding: true },
    };
    const totals = summarizeFunding([
      donation,
      summarizeThresholdFunding(thresholdProject, now),
    ]);
    assert.equal(totals.projectsNeedingFunding, 2);
    assert.equal(totals.totalRaisedAcrossProjects[0]?.amount, 35n);
    assert.equal(totals.remainingToGoal[0]?.amount, 75n);
    assert.equal(totals.projectsNeedingReimbursement, 0);
    assert.deepEqual(totals.totalUnreimbursed, []);
    assert.equal(donation.refund, undefined);
    assert.equal(donation.reimbursement, undefined);
  });

  it('keeps an unsupported reimbursement capability distinct from a fully reimbursed pool', () => {
    const snapshot = { ...thresholdProject, totalReceived: '100' };
    const unsupported = summarizeThresholdFunding(snapshot, now);
    const reimbursed = summarizeThresholdFunding(snapshot, now, { outstanding: 0n });
    assert.equal(unsupported.reimbursement, undefined);
    assert.deepEqual(reimbursed.reimbursement, { outstanding: 0n });
    assert.equal(summarizeFunding([unsupported, reimbursed]).projectsNeedingReimbursement, 0);
  });

  it('retains assurance presentation at the deadline and after failure or success', () => {
    const active = summarizeThresholdFunding(thresholdProject, 200);
    const failed = summarizeThresholdFunding(thresholdProject, 201);
    const succeeded = summarizeThresholdFunding(
      { ...thresholdProject, totalReceived: '110' }, 201, { outstanding: 80n },
    );
    assert.equal(active.contribution?.seekingFunding, true);
    assert.equal(failed.contribution?.seekingFunding, false);
    assert.equal(failed.refund?.available, true);
    assert.equal(succeeded.refund?.available, false);
    const totals = summarizeFunding([failed, succeeded]);
    assert.equal(totals.projectsNeedingFunding, 0);
    assert.deepEqual(totals.remainingToGoal, []);
    assert.equal(totals.projectsNeedingReimbursement, 1);
    assert.equal(totals.totalUnreimbursed[0]?.amount, 80n);
  });

  it('keeps different settlement currencies separate and excludes closed donation funds', () => {
    const usdc = { ...ETH_CURRENCY, kind: 'erc20' as const, symbol: 'USDC', decimals: 6,
      tokenAddress: '0x0000000000000000000000000000000000000001' };
    const totals = summarizeFunding([
      summarizeThresholdFunding(thresholdProject, now),
      { fundingCurrency: usdc, totalReceived: 90n, contribution: { seekingFunding: false } },
    ]);
    assert.equal(totals.projectCount, 2);
    assert.equal(totals.projectsNeedingFunding, 1);
    assert.deepEqual(totals.totalRaisedAcrossProjects.map(row => row.amount), [25n, 90n]);
    assert.equal(totals.remainingToGoal.length, 1);
    assert.deepEqual(summarizeFunding([]).totalRaisedAcrossProjects, []);
  });
});
