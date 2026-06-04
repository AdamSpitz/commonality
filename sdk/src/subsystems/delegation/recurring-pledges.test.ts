import assert from 'assert';
import {
  foldStandingPledges,
  monthlyPledgedByCause,
  type RecurringPledgeEvent,
} from './recurring-pledges.js';

const ALICE = '0x1111111111111111111111111111111111111111' as const;
const BOB = '0x2222222222222222222222222222222222222222' as const;
const TOKEN = '0x4444444444444444444444444444444444444444' as const;
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

function baseRaw(overrides = {}) {
  return {
    contractAddress: '0x9999999999999999999999999999999999999999' as const,
    blockNumber: 1n,
    blockTimestamp: 1000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

describe('recurring pledge folds', () => {
  it('folds immediate execution into lastExecuted and executed note IDs', () => {
    const events: RecurringPledgeEvent[] = [
      {
        type: 'standingPledgeCreated',
        event: {
          ...baseRaw(),
          pledgeId: 1n,
          rootOwner: ALICE,
          delegateTo: BOB,
          token: TOKEN,
          amountPerPeriod: 10n,
          period: 2_592_000n,
          causeRef: 'bafy-cause',
          backingType: 0,
        },
      },
      {
        type: 'standingPledgeExecuted',
        event: {
          ...baseRaw({ logIndex: 1 }),
          pledgeId: 1n,
          noteId: 7n,
          executedAt: 1000n,
        },
      },
    ];

    const pledges = foldStandingPledges(events);
    const pledge = pledges.get('1');
    assert.equal(pledge?.active, true);
    assert.equal(pledge?.lastExecuted, '1000');
    assert.deepEqual(pledge?.executedNoteIds, ['7']);
  });

  it('excludes cancelled pledges from monthly cause totals', () => {
    const events: RecurringPledgeEvent[] = [
      {
        type: 'standingPledgeCreated',
        event: {
          ...baseRaw(),
          pledgeId: 1n,
          rootOwner: ALICE,
          delegateTo: BOB,
          token: TOKEN,
          amountPerPeriod: 10n,
          period: 2_592_000n,
          causeRef: 'bafy-cause',
          backingType: 0,
        },
      },
      {
        type: 'standingPledgeCancelled',
        event: {
          ...baseRaw({ logIndex: 1 }),
          pledgeId: 1n,
          rootOwner: ALICE,
        },
      },
    ];

    const totals = monthlyPledgedByCause(foldStandingPledges(events).values());
    assert.equal(totals.get('bafy-cause'), undefined);
  });
});
