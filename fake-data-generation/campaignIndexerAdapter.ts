import type { PublicClient } from 'viem';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import { chainStatusKeyForChainId, fetchEvents, type RawEventFromCache } from '@commonality/sdk/utils';
import type { CampaignActionType } from './campaignSchema.js';
import type { PlannedAction } from './campaignPlanner.js';
import type { CampaignReconciliationAdapter, DerivedCheck, IndexedActionMatch } from './campaignReconciler.js';

/** Events whose presence proves that one planned write reached the raw event cache. */
export const CAMPAIGN_ACTION_EVENTS: Record<CampaignActionType, readonly string[]> = {
  'publish-statement': ['DataPublished'],
  'create-cause': ['RefUpdated'],
  'set-belief': ['DirectSupport'],
  'attest-implication': ['ImplicationAttestation'],
  'create-project': ['ProjectCreated'],
  'attest-alignment': ['AlignmentAttestation'],
  // The campaign contract adapter may use either ordinary crowdfunding or a
  // retroactive donation. Both are user-visible funding writes in SDK folds.
  'fund-project': ['ERC1155Bought', 'RetroactiveDonationReceived'],
  'deposit-note': ['NoteCreated'],
  'delegate-note': ['NoteDelegated'],
  'revoke-delegation': ['NoteRevoked'],
};

export interface CampaignDerivedCheckProvider {
  /** Run the SDK fold checks appropriate to this action and its runtime bindings. */
  getDerivedChecks(action: PlannedAction): Promise<DerivedCheck[]>;
}

type StatusResult = Record<string, { block: { number: number } | null } | null>;

function requireEventCacheUrl(machinery: SDKMachinery): string {
  if (!machinery.eventCacheUrl) throw new Error('campaign reconciliation requires an event-cache URL');
  return machinery.eventCacheUrl;
}

async function getIndexerHead(machinery: SDKMachinery): Promise<bigint> {
  const eventCacheUrl = requireEventCacheUrl(machinery);
  const response = await fetch(`${new URL(eventCacheUrl).origin}/status`);
  if (!response.ok) throw new Error(`indexer status endpoint returned ${response.status}`);
  const status = await response.json() as StatusResult;
  const key = machinery.chainStatusKey ?? chainStatusKeyForChainId(machinery.defaultChainId ?? 31_337);
  const block = status[key]?.block?.number;
  if (!Number.isSafeInteger(block) || block! < 0) throw new Error(`indexer status has no valid ${key} block`);
  return BigInt(block!);
}

function toMatch(event: RawEventFromCache): IndexedActionMatch {
  return {
    entityId: event.id,
    eventId: `${event.eventName}:${event.id}`,
    transactionHash: event.transactionHash as `0x${string}`,
  };
}

/**
 * Bind campaign reconciliation to the real Ponder event cache and SDK fold seam.
 * Event-cache results are filtered by transaction hash because the public API
 * deliberately exposes no transactionHash query parameter.
 */
export function createCampaignIndexerAdapter(input: {
  machinery: SDKMachinery;
  publicClient: Pick<PublicClient, 'getBlockNumber'>;
  derivedChecks: CampaignDerivedCheckProvider;
}): CampaignReconciliationAdapter {
  requireEventCacheUrl(input.machinery);
  return {
    getChainHead: () => input.publicClient.getBlockNumber(),
    getIndexerHead: () => getIndexerHead(input.machinery),
    async findIndexedAction(action, transactionHash) {
      const eventGroups = await Promise.all(CAMPAIGN_ACTION_EVENTS[action.type].map((eventName) =>
        fetchEvents(input.machinery, { eventName, limit: 1000 })));
      const target = transactionHash.toLowerCase();
      return eventGroups.flat().filter((event) => event.transactionHash.toLowerCase() === target).map(toMatch);
    },
    getDerivedChecks: (action) => input.derivedChecks.getDerivedChecks(action),
  };
}
