import { type DisplayableDocument } from '../../displayable-documents/displayable-document.js';
import { cidToBytes32, IpfsCidV1, normalizeCidV1 } from '../../../utils/cid-types.js';
import { SDKMachinery } from '../../../machinery.js';
import { getKnownProofTiers } from '../../identity/queries.js';
import {
  type Statement,
  type StatementListItem,
  type StatementWithContent,
  type StatementContentStatus,
  type GetStatementWithContentOptions,
  type IndirectSupportInfo,
  type GetUserIndirectSupportOptions,
  BeliefStates,
} from '../types.js';
import { fetchDecodedDirectSupportEvents } from './fetch.js';
import { fetchStatementDocument, uniqueAddresses } from './documents.js';
import { getStatement, getUserBelief } from './statements.js';
import { getImplicationsFrom } from './implications.js';
import { getIndirectSupporterCount, getStatementSupportTieredHeadCount } from './indirect-support.js';
import { getUserBeliefs } from './browse.js';

/** extras.statementType values that may synthesize a Statement without DirectSupport. */
const STATEMENT_SHAPED_EXTRAS_TYPES = new Set([
  'statement',
  'simple',
  'disjunction',
  'conjunction',
  'proposal',
]);

function extrasStatementType(doc: DisplayableDocument | null): string | undefined {
  const value = doc?.extras?.statementType;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Unsigned PublishedData fallback must not turn a roster, claim, or other
 * publication into a signable Statement just because the bytes are displayable.
 */
function isStatementShapedDocument(doc: DisplayableDocument | null): boolean {
  const statementType = extrasStatementType(doc);
  return statementType !== undefined && STATEMENT_SHAPED_EXTRAS_TYPES.has(statementType);
}

/**
 * Get a statement's on-chain metadata together with its IPFS content document.
 *
 * Optionally includes computed metrics (direct believers, disbelievers,
 * indirect supporters).
 *
 * @returns Statement with content, or null if there are no DirectSupport events
 *   and the CID is not an unsigned statement-shaped publication
 */
export async function getStatementWithContent(
  machinery: SDKMachinery,
  statementCid: IpfsCidV1,
  options: GetStatementWithContentOptions = {}
): Promise<StatementWithContent | null> {
  const {
    includeMetrics = false,
    timeout = 10000,
    trustedAttesters,
    knownTiers,
  } = options;

  const statementFromEvents = await getStatement(machinery, statementCid);

  const statementEvents = await fetchDecodedDirectSupportEvents(machinery, {
    topic2: cidToBytes32(statementCid),
  });

  let content: DisplayableDocument | null = null;
  let contentStatus: StatementContentStatus = 'unavailable';
  const document = await fetchStatementDocument(
    machinery,
    statementCid,
    timeout,
    uniqueAddresses(statementEvents.map(event => event.user)),
  );
  content = document.content;
  contentStatus = document.status;

  // Unsigned planks have no DirectSupport events; getStatement would 404
  // /statement/:cid. Only synthesize a Statement for statement-shaped extras
  // (not rosters, claims, or other PublishedData publications).
  if (!statementFromEvents) {
    if (contentStatus !== 'active' || !isStatementShapedDocument(content)) {
      return null;
    }
  }

  const statement: Statement = statementFromEvents ?? {
    id: statementCid,
    cid: statementCid,
    believerCount: 0,
    disbelieverCount: 0,
    statementType: extrasStatementType(content),
  };

  let metrics: StatementWithContent['metrics'] | undefined;
  if (includeMetrics) {
    const indirectSupporters = await getIndirectSupporterCount(
      machinery,
      statementCid,
      trustedAttesters
    );
    // Auto-populate knownTiers from on-chain tier-0/1 self-declarations when
    // the caller hasn't supplied them explicitly. This makes the tiered
    // head-count UI light up automatically as soon as accounts assert, without
    // every caller having to know about the AccountAssertions contract.
    const effectiveKnownTiers = knownTiers ?? await getKnownProofTiers(machinery).catch(() => undefined);
    const tieredSupporters = await getStatementSupportTieredHeadCount(
      machinery,
      statementCid,
      { trustedAttesters, knownTiers: effectiveKnownTiers }
    );

    metrics = {
      directBelievers: statement.believerCount,
      directDisbelievers: statement.disbelieverCount,
      indirectSupporters,
      tieredSupporters,
    };
  }

  return {
    statement,
    content,
    contentStatus,
    metrics,
  };
}

/**
 * Get all statements a user indirectly supports through their beliefs and implications.
 *
 * Traverses the implication graph from the user's directly-believed statements,
 * excludes statements the user has already expressed a direct opinion on,
 * and returns the remaining targets with the "via" paths.
 */
export async function getUserIndirectSupport(
  machinery: SDKMachinery,
  userAddress: string,
  options: GetUserIndirectSupportOptions = {}
): Promise<IndirectSupportInfo[]> {
  const userBeliefsList = await getUserBeliefs(machinery, userAddress);

  if (userBeliefsList.length === 0) {
    return [];
  }

  const implicationsQueries = userBeliefsList.map(belief =>
    getImplicationsFrom(machinery, belief.cid, options.trustedAttesters)
  );

  const implicationsResults = await Promise.all(implicationsQueries);

  const targetToSources = new Map<IpfsCidV1, Set<IpfsCidV1>>();
  const allTargetStatementCids = new Set<IpfsCidV1>();

  userBeliefsList.forEach((belief, idx) => {
    const implications = implicationsResults[idx];
    implications.forEach(implication => {
      const targetCid = normalizeCidV1(implication.toStatementCid);
      allTargetStatementCids.add(targetCid);

      if (!targetToSources.has(targetCid)) {
        targetToSources.set(targetCid, new Set());
      }
      targetToSources.get(targetCid)!.add(belief.cid);
    });
  });

  if (allTargetStatementCids.size === 0) {
    return [];
  }

  const targetCids = Array.from(allTargetStatementCids);
  const beliefChecks = targetCids.map(targetCid =>
    getUserBelief(machinery, userAddress, targetCid)
  );

  const beliefStates = await Promise.all(beliefChecks);

  const indirectlySupportedCids = targetCids.filter((_, idx) => {
    const beliefState = beliefStates[idx];
    return !beliefState || beliefState.beliefState === BeliefStates.NO_OPINION;
  });

  if (indirectlySupportedCids.length === 0) {
    return [];
  }

  const statementQueries = indirectlySupportedCids.map(cid => getStatement(machinery, cid));
  const statements = await Promise.all(statementQueries);

  const results: IndirectSupportInfo[] = [];

  for (let i = 0; i < indirectlySupportedCids.length; i++) {
    const targetCid = indirectlySupportedCids[i];
    const statement = statements[i] ?? {
      id: targetCid,
      cid: targetCid,
      believerCount: 0,
      disbelieverCount: 0,
      createdAt: '',
    } as unknown as Statement;

    const sourceIds = Array.from(targetToSources.get(targetCid) || []);
    const sourceStatements = userBeliefsList.filter(b => sourceIds.includes(b.cid));

    results.push({
      statement: statement as StatementListItem,
      supportedVia: sourceStatements.map(source => ({
        directlyBelievedStatement: source,
        viaStatementCid: source.cid,
      })),
    });
  }

  const start = options.offset || 0;
  const end = options.limit ? start + options.limit : undefined;

  return results.slice(start, end);
}
