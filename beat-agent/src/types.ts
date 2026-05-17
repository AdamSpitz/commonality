import type { IpfsCidV1 } from '@commonality/sdk';

export type BeatAgentDecision = 'positive' | 'negative' | 'abstain';
export type BeatAgentConfidence = 'high' | 'medium' | 'low';

export type BeatAgentAbstainReason =
  | 'outside_beat'
  | 'insufficient_local_context'
  | 'insufficient_ambient_context'
  | 'unsupported_platform'
  | 'other';

export interface BeatAgentEvaluationRequest {
  contentCanonicalId: string;
  statementCid: IpfsCidV1;
  contentText?: string;
  contentUrl?: string;
  contentCid?: IpfsCidV1;
  declaredPerspective?: string;
}

export interface BeatAgentEvaluationResult {
  decision: BeatAgentDecision;
  confidence: BeatAgentConfidence;
  reasoning: string;
  abstainReason?: BeatAgentAbstainReason;
}

export interface BeatAgentEvaluationContext {
  localContextUsed: BeatAgentLocalContextCitation[];
  ambientContextUsed: BeatAgentAmbientContextCitation[];
}

export interface BeatAgentLocalContextCitation {
  type: 'parent_post' | 'thread' | 'quote' | 'reply' | 'author_recent_post' | 'linked_content';
  contentCanonicalId: string;
  summary: string;
}

export interface BeatAgentAmbientContextCitation {
  observation: string;
  observedAt: string;
  confidence: BeatAgentConfidence;
  supportingExamples: string[];
  sourceAuthorCount?: number;
  timeSpanHours?: number;
  diversityScore?: number;
}

export interface BeatAgentExplanationDocument {
  attesterType: 'beat-agent';
  beatId: string;
  attesterName: string;
  contentCanonicalId: string;
  statementCid: IpfsCidV1;
  decision: BeatAgentDecision;
  confidence: BeatAgentConfidence;
  reasoning: string;
  abstainReason?: BeatAgentAbstainReason;
  localContextUsed: BeatAgentLocalContextCitation[];
  ambientContextUsed: BeatAgentAmbientContextCitation[];
  timestamp: string;
}

export interface BeatAgentEvaluateResponse extends BeatAgentEvaluationResult {
  /** True only when this response reflects a previously published positive attestation. */
  alreadyAttested: boolean;
  /** True when this request reused an in-flight evaluation from another concurrent request. */
  deduplicated?: boolean;
  subjectId: string;
  explanationCid: IpfsCidV1 | null;
  transactionHash: string | null;
  processingTime: number;
}

export interface CreateBeatAgentExplanationDocumentParams {
  beatId: string;
  attesterName: string;
  request: Pick<BeatAgentEvaluationRequest, 'contentCanonicalId' | 'statementCid'>;
  result: BeatAgentEvaluationResult;
  context: BeatAgentEvaluationContext;
  timestamp: string;
}

export interface BeatAgentEvaluationLogEntry extends BeatAgentExplanationDocument {
  schemaVersion: 1;
  explanationCid: IpfsCidV1 | null;
  transactionHash: string | null;
  processingTime: number;
}

export interface CreateBeatAgentEvaluationLogEntryParams extends CreateBeatAgentExplanationDocumentParams {
  explanationCid: IpfsCidV1 | null;
  transactionHash: string | null;
  processingTime: number;
}

const confidenceRank: Record<BeatAgentConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function shouldPublishBeatAgentAttestation(
  result: BeatAgentEvaluationResult,
  minimumConfidence: BeatAgentConfidence = 'medium',
): boolean {
  return (
    result.decision === 'positive' &&
    confidenceRank[result.confidence] >= confidenceRank[minimumConfidence]
  );
}

export function createBeatAgentExplanationDocument(
  params: CreateBeatAgentExplanationDocumentParams,
): BeatAgentExplanationDocument {
  const validationError = validateBeatAgentEvaluationResult(params.result);
  if (validationError) {
    throw new Error(validationError);
  }

  return {
    attesterType: 'beat-agent',
    beatId: params.beatId,
    attesterName: params.attesterName,
    contentCanonicalId: params.request.contentCanonicalId,
    statementCid: params.request.statementCid,
    decision: params.result.decision,
    confidence: params.result.confidence,
    reasoning: params.result.reasoning,
    abstainReason: params.result.abstainReason,
    localContextUsed: params.context.localContextUsed,
    ambientContextUsed: params.context.ambientContextUsed,
    timestamp: params.timestamp,
  };
}

export function createBeatAgentEvaluationLogEntry(
  params: CreateBeatAgentEvaluationLogEntryParams,
): BeatAgentEvaluationLogEntry {
  return {
    schemaVersion: 1,
    ...createBeatAgentExplanationDocument(params),
    explanationCid: params.explanationCid,
    transactionHash: params.transactionHash,
    processingTime: params.processingTime,
  };
}

export function validateBeatAgentEvaluationResult(
  result: BeatAgentEvaluationResult,
): string | null {
  if (result.decision === 'abstain' && !result.abstainReason) {
    return 'abstainReason is required when decision is abstain';
  }

  if (result.decision !== 'abstain' && result.abstainReason) {
    return 'abstainReason is only valid when decision is abstain';
  }

  if (!result.reasoning.trim()) {
    return 'reasoning is required';
  }

  return null;
}
