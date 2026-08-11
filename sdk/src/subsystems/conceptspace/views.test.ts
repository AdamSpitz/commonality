import assert from 'assert';
import { computeViewCounts } from './views.js';
import type { StatementBelieverSets } from './queries.js';
import type { AnonymizedId } from '../identity/unique-human-id.js';
import { fakeIpfsCidV1 } from '../../utils/test-helpers.js';

function id(name: string): AnonymizedId {
  return `0x${name}` as AnonymizedId;
}

function plank(
  name: string,
  sets: { direct?: string[]; indirect?: string[]; disbelieves?: string[] },
): StatementBelieverSets {
  return {
    statementCid: fakeIpfsCidV1(name),
    directBelieverIds: new Set((sets.direct ?? []).map(id)),
    indirectBelieverIds: new Set((sets.indirect ?? []).map(id)),
    disbelieverIds: new Set((sets.disbelieves ?? []).map(id)),
  };
}

describe('computeViewCounts', () => {
  it('reports zeroes when no planks are selected', () => {
    assert.deepEqual(computeViewCounts([]), {
      plankCount: 0,
      union: { total: 0, direct: 0 },
      conjunction: { signedAll: 0, noneDisagreed: 0 },
    });
  });

  it('unions supporters across planks rather than adding them', () => {
    // `ann` signed both planks; she is one supporter of the union, not two.
    const counts = computeViewCounts([
      plank('a', { direct: ['ann', 'bob'] }),
      plank('b', { direct: ['ann', 'cal'] }),
    ]);
    assert.equal(counts.union.total, 3);
  });

  it('does not double-count an anchor that supports one plank both ways', () => {
    // The direct and indirect sets are NOT disjoint: `ann` signed the plank
    // directly *and* signed something implying it. Adding the cardinalities
    // would report two supporters where there is one person.
    const counts = computeViewCounts([plank('a', { direct: ['ann'], indirect: ['ann'] })]);
    assert.equal(counts.union.total, 1);
    assert.equal(counts.union.direct, 1);
  });

  it('counts band 1 as direct signatures on every plank', () => {
    const counts = computeViewCounts([
      plank('a', { direct: ['ann', 'bob'] }),
      plank('b', { direct: ['ann', 'bob'] }),
      plank('c', { direct: ['ann'] }),
    ]);
    // Only `ann` signed all three; `bob` missed one.
    assert.equal(counts.conjunction.signedAll, 1);
  });

  it('excludes indirect support from band 1 but admits it to band 2', () => {
    // `bob` supports plank c only indirectly, so he is not in the hard number —
    // but he contradicts nothing, so he belongs in the honest estimate.
    const counts = computeViewCounts([
      plank('a', { direct: ['ann', 'bob'] }),
      plank('b', { direct: ['ann', 'bob'] }),
      plank('c', { direct: ['ann'], indirect: ['bob'] }),
    ]);
    assert.equal(counts.conjunction.signedAll, 1);
    assert.equal(counts.conjunction.noneDisagreed, 1);
  });

  it('keeps silence in band 2 — the failure a one-band intersection causes', () => {
    // `bob` signed four of five planks and never encountered the fifth. A
    // strict intersection drops him for not having been asked.
    const counts = computeViewCounts([
      plank('a', { direct: ['ann', 'bob'] }),
      plank('b', { direct: ['ann', 'bob'] }),
      plank('c', { direct: ['ann', 'bob'] }),
      plank('d', { direct: ['ann', 'bob'] }),
      plank('e', { direct: ['ann'] }),
    ]);
    assert.equal(counts.conjunction.signedAll, 1);
    assert.equal(counts.conjunction.noneDisagreed, 1);
  });

  it('drops an anchor from band 2 when it disbelieves any selected plank', () => {
    // Actual disagreement, not silence — the distinction band 2 exists to
    // respect, and it only works because beliefs are three-valued.
    const counts = computeViewCounts([
      plank('a', { direct: ['ann', 'bob'] }),
      plank('b', { direct: ['ann'], disbelieves: ['bob'] }),
    ]);
    assert.equal(counts.conjunction.signedAll, 1);
    assert.equal(counts.conjunction.noneDisagreed, 0);
    // He still supports one plank, so the union view keeps him honestly.
    assert.equal(counts.union.total, 2);
  });

  it('excludes band 1 members from band 2 so the bands read as "N more"', () => {
    const counts = computeViewCounts([
      plank('a', { direct: ['ann', 'bob'] }),
      plank('b', { direct: ['ann', 'bob'] }),
    ]);
    assert.equal(counts.conjunction.signedAll, 2);
    assert.equal(counts.conjunction.noneDisagreed, 0);
  });

  it('treats a single-plank view as its own union and intersection', () => {
    const counts = computeViewCounts([
      plank('a', { direct: ['ann', 'bob'], indirect: ['cal'] }),
    ]);
    assert.equal(counts.union.total, 3);
    assert.equal(counts.conjunction.signedAll, 2);
    assert.equal(counts.conjunction.noneDisagreed, 1);
  });
});
