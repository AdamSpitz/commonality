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
  const allResults: BatchEvaluationResult[] = [];

  for (let i = 0; i < pairs.length; i += MAX_BATCH_SIZE) {
    const batch = pairs.slice(i, i + MAX_BATCH_SIZE);
    const evaluations = batch.map(p => ({
      fromStatementCid: p.fromCid,
      toStatementCid: p.toCid,
    }));

    const response = await fetch(`${attesterUrl}/evaluate-implications-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Finder-Key': finderKey,
      },
      body: JSON.stringify({ evaluations }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Attester returned ${response.status}: ${body}`);
      // Mark all pairs in this batch as failed
      for (const p of batch) {
        allResults.push({
          fromStatementCid: p.fromCid,
          toStatementCid: p.toCid,
          success: false,
          error: `HTTP ${response.status}: ${body}`,
          processingTime: 0,
        });
      }
      continue;
    }

    const data = (await response.json()) as BatchEvaluationResponse;
    allResults.push(...data.results);
  }

  return allResults;
}
