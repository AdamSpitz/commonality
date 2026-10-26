import assert from 'assert';
import { foldSelfAttestedNames, foldSuggestedNames } from './folds.js';
import type { SuggestedName } from './types.js';

const ALICE = '0x1111111111111111111111111111111111111111' as const;
const BOB = '0x2222222222222222222222222222222222222222' as const;

function suggestion(
  attester: `0x${string}`,
  accountBeingNamed: `0x${string}`,
  name: string,
  blockNumber: bigint,
  logIndex = 0,
): SuggestedName {
  return { attester, accountBeingNamed, name, blockNumber, logIndex };
}

const events = [
  suggestion(BOB, ALICE, 'From Bob, later log', 2n, 1),
  suggestion(ALICE, ALICE, 'Ada', 1n),
  suggestion(BOB, ALICE, 'From Bob', 2n, 0),
  suggestion(ALICE, BOB, 'Bob', 3n),
  suggestion(ALICE, ALICE, 'Ada Lovelace', 4n),
];

describe('suggested names', () => {
  it('returns every suggestion for an account in chain order', () => {
    const names = foldSuggestedNames(ALICE, events).map((event) => event.name);
    assert.deepEqual(names, ['Ada', 'From Bob', 'From Bob, later log', 'Ada Lovelace']);
  });

  it('returns only names the account suggested for itself', () => {
    const names = foldSelfAttestedNames(ALICE, events).map((event) => event.name);
    assert.deepEqual(names, ['Ada', 'Ada Lovelace']);
  });

  it('treats attester and account addresses case-insensitively', () => {
    const mixed = [
      suggestion(
        ALICE.toUpperCase() as `0x${string}`,
        ALICE,
        'Ada',
        1n,
      ),
    ];
    assert.equal(foldSelfAttestedNames(ALICE, mixed).length, 1);
  });
});
