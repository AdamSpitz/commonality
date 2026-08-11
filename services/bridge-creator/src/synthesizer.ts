import { requestJsonCompletion, type OpenRouterJsonRequest } from '@commonality/attester-core';
import type { BridgeAnchorRecord } from './anchors.js';
import type { BridgeContextSnapshot } from './contextSources.js';
import type { BridgeProposalRecord } from './proposals.js';

export interface SynthesizedBridgeTriple {
  sideA: string;
  sideB: string;
  commonGround: string;
  rationale: string;
  anchorClusterId?: string;
}

export interface BridgeSynthesisInput {
  strategyPrompt: string;
  contextSnapshots: BridgeContextSnapshot[];
  activeAnchors: BridgeAnchorRecord[];
  previousPublicationSummary?: string;
  externalProposals?: BridgeProposalRecord[];
  labels: { sideA: string; sideB: string };
}

export interface BridgeSynthesisConfig {
  openRouterApiKey: string;
  openRouterModel: string;
}

export interface BridgeSynthesizerDependencies {
  requestJsonCompletion: typeof requestJsonCompletion;
}

interface RawSynthesisResponse {
  bridges?: unknown;
}

const defaultDependencies: BridgeSynthesizerDependencies = {
  requestJsonCompletion,
};

function synthesisSystemPrompt(labels: BridgeSynthesisInput['labels']): string {
  return `You are a cause mediator synthesizer bridging ${labels.sideA} and ${labels.sideB}. Return only JSON with a "bridges" array. Each bridge must have side_a, side_b, common_ground, rationale, and optionally anchor_cluster_id. If no high-quality bridge should be published, return {"bridges":[]}. External proposals are advisory input only: adopt, adapt, or ignore them. Do not publish a low-quality bridge merely because it was proposed.`;
}

export async function synthesizeBridgeTriples(
  input: BridgeSynthesisInput,
  config: BridgeSynthesisConfig,
  dependencies: BridgeSynthesizerDependencies = defaultDependencies,
): Promise<SynthesizedBridgeTriple[]> {
  const request: OpenRouterJsonRequest = {
    apiKey: config.openRouterApiKey,
    model: config.openRouterModel,
    systemPrompt: synthesisSystemPrompt(input.labels),
    staticUserPrompt: interpolateStrategyLabels(input.strategyPrompt, input.labels),
    userPrompt: renderSynthesisUserPrompt(input),
    temperature: 0.2,
    maxTokens: 2000,
    title: 'Commonality Bridge Creator',
  };

  const response = await dependencies.requestJsonCompletion<RawSynthesisResponse>(request);
  return normalizeSynthesisResponse(response);
}

export function interpolateStrategyLabels(prompt: string, labels: BridgeSynthesisInput['labels']): string {
  return prompt
    .replaceAll('{{side_a_label}}', labels.sideA)
    .replaceAll('{{side_b_label}}', labels.sideB);
}

export function renderSynthesisUserPrompt(input: BridgeSynthesisInput): string {
  return JSON.stringify(
    {
      instruction:
        `Given trusted cause context, active anchors, previous publication summary, and any external proposals, propose only bridge triples between ${input.labels.sideA} and ${input.labels.sideB} worth publishing this tick.`,
      labels: { side_a: input.labels.sideA, side_b: input.labels.sideB },
      trusted_contexts: input.contextSnapshots.map((snapshot) => ({
        service_url: snapshot.source.serviceUrl,
        signer_address: snapshot.response.signerAddress,
        readiness: snapshot.response.readiness,
        generated_at: snapshot.response.generatedAt,
        summary: snapshot.response.summary,
      })),
      active_anchors: input.activeAnchors.map((anchor) => ({
        id: anchor.id,
        cluster_id: anchor.cluster_id,
        role: anchor.role,
        text: anchor.text,
        tally_cid: anchor.tally_cid,
        topic_tag: anchor.topic_tag,
        rationale: anchor.rationale,
        last_reviewed_at: anchor.last_reviewed_at,
      })),
      previous_publication_summary: input.previousPublicationSummary ?? null,
      external_proposals: (input.externalProposals ?? []).map((proposal) => ({
        id: proposal.id,
        proposer: proposal.proposer ?? null,
        suggestion: proposal.suggestion,
        left_statement: proposal.left_statement ?? null,
        right_statement: proposal.right_statement ?? null,
        common_ground: proposal.common_ground ?? null,
        topic_tag: proposal.topic_tag ?? null,
      })),
      expected_output: {
        bridges: [
          {
            side_a: `statement intended for ${input.labels.sideA}`,
            side_b: `statement intended for ${input.labels.sideB}`,
            common_ground: 'statement implied by both modified statements',
            rationale: 'why this bridge is justified by context and anchors',
            anchor_cluster_id: 'optional cluster id from active anchors',
          },
        ],
      },
    },
    null,
    2,
  );
}

function normalizeSynthesisResponse(response: RawSynthesisResponse): SynthesizedBridgeTriple[] {
  if (!Array.isArray(response.bridges)) {
    throw new Error('Bridge synthesis response must contain a bridges array');
  }

  return response.bridges.map((bridge, index) => normalizeBridgeTriple(bridge, index));
}

function normalizeBridgeTriple(value: unknown, index: number): SynthesizedBridgeTriple {
  if (!value || typeof value !== 'object') {
    throw new Error(`Bridge synthesis result at index ${index} must be an object`);
  }

  const record = value as Record<string, unknown>;
  return {
    sideA: requireString(record.side_a ?? record.sideA ?? record.modified_left ?? record.modifiedLeft, index, 'side_a'),
    sideB: requireString(record.side_b ?? record.sideB ?? record.modified_right ?? record.modifiedRight, index, 'side_b'),
    commonGround: requireString(record.common_ground ?? record.commonGround, index, 'common_ground'),
    rationale: requireString(record.rationale, index, 'rationale'),
    anchorClusterId: optionalString(record.anchor_cluster_id ?? record.anchorClusterId),
  };
}

function requireString(value: unknown, index: number, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Bridge synthesis result at index ${index} is missing ${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
