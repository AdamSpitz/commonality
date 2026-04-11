import { postJsonInBatches } from '@commonality/finder-core';
import type { CandidatePair } from './candidates.js';

interface BatchEvaluationResult {
  fromStatementCid: string;
  toStatementCid: string;
  success: boolean;
  decision?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  explanation?: string;
  explanationCid?: string | null;
  transactionHash?: string | null;
  error?: string;
  processingTime: number;
}

interface BatchEvaluationResponse {
  total: number;
  successful: number;
  failed: number;
  results: BatchEvaluationResult[];
  totalProcessingTime: number;
}

const MAX_BATCH_SIZE = 10;

/**
 * Send candidate pairs to the attester's batch endpoint.
 * Splits into batches of 10 (the attester's max) and runs them sequentially.
 */
export async function evaluatePairs(
  pairs: CandidatePair[],
  attesterUrl: string,
  finderKey: string,
): Promise<BatchEvaluationResult[]> {
  return postJsonInBatches({
    items: pairs,
    maxBatchSize: MAX_BATCH_SIZE,
    endpointUrl: `${attesterUrl}/evaluate-implications-batch`,
    headers: {
      'X-Finder-Key': finderKey,
    },
    buildBody: (batch: CandidatePair[]) => ({
      evaluations: batch.map((pair) => ({
        fromStatementCid: pair.fromCid,
        toStatementCid: pair.toCid,
      })),
    }),
    parseResults: (json: unknown) => (json as BatchEvaluationResponse).results,
    buildErrorResults: (batch: CandidatePair[], errorMessage: string) => batch.map((pair) => ({
      fromStatementCid: pair.fromCid,
      toStatementCid: pair.toCid,
      success: false,
      error: errorMessage,
      processingTime: 0,
    })),
  });
}
