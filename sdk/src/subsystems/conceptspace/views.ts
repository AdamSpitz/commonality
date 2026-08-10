/**
 * Views — client-side set operations over a cause's planks.
 *
 * A **view** is a union or intersection over some subset of published planks.
 * It needs no published statement, no attestation, and nothing on chain: it is
 * display, derived from believer sets the SDK already folds. See
 * `docs/founder/shaping-your-cause-statements.md` § Planks, views, anchors.
 *
 * What a view cannot do — and the only three things it cannot do — is let
 * anyone *sign* the combination, *earmark* funds to it, or *align a project*
 * with it. Those need a real statement with a real CID, which is what
 * promoting a view to an **anchor** is for.
 */

import type { AnonymizedId } from '../identity/unique-human-id.js';
import type { StatementBelieverSets } from './queries.js';

/** Supporters of a disjunction view: signed at least one of the selected planks. */
export interface UnionViewCount {
  /** Anchors supporting >= 1 selected plank, directly or indirectly. */
  total: number;
  /** Of those, how many signed at least one plank directly (a subset of `total`). */
  direct: number;
}

/**
 * Supporters of a conjunction view, as two bands.
 *
 * A conjunction view reported as a single "signed everything" number lies, and
 * gets worse as a cause grows planks. `noOpinion` is the default belief state,
 * so someone who signed four of five planks and simply never encountered the
 * fifth drops out of a strict intersection — not because he disagrees, but
 * because nobody asked him. Hence two bands, per § Conjunction views need two
 * bands, or they lie.
 */
export interface ConjunctionViewBands {
  /**
   * Band 1 — signed *every* selected plank, **directly**. The hard number; its
   * whole claim to being hard is that these people literally signed each one,
   * so indirect support is deliberately excluded.
   */
  signedAll: number;
  /**
   * Band 2 — supports at least one selected plank (directly *or* indirectly)
   * and disbelieves none of them, excluding anyone already counted in band 1.
   * This band is already an inference from silence, so indirect support belongs
   * here and concedes nothing it hasn't conceded already.
   *
   * Read as "N *more* have signed at least one and disagreed with none."
   */
  noneDisagreed: number;
}

export interface ViewCounts {
  /** How many planks the view is over. Zero means nothing was selected. */
  plankCount: number;
  union: UnionViewCount;
  conjunction: ConjunctionViewBands;
}

/** Everyone supporting this plank at all: direct believers ∪ indirect supporters. */
function supporterIds(sets: StatementBelieverSets): Set<AnonymizedId> {
  // Union, never add: the two sets are *not* disjoint — one anchor can be in
  // both, having signed the plank directly *and* signed something implying it.
  // Adding the cardinalities double-counts. (queries.ts:478 unions for the same
  // reason.)
  const all = new Set(sets.directBelieverIds);
  for (const id of sets.indirectBelieverIds) all.add(id);
  return all;
}

function intersect(sets: Set<AnonymizedId>[]): Set<AnonymizedId> {
  if (sets.length === 0) return new Set();
  // Start from the smallest set so the scan is bounded by it, not by the first.
  const [smallest, ...rest] = [...sets].sort((a, b) => a.size - b.size);
  const result = new Set<AnonymizedId>();
  for (const id of smallest!) {
    if (rest.every((other) => other.has(id))) result.add(id);
  }
  return result;
}

/**
 * Fold per-plank believer sets into the counts a cause page displays.
 *
 * Pass only the planks the view actually selects — a visitor deselecting an
 * issue is a set operation, not a new statement, so it is just a shorter array
 * here.
 */
export function computeViewCounts(planks: StatementBelieverSets[]): ViewCounts {
  if (planks.length === 0) {
    return {
      plankCount: 0,
      union: { total: 0, direct: 0 },
      conjunction: { signedAll: 0, noneDisagreed: 0 },
    };
  }

  const unionAll = new Set<AnonymizedId>();
  const unionDirect = new Set<AnonymizedId>();
  const anyDisbelieved = new Set<AnonymizedId>();
  for (const plank of planks) {
    for (const id of supporterIds(plank)) unionAll.add(id);
    for (const id of plank.directBelieverIds) unionDirect.add(id);
    for (const id of plank.disbelieverIds) anyDisbelieved.add(id);
  }

  // Band 1: direct believers of every selected plank.
  const signedAll = intersect(planks.map((plank) => plank.directBelieverIds));

  // Band 2: supports something here, contradicts nothing here, not already in
  // band 1 — so the two bands can be read as "310 … and 1,840 *more*".
  let noneDisagreed = 0;
  for (const id of unionAll) {
    if (anyDisbelieved.has(id) || signedAll.has(id)) continue;
    noneDisagreed++;
  }

  return {
    plankCount: planks.length,
    union: { total: unionAll.size, direct: unionDirect.size },
    conjunction: { signedAll: signedAll.size, noneDisagreed },
  };
}
