/**
 * Unique Human IDs — anonymized anchor ID + proof-of-personhood tier model.
 *
 * This is the day-one foundation for Sybil-resistance across Commonality
 * (Tally set-union counting, Aligning anti-abuse). It deliberately does **not**
 * implement a uniqueness system or pick a proof-of-personhood provider. Instead
 * it establishes two stable primitives so later proof-of-personhood can attach
 * *additively* without a schema migration:
 *
 *   1. **`anonymized_ID = hash(anchor_address, app_salt)`** — a deterministic,
 *      context-scoped nullifier derived from the account a user acts from (the
 *      "anchor"). Same anchor ⇒ same ID, so it is the set-union / dedupe key
 *      across statements. `app_salt` is a *public* domain separator (not a
 *      secret): it stops the ID colliding with the same person's ID in other
 *      apps and keeps both the public and private proof-linking paths producing
 *      the same ID for the same anchor.
 *
 *   2. **Proof strength as a tier/value, not a boolean `is_verified` flag.**
 *      Each anchor carries a `ProofTier` (0 = none, 1 = asserted, 2 = one
 *      attestation, 3 = multiple attestations). Tally can group counts by tier
 *      ("100,000 signers — 10,000 with ≥2 attestations"); the reader picks the
 *      tier they trust. Adding a provider later just moves an anchor up the
 *      ladder — no re-signing, no migration.
 *
 * See `specs/tech/shared/unique-human-id.md` for the full design. The lower
 * tiers provide essentially no real Sybil-resistance (one human can mint many
 * accounts and assert on each); UI copy must never let "asserted" read as "we
 * checked."
 */

