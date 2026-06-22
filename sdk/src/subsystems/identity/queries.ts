/**
 * Identity queries — read tier-0/1 proof-of-personhood self-declarations
 * (`AccountAssertions.sol`) from the event cache and fold them into the
 * `knownTiers` map consumed by the tiered head-count path.
 */

import { type Address } from 'viem';
import { SDKMachinery } from '../../machinery.js';
import { fetchEvents, padAddressAsTopic } from '../../utils/eventCacheClient.js';
import { decodeAccountAssertionSetEvent } from '../../utils/eventDecoder.js';
import {
  computeAnonymizedId,
  createUniqueHumanIdConfig,
  ProofTier,
  type AnonymizedId,
  type ProofStrength,
  type UniqueHumanIdConfig,
} from './unique-human-id.js';

/** A decoded `AccountAssertionSet` event with the fold-relevant fields. */
export interface AccountAssertionEvent {
  chainId?: number;
  user: `0x${string}`;
  asserted: boolean;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}

function decodeAssertionEvents(
  rawEvents: Awaited<ReturnType<typeof fetchEvents>>,
): AccountAssertionEvent[] {
  const events: AccountAssertionEvent[] = [];
  for (const raw of rawEvents) {
    const decoded = decodeAccountAssertionSetEvent(raw);
    if (decoded) {
      events.push({
        chainId: decoded.chainId,
        user: decoded.user,
        asserted: decoded.asserted,
        blockNumber: decoded.blockNumber,
        blockTimestamp: decoded.blockTimestamp,
        transactionHash: decoded.transactionHash,
        logIndex: decoded.logIndex,
      });
    }
  }
  return events.sort((a, b) => {
    const bn = Number(a.blockNumber - b.blockNumber);
    return bn !== 0 ? bn : a.logIndex - b.logIndex;
  });
}

/**
 * Fold `AccountAssertionSet` events into the set of anchor addresses that
 * currently assert this is their one Commonality account. Last-write-wins per
 * anchor; revocations (`asserted === false`) remove the anchor from the set.
 */
export function foldAssertedAnchors(events: AccountAssertionEvent[]): Set<Address> {
  const latestByAnchor = new Map<string, boolean>();
  for (const e of events) {
    latestByAnchor.set(e.user.toLowerCase(), e.asserted);
  }
  const asserted = new Set<Address>();
  for (const [lower, isAsserted] of latestByAnchor) {
    if (isAsserted) asserted.add(lower as Address);
  }
  return asserted;
}

/**
 * Build the `knownTiers` map of proof-of-personhood tiers from on-chain
 * `AccountAssertionSet` events. Each anchor that currently asserts this is its
 * one account is mapped to {@link ProofTier.ASSERTED} (tier 1); revoked or
 * never-asserted anchors are absent (defaulting to tier 0).
 *
 * This is the tier-0→1 source: it populates the `knownTiers` seam that
 * `getStatementSupportTieredHeadCount` consumes, so the tiered head-count UI
 * can render "— N claimed one account" as soon as self-declarations exist and
 * before any proof-of-personhood provider is wired up. Per
 * `unique-human-id.md` caveat #1, "asserted" is a self-claim, not a check.
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param config - Optional anonymized-ID config overriding the default app salt
 * @returns Map from anonymized anchor ID → tier (tier 1 for asserted anchors)
 */
export async function getKnownProofTiers(
  machinery: SDKMachinery,
  config: UniqueHumanIdConfig = createUniqueHumanIdConfig(),
): Promise<Map<AnonymizedId, ProofStrength>> {
  const resolvedConfig = config;
  const rawEvents = await fetchEvents(machinery, {
    eventName: 'AccountAssertionSet',
    limit: 10000,
  });
  const assertedAnchors = foldAssertedAnchors(decodeAssertionEvents(rawEvents));

  const tiers = new Map<AnonymizedId, ProofStrength>();
  for (const anchor of assertedAnchors) {
    tiers.set(computeAnonymizedId(anchor, resolvedConfig), ProofTier.ASSERTED);
  }
  return tiers;
}

/**
 * Get a single account's current single-account assertion status, folded from
 * `AccountAssertionSet` events. Returns true if the account's latest event is
 * an assertion (not a revocation).
 *
 * @param machinery - SDK machinery with event cache configuration
 * @param address - The account to look up
 */
export async function getAccountAssertion(
  machinery: SDKMachinery,
  address: string,
): Promise<boolean> {
  const rawEvents = await fetchEvents(machinery, {
    eventName: 'AccountAssertionSet',
    topic1: padAddressAsTopic(address),
    limit: 10000,
  });
  const events = decodeAssertionEvents(rawEvents);
  if (events.length === 0) return false;
  return events[events.length - 1]!.asserted;
}
