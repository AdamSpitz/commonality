import { postJsonInBatches } from '@commonality/finder-core';
import type { IpfsCidV1 } from '@commonality/sdk';

export interface ContentAttesterRequest {
  contentCanonicalId: string;
  statementCid: IpfsCidV1;
  contentUrl?: string;
  contentText?: string;
  declaredPerspective?: string;
}

interface ContentBatchEvaluationResult {
  contentCanonicalId: string;
  statementCid: IpfsCidV1;
  success: boolean;
  decision?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
  transactionHash?: string | null;
  error?: string;
  processingTime: number;
}

interface ContentBatchEvaluationResponse {
  results: ContentBatchEvaluationResult[];
}

const MAX_BATCH_SIZE = 10;

export async function evaluateContentBatch(
  evaluations: ContentAttesterRequest[],
  attesterUrl: string,
  finderKey: string,
): Promise<ContentBatchEvaluationResult[]> {
  return postJsonInBatches({
    items: evaluations,
    maxBatchSize: MAX_BATCH_SIZE,
    endpointUrl: `${attesterUrl}/evaluate-content-batch`,
    headers: {
      'X-Finder-Key': finderKey,
    },
    buildBody: (batch: ContentAttesterRequest[]) => ({ evaluations: batch }),
    parseResults: (json: unknown) => (json as ContentBatchEvaluationResponse).results,
    buildErrorResults: (batch: ContentAttesterRequest[], errorMessage: string) => batch.map((evaluation) => ({
      contentCanonicalId: evaluation.contentCanonicalId,
      statementCid: evaluation.statementCid,
      success: false,
      error: errorMessage,
      processingTime: 0,
    })),
  });
}
