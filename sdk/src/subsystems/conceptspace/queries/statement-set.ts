/**
 * Exact statement-set reads over the raw event feed.
 *
 * One finalized checkpoint covers every target. Incoming implications and
 * direct-support histories are fetched in topic batches, and a source statement
 * is fetched once even when several targets depend on it. This is not a
 * persisted browser fold; repeat visits still re-read through the frozen head.
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
  decodeDirectSupportEvent,
  decodeImplicationAttestationEvent,
  decodeImplicationRevokedEvent,
  type DecodedDirectSupportEvent,
  type DecodedImplicationAttestationEvent,
  type DecodedImplicationRevokedEvent,
} from '../../../utils/event-decoders/conceptspace.js';
import { computeAnonymizedId, type AnonymizedId } from '../../identity/unique-human-id.js';
import { foldImplications, foldStatementBeliefs } from '../folds.js';
import { BeliefStates } from '../types.js';
import { fetchStatementDocument, uniqueAddresses } from './documents.js';
import { filterByTrustedAttesters } from './implications.js';

const TOPIC_IN_CHUNK = 32;

export type StatementSetReadStatus = 'complete' | 'not-ready' | 'failed';

export interface StatementSetSupport {
  statementCid: IpfsCidV1;
  directSigners: number;
  indirectOnlySupporters: number;
  totalSupporters: number;
}

export interface StatementSetRead {
  status: StatementSetReadStatus;
  chainId: number | null;
  /** Finalized block the counts are exact through. Null unless status is complete. */
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
  try {
    const sync = await fetchChainSync(machinery, chainId ?? undefined);
    const watermark = sync.chains.find(chain => chainId != null && chain.chainId === String(chainId));
    if (!sync.ready || watermark == null || watermark.finalizedCheckpoint === '') {
      return emptyRead('not-ready', chainId);
    }
    const asOfBlock = watermark.finalizedThrough;
    const checkpoint = watermark.finalizedCheckpoint;

    const implicationEvents = await fetchDecodedAtCheckpoint(machinery, {
      eventNames: ['ImplicationAttestation', 'ImplicationRevoked'],
      topic: 'topic3',
      values: targets.map(cid => cidToBytes32(cid)),
      contractAddress: machinery.contractAddresses?.implications,
      checkpoint,
      asOfBlock,
      decode: decodeImplicationLifecycle,
    });
    const accepted = filterByTrustedAttesters(
      foldImplications(implicationEvents.filter(event => targets.includes(event.toStatementCid as IpfsCidV1))),
      trustedAttesters ? [...trustedAttesters] : undefined,
    );
    const sources = uniqueCids(accepted.map(implication => implication.fromStatementCid))
      .filter(source => !targets.includes(source));
    const beliefCids = [...targets, ...sources];
    const directSupport = await fetchDecodedAtCheckpoint(machinery, {
      eventNames: ['DirectSupport'],
      topic: 'topic2',
      values: beliefCids.map(cid => cidToBytes32(cid)),
      contractAddress: machinery.contractAddresses?.beliefs,
      checkpoint,
      asOfBlock,
      decode: event => {
        const decoded = decodeDirectSupportEvent(event);
        return decoded ? [decoded] : [];
      },
    });
    const retractedSources = await retractedSourceCids(machinery, sources, directSupport);
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
