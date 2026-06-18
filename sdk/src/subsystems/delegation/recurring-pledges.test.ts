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
const PLEDGES_CONTRACT = '0x9999999999999999999999999999999999999999' as const;
const PLEDGES_CONTRACT_2 = '0x8888888888888888888888888888888888888888' as const;

function baseRaw(overrides = {}) {
  return {
    contractAddress: PLEDGES_CONTRACT,
    blockNumber: 1n,
    blockTimestamp: 1000n,
    transactionHash: TX_HASH,
    logIndex: 0,
    ...overrides,
  };
}

describe('recurring pledge folds', () => {
  it('keeps same numeric pledge IDs from different contract versions separate', () => {
    const events: RecurringPledgeEvent[] = [
      {
        type: 'standingPledgeCreated',
        event: {
          ...baseRaw({ contractAddress: PLEDGES_CONTRACT, logIndex: 0 }),
          pledgeId: 1n,
          rootOwner: ALICE,
          delegateTo: BOB,
          token: TOKEN,
          amountPerPeriod: 10n,
          period: 2_592_000n,
          causeRef: 'bafy-cause-a',
          backingType: 0,
        },
      },
      {
        type: 'standingPledgeCreated',
        event: {
          ...baseRaw({ contractAddress: PLEDGES_CONTRACT_2, logIndex: 1 }),
          pledgeId: 1n,
          rootOwner: ALICE,
          delegateTo: BOB,
          token: TOKEN,
          amountPerPeriod: 20n,
          period: 2_592_000n,
          causeRef: 'bafy-cause-b',
          backingType: 0,
        },
      },
    ];

    const pledges = foldStandingPledges(events);
    assert.equal(pledges.get(`${PLEDGES_CONTRACT}:1`)?.amountPerPeriod, '10');
    assert.equal(pledges.get(`${PLEDGES_CONTRACT_2}:1`)?.amountPerPeriod, '20');
    assert.equal(pledges.get('1'), undefined);
  });

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
