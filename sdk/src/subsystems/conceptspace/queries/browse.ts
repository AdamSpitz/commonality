import { type Address } from 'viem';
import { padAddressAsTopic, readFinalizedThrough } from '../../../utils/eventCacheClient.js';
import { foldStoreKey, runResumableFold } from '../../../utils/resumableFold.js';
import { IpfsCidV1 } from '../../../utils/cid-types.js';
import { SDKMachinery } from '../../../machinery.js';
import {
  browseCountsFromState,
  deserializeDirectSupportBrowse,
  DIRECT_SUPPORT_BROWSE_FOLD_VERSION,
  emptyDirectSupportBrowse,
  foldUserBeliefs,
  serializeDirectSupportBrowse,
  stepDirectSupportBrowse,
  type DirectSupportBrowseState,
} from '../folds.js';
import {
  type StatementListItem,
  type BrowseStatementsOptions,
  BeliefStates,
} from '../types.js';
import { fetchDecodedDirectSupportEvents } from './fetch.js';
import { enrichWithActiveStatementContent, fetchStatementDocument } from './documents.js';
import { getStatement } from './statements.js';
import { getImplicationsFrom, getImplicationsTo } from './implications.js';

async function loadDirectSupportBrowse(machinery: SDKMachinery): Promise<DirectSupportBrowseState> {
  const beliefs = machinery.contractAddresses?.beliefs;
  return runResumableFold({
    id: 'direct-support-browse',
    version: DIRECT_SUPPORT_BROWSE_FOLD_VERSION,
    key: foldStoreKey({
      chainId: machinery.defaultChainId ?? 0,
      eventCacheUrl: machinery.eventCacheUrl ?? '',
      contracts: beliefs ? [beliefs] : [],
      id: 'direct-support-browse',
      version: DIRECT_SUPPORT_BROWSE_FOLD_VERSION,
    }),
    store: machinery.foldStore,
    empty: emptyDirectSupportBrowse,
    fetch: async cursor => ({
      events: await fetchDecodedDirectSupportEvents(machinery, {}, cursor ? BigInt(cursor.blockNumber) : 0n),
      finalizedThrough: await readFinalizedThrough(machinery, 'DirectSupport'),
    }),
    position: event => ({ blockNumber: event.blockNumber.toString(), logIndex: event.logIndex }),
    step: stepDirectSupportBrowse,
    serialize: serializeDirectSupportBrowse,
    deserialize: deserializeDirectSupportBrowse,
    finish: state => state,
  });
}

function statementItemsFromBrowse(state: DirectSupportBrowseState): StatementListItem[] {
  const beliefCounts = browseCountsFromState(state);
  return [...beliefCounts.keys()].map(cidV1 => {
    const counts = beliefCounts.get(cidV1)!;
    const seen = state.firstSeen.get(cidV1);
    return {
      id: cidV1,
      cid: cidV1 as IpfsCidV1,
      statementType: '',
      title: '',
      excerpt: '',
      believerCount: counts.believerCount,
      disbelieverCount: counts.disbelieverCount,
      createdAt: seen ? new Date(Number(seen.blockTimestamp) * 1000).toISOString() : '',
    };
  });
}

function publisherMap(state: DirectSupportBrowseState): Map<string, Address[]> {
  return new Map([...state.publishers].map(([id, users]) => [id, users as Address[]]));
}

/** A suggested related statement, with the reason for the suggestion. */
export interface StatementSuggestion {
  /** The suggested statement. */
  statement: StatementListItem;
  /** Human-readable explanation of why this statement is suggested. */
  reason: string;
  /** Type of relationship (e.g. `'implies'`, `'impliedBy'`). */
  relationshipType: string;
}

/**
 * Browse statements sorted by number of direct believers.
 *
 * Fetches all DirectSupport events, folds them to compute believer counts,
 * sorts by count, and enriches the page with IPFS content (title/excerpt).
 */
export async function browseStatementsByMostSupporters(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const browse = await loadDirectSupportBrowse(machinery);
  const items = statementItemsFromBrowse(browse);

  items.sort((a, b) => {
    const diff = a.believerCount - b.believerCount;
    return orderDirection === 'asc' ? diff : -diff;
  });

  const displayableItems = await enrichWithActiveStatementContent(machinery, items, publisherMap(browse));
  return displayableItems.slice(offset, offset + limit);
}

/** Browse statements sorted by creation date (newest first by default). */
export async function browseStatementsByNewest(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 10, offset = 0, orderDirection = 'desc' } = options;

  const browse = await loadDirectSupportBrowse(machinery);
  const items = statementItemsFromBrowse(browse);

  items.sort((a, b) => {
    const blockA = browse.firstSeen.get(a.id)?.blockNumber ?? 0n;
    const blockB = browse.firstSeen.get(b.id)?.blockNumber ?? 0n;
    const diff = a.createdAt.localeCompare(b.createdAt) || Number(blockA - blockB);
    return orderDirection === 'asc' ? diff : -diff;
  });

  const displayableItems = await enrichWithActiveStatementContent(machinery, items, publisherMap(browse));
  return displayableItems.slice(offset, offset + limit);
}

/**
 * Browse statements with configurable sort order.
 *
 * Delegates to {@link browseStatementsByMostSupporters} for believerCount/disbelieverCount
 * ordering, or {@link browseStatementsByNewest} for date ordering.
 */
