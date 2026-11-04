/**
 * Exact statement-set reads over the raw event feed.
 *
 * One finalized checkpoint covers every target. Incoming implications and
 * direct-support histories are fetched in topic batches, and a source statement
 * is fetched once even when several targets depend on it. A source that is also
 * a displayed target is still checked for retraction; that flag is stored on its
 * belief scan. Its belief history is not fetched a second time.
 *
 * Completed scans live in the machinery fold store (IndexedDB in the browser).
 * The stored position is the block the statement was fully scanned through,
 * which may be later than its last matching event. A repeat read at a higher
 * finalized head fetches only later blocks. Cached folds do not include trust
 * policy; policy is applied when the read is computed. Keys include chain,
 * both statement contracts, the indexer URL, and upstream build id. A lower
 * head, the same head under a different checkpoint, or a new upstream id
 * discards the scan. A refresh persists implication and belief positions
 * together, only after both families and source-retraction checks succeed.
 */

import type { Address } from 'viem';
import { SDKMachinery } from '../../../machinery.js';
import { cidToBytes32, type IpfsCidV1 } from '../../../utils/cid-types.js';
import {
  fetchChainSync,
  fetchEventFeedPage,
  type RawEventFromCache,
} from '../../../utils/eventCacheClient.js';
import {
  defaultFoldStore,
  foldStoreKey,
  type FoldStore,
  type StoredFold,
} from '../../../utils/resumableFold.js';
import {
  decodeDirectSupportEvent,
  decodeImplicationAttestationEvent,
  decodeImplicationRevokedEvent,
  type DecodedDirectSupportEvent,
  type DecodedImplicationAttestationEvent,
  type DecodedImplicationRevokedEvent,
} from '../../../utils/event-decoders/conceptspace.js';
import { computeAnonymizedId, type AnonymizedId } from '../../identity/unique-human-id.js';
import {
  deserializeImplications,
  emptyImplications,
  foldImplications,
  foldStatementBeliefs,
  serializeImplications,
  stepImplications,
} from '../folds.js';
import { BeliefStates } from '../types.js';
import { fetchStatementDocument, uniqueAddresses } from './documents.js';
import { filterByTrustedAttesters } from './implications.js';

const TOPIC_IN_CHUNK = 32;
const STATEMENT_SCAN_VERSION = 2;

export type StatementSetReadStatus = 'complete' | 'not-ready' | 'failed' | 'stale';

export interface StatementSetSupport {
  statementCid: IpfsCidV1;
  directSigners: number;
  indirectOnlySupporters: number;
  totalSupporters: number;
}

export interface StatementSetRead {
  status: StatementSetReadStatus;
  chainId: number | null;
  /**
   * Finalized block the counts are exact through when status is complete.
   * When status is stale, the block a previous complete scan reached.
   */
  asOfBlock: string | null;
  checkpoint: string | null;
  targets: StatementSetSupport[];
  /** Sources whose histories were required, after trusted-attester filtering. */
  sourceStatements: IpfsCidV1[];
  error?: string;
}

export interface StatementSetEvents {
  targets: readonly IpfsCidV1[];
  directSupport: readonly DecodedDirectSupportEvent[];
  implications: Array<DecodedImplicationAttestationEvent | DecodedImplicationRevokedEvent>;
  retractedSources?: ReadonlySet<IpfsCidV1>;
  trustedAttesters?: readonly string[];
}

