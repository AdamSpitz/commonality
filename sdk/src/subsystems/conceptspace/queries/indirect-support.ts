import { type Address } from 'viem';
import { cidToBytes32, IpfsCidV1 } from '../../../utils/cid-types.js';
import { SDKMachinery } from '../../../machinery.js';
import { foldImplications, foldStatementBeliefs } from '../folds.js';
import {
  computeAnonymizedId,
  foldAnonymizedBelieverIds,
  unionAnonymizedBelieverIds,
  computeTieredHeadCount,
  type AnonymizedId,
  type TieredHeadCount,
} from '../../identity/unique-human-id.js';
import {
  type Implication,
  type IndirectSupporter,
  type IndirectSupportTieredHeadCountOptions,
  BeliefStates,
} from '../types.js';
import type { DecodedDirectSupportEvent } from '../../../utils/eventDecoder.js';
import { fetchDecodedDirectSupportEvents, fetchDecodedImplicationLifecycleEvents } from './fetch.js';
import { fetchStatementDocument, uniqueAddresses } from './documents.js';
import { filterByTrustedAttesters } from './implications.js';

/**
 * Compute indirect supporters for a statement.
 *
 * An indirect supporter is a user who believes a statement that implies this one
 * (via the implication graph) but has not directly expressed a belief on this statement.
 */
