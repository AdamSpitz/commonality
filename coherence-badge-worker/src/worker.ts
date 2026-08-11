import type { Address, Hash } from 'viem';
import {
  attestCoherenceIfJudged,
  createCauseAssistMachinery,
  createLoadStatementText,
  parseRosterDocument,
  type AttestCoherenceResult,
  type CauseAssistConfig,
} from '@commonality/cause-assist';
import {
  createDefaultDocumentStore,
  type DisplayableDocument,
} from '@commonality/sdk/displayable-documents';
import { RESERVED_REF_NAMES } from '@commonality/sdk/mutable-refs';

export interface RefUpdatedLog {
  owner: Address;
  name: string;
  currentRefValue: string;
  transactionHash: Hash;
  blockNumber: bigint;
  logIndex: number;
}

export type ProcessResult =
  | { status: 'ignored'; reason: 'empty_ref' | 'reserved_name' | 'non_roster' }
  | { status: 'unavailable' }
  | { status: 'judged'; result: AttestCoherenceResult };

export interface WorkerDependencies {
  loadDocument(cid: string): Promise<DisplayableDocument | null>;
  attest(request: {
    rosterCid: string;
    title: string;
    summary: string;
    plankCids: string[];
    mediatorBlurb?: string;
  }): Promise<AttestCoherenceResult>;
  sleep(ms: number): Promise<void>;
}

export function createWorkerDependencies(config: CauseAssistConfig): WorkerDependencies {
  const machinery = createCauseAssistMachinery(config);
  const store = machinery ? createDefaultDocumentStore(machinery) : null;
  const loadStatementText = createLoadStatementText(machinery);
  return {
    async loadDocument(cid) {
      if (!store) return null;
      try {
        const read = await store.read(cid as never);
        return read.status === 'active' ? read.document : null;
      } catch {
        return null;
      }
    },
    attest: (request) => attestCoherenceIfJudged(request, config, { loadStatementText }),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

export async function processRefUpdated(
  log: RefUpdatedLog,
  dependencies: WorkerDependencies,
  retryCount = 3,
  retryDelayMs = 2_000,
): Promise<ProcessResult> {
  const rosterCid = log.currentRefValue.trim();
  if (!rosterCid) return { status: 'ignored', reason: 'empty_ref' };
  if (RESERVED_REF_NAMES.has(log.name)) return { status: 'ignored', reason: 'reserved_name' };

  // Retry both roster and plank resolution. Plank texts load inside attest/bind;
  // roster_unavailable means content lag, not a permanent ignore.
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const document = await dependencies.loadDocument(rosterCid);
    if (!document) {
      if (attempt < retryCount) await dependencies.sleep(retryDelayMs);
      continue;
    }

    const fields = parseRosterDocument(document);
    if (!fields) return { status: 'ignored', reason: 'non_roster' };

    const result = await dependencies.attest({
      rosterCid,
      title: fields.title,
      summary: fields.summary,
      plankCids: fields.plankCids,
      mediatorBlurb: fields.mediatorBlurb,
    });

    if (result.reason === 'roster_unavailable') {
      if (attempt < retryCount) await dependencies.sleep(retryDelayMs);
      continue;
    }

    return { status: 'judged', result };
  }

  return { status: 'unavailable' };
}