export function statementSetSupportFromEvents(input: StatementSetEvents): StatementSetSupport[] {
  const targets = uniqueCids(input.targets);
  const targetSet = new Set<string>(targets);
  const implications = filterByTrustedAttesters(
    foldImplications(input.implications.filter(event => targetSet.has(event.toStatementCid))),
    input.trustedAttesters ? [...input.trustedAttesters] : undefined,
  ).filter(implication => !input.retractedSources?.has(implication.fromStatementCid));

  const sourcesByTarget = new Map<string, string[]>();
  for (const target of targets) sourcesByTarget.set(target, []);
  for (const implication of implications) {
    const sources = sourcesByTarget.get(implication.toStatementCid);
    if (!sources) continue;
    if (!sources.includes(implication.fromStatementCid)) sources.push(implication.fromStatementCid);
  }

  const needed = new Set<string>(targets);
  for (const sources of sourcesByTarget.values()) {
    for (const source of sources) needed.add(source);
  }
  const beliefsByStatement = new Map<string, ReturnType<typeof foldStatementBeliefs>>();
  for (const statementId of needed) {
    beliefsByStatement.set(
      statementId,
      foldStatementBeliefs(input.directSupport.filter(event => event.statementId === statementId)),
    );
  }

  return targets.map(statementCid => {
    const beliefs = beliefsByStatement.get(statementCid) ?? foldStatementBeliefs([]);
    const direct = idsForState(beliefs.beliefs, BeliefStates.BELIEVES);
    const disbelievers = idsForState(beliefs.beliefs, BeliefStates.DISBELIEVES);
    const indirectOnly = new Set<AnonymizedId>();
    for (const source of sourcesByTarget.get(statementCid) ?? []) {
      const sourceBeliefs = beliefsByStatement.get(source)?.beliefs;
      if (!sourceBeliefs) continue;
      for (const id of idsForState(sourceBeliefs, BeliefStates.BELIEVES)) {
        if (!direct.has(id) && !disbelievers.has(id)) indirectOnly.add(id);
      }
    }
    return {
      statementCid,
      directSigners: direct.size,
      indirectOnlySupporters: indirectOnly.size,
      totalSupporters: direct.size + indirectOnly.size,
    };
  });
}

