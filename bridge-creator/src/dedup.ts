import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { BridgeAnchorRecord } from './anchors.js';
import type { BridgeContextSnapshot } from './contextSources.js';
import type { BridgeProposalRecord } from './proposals.js';
import type { SynthesizedBridgeTriple } from './synthesizer.js';

export interface BridgePublicationDedupState {
  lastInputHash?: string;
  lastPublicationSummary?: string;
}

export function loadBridgePublicationDedupState(filePath: string): BridgePublicationDedupState {
  if (!existsSync(filePath)) return {};
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Bridge publication dedup state must be an object');
  }
  const record = parsed as Record<string, unknown>;
  return {
    lastInputHash: optionalString(record.lastInputHash, 'lastInputHash'),
    lastPublicationSummary: optionalString(record.lastPublicationSummary, 'lastPublicationSummary'),
  };
}

export function saveBridgePublicationDedupState(filePath: string, state: BridgePublicationDedupState): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
}

export function computeBridgePublicationInputHash(input: {
  contextSnapshots: BridgeContextSnapshot[];
  activeAnchors: BridgeAnchorRecord[];
  pendingProposals?: BridgeProposalRecord[];
}): string {
  return hashStableJson({
    upstream_context_summary_hash: hashStableJson(input.contextSnapshots.map((snapshot) => ({
      service_url: snapshot.source.serviceUrl,
      signer_address: snapshot.response.signerAddress ?? null,
      generated_at: snapshot.response.generatedAt ?? null,
      readiness: snapshot.response.readiness,
      summary: snapshot.response.summary,
    }))),
    pending_proposal_ids: (input.pendingProposals ?? []).map((proposal) => proposal.id),
    anchor_cluster_version: input.activeAnchors.map((anchor) => ({
      id: anchor.id,
      cluster_id: anchor.cluster_id,
      role: anchor.role,
      text: anchor.text,
      tally_cid: anchor.tally_cid,
      topic_tag: anchor.topic_tag,
      rationale: anchor.rationale,
      status: anchor.status,
      last_reviewed_at: anchor.last_reviewed_at,
    })),
  });
}

export function summarizePublishedBridgeTriples(triples: SynthesizedBridgeTriple[]): string {
  return triples
    .map((triple, index) => {
      const cluster = triple.anchorClusterId ? ` [${triple.anchorClusterId}]` : '';
      return `${index + 1}.${cluster} left="${triple.modifiedLeft}" right="${triple.modifiedRight}" common="${triple.commonGround}" rationale="${triple.rationale}"`;
    })
    .join('\n');
}

function hashStableJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`Bridge publication dedup state field must be a string: ${field}`);
  }
  return value;
}
