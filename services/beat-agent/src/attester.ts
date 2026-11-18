import type { IpfsCidV1 } from '@commonality/sdk/utils';
import { getSubjectIdForContentCanonicalId } from './blockchain.js';
import type {
  BeatAgentEvaluateResponse,
  BeatAgentEvaluationContext,
  BeatAgentEvaluationLogEntry,
  BeatAgentEvaluationRequest,
  BeatAgentEvaluationResult,
  BeatAgentExistingAttestation,
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
  evaluationVersionId?: string;
}

export type BeatAgentContentSource =
  | { contentText: string; contentUrl?: undefined; contentCid?: undefined }
  | { contentText?: undefined; contentUrl: string; contentCid?: undefined }
  | { contentText?: undefined; contentUrl?: undefined; contentCid: IpfsCidV1 };

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
  findExistingAttestation?: (
    contentCanonicalId: string,
    statementCid: IpfsCidV1,
    scope?: import('./types.js').BeatAgentEvaluationScope,
  ) => Promise<BeatAgentExistingAttestation | null>;
  /** Called right before publishing a positive attestation to catch cross-instance races. */
  checkExistingBeforePublish?: (
    contentCanonicalId: string,
    statementCid: IpfsCidV1,
    scope?: import('./types.js').BeatAgentEvaluationScope,
  ) => Promise<BeatAgentExistingAttestation | null>;
  now?: () => Date;
}

export interface ProcessBeatAgentEvaluationResult extends BeatAgentEvaluateResponse {
  logEntry: BeatAgentEvaluationLogEntry;
}

export function validateBeatAgentEvaluationRequest(body: BeatAgentEvaluationRequest): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Expected an evaluation object';
  for (const key of ['contentCanonicalId', 'statementCid', 'contentText', 'contentUrl', 'contentCid', 'contentVersion', 'authorId', 'editableUntil', 'declaredPerspective'] as const) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || !body[key].trim())) return `Invalid ${key}: expected a non-empty string`;
  }
  for (const key of ['isReply', 'mediaIsPrimary'] as const) {
    if (body[key] !== undefined && typeof body[key] !== 'boolean') return `Invalid ${key}: expected a boolean`;
  }
  if (body.editableUntil && !Number.isFinite(Date.parse(body.editableUntil))) return 'Invalid editableUntil';
  if (body.quotedContent !== undefined && (!Array.isArray(body.quotedContent) || body.quotedContent.some((item) => !item || typeof item.text !== 'string'))) return 'Invalid quotedContent';
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
  const now = dependencies.now ?? (() => new Date());
  const scope = {
    evaluationVersionId: config.evaluationVersionId,
    contentVersion: request.contentVersion,
  };

  if (request.editableUntil && Date.parse(request.editableUntil) > now().getTime()) {
    const deferredResult: BeatAgentEvaluationResult = {
      decision: 'abstain',
      confidence: 'low',
      reasoning: 'The source edit window is still open.',
      abstainReason: 'edit_window_open',
    };
    return {
      alreadyAttested: false,
      deferred: true,
      ...deferredResult,
      evaluationVersionId: config.evaluationVersionId,
      contentVersion: request.contentVersion,
      subjectId,
      explanationCid: null,
      transactionHash: null,
      processingTime: 0,
      logEntry: {
        schemaVersion: 1,
        attesterType: 'beat-agent',
        beatId: config.beatId,
        attesterName: config.attesterName,
        contentCanonicalId: request.contentCanonicalId,
        statementCid: request.statementCid,
        ...deferredResult,
        evaluationVersionId: config.evaluationVersionId,
        contentVersion: request.contentVersion,
        localContextUsed: [],
        ambientContextUsed: [],
        timestamp: now().toISOString(),
        explanationCid: null,
        transactionHash: null,
        processingTime: 0,
      },
    };
  }

  if (request.isReply || request.mediaIsPrimary) {
    const skipped = shapeSkipResult(request);
    const timestamp = now().toISOString();
    const logEntry = buildEvaluationLogEntry({
      beatId: config.beatId,
      attesterName: config.attesterName,
      request,
      result: skipped,
      context: { localContextUsed: [], ambientContextUsed: [] },
      timestamp,
      evaluationVersionId: config.evaluationVersionId,
      explanationCid: null,
      transactionHash: null,
      processingTime: 0,
    });
    await dependencies.appendEvaluationLog?.(logEntry);
    return {
      alreadyAttested: false,
      ...skipped,
      evaluationVersionId: config.evaluationVersionId,
      contentVersion: request.contentVersion,
      subjectId,
      explanationCid: null,
      transactionHash: null,
      processingTime: 0,
      logEntry,
    };
  }

  const existing = await dependencies.findExistingAttestation?.(request.contentCanonicalId, request.statementCid, scope);
  if (existing && existing.abstainReason !== 'edit_window_open') {
    return {
      alreadyAttested: Boolean(existing.transactionHash),
      decision: existing.decision,
      confidence: existing.confidence,
      reasoning: existing.reasoning,
      abstainReason: existing.abstainReason,
      extensions: existing.extensions,
      scorerResults: existing.scorerResults,
      evaluationVersionId: existing.evaluationVersionId ?? config.evaluationVersionId,
      contentVersion: existing.contentVersion ?? request.contentVersion,
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
        extensions: existing.extensions,
        scorerResults: existing.scorerResults,
        evaluationVersionId: existing.evaluationVersionId ?? config.evaluationVersionId,
        contentVersion: existing.contentVersion ?? request.contentVersion,
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
  const content = await dependencies.resolveContent(request);
  const context = await dependencies.buildEvaluationContext(request, content);
  const result = await dependencies.evaluateContent({ request, content, context });
  const timestamp = now().toISOString();
  const shouldPublish = shouldPublishBeatAgentAttestation(result, config.minimumConfidence ?? 'medium');
  let explanationCid: IpfsCidV1 | null = null;
  let transactionHash: string | null = null;

  if (shouldPublish && dependencies.checkExistingBeforePublish) {
    const existingNow = await dependencies.checkExistingBeforePublish(request.contentCanonicalId, request.statementCid, scope);
    if (existingNow) {
      return {
        alreadyAttested: Boolean(existingNow.transactionHash),
        extensions: existingNow.extensions,
        scorerResults: existingNow.scorerResults,
        evaluationVersionId: existingNow.evaluationVersionId ?? config.evaluationVersionId,
        contentVersion: existingNow.contentVersion ?? request.contentVersion,
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
          extensions: existingNow.extensions,
          scorerResults: existingNow.scorerResults,
          evaluationVersionId: existingNow.evaluationVersionId ?? config.evaluationVersionId,
          contentVersion: existingNow.contentVersion ?? request.contentVersion,
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
      evaluationVersionId: config.evaluationVersionId,
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
    evaluationVersionId: config.evaluationVersionId,
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
    extensions: result.extensions,
    scorerResults: result.scorerResults,
    evaluationVersionId: config.evaluationVersionId,
    contentVersion: request.contentVersion,
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

function shapeSkipResult(request: BeatAgentEvaluationRequest): BeatAgentEvaluationResult {
  if (request.isReply) {
    return {
      decision: 'abstain',
      confidence: 'high',
      reasoning: 'Replies are not evaluated on their own.',
      abstainReason: 'reply',
    };
  }
  return {
    decision: 'abstain',
    confidence: 'high',
    reasoning: 'Posts whose point lives in media are not evaluated from text alone.',
    abstainReason: 'media_primary',
  };
}