export async function readStatementSet(
  machinery: SDKMachinery,
  statementCids: readonly IpfsCidV1[],
  trustedAttesters?: readonly string[],
): Promise<StatementSetRead> {
  const targets = uniqueCids(statementCids);
  const chainId = machinery.defaultChainId ?? null;
  const store = machinery.foldStore ?? defaultFoldStore;
  try {
    const sync = await fetchChainSync(machinery, chainId ?? undefined);
    const watermark = sync.chains.find(chain => chainId != null && chain.chainId === String(chainId));
    if (!sync.ready || watermark == null || watermark.finalizedCheckpoint === '') {
      return emptyRead('not-ready', chainId);
    }
    const asOfBlock = watermark.finalizedThrough;
    const checkpoint = watermark.finalizedCheckpoint;
    const upstreamId = sync.upstreamId;
    const head = { asOfBlock, checkpoint };
    const scope = scanScope(machinery, upstreamId);

    const implicationScans = await loadScans(store, targets.map(cid => implicationKey(scope, cid)));
    let pending: PendingScan[];
    let implicationEvents: Array<DecodedImplicationAttestationEvent | DecodedImplicationRevokedEvent>;
    let directSupport: DecodedDirectSupportEvent[];
    let sources: IpfsCidV1[];
    let retractedSources: Set<IpfsCidV1>;
    try {
      const implications = await advanceImplications(machinery, scope, targets, implicationScans, head);
      implicationEvents = implications.events;
      const accepted = filterByTrustedAttesters(
        foldImplications(implicationEvents.filter(event => targets.includes(event.toStatementCid as IpfsCidV1))),
        trustedAttesters ? [...trustedAttesters] : undefined,
      );
      // Accepted sources include statements that are also targets. Those belief
      // histories are already in `targets`, so only non-target sources are fetched again.
      sources = uniqueCids(accepted.map(implication => implication.fromStatementCid));
      const extraSources = sources.filter(source => !targets.includes(source));
      const beliefCids = [...targets, ...extraSources];
      const beliefScans = await loadScans(store, beliefCids.map(cid => beliefKey(scope, cid)));
      const beliefs = await advanceBeliefs(machinery, scope, beliefCids, beliefScans, head);
      directSupport = beliefs.events;
      retractedSources = await retractedSourceCids(machinery, sources, directSupport);
      pending = [
        ...implications.pending,
        ...beliefs.pending.map(record => ({
          ...record,
          accumulator: {
            ...record.accumulator,
            ...(sources.includes(record.statementCid)
              ? { retracted: retractedSources.has(record.statementCid) }
              : {}),
          },
        })),
      ];
    } catch (error) {
      const stale = await staleRead(machinery, scope, targets, chainId, trustedAttesters, error);
      if (stale) return stale;
      throw error;
    }
    await Promise.all(pending.map(record => store.put(record.key, {
      version: STATEMENT_SCAN_VERSION,
      cursor: null,
      accumulator: record.accumulator,
    }).catch(() => { /* Persistence is optional. */ })));
    return {
      status: 'complete',
      chainId,
      asOfBlock,
      checkpoint,
      targets: statementSetSupportFromEvents({
        targets,
        directSupport,
        implications: implicationEvents,
        retractedSources,
        trustedAttesters,
      }),
      sourceStatements: sources.filter(source => !retractedSources.has(source)),
    };
  } catch (error) {
    return {
      ...emptyRead('failed', chainId),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function emptyRead(status: 'not-ready' | 'failed', chainId: number | null): StatementSetRead {
  return {
    status,
    chainId,
    asOfBlock: null,
    checkpoint: null,
    targets: [],
    sourceStatements: [],
  };
}

type Head = { asOfBlock: string; checkpoint: string };

type ScanScope = { machinery: SDKMachinery; upstreamId: string };

type BeliefScan = Head & {
  beliefs: Array<{ user: string; beliefState: number; blockNumber: string; logIndex: number }>;
  /** Set after a completed read checked the statement document. */
  retracted?: boolean;
};

type ImplicationScan = Head & { edges: unknown };

function scanScope(machinery: SDKMachinery, upstreamId: string): ScanScope {
  return { machinery, upstreamId };
}

function beliefKey(scope: ScanScope, statementCid: string): string {
  return scanKey(scope, 'statement-belief', statementCid);
}

function implicationKey(scope: ScanScope, statementCid: string): string {
  return scanKey(scope, 'statement-implications', statementCid);
}

function scanKey(scope: ScanScope, id: string, statementCid: string): string {
  const addresses = scope.machinery.contractAddresses;
  return foldStoreKey({
    chainId: scope.machinery.defaultChainId ?? 'unknown',
    eventCacheUrl: scope.machinery.eventCacheUrl ?? '',
    contracts: [addresses?.beliefs ?? '', addresses?.implications ?? '', scope.upstreamId],
    id: `${id}:${statementCid}`,
    version: STATEMENT_SCAN_VERSION,
  });
}

function isHead(value: unknown): value is Head {
  if (value == null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.asOfBlock === 'string' && /^\d+$/.test(record.asOfBlock)
    && typeof record.checkpoint === 'string' && record.checkpoint !== '';
}

function asBeliefScan(raw: unknown): BeliefScan | null {
  if (!isHead(raw) || !Array.isArray((raw as BeliefScan).beliefs)) return null;
  return raw as BeliefScan;
}

function asImplicationScan(raw: unknown): ImplicationScan | null {
  if (!isHead(raw) || !('edges' in raw)) return null;
  return raw as ImplicationScan;
}

async function loadScans(store: FoldStore, keys: string[]): Promise<Array<StoredFold | null>> {
  return Promise.all(keys.map(key => store.get(key).catch(() => null)));
}

function resumeFrom(scan: Head | null, head: Head): { fromBlock: string | null; keep: boolean } {
  if (scan == null) return { fromBlock: null, keep: false };
  const scanned = BigInt(scan.asOfBlock);
  const next = BigInt(head.asOfBlock);
  if (scanned > next) return { fromBlock: null, keep: false };
  if (scan.checkpoint !== head.checkpoint && scanned === next) return { fromBlock: null, keep: false };
  if (scan.checkpoint === head.checkpoint && scanned === next) return { fromBlock: null, keep: true };
  return { fromBlock: (scanned + 1n).toString(), keep: true };
}

type PendingScan = {
  key: string;
  statementCid: IpfsCidV1;
  accumulator: BeliefScan | ImplicationScan;
};

async function advanceImplications(
  machinery: SDKMachinery,
  scope: ScanScope,
  targets: readonly IpfsCidV1[],
  stored: Array<StoredFold | null>,
  head: Head,
): Promise<{
  events: Array<DecodedImplicationAttestationEvent | DecodedImplicationRevokedEvent>;
  pending: PendingScan[];
}> {
  const scans = stored.map(record => record?.version === STATEMENT_SCAN_VERSION
    ? asImplicationScan(record.accumulator)
    : null);
  const eventsByTarget = new Map<string, Array<DecodedImplicationAttestationEvent | DecodedImplicationRevokedEvent>>();
  await fetchGrouped(machinery, targets, scans, head, {
    eventNames: ['ImplicationAttestation', 'ImplicationRevoked'],
    topic: 'topic3',
    contractAddress: machinery.contractAddresses?.implications,
    decode: decodeImplicationLifecycle,
  }, (cid, events) => {
    eventsByTarget.set(cid, events.filter(event => event.toStatementCid === cid));
  });
  const events: Array<DecodedImplicationAttestationEvent | DecodedImplicationRevokedEvent> = [];
  const pending: PendingScan[] = [];
  for (const [index, cid] of targets.entries()) {
    const previous = scans[index] != null && resumeFrom(scans[index], head).keep
      ? deserializeImplications(scans[index]!.edges)
      : emptyImplications();
    const next = stepImplications(previous, eventsByTarget.get(cid) ?? []);
    pending.push({
      key: implicationKey(scope, cid),
      statementCid: cid,
      accumulator: { ...head, edges: serializeImplications(next) },
    });
    for (const implication of next.values()) {
      events.push({
        attester: implication.attester as Address,
        fromStatementCid: implication.fromStatementCid,
        toStatementCid: implication.toStatementCid,
        explanationCid: implication.explanationCid,
        contractAddress: (machinery.contractAddresses?.implications ?? '0x') as Address,
        blockNumber: BigInt(implication.blockNumber),
        blockTimestamp: BigInt(implication.createdAt),
        transactionHash: '0x',
        logIndex: 0,
      });
    }
  }
  return { events, pending };
}

async function advanceBeliefs(
  machinery: SDKMachinery,
  scope: ScanScope,
  statementCids: readonly IpfsCidV1[],
  stored: Array<StoredFold | null>,
  head: Head,
): Promise<{ events: DecodedDirectSupportEvent[]; pending: PendingScan[] }> {
  const scans = stored.map(record => record?.version === STATEMENT_SCAN_VERSION
    ? asBeliefScan(record.accumulator)
    : null);
  const eventsByStatement = new Map<string, DecodedDirectSupportEvent[]>();
  await fetchGrouped(machinery, statementCids, scans, head, {
    eventNames: ['DirectSupport'],
    topic: 'topic2',
    contractAddress: machinery.contractAddresses?.beliefs,
    decode: event => {
      const decoded = decodeDirectSupportEvent(event);
      return decoded ? [decoded] : [];
    },
  }, (cid, events) => {
    eventsByStatement.set(cid, events.filter(event => event.statementId === cid));
  });
  const events: DecodedDirectSupportEvent[] = [];
  const pending: PendingScan[] = [];
  for (const [index, cid] of statementCids.entries()) {
    const latest = new Map<string, BeliefScan['beliefs'][number]>();
    const previous = scans[index] != null && resumeFrom(scans[index], head).keep ? scans[index]!.beliefs : [];
    for (const belief of previous) latest.set(belief.user.toLowerCase(), belief);
    for (const event of eventsByStatement.get(cid) ?? []) {
      const key = event.user.toLowerCase();
      const current = latest.get(key);
      if (current != null && !isLaterBelief(event, current)) continue;
      latest.set(key, {
        user: event.user,
        beliefState: event.beliefState,
        blockNumber: event.blockNumber.toString(),
        logIndex: event.logIndex,
      });
    }
    const beliefs = [...latest.values()];
    const previousRetracted = scans[index]?.retracted;
    pending.push({
      key: beliefKey(scope, cid),
      statementCid: cid,
      accumulator: {
        ...head,
        beliefs,
        ...(previousRetracted === undefined ? {} : { retracted: previousRetracted }),
      },
    });
    for (const belief of beliefs) {
      events.push({
        user: belief.user as Address,
        statementId: cid,
        beliefState: belief.beliefState,
        contractAddress: (machinery.contractAddresses?.beliefs ?? '0x') as Address,
        blockNumber: BigInt(belief.blockNumber),
        blockTimestamp: 0n,
        transactionHash: '0x',
        logIndex: belief.logIndex,
      });
    }
  }
  return { events, pending };
}

function isLaterBelief(
  event: { blockNumber: bigint; logIndex: number },
  current: { blockNumber: string; logIndex: number },
): boolean {
  if (event.blockNumber !== BigInt(current.blockNumber)) return event.blockNumber > BigInt(current.blockNumber);
  return event.logIndex > current.logIndex;
}

async function fetchGrouped<T>(
  machinery: SDKMachinery,
  statementCids: readonly IpfsCidV1[],
  scans: Array<Head | null>,
  head: Head,
  query: {
    eventNames: string[];
    topic: 'topic2' | 'topic3';
    contractAddress?: string;
    decode: (event: RawEventFromCache) => T[];
  },
  assign: (cid: string, events: T[]) => void,
): Promise<void> {
  const groups = new Map<string, IpfsCidV1[]>();
  statementCids.forEach((cid, index) => {
    const resume = resumeFrom(scans[index] ?? null, head);
    if (resume.fromBlock == null && resume.keep) return;
    const groupKey = resume.fromBlock ?? '0';
    const group = groups.get(groupKey) ?? [];
    group.push(cid);
    groups.set(groupKey, group);
  });
  const fetched = new Map<string, T[]>();
  for (const [fromBlock, cids] of groups) {
    const events = await fetchDecodedAtCheckpoint(machinery, {
      ...query,
      values: cids.map(cid => cidToBytes32(cid)),
      checkpoint: head.checkpoint,
      asOfBlock: head.asOfBlock,
      fromBlock: fromBlock === '0' ? undefined : fromBlock,
    });
    for (const cid of cids) assign(cid, events);
    for (const cid of cids) fetched.set(cid, events);
  }
  for (const cid of statementCids) {
    if (!fetched.has(cid)) assign(cid, []);
  }
}

async function staleRead(
  machinery: SDKMachinery,
  scope: ScanScope,
  targets: readonly IpfsCidV1[],
  chainId: number | null,
  trustedAttesters: readonly string[] | undefined,
  error: unknown,
): Promise<StatementSetRead | null> {
  const store = machinery.foldStore ?? defaultFoldStore;
  const implicationRecords = await loadScans(store, targets.map(cid => implicationKey(scope, cid)));
  const implicationScans = implicationRecords.map(record => record?.version === STATEMENT_SCAN_VERSION
    ? asImplicationScan(record.accumulator)
    : null);
  if (implicationScans.some(scan => scan == null)) return null;
  const complete = implicationScans as ImplicationScan[];
  const head = complete[0];
  if (head == null || complete.some(scan => scan.checkpoint !== head.checkpoint || scan.asOfBlock !== head.asOfBlock)) {
    return null;
  }
  const implications = complete.flatMap(scan => [...deserializeImplications(scan.edges).values()]);
  const sources = uniqueCids(implications.map(implication => implication.fromStatementCid));
  const extraSources = sources.filter(source => !targets.includes(source));
  const beliefIds = [...targets, ...extraSources];
  const beliefRecords = await loadScans(store, beliefIds.map(cid => beliefKey(scope, cid)));
  const beliefScans = beliefRecords.map(record => record?.version === STATEMENT_SCAN_VERSION
    ? asBeliefScan(record.accumulator)
    : null);
  if (beliefScans.some(scan => scan == null || scan.checkpoint !== head.checkpoint || scan.asOfBlock !== head.asOfBlock)) {
    return null;
  }
  const beliefScanByCid = new Map(beliefIds.map((cid, index) => [cid, beliefScans[index]]));
  const retractedSources = new Set<IpfsCidV1>();
  for (const cid of sources) {
    const retracted = beliefScanByCid.get(cid)?.retracted;
    if (retracted == null) return null;
    if (retracted) retractedSources.add(cid);
  }
  const directSupport = beliefIds.flatMap((cid, index) => (beliefScans[index]?.beliefs ?? []).map(belief => ({
    user: belief.user as Address,
    statementId: cid,
    beliefState: belief.beliefState,
    contractAddress: (machinery.contractAddresses?.beliefs ?? '0x') as Address,
    blockNumber: BigInt(belief.blockNumber),
    blockTimestamp: 0n,
    transactionHash: '0x',
    logIndex: belief.logIndex,
  } satisfies DecodedDirectSupportEvent)));
  const implicationEvents = implications.map(implication => ({
    attester: implication.attester as Address,
    fromStatementCid: implication.fromStatementCid,
    toStatementCid: implication.toStatementCid,
    explanationCid: implication.explanationCid,
    contractAddress: (machinery.contractAddresses?.implications ?? '0x') as Address,
    blockNumber: BigInt(implication.blockNumber),
    blockTimestamp: BigInt(implication.createdAt),
    transactionHash: '0x',
    logIndex: 0,
  } satisfies DecodedImplicationAttestationEvent));
  return {
    status: 'stale',
    chainId,
    asOfBlock: head.asOfBlock,
    checkpoint: head.checkpoint,
    targets: statementSetSupportFromEvents({
      targets,
      directSupport,
      implications: implicationEvents,
      retractedSources,
      trustedAttesters,
    }),
    sourceStatements: sources.filter(source => !retractedSources.has(source)),
    error: error instanceof Error ? error.message : String(error),
  };
}

function uniqueCids(cids: readonly IpfsCidV1[]): IpfsCidV1[] {
  const seen = new Set<string>();
  const unique: IpfsCidV1[] = [];
  for (const cid of cids) {
    if (seen.has(cid)) continue;
    seen.add(cid);
    unique.push(cid);
  }
  return unique;
}

function idsForState(beliefs: Map<string, number>, state: number): Set<AnonymizedId> {
  const ids = new Set<AnonymizedId>();
  for (const [user, belief] of beliefs) {
    if (belief === state) ids.add(computeAnonymizedId(user as Address));
  }
  return ids;
}

function decodeImplicationLifecycle(
  event: RawEventFromCache,
): Array<DecodedImplicationAttestationEvent | DecodedImplicationRevokedEvent> {
  const attestation = decodeImplicationAttestationEvent(event);
  if (attestation) return [attestation];
  const revoked = decodeImplicationRevokedEvent(event);
  return revoked ? [revoked] : [];
}

async function retractedSourceCids(
  machinery: SDKMachinery,
  sources: readonly IpfsCidV1[],
  directSupport: readonly DecodedDirectSupportEvent[],
): Promise<Set<IpfsCidV1>> {
  const retracted = new Set<IpfsCidV1>();
  await Promise.all(sources.map(async source => {
    const publishers = uniqueAddresses(
      directSupport.filter(event => event.statementId === source).map(event => event.user),
    );
    const document = await fetchStatementDocument(machinery, source, 5000, publishers);
    if (document.status === 'retracted') retracted.add(source);
  }));
  return retracted;
}

async function fetchDecodedAtCheckpoint<T>(
  machinery: SDKMachinery,
  options: {
    eventNames: string[];
    topic: 'topic2' | 'topic3';
    values: string[];
    contractAddress?: string;
    checkpoint: string;
    asOfBlock: string;
    fromBlock?: string;
    decode: (event: RawEventFromCache) => T[];
  },
): Promise<T[]> {
  if (options.values.length === 0) return [];
  const decoded: T[] = [];
  const asOf = BigInt(options.asOfBlock);
  for (const eventName of options.eventNames) {
    for (let i = 0; i < options.values.length; i += TOPIC_IN_CHUNK) {
      const topicIn = options.values.slice(i, i + TOPIC_IN_CHUNK).join(',');
      const params = {
        eventName,
        contractAddress: options.contractAddress,
        [`${options.topic}_in`]: topicIn,
        ...(options.fromBlock ? { blockNumber_gte: options.fromBlock } : {}),
      };
      let after: string | undefined;
      const seen = new Set<string>();
      for (;;) {
        const page = await fetchEventFeedPage(machinery, params, {
          checkpoint: options.checkpoint,
          after,
        });
        if (page.checkpoint !== options.checkpoint) {
          throw new Error(`Event feed checkpoint ${page.checkpoint ?? 'none'} did not match frozen ${options.checkpoint}`);
        }
        for (const event of page.items) {
          if (BigInt(event.blockNumber) > asOf) continue;
          decoded.push(...options.decode(event));
        }
        if (page.completeThroughCheckpoint && !page.truncated) break;
        if (!page.nextCursor || seen.has(page.nextCursor)) {
          throw new Error(`Incomplete event feed for ${eventName} at checkpoint ${options.checkpoint}`);
        }
        seen.add(page.nextCursor);
        after = page.nextCursor;
      }
    }
  }
  return decoded;
}