export async function browseStatements(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { orderBy = 'createdAt' } = options;

  if (orderBy === 'believerCount' || orderBy === 'disbelieverCount') {
    return browseStatementsByMostSupporters(machinery, options);
  }
  return browseStatementsByNewest(machinery, options);
}

/** All displayable statements as a paginated list. */
export async function getAllStatements(
  machinery: SDKMachinery,
  options: BrowseStatementsOptions = {}
): Promise<StatementListItem[]> {
  const { limit = 100, offset = 0 } = options;

  const browse = await loadDirectSupportBrowse(machinery);
  const items = statementItemsFromBrowse(browse);
  const displayableItems = await enrichWithActiveStatementContent(machinery, items, publisherMap(browse));
  return displayableItems.slice(offset, offset + limit);
}

/**
 * Get all statements a user directly believes (beliefState = 1).
 *
 * Fetches the user's DirectSupport events, filters for active beliefs,
 * then enriches each statement with IPFS content.
 */
async function getUserStatementsByBeliefState(
  machinery: SDKMachinery,
  userAddress: string,
  beliefState: number,
): Promise<StatementListItem[]> {
  const paddedUser = padAddressAsTopic(userAddress);

  const decodedEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic1: paddedUser,
  });

  const userBeliefs = foldUserBeliefs(decodedEvents);
  const believedCids = userBeliefs
    .filter(b => b.beliefState === beliefState)
    .map(b => b.statementCid);

  if (believedCids.length === 0) return [];

  const results = await Promise.all(believedCids.map(async cid => {
    const [stmt, document] = await Promise.all([
      getStatement(machinery, cid),
      fetchStatementDocument(machinery, cid, 5000, [userAddress as Address]),
    ]);
    if (!stmt || document.status === 'retracted') return null;
    const content = String(document.content?.content ?? '');
    return {
      id: stmt.id,
      cid: stmt.cid,
      statementType: stmt.statementType ?? '',
      title: content ? content.split('\n')[0].slice(0, 200) : '',
      excerpt: content ? content.slice(0, 200) : '',
      believerCount: stmt.believerCount,
      disbelieverCount: stmt.disbelieverCount,
      createdAt: stmt.createdAt ?? '',
    } as StatementListItem;
  }));
  return results.filter((item): item is StatementListItem => item !== null);
}

export async function getUserBeliefs(
  machinery: SDKMachinery,
  userAddress: string,
): Promise<StatementListItem[]> {
  return getUserStatementsByBeliefState(machinery, userAddress, BeliefStates.BELIEVES);
}

/** Statements a user directly disbelieves (beliefState = 2). */
export async function getUserDisbeliefs(
  machinery: SDKMachinery,
  userAddress: string
): Promise<StatementListItem[]> {
  return getUserStatementsByBeliefState(machinery, userAddress, BeliefStates.DISBELIEVES);
}

/**
 * Statement suggestions related to a given statement.
 *
 * Returns statements connected via the implication graph that have more
 * supporters than the source statement, sorted by supporter count.
 */
export async function getStatementSuggestions(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  trustedAttesters?: string[]
): Promise<StatementSuggestion[]> {
  const suggestions: StatementSuggestion[] = [];

  const sourceStatement = await getStatement(machinery, statementCid);
  if (!sourceStatement) {
    return [];
  }

  const implicationsFrom = await getImplicationsFrom(machinery, statementCid, trustedAttesters);

  for (const implication of implicationsFrom) {
    const targetStatement = await getStatement(machinery, implication.toStatementCid);
    if (targetStatement && targetStatement.believerCount > sourceStatement.believerCount) {
      suggestions.push({
        statement: {
          id: targetStatement.id,
          cid: targetStatement.cid,
          statementType: targetStatement.statementType || '',
          title: targetStatement.title || '',
          excerpt: targetStatement.excerpt || '',
          believerCount: targetStatement.believerCount,
          disbelieverCount: targetStatement.disbelieverCount,
          createdAt: targetStatement.createdAt || '',
        },
        reason: `This statement is implied by the current statement and has ${targetStatement.believerCount} supporters (more than the current statement's ${sourceStatement.believerCount})`,
        relationshipType: 'implies',
      });
    }
  }

  const implicationsTo = await getImplicationsTo(machinery, statementCid, trustedAttesters);

  for (const implication of implicationsTo) {
    const sourceOfImplication = await getStatement(machinery, implication.fromStatementCid);
    if (sourceOfImplication && sourceOfImplication.believerCount > sourceStatement.believerCount) {
      suggestions.push({
        statement: {
          id: sourceOfImplication.id,
          cid: sourceOfImplication.cid,
          statementType: sourceOfImplication.statementType || '',
          title: sourceOfImplication.title || '',
          excerpt: sourceOfImplication.excerpt || '',
          believerCount: sourceOfImplication.believerCount,
          disbelieverCount: sourceOfImplication.disbelieverCount,
          createdAt: sourceOfImplication.createdAt || '',
        },
        reason: `This statement implies the current statement and has ${sourceOfImplication.believerCount} supporters (more than the current statement's ${sourceStatement.believerCount})`,
        relationshipType: 'impliedBy',
      });
    }
  }

  suggestions.sort((a, b) => b.statement.believerCount - a.statement.believerCount);

  return suggestions;
}