import {
  encodeAbiParameters,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from 'viem';
import type { RawEvent } from '../events-common.js';

// ============================================================================
// App salt (public domain separator)
// ============================================================================

/**
 * Default public domain separator for Commonality's anonymized-ID derivation.
 *
 * This is **not a secret** — it is public and fixed. Its only job is to scope
 * the nullifier so the same anchor address produces a different `anonymized_ID`
 * in other applications, and to guarantee the public and private proof-linking
 * paths derive the same ID for the same anchor. Per `unique-human-id.md`, there
 * is no per-user secret salt: set-union across the public and private paths
 * requires the derivation to be identical in both.
 *
 * It is a 32-byte value derived from a fixed domain string. Callers may override
 * it via {@link createUniqueHumanIdConfig} (e.g. to vary by deployment
 * environment), but all components that participate in set-union for a given
 * deployment must agree on the same salt.
 */
export const COMMONALITY_APP_SALT_DEFAULT: Hex = keccak256(
  toHex('commonality.anonymized-id.v1'),
);

/**
 * Configuration for anonymized-ID derivation.
 */
export interface UniqueHumanIdConfig {
  /** 32-byte public domain separator. */
  appSalt: Hex;
}

/**
 * Create a {@link UniqueHumanIdConfig}, defaulting the salt to
 * {@link COMMONALITY_APP_SALT_DEFAULT}.
 */
export function createUniqueHumanIdConfig(appSalt: Hex = COMMONALITY_APP_SALT_DEFAULT): UniqueHumanIdConfig {
  return { appSalt };
}

// ============================================================================
// Anonymized ID derivation
// ============================================================================

/** A 32-byte anonymized ID (nullifier) for an anchor account. */
export type AnonymizedId = Hex;

const ADDRESS_BYTES32_ABI = [{ type: 'address' }, { type: 'bytes32' }] as const;

/**
 * Compute the anonymized ID (nullifier) for an anchor account.
 *
 * `anonymized_ID = keccak256(abi.encode(anchorAddress, appSalt))`.
 *
 * Deterministic in the address ⇒ the same anchor always produces the same ID,
 * so it is the set-union / dedupe key across statements and across
 * Sybil-relevant actions. The `appSalt` scopes it to this application.
 *
 * The anchor address is case-normalized before hashing, so `0xABC…` and
 * `0xabc…` produce the same ID.
 *
 * @param anchorAddress - The account the user acts from (signs Tally statements,
 *   creates projects, etc.).
 * @param config - Optional config overriding the default app salt.
 * @returns A 32-byte anonymized ID as a hex string.
 */
export function computeAnonymizedId(
  anchorAddress: Address,
  config: UniqueHumanIdConfig = createUniqueHumanIdConfig(),
): AnonymizedId {
  const normalizedAddress = anchorAddress.toLowerCase() as Address;
  return keccak256(
    encodeAbiParameters(ADDRESS_BYTES32_ABI, [normalizedAddress, config.appSalt]),
  );
}

// ============================================================================
// Proof-of-personhood strength (tier / value, not a boolean)
// ============================================================================

/**
 * Proof-of-personhood strength tiers.
 *
 * Modeled as a numeric **value**, not a boolean `is_verified` flag, so that
 * adding providers later moves an anchor up the ladder without a schema
 * migration. Tally counts group by tier; the reader picks the tier they trust.
 *
 * Per `unique-human-id.md` caveat #1: tiers 0–1 provide essentially no real
 * Sybil-resistance. UI copy must read "asserted" as "they claim," never "we
 * checked."
 */
export const ProofTier = {
  /** No proof asserted — the account hasn't claimed the one-account convention. */
  NONE: 0,
  /** The user asserts this is their one Commonality account; nothing external backs it. */
  ASSERTED: 1,
  /** One proof-of-personhood credential is linked to the anchor. */
  ONE_ATTESTATION: 2,
  /** Several independent credentials are linked — harder to fake at scale. */
  MULTIPLE_ATTESTATIONS: 3,
} as const;

/** A proof-of-personhood strength value (one of the {@link ProofTier} values). */
export type ProofStrength = number;

/**
 * A Sybil-relevant anchor: its anonymized ID plus the current proof-of-personhood
 * strength attached to it. Proof attaches *additively* — the same anonymized ID
 * gains attestations over time, bumping its tier, with no re-signing.
 */
export interface SybilAnchor {
  anonymizedId: AnonymizedId;
  proofTier: ProofStrength;
}

/**
 * Look up the proof-of-personhood tier for an anchor, defaulting to
 * {@link ProofTier.NONE} when no attestations are recorded yet.
 *
 * `knownTiers` is a map from anonymized ID → tier, populated by whatever
 * proof-of-personhood integration is wired up (none yet, by design). Until a
 * provider exists every anchor is tier 0, which is the honest default: the
 * tiered head-count string can still be rendered ("N signers — 0 with ≥1
 * attestation") and the headline number is never presented as a verified human
 * count.
 */
export function getProofTierForAnchor(
  anonymizedId: AnonymizedId,
  knownTiers?: ReadonlyMap<AnonymizedId, ProofStrength>,
): ProofStrength {
  return knownTiers?.get(anonymizedId) ?? ProofTier.NONE;
}

// ============================================================================
// Tiered head-counts (Tally set-union grouped by proof strength)
// ============================================================================

/**
 * Tiered head-count over a deduped set of anonymized anchor IDs.
 *
 * The headline {@link total} is the whole set (every anchor, any tier). The
 * threshold fields give cumulative counts at each proof-of-personhood
 * strength: the number of anchors whose tier is **at least** the named level.
 * A skeptical reader picks the highest threshold they trust; a casual reader
 * looks at {@link total}. Per `unique-human-id.md` caveat #1, only the
 * attestation-backed thresholds (≥ {@link ProofTier.ONE_ATTESTATION}) carry
 * real Sybil-resistance — the asserted tier is a claim, not a check.
 */
export interface TieredHeadCount {
  /** Total anchors in the set (all tiers). Never presented as a verified-human count. */
  total: number;
  /** Anchors at tier ≥ {@link ProofTier.ASSERTED} (claimed one account; unverified). */
  assertedOrHigher: number;
  /** Anchors at tier ≥ {@link ProofTier.ONE_ATTESTATION} (one credential linked). */
  oneAttestationOrHigher: number;
  /** Anchors at tier ≥ {@link ProofTier.MULTIPLE_ATTESTATIONS} (several credentials). */
  multipleAttestationsOrHigher: number;
}

/**
 * Group a deduped set of anonymized anchor IDs into a {@link TieredHeadCount}.
 *
 * This is the Tally set-union count grouped by proof-of-personhood strength:
 * "N signers — M of whom have ≥1 attestation." `knownTiers` is the optional
 * map from anonymized ID → tier populated by whatever proof-of-personhood
 * integration is wired up. Until a provider exists every anchor is tier 0, so
 * {@link TieredHeadCount.total} is the only nonzero field and the threshold
 * fields read 0 — which is the honest rendering.
 *
 * @param ids - A deduped set of anonymized IDs (e.g. the union of per-statement
 *   believer sets from {@link unionAnonymizedBelieverIds}).
 * @param knownTiers - Optional map from anonymized ID → tier. Defaults to empty
 *   (all tier 0).
 * @returns Cumulative tiered head-count over the set.
 */
export function computeTieredHeadCount(
  ids: ReadonlySet<AnonymizedId>,
  knownTiers?: ReadonlyMap<AnonymizedId, ProofStrength>,
): TieredHeadCount {
  let assertedOrHigher = 0;
  let oneAttestationOrHigher = 0;
  let multipleAttestationsOrHigher = 0;

  for (const id of ids) {
    const tier = getProofTierForAnchor(id, knownTiers);
    if (tier >= ProofTier.MULTIPLE_ATTESTATIONS) {
      multipleAttestationsOrHigher++;
      // falls through to also count toward the lower thresholds
    }
    if (tier >= ProofTier.ONE_ATTESTATION) {
      oneAttestationOrHigher++;
    }
    if (tier >= ProofTier.ASSERTED) {
      assertedOrHigher++;
    }
  }

  return {
    total: ids.size,
    assertedOrHigher,
    oneAttestationOrHigher,
    multipleAttestationsOrHigher,
  };
}

// ============================================================================
// Set-union / dedupe helpers for Tally signing (DirectSupport events)
// ============================================================================

/** Belief-state constant mirroring `hardhat/contracts/statements/Beliefs.sol`. */
const BELIEVES = 1;

/**
 * Fold DirectSupport events for a single statement → the set of anonymized IDs
 * of its current believers.
 *
 * This is the **set-union / dedupe key set** for Tally: one anonymized ID per
 * anchor that currently believes the statement, so an account that signed
 * several equivalent statements counts once when the per-statement sets are
 * unioned (see {@link unionAnonymizedBelieverIds}).
 *
 * Uses last-write-wins per (anchor, statement) pair, mirroring
 * `foldStatementBeliefs` in `conceptspace/folds.ts`. The caller is responsible
 * for filtering events to a single statement before calling.
 *
 * @param events - DirectSupport events for one statement.
 * @param config - Optional config overriding the default app salt.
 * @returns Set of anonymized IDs for anchors whose latest belief is "believes".
 */
export function foldAnonymizedBelieverIds(
  events: ReadonlyArray<{ user: Address; beliefState: number } & RawEvent>,
  config: UniqueHumanIdConfig = createUniqueHumanIdConfig(),
): Set<AnonymizedId> {
  const latestStateByAnchor = new Map<AnonymizedId, number>();

  for (const e of events) {
    latestStateByAnchor.set(computeAnonymizedId(e.user, config), e.beliefState);
  }

  const believerIds = new Set<AnonymizedId>();
  for (const [id, state] of latestStateByAnchor) {
    if (state === BELIEVES) believerIds.add(id);
  }
  return believerIds;
}

/**
 * Union per-statement anonymized-believer-ID sets into one dedupe key set.
 *
 * This is the Tally set-union: "everyone who signed *any* of the equivalent
 * statements", counted once per anchor. Because dedupe is per-account (not per
 * human — see `unique-human-id.md` caveat #3), an account that acted from two
 * different anchors would count twice; the tiered counts soften this because
 * cross-account inflation mostly shows up in the low-proof tiers.
 *
 * @param sets - One set per equivalent statement (e.g. from
 *   {@link foldAnonymizedBelieverIds}).
 * @returns The union of all input sets.
 */
export function unionAnonymizedBelieverIds(
  sets: ReadonlyArray<ReadonlySet<AnonymizedId>>,
): Set<AnonymizedId> {
  const union = new Set<AnonymizedId>();
  for (const set of sets) {
    for (const id of set) union.add(id);
  }
  return union;
}