export async function getIndirectSupporters(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<IndirectSupporter[]> {
  const { supporters } = await computeIndirectSupport(machinery, statementCid, trustedAttesters);
  return supporters;
}

/**
 * Internal shared computation behind {@link getIndirectSupporters} and the
 * tiered head-count path. Returns the indirect-supporter list plus the
 * deduped anonymized-ID sets that proof-of-personhood tiers attach to:
 *
 *   - `directBelieverIds`  — anchors whose latest belief on the *target*
 *     statement is "believes".
 *   - `indirectBelieverIds` — the Tally set-union of believer IDs across the
 *     implying statements, with target-disbelievers excluded.
 *   - `disbelieverIds` — anchors whose latest belief on the *target* statement
 *     is "disbelieves". Exposed because `noOpinion` and `disbelieves` are
 *     different facts and view folds must not conflate them (see
 *     {@link computeViewBands}).
 *
 * All three sets are deduped by anonymized anchor ID (see
 * `specs/tech/shared/unique-human-id.md`); today address → anonymized_ID is
 * 1:1, so counts are unchanged from the raw-address era, but the anonymized-ID
 * key is the seam proof-of-personhood tiers will attach to.
 */
async function computeIndirectSupport(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[],
): Promise<{
  supporters: IndirectSupporter[];
  directBelieverIds: Set<AnonymizedId>;
  indirectBelieverIds: Set<AnonymizedId>;
  disbelieverIds: Set<AnonymizedId>;
}> {
  const decodedToEvents = await fetchDecodedImplicationLifecycleEvents(machinery, {
    topic3: cidToBytes32(statementCid),
  });

  const implications = filterByTrustedAttesters(foldImplications(decodedToEvents), trustedAttesters);

  const decodedTargetEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic2: cidToBytes32(statementCid),
  });

  // Tally set-union: dedupe by anonymized anchor ID, not raw address, so an
  // account that signed several equivalent (mutually-implying) statements
  // counts once. Today address → anonymized_ID is 1:1, so counts are unchanged;
  // the anonymized-ID key is the seam proof-of-personhood tiers attach to.
  const targetBeliefs = foldStatementBeliefs(decodedTargetEvents).beliefs;
  const targetDisbelieverIds = new Set<AnonymizedId>();
  const directBelieverIds = new Set<AnonymizedId>();
  for (const [user, state] of targetBeliefs.entries()) {
    const id = computeAnonymizedId(user as Address);
    if (state === BeliefStates.DISBELIEVES) {
      targetDisbelieverIds.add(id);
    } else if (state === BeliefStates.BELIEVES) {
      directBelieverIds.add(id);
    }
  }

  if (implications.length === 0) {
    return {
      supporters: [],
      directBelieverIds,
      indirectBelieverIds: new Set<AnonymizedId>(),
      disbelieverIds: targetDisbelieverIds,
    };
  }

  const uniqueFromCids = [...new Set(implications.map(i => i.fromStatementCid))];
  const beliefEventsByFromCid = new Map<IpfsCidV1, DecodedDirectSupportEvent[]>();

  const allBeliefEvents = await Promise.all(
    uniqueFromCids.map(async cid => {
      const decoded = await fetchDecodedDirectSupportEvents(machinery, {
        topic2: cidToBytes32(cid as IpfsCidV1),
      });
      return { cid, decoded };
    })
  );

  for (const { cid, decoded } of allBeliefEvents) {
    beliefEventsByFromCid.set(cid, decoded);
  }

  const retractedFromCids = new Set<IpfsCidV1>();
  await Promise.all(uniqueFromCids.map(async cid => {
    const publisherCandidates = uniqueAddresses((beliefEventsByFromCid.get(cid) ?? []).map(e => e.user));
    const { status } = await fetchStatementDocument(machinery, cid, 5000, publisherCandidates);
    if (status === 'retracted') retractedFromCids.add(cid);
  }));
  const activeImplications = implications.filter(i => !retractedFromCids.has(i.fromStatementCid));

  const believerIdSetsByImplication = new Map<Implication, Set<AnonymizedId>>();
  const addressByAnonymizedId = new Map<AnonymizedId, string>();

  for (const implication of activeImplications) {
    const fromEvents = beliefEventsByFromCid.get(implication.fromStatementCid) ?? [];
    const believerIds = foldAnonymizedBelieverIds(fromEvents);
    believerIdSetsByImplication.set(implication, believerIds);
    for (const e of fromEvents) {
      const id = computeAnonymizedId(e.user);
      if (!addressByAnonymizedId.has(id)) {
        addressByAnonymizedId.set(id, e.user.toLowerCase());
      }
    }
  }

  const unionedBelieverIds = unionAnonymizedBelieverIds(
    [...believerIdSetsByImplication.values()],
  );

  // Exclude anchors that explicitly disbelieve the target (by anonymized ID).
  const indirectBelieverIds = new Set<AnonymizedId>();
  for (const id of unionedBelieverIds) {
    if (!targetDisbelieverIds.has(id)) indirectBelieverIds.add(id);
  }

  // First-implication-wins for the via-statement, mirroring the previous
  // raw-address dedupe order.
  const viaStatementCidByAnonymizedId = new Map<AnonymizedId, IpfsCidV1>();
  for (const implication of activeImplications) {
    const believerIds = believerIdSetsByImplication.get(implication)!;
    for (const id of believerIds) {
      if (!viaStatementCidByAnonymizedId.has(id)) {
        viaStatementCidByAnonymizedId.set(id, implication.fromStatementCid);
      }
    }
  }

  const supporters: IndirectSupporter[] = [];
  for (const id of indirectBelieverIds) {
    const user = addressByAnonymizedId.get(id);
    const viaStatementCid = viaStatementCidByAnonymizedId.get(id);
    if (user === undefined || viaStatementCid === undefined) continue;
    supporters.push({ user, viaStatementCid });
  }

  return { supporters, directBelieverIds, indirectBelieverIds, disbelieverIds: targetDisbelieverIds };
}

/**
 * The three belief sets for a statement, deduped by anonymized anchor ID.
 *
 * This is the read primitive behind **views** — the client-side set operations
 * a cause site runs over its planks (see
 * `docs/founder/shaping-your-cause-statements.md` § Planks, views, anchors).
 * Counts are not enough: a union or an intersection over several planks needs
 * the member sets themselves, and the two-band conjunction additionally needs
 * to tell `disbelieves` apart from `noOpinion`.
 *
 * **Cost:** this walks DirectSupport events for the statement *and* for every
 * statement implying it, so a view over N planks multiplies that walk by N.
 * Fetches use {@link fetchEventsComplete}; a 10⁵-signer fold is still a
 * client-side problem (TODO.md), not a silent 10_000 cap.
 */
export interface StatementBelieverSets {
  statementCid: IpfsCidV1;
  /** Anchors whose latest belief on this statement is "believes". */
  directBelieverIds: Set<AnonymizedId>;
  /** Anchors believing something that implies this statement, disbelievers excluded. */
  indirectBelieverIds: Set<AnonymizedId>;
  /** Anchors whose latest belief on this statement is "disbelieves". */
  disbelieverIds: Set<AnonymizedId>;
}

