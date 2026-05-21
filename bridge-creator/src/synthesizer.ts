import { requestJsonCompletion, type OpenRouterJsonRequest } from '@commonality/attester-core';
import type { BridgeAnchorRecord } from './anchors.js';
import type { BridgeContextSnapshot } from './contextSources.js';

export interface SynthesizedBridgeTriple {
  modifiedLeft: string;
  modifiedRight: string;
  commonGround: string;
  rationale: string;
  anchorClusterId?: string;
}

export interface BridgeSynthesisInput {
  strategyPrompt: string;
  contextSnapshots: BridgeContextSnapshot[];
  activeAnchors: BridgeAnchorRecord[];
  previousPublicationSummary?: string;
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

const SYNTHESIS_SYSTEM_PROMPT = `You are the Common Sense Majority bridge-creator synthesizer. Return only JSON with a "bridges" array. Each bridge must have modified_left, modified_right, common_ground, rationale, and optionally anchor_cluster_id. If no high-quality bridge should be published, return {"bridges":[]}.`;

export async function synthesizeBridgeTriples(
  input: BridgeSynthesisInput,
  config: BridgeSynthesisConfig,
  dependencies: BridgeSynthesizerDependencies = defaultDependencies,
): Promise<SynthesizedBridgeTriple[]> {
  const request: OpenRouterJsonRequest = {
    apiKey: config.openRouterApiKey,
    model: config.openRouterModel,
    systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
    staticUserPrompt: input.strategyPrompt,
    userPrompt: renderSynthesisUserPrompt(input),
    temperature: 0.2,
    maxTokens: 2000,
    title: 'Commonality Bridge Creator',
  };

  const response = await dependencies.requestJsonCompletion<RawSynthesisResponse>(request);
  return normalizeSynthesisResponse(response);
}

export function renderSynthesisUserPrompt(input: BridgeSynthesisInput): string {
  return JSON.stringify(
    {
      instruction:
        'Given the trusted CSM context, active anchors, and previous publication summary, propose only bridge triples worth publishing this tick.',
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
      expected_output: {
        bridges: [
          {
            modified_left: 'statement intended for moderate-left signers',
            modified_right: 'statement intended for moderate-right signers',
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
    modifiedLeft: requireString(record.modified_left ?? record.modifiedLeft, index, 'modified_left'),
    modifiedRight: requireString(record.modified_right ?? record.modifiedRight, index, 'modified_right'),
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
