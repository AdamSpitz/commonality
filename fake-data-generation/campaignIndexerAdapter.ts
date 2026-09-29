import type { PublicClient } from 'viem';
import { toSubjectId } from '@commonality/sdk/fundingportals';
import type { SDKMachinery } from '@commonality/sdk/machinery';
import { chainStatusKeyForChainId, cidToBytes32, fetchEventsComplete, type RawEventFromCache } from '@commonality/sdk/utils';
import type { CampaignActionType } from './campaignSchema.js';
import type { PlannedAction } from './campaignPlanner.js';
import type { CampaignRuntimeBindings } from './campaignRuntimeBindings.js';
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
 * Alternative proving events (e.g. ordinary vs retroactive funding) count as
 * one indexed write. Duplicates of the same event name remain visible.
 */
function sameTopic(actual: string | null, expected: string | undefined): boolean {
  if (!expected) return true;
  return actual?.toLowerCase() === expected.toLowerCase();
}

/**
 * When one transaction emits several events of the same name, keep the log whose
 * indexed ids are this planned write. Missing bindings do not filter.
 */
export function campaignEventMatchesAction(action: PlannedAction, event: RawEventFromCache, bindings: CampaignRuntimeBindings): boolean {
  const statement = (id: string | undefined): `0x${string}` | undefined => {
    const cid = id ? bindings.statements[id] : undefined;
    return cid ? cidToBytes32(cid) : undefined;
  };
  if (action.type === 'publish-statement' || action.type === 'set-belief') {
    return sameTopic(event.topic2, statement(action.statementId));
  }
  if (action.type === 'attest-implication') {
    return sameTopic(event.topic2, statement(action.implication?.fromStatementId))
      && sameTopic(event.topic3, statement(action.implication?.toStatementId));
  }
  if (action.type === 'attest-alignment') {
    const project = action.projectId ? bindings.projects[action.projectId] : undefined;
    return sameTopic(event.topic2, project ? toSubjectId(project) : undefined)
      && sameTopic(event.topic3, statement(action.statementId));
  }
  return true;
}

export function collapseIndexedMatches(events: readonly RawEventFromCache[]): IndexedActionMatch[] {
  const byName = new Map<string, RawEventFromCache[]>();
  for (const event of events) {
    const group = byName.get(event.eventName) ?? [];
    group.push(event);
    byName.set(event.eventName, group);
  }
  for (const group of byName.values()) {
    if (group.length > 1) return group.map(toMatch);
  }
  return events[0] ? [toMatch(events[0])] : [];
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
  bindings?: CampaignRuntimeBindings;
}): CampaignReconciliationAdapter {
  requireEventCacheUrl(input.machinery);
  return {
    getChainHead: () => input.publicClient.getBlockNumber(),
    getIndexerHead: () => getIndexerHead(input.machinery),
    async findIndexedAction(action, transactionHash) {
      const eventGroups = await Promise.all(CAMPAIGN_ACTION_EVENTS[action.type].map((eventName) =>
        fetchEventsComplete(input.machinery, { eventName })));
      const target = transactionHash.toLowerCase();
      const inTransaction = eventGroups.flat().filter((event) => event.transactionHash.toLowerCase() === target);
      const matched = input.bindings
        ? inTransaction.filter((event) => campaignEventMatchesAction(action, event, input.bindings!))
        : inTransaction;
      return collapseIndexedMatches(matched);
    },
    getDerivedChecks: (action) => input.derivedChecks.getDerivedChecks(action),
  };
}
