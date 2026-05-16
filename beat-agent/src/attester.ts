import type { IpfsCidV1 } from '@commonality/sdk';
import { getSubjectIdForContentCanonicalId } from './blockchain.js';
import type {
  BeatAgentAbstainReason,
  BeatAgentConfidence,
  BeatAgentDecision,
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

export interface BeatAgentExistingAttestation {
  decision: BeatAgentDecision;
  confidence: BeatAgentConfidence;
  reasoning: string;
  abstainReason?: BeatAgentAbstainReason;
  subjectId: string;
  explanationCid: IpfsCidV1 | null;
  transactionHash: string | null;
}

export interface ProcessBeatAgentEvaluationDependencies {
  resolveContent: (request: BeatAgentEvaluationRequest) => Promise<string>;
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
  findExistingAttestation?: (contentCanonicalId: string, statementCid: IpfsCidV1) => Promise<BeatAgentExistingAttestation | null>;
  /** Called right before publishing a positive attestation to catch cross-instance races. */
  checkExistingBeforePublish?: (contentCanonicalId: string, statementCid: IpfsCidV1) => Promise<BeatAgentExistingAttestation | null>;
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

  const subjectId = getSubjectIdForContentCanonicalId(request.contentCanonicalId);

  const existing = await dependencies.findExistingAttestation?.(request.contentCanonicalId, request.statementCid);
  if (existing) {
    return {
      alreadyAttested: true,
      decision: existing.decision,
      confidence: existing.confidence,
      reasoning: existing.reasoning,
      abstainReason: existing.abstainReason,
      subjectId,
      explanationCid: existing.explanationCid,
      transactionHash: existing.transactionHash,
      processingTime: 0,
      logEntry: {
        schemaVersion: 1,
        attesterType: 'beat-agent',
        beatId: config.beatId,
        attesterName: config.attesterName,
        contentCanonicalId: request.contentCanonicalId,
        statementCid: request.statementCid,
        decision: existing.decision,
        confidence: existing.confidence,
        reasoning: existing.reasoning,
        abstainReason: existing.abstainReason,
        localContextUsed: [],
        ambientContextUsed: [],
        timestamp: new Date().toISOString(),
        explanationCid: existing.explanationCid,
        transactionHash: existing.transactionHash,
        processingTime: 0,
      },
    };
  }

  const startTime = Date.now();
  const now = dependencies.now ?? (() => new Date());
  const content = await dependencies.resolveContent(request);
  const context = await dependencies.buildEvaluationContext(request, content);
  const result = await dependencies.evaluateContent({ request, content, context });
  const timestamp = now().toISOString();
  const shouldPublish = shouldPublishBeatAgentAttestation(result, config.minimumConfidence ?? 'medium');
  let explanationCid: IpfsCidV1 | null = null;
  let transactionHash: string | null = null;

  if (shouldPublish && dependencies.checkExistingBeforePublish) {
    const existingNow = await dependencies.checkExistingBeforePublish(request.contentCanonicalId, request.statementCid);
    if (existingNow) {
      return {
        alreadyAttested: true,
        decision: existingNow.decision,
        confidence: existingNow.confidence,
        reasoning: existingNow.reasoning,
        abstainReason: existingNow.abstainReason,
        subjectId,
        explanationCid: existingNow.explanationCid,
        transactionHash: existingNow.transactionHash,
        processingTime: Date.now() - startTime,
        logEntry: {
          schemaVersion: 1,
          attesterType: 'beat-agent',
          beatId: config.beatId,
          attesterName: config.attesterName,
          contentCanonicalId: request.contentCanonicalId,
          statementCid: request.statementCid,
          decision: existingNow.decision,
          confidence: existingNow.confidence,
          reasoning: existingNow.reasoning,
          abstainReason: existingNow.abstainReason,
          localContextUsed: [],
          ambientContextUsed: [],
          timestamp: new Date().toISOString(),
          explanationCid: existingNow.explanationCid,
          transactionHash: existingNow.transactionHash,
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

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

function buildEvaluationLogEntry(
  params: CreateBeatAgentEvaluationLogEntryParams,
): BeatAgentEvaluationLogEntry {
  return createBeatAgentEvaluationLogEntry(params);
}
