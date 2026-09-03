import { readFileSync, writeFileSync } from 'node:fs';
import { normalizeAnchorStoreFile, type BridgeAnchorRecord } from './anchors.js';
import { parseTrustedContextSources, type TrustedContextSourceConfig } from './contextSources.js';
import type { ParentCauseRef } from './clusterFromTick.js';

/** Provisional for one revision, pending the first live founder rehearsal. */
export const MEDIATOR_CONFIG_SCHEMA_VERSION = 'provisional-v1' as const;

export interface MediatorConfigArtifact {
  schema_version: typeof MEDIATOR_CONFIG_SCHEMA_VERSION;
  provisional: true;
  name: string;
  description: string;
  founding_statement: string;
  labels: { side_a: string; side_b: string };
  strategy_prompt: string;
  anchors: BridgeAnchorRecord[];
  context_sources: TrustedContextSourceConfig[];
  signer_private_key_env: string;
  /** When set, a tick may also publish a cause-cluster under this signer. */
  parent_causes: ParentCauseRef[];
  cluster_slug?: string;
}

export function loadMediatorConfigArtifact(path: string, env: NodeJS.ProcessEnv = process.env): MediatorConfigArtifact {
  const value = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  if (value.schema_version !== MEDIATOR_CONFIG_SCHEMA_VERSION || value.provisional !== true) {
    throw new Error(`Mediator config must declare schema_version ${MEDIATOR_CONFIG_SCHEMA_VERSION} and provisional true`);
  }
  const labels = value.labels as Record<string, unknown> | undefined;
  const contextSources = Array.isArray(value.context_sources)
    ? parseTrustedContextSources(JSON.stringify(value.context_sources))
    : (() => { throw new Error('Mediator config context_sources must be an array'); })();
  const artifact: MediatorConfigArtifact = {
    schema_version: MEDIATOR_CONFIG_SCHEMA_VERSION,
    provisional: true,
    name: requireString(value.name, 'name'),
    description: requireString(value.description, 'description'),
    founding_statement: requireString(value.founding_statement, 'founding_statement'),
    labels: {
      side_a: requireString(labels?.side_a, 'labels.side_a'),
      side_b: requireString(labels?.side_b, 'labels.side_b'),
    },
    strategy_prompt: requireFounderPrompt(value.strategy_prompt),
    anchors: normalizeAnchorStoreFile({ anchors: value.anchors }).anchors,
    context_sources: contextSources,
    signer_private_key_env: requireString(value.signer_private_key_env, 'signer_private_key_env'),
    parent_causes: parseParentCauses(value.parent_causes),
    cluster_slug: typeof value.cluster_slug === 'string' && value.cluster_slug.trim()
      ? value.cluster_slug.trim()
      : undefined,
  };
  if (!env[artifact.signer_private_key_env]) {
    throw new Error(`Missing mediator signer secret environment variable: ${artifact.signer_private_key_env}`);
  }
  return artifact;
}

export function loadMediatorAnchors(path: string): BridgeAnchorRecord[] {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  return normalizeAnchorStoreFile({ anchors: raw.anchors }).anchors;
}

export function loadMediatorStrategyPrompt(path: string): string {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  return requireFounderPrompt(raw.strategy_prompt);
}

export function saveMediatorAnchors(path: string, anchors: BridgeAnchorRecord[]): void {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  raw.anchors = normalizeAnchorStoreFile({ anchors }).anchors;
  writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
}

export function scaffoldMediatorConfig(foundingStatement: string, name = 'REPLACE WITH MEDIATOR NAME'): MediatorConfigArtifact {
  const statement = foundingStatement.trim();
  if (!statement) throw new Error('A founding statement is required');
  return {
    schema_version: MEDIATOR_CONFIG_SCHEMA_VERSION,
    provisional: true,
    name,
    description: 'REPLACE WITH A SHORT DESCRIPTION OF THIS MEDIATOR',
    founding_statement: statement,
    labels: { side_a: 'REPLACE WITH SIDE A LABEL', side_b: 'REPLACE WITH SIDE B LABEL' },
    strategy_prompt: 'REPLACE WITH THE FOUNDER-WRITTEN STRATEGY PROMPT (NO DEFAULT IS PROVIDED)',
    anchors: [],
    context_sources: [],
    signer_private_key_env: 'BRIDGE_CREATOR_PRIVATE_KEY',
    parent_causes: [],
  };
}

function parseParentCauses(value: unknown): ParentCauseRef[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Mediator config parent_causes must be an array');
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`parent_causes[${index}] must be an object`);
    const record = entry as Record<string, unknown>;
    const owner = requireString(record.owner, `parent_causes[${index}].owner`);
    if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) {
      throw new Error(`parent_causes[${index}].owner must be a 0x-prefixed address`);
    }
    const slug = requireString(record.slug, `parent_causes[${index}].slug`);
    const side = requireString(record.side, `parent_causes[${index}].side`);
    if (side !== 'side_a' && side !== 'side_b') {
      throw new Error(`parent_causes[${index}].side must be side_a or side_b`);
    }
    return { owner: owner.toLowerCase() as `0x${string}`, slug, side };
  });
}

function requireFounderPrompt(value: unknown): string {
  const prompt = requireString(value, 'strategy_prompt');
  if (prompt.startsWith('REPLACE WITH')) throw new Error('Mediator config requires a founder-written strategy_prompt');
  return prompt;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Mediator config is missing ${field}`);
  return value.trim();
}
