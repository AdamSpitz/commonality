import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { requestJsonCompletion, type OpenRouterJsonRequest } from '@commonality/attester-core';
import { normalizeAnchorStoreFile, type BridgeAnchorRecord, type BridgeAnchorStoreFile } from './anchors.js';
import type { BridgeContextSnapshot } from './contextSources.js';

export interface AnchorReflectionInput {
  contextSnapshots: BridgeContextSnapshot[];
  currentAnchors: BridgeAnchorRecord[];
  previousPublicationSummary?: string;
  now?: Date;
}

export interface AnchorReflectionConfig {
  openRouterApiKey: string;
  openRouterModel: string;
}

export interface AnchorReflectionDependencies {
  requestJsonCompletion: typeof requestJsonCompletion;
}

export interface AnchorReflectionResult {
  proposals: BridgeAnchorRecord[];
}

interface RawAnchorReflectionResponse {
  proposals?: unknown;
}

const defaultDependencies: AnchorReflectionDependencies = {
  requestJsonCompletion,
};

const ANCHOR_REFLECTION_SYSTEM_PROMPT = `You are the Common Sense Majority bridge-creator anchor reflection reviewer. Return only JSON with a "proposals" array. Each proposal must be a full anchor record with id, cluster_id, role, text, tally_cid, topic_tag, rationale, status, created_at, and last_reviewed_at. Use status "proposed" for every record. Return {"proposals":[]} if no anchor changes are clearly warranted.`;

const ANCHOR_REFLECTION_STRATEGY_PROMPT = `Review the current bridge-creator anchors against the trusted CSM context. Propose new or reworded anchors only when they would materially improve coverage of live, popular-and-sane common-ground opportunities. Do not propose extreme factional positions as anchors. Keep each proposal inspectable: include a concise rationale citing the context or coverage gap. Human operators will review proposals before activation, so do not modify active anchors directly.`;

export async function reflectAnchorProposals(
  input: AnchorReflectionInput,
  config: AnchorReflectionConfig,
  dependencies: AnchorReflectionDependencies = defaultDependencies,
): Promise<BridgeAnchorRecord[]> {
  const request: OpenRouterJsonRequest = {
    apiKey: config.openRouterApiKey,
    model: config.openRouterModel,
    systemPrompt: ANCHOR_REFLECTION_SYSTEM_PROMPT,
    staticUserPrompt: ANCHOR_REFLECTION_STRATEGY_PROMPT,
    userPrompt: renderAnchorReflectionUserPrompt(input),
    temperature: 0.2,
    maxTokens: 2000,
    title: 'Commonality Bridge Anchor Reflection',
  };

  const response = await dependencies.requestJsonCompletion<RawAnchorReflectionResponse>(request);
  return normalizeAnchorReflectionResponse(response, input.now ?? new Date());
}

export async function appendAnchorReflectionProposals(
  storePath: string,
  input: Omit<AnchorReflectionInput, 'currentAnchors'>,
  config: AnchorReflectionConfig,
  dependencies: AnchorReflectionDependencies = defaultDependencies,
): Promise<AnchorReflectionResult> {
  const store = normalizeAnchorStoreFile(JSON.parse(readFileSync(storePath, 'utf8')) as unknown);
  const proposals = await reflectAnchorProposals(
    { ...input, currentAnchors: store.anchors },
    config,
    dependencies,
  );
  if (proposals.length === 0) return { proposals };

  const nextStore: BridgeAnchorStoreFile = { anchors: [...store.anchors, ...proposals] };
  normalizeAnchorStoreFile(nextStore);
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, `${JSON.stringify(nextStore, null, 2)}\n`);
  return { proposals };
}

export function renderAnchorReflectionUserPrompt(input: AnchorReflectionInput): string {
  return JSON.stringify(
    {
      instruction: 'Propose advisory-only anchor records with status proposed, or return no proposals.',
      trusted_contexts: input.contextSnapshots.map((snapshot) => ({
        service_url: snapshot.source.serviceUrl,
        signer_address: snapshot.response.signerAddress,
        readiness: snapshot.response.readiness,
        generated_at: snapshot.response.generatedAt,
        summary: snapshot.response.summary,
      })),
      current_anchors: input.currentAnchors,
      previous_publication_summary: input.previousPublicationSummary ?? null,
      expected_output: {
        proposals: [
          {
            id: 'topic-role-v1',
            cluster_id: 'topic-v1',
            role: 'common-ground',
            text: 'Natural-language anchor statement.',
            tally_cid: null,
            topic_tag: 'topic',
            rationale: 'Why this proposed anchor is warranted.',
            status: 'proposed',
            created_at: (input.now ?? new Date()).toISOString(),
            last_reviewed_at: (input.now ?? new Date()).toISOString(),
          },
        ],
      },
    },
    null,
    2,
  );
}

function normalizeAnchorReflectionResponse(response: RawAnchorReflectionResponse, now: Date): BridgeAnchorRecord[] {
  if (!Array.isArray(response.proposals)) {
    throw new Error('Anchor reflection response must contain a proposals array');
  }

  const timestamp = now.toISOString();
  const store = normalizeAnchorStoreFile({
    anchors: response.proposals.map((proposal) => ({
      ...(proposal && typeof proposal === 'object' ? proposal as Record<string, unknown> : {}),
      tally_cid: proposal && typeof proposal === 'object' && 'tally_cid' in proposal ? (proposal as Record<string, unknown>).tally_cid : null,
      status: 'proposed',
      created_at: proposal && typeof proposal === 'object' && typeof (proposal as Record<string, unknown>).created_at === 'string' ? (proposal as Record<string, unknown>).created_at : timestamp,
      last_reviewed_at: proposal && typeof proposal === 'object' && typeof (proposal as Record<string, unknown>).last_reviewed_at === 'string' ? (proposal as Record<string, unknown>).last_reviewed_at : timestamp,
    })),
  });

  return store.anchors;
}
