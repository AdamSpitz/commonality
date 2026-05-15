import type { IpfsCidV1 } from '@commonality/sdk';
import { getSubjectIdForContentCanonicalId } from './blockchain.js';
import type {
  BeatAgentEvaluateResponse,
  BeatAgentEvaluationContext,
  BeatAgentEvaluationLogEntry,
  BeatAgentEvaluationRequest,
  BeatAgentEvaluationResult,
  CreateBeatAgentEvaluationLogEntryParams,
} from './types.js';
import {
  createBeatAgentEvaluationLogEntry,
  createBeatAgentExplanationDocument,
  shouldPublishBeatAgentAttestation,
} from './types.js';

export interface BeatAgentAttesterModeConfig {
  beatId: string;
  attesterName: string;
  alignmentTopicStatementCid: IpfsCidV1;
  minimumConfidence?: 'high' | 'medium' | 'low';
}

export type BeatAgentContentSource =
  | { contentText: string; contentUrl?: undefined; contentCid?: undefined }
  | { contentText?: undefined; contentUrl: string; contentCid?: undefined }
  | { contentText?: undefined; contentUrl?: undefined; contentCid: IpfsCidV1 };

export interface ProcessBeatAgentEvaluationDependencies {
  resolveContent: (source: BeatAgentContentSource) => Promise<string>;
  buildEvaluationContext: (request: BeatAgentEvaluationRequest, content: string) => Promise<BeatAgentEvaluationContext>;
  evaluateContent: (params: {
    request: BeatAgentEvaluationRequest;
    content: string;
    context: BeatAgentEvaluationContext;
  }) => Promise<BeatAgentEvaluationResult>;
  uploadExplanation: (content: string) => Promise<{ cid: string }>;
  publishAttestation: (
    contentCanonicalId: string,
    statementCid: IpfsCidV1,
    topicStatementCid: IpfsCidV1,
  ) => Promise<string>;
  appendEvaluationLog?: (entry: BeatAgentEvaluationLogEntry) => Promise<void>;
  now?: () => Date;
}

export interface ProcessBeatAgentEvaluationResult extends BeatAgentEvaluateResponse {
  logEntry: BeatAgentEvaluationLogEntry;
}

export function validateBeatAgentEvaluationRequest(body: BeatAgentEvaluationRequest): string | null {
  const sourceCount = [body.contentText, body.contentUrl, body.contentCid].filter(Boolean).length;

  if (!body.contentCanonicalId || !body.statementCid) {
    return 'Missing required fields: contentCanonicalId, statementCid';
  }

  if (sourceCount !== 1) {
    return 'Provide exactly one of contentText, contentUrl, or contentCid';
  }

  return null;
}

export async function processBeatAgentEvaluation(
  config: BeatAgentAttesterModeConfig,
  request: BeatAgentEvaluationRequest,
  dependencies: ProcessBeatAgentEvaluationDependencies,
): Promise<ProcessBeatAgentEvaluationResult> {
  const validationError = validateBeatAgentEvaluationRequest(request);
  if (validationError) {
    throw new Error(validationError);
  }

  const startTime = Date.now();
  const now = dependencies.now ?? (() => new Date());
  const subjectId = getSubjectIdForContentCanonicalId(request.contentCanonicalId);
  const content = await dependencies.resolveContent(toContentSource(request));
  const context = await dependencies.buildEvaluationContext(request, content);
  const result = await dependencies.evaluateContent({ request, content, context });
  const timestamp = now().toISOString();
  const shouldPublish = shouldPublishBeatAgentAttestation(result, config.minimumConfidence ?? 'medium');
  let explanationCid: IpfsCidV1 | null = null;
  let transactionHash: string | null = null;

  if (shouldPublish) {
    const explanation = createBeatAgentExplanationDocument({
      beatId: config.beatId,
      attesterName: config.attesterName,
      request,
      result,
      context,
      timestamp,
    });
    const uploadResult = await dependencies.uploadExplanation(JSON.stringify(explanation));
    explanationCid = uploadResult.cid as IpfsCidV1;
    transactionHash = await dependencies.publishAttestation(
      request.contentCanonicalId,
      request.statementCid,
      config.alignmentTopicStatementCid,
    );
  }

  const processingTime = Date.now() - startTime;
  const logEntry = buildEvaluationLogEntry({
    beatId: config.beatId,
    attesterName: config.attesterName,
    request,
    result,
    context,
    timestamp,
    explanationCid,
    transactionHash,
    processingTime,
  });
  await dependencies.appendEvaluationLog?.(logEntry);

  return {
    alreadyAttested: false,
    decision: result.decision,
    confidence: result.confidence,
    reasoning: result.reasoning,
    abstainReason: result.abstainReason,
    subjectId,
    explanationCid,
    transactionHash,
    processingTime,
    logEntry,
  };
}

function toContentSource(request: BeatAgentEvaluationRequest): BeatAgentContentSource {
  if (request.contentText) {
    return { contentText: request.contentText };
  }
  if (request.contentUrl) {
    return { contentUrl: request.contentUrl };
  }
  if (request.contentCid) {
    return { contentCid: request.contentCid };
  }
  throw new Error('Missing content source');
}

function buildEvaluationLogEntry(
  params: CreateBeatAgentEvaluationLogEntryParams,
): BeatAgentEvaluationLogEntry {
  return createBeatAgentEvaluationLogEntry(params);
}