/**
 * Get the deduped believer / disbeliever ID sets for a statement, for folding
 * into a view alongside other planks' sets.
 *
 * Prefer {@link getStatementSupportTieredHeadCount} when a single statement's
 * headline number is all that's wanted; this exists for the multi-plank case
 * where the sets must be combined before they are counted.
 */
export async function getStatementBelieverSets(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[],
): Promise<StatementBelieverSets> {
  const { directBelieverIds, indirectBelieverIds, disbelieverIds } = await computeIndirectSupport(
    machinery,
    statementCid,
    trustedAttesters,
  );
  return { statementCid, directBelieverIds, indirectBelieverIds, disbelieverIds };
}

/**
 * Compute the tiered head-count over a statement's full deduped supporter base.
 *
 * The supporter base is the Tally set-union: direct believers of this statement
 * plus indirect supporters via the implication graph, deduped by anonymized
 * anchor ID, with anchors that explicitly disbelieve the target excluded.
 * {@link computeTieredHeadCount} then groups that set by proof-of-personhood
 * strength, so the UI can render "N supporters — M with ≥1 attestation."
 *
 * `knownTiers` is the optional map from anonymized ID → tier populated by
 * whatever proof-of-personhood integration is wired up (none yet). Until a
 * provider exists every anchor is tier 0, so only `total` is nonzero — the
 * honest default that keeps the headline from reading as a verified-human
 * count. See `specs/tech/shared/unique-human-id.md`.
 */
export async function getStatementSupportTieredHeadCount(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: IndirectSupportTieredHeadCountOptions = {},
): Promise<TieredHeadCount> {
  const { trustedAttesters, knownTiers } = options;
  const { directBelieverIds, indirectBelieverIds } = await computeIndirectSupport(
    machinery,
    statementCid,
    trustedAttesters,
  );
  // Union direct + indirect believer ID sets (both already deduped by
  // anonymized ID and both already exclude target-disbelievers), then group by
  // proof-of-personhood tier.
  const supporterIds = unionAnonymizedBelieverIds([directBelieverIds, indirectBelieverIds]);
  return computeTieredHeadCount(supporterIds, knownTiers);
}

/** Count of indirect supporters for a statement. */
export async function getIndirectSupporterCount(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<number> {
  const supporters = await getIndirectSupporters(machinery, statementCid, trustedAttesters);
  return supporters.length;
}

/**
 * Which implication attesters have actually published on the chain we are
 * reading, and which of the caller's trusted sources have not.
 *
 * Indirect support is filtered by trusted attester, so a trusted address that
 * has published nothing here contributes nothing — and the UI would otherwise
 * render that as an ordinary "0 indirect supporters", indistinguishable from a
 * statement that genuinely has no related statements. The usual cause is a
 * default trust config left pointing at a different network's attester (see
 * `docs/dev/chain-scoped-trust-config.md`), which no amount of staring at the
 * statement page will reveal. This query supplies the evidence needed to say
 * *why* the number is zero.
 */
export interface ImplicationSourceActivity {
  /** Every attester with >=1 implication attestation on this chain, busiest first. */
  activeAttesters: { attester: Address; implicationCount: number }[];
  /** Trusted attesters that have published nothing on this chain. */
  inactiveTrustedAttesters: Address[];
  /** Total distinct implication edges on this chain, across all attesters. */
  totalImplications: number;
}

export async function getImplicationSourceActivity(
  machinery: SDKMachinery,
  trustedAttesters?: string[]
): Promise<ImplicationSourceActivity> {
  const implications = foldImplications(
    await fetchDecodedImplicationLifecycleEvents(machinery)
  );

  const countByAttester = new Map<string, number>();
  for (const implication of implications) {
    const attester = implication.attester.toLowerCase();
    countByAttester.set(attester, (countByAttester.get(attester) ?? 0) + 1);
  }

  const activeAttesters = Array.from(countByAttester, ([attester, implicationCount]) => ({
    attester: attester as Address,
    implicationCount,
  })).sort((a, b) => b.implicationCount - a.implicationCount);

  const inactiveTrustedAttesters = (trustedAttesters ?? [])
    .filter(a => !countByAttester.has(a.toLowerCase()))
    .map(a => a as Address);

  return { activeAttesters, inactiveTrustedAttesters, totalImplications: implications.length };
}
