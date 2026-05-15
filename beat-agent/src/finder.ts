import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { IpfsCidV1 } from '@commonality/sdk';
import type { BeatAgentEvaluateResponse, BeatAgentEvaluationRequest } from './types.js';
import { loadBeatIngestionState, type BeatIngestedItem } from './ingestion.js';

export type BeatFinderProcessedStatus = 'submitted' | 'not_promising' | 'failed';

export interface BeatFinderState {
  schemaVersion: 1;
  processedItems: Record<string, BeatFinderProcessedItem>;
}

export interface BeatFinderProcessedItem {
  processedAt: string;
  status: BeatFinderProcessedStatus;
  retries?: number;
  lastError?: string;
  attesterEndpoint?: string;
  decision?: BeatAgentEvaluateResponse['decision'];
  confidence?: BeatAgentEvaluateResponse['confidence'];
  transactionHash?: string | null;
  explanationCid?: IpfsCidV1 | null;
  reason?: string;
}

export interface BeatFinderCandidate {
  item: BeatIngestedItem;
  request: BeatAgentEvaluationRequest;
  reason: string;
}

export interface BeatFinderCandidateSelectorParams {
  item: BeatIngestedItem;
  targetStatementCid: IpfsCidV1;
}

export type BeatFinderCandidateSelector = (
  params: BeatFinderCandidateSelectorParams,
) => Promise<BeatFinderCandidate | null> | BeatFinderCandidate | null;

export interface RunBeatFinderOnceParams {
  ingestionStateFilePath: string;
  finderStateFilePath: string;
  targetStatementCid: IpfsCidV1;
  attesterEndpoint: string;
  selectCandidate?: BeatFinderCandidateSelector;
  trustedFinderKey?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  now?: Date;
}

export interface BeatFinderRunSummary {
  scannedItemCount: number;
  skippedAlreadyProcessedCount: number;
  notPromisingCount: number;
  submittedCount: number;
  failedCandidateIds: string[];
}

const emptyState: BeatFinderState = {
  schemaVersion: 1,
  processedItems: {},
};

export async function loadBeatFinderState(filePath: string): Promise<BeatFinderState> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BeatFinderState>;
    return {
      schemaVersion: 1,
      processedItems: parsed.processedItems ?? {},
    };
  } catch {
    return { ...emptyState, processedItems: {} };
  }
}

export async function saveBeatFinderState(filePath: string, state: BeatFinderState): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

export async function runBeatFinderOnce(params: RunBeatFinderOnceParams): Promise<BeatFinderRunSummary> {
  const ingestionState = await loadBeatIngestionState(params.ingestionStateFilePath);
  const finderState = await loadBeatFinderState(params.finderStateFilePath);
  const nowIso = (params.now ?? new Date()).toISOString();
  const fetchImpl = params.fetchImpl ?? fetch;
  const selectCandidate = params.selectCandidate ?? defaultBeatFinderCandidateSelector;
  const summary: BeatFinderRunSummary = {
    scannedItemCount: 0,
    skippedAlreadyProcessedCount: 0,
    notPromisingCount: 0,
    submittedCount: 0,
    failedCandidateIds: [],
  };

  for (const item of ingestionState.items) {
    summary.scannedItemCount += 1;

    const prev = finderState.processedItems[item.contentCanonicalId];
    if (prev && prev.status !== 'failed') {
      summary.skippedAlreadyProcessedCount += 1;
      continue;
    }

    if (prev && prev.status === 'failed') {
      const maxRetries = params.maxRetries ?? 3;
      if ((prev.retries ?? 0) >= maxRetries) {
        summary.skippedAlreadyProcessedCount += 1;
        continue;
      }
    }

    const candidate = await selectCandidate({ item, targetStatementCid: params.targetStatementCid });
    if (!candidate) {
      finderState.processedItems[item.contentCanonicalId] = {
        processedAt: nowIso,
        status: 'not_promising',
        reason: 'candidate selector returned null',
      };
      summary.notPromisingCount += 1;
      continue;
    }

    try {
      const response = await submitBeatFinderCandidate({
        attesterEndpoint: params.attesterEndpoint,
        candidate,
        trustedFinderKey: params.trustedFinderKey,
        fetchImpl,
      });
      finderState.processedItems[item.contentCanonicalId] = {
        processedAt: nowIso,
        status: 'submitted',
        attesterEndpoint: params.attesterEndpoint,
        decision: response.decision,
        confidence: response.confidence,
        transactionHash: response.transactionHash,
        explanationCid: response.explanationCid,
        reason: candidate.reason,
      };
      summary.submittedCount += 1;
    } catch (error) {
      finderState.processedItems[item.contentCanonicalId] = {
        processedAt: nowIso,
        status: 'failed',
        retries: (prev?.retries ?? 0) + 1,
        lastError: error instanceof Error ? error.message : String(error),
        reason: candidate.reason,
      };
      summary.failedCandidateIds.push(item.contentCanonicalId);
    }
  }

  await saveBeatFinderState(params.finderStateFilePath, finderState);
  return summary;
}

export function defaultBeatFinderCandidateSelector(
  params: BeatFinderCandidateSelectorParams,
): BeatFinderCandidate | null {
  const text = params.item.text.trim();
  if (!text) return null;

  return {
    item: params.item,
    reason: 'non-empty ingested beat item',
    request: {
      contentCanonicalId: params.item.contentCanonicalId,
      statementCid: params.targetStatementCid,
      contentText: text,
    },
  };
}

async function submitBeatFinderCandidate(params: {
  attesterEndpoint: string;
  candidate: BeatFinderCandidate;
  trustedFinderKey?: string;
  fetchImpl: typeof fetch;
}): Promise<BeatAgentEvaluateResponse> {
  const response = await params.fetchImpl(params.attesterEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(params.trustedFinderKey ? { 'x-finder-key': params.trustedFinderKey } : {}),
    },
    body: JSON.stringify(params.candidate.request),
  });

  if (!response.ok) {
    throw new Error(`Beat finder candidate submission failed with HTTP ${response.status}`);
  }

  return await response.json() as BeatAgentEvaluateResponse;
}
