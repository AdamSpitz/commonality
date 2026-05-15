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
  alreadyAttested: boolean;
  subjectId: string;
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
