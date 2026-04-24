import { readFileSync } from 'node:fs';
import type { ServiceHostConfig } from './config.js';
import { loadConfigFromEnv as loadImplicationAttesterConfig } from '@commonality/implication-attester';
import { loadConfigFromEnv as loadContentAttesterConfig } from '@commonality/content-attester';
import { loadConfigFromEnv as loadImplicationFinderConfig } from '@commonality/implication-finder';
import { loadConfigFromEnv as loadContentFinderConfig } from '@commonality/content-finder';
import { loadConfigFromEnv as loadImplicationGraphNudgerConfig } from '@commonality/implication-graph-nudger';
import { loadConfigFromEnv as loadBridgeCreatorConfig } from '@commonality/bridge-creator';
import { loadConfigFromEnv as loadExplorerCuratorConfig } from '@commonality/explorer-curator';

function readOptionalStringFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return undefined;
}

function readStringFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: string,
): string {
  return readOptionalStringFrom(env, names) ?? fallback;
}

function readNumberFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: number,
): number {
  const raw = readOptionalStringFrom(env, names);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${names[0]}`);
  }
  return parsed;
}

function readBooleanFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: boolean,
): boolean {
  const raw = readOptionalStringFrom(env, names);
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === '1') return true;
  if (lower === 'false' || lower === '0') return false;
  throw new Error(`Invalid boolean environment variable: ${names[0]} must be true/false/1/0`);
}

function readPromptTemplateFromEnv(env: NodeJS.ProcessEnv): string {
  const file = env.CONTENT_ATTESTER_PROMPT_TEMPLATE_FILE;
  if (file) {
    return readFileSync(file, 'utf-8');
  }
  const value = env.CONTENT_ATTESTER_PROMPT_TEMPLATE;
  if (!value) {
    throw new Error('Missing required environment variable: CONTENT_ATTESTER_PROMPT_TEMPLATE (or set CONTENT_ATTESTER_PROMPT_TEMPLATE_FILE)');
  }
  return value;
}

export function loadServiceHostConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ServiceHostConfig {
  const implicationAttesterEnabled = readBooleanFrom(env, ['IMPLICATION_ATTESTER_ENABLED'], true);
  const contentAttesterEnabled = readBooleanFrom(env, ['CONTENT_ATTESTER_ENABLED'], true);
  const implicationFinderEnabled = readBooleanFrom(env, ['IMPLICATION_FINDER_ENABLED'], true);
  const contentFinderEnabled = readBooleanFrom(env, ['CONTENT_FINDER_ENABLED'], true);
  const implicationGraphNudgerEnabled = readBooleanFrom(env, ['IMPLICATION_GRAPH_NUDGER_ENABLED'], true);
  const bridgeCreatorEnabled = readBooleanFrom(env, ['BRIDGE_CREATOR_ENABLED'], true);
  const explorerCuratorEnabled = readBooleanFrom(env, ['EXPLORER_CURATOR_ENABLED'], true);

  return {
    port: readNumberFrom(env, ['SERVICE_HOST_PORT', 'PORT'], 3000),
    workers: [
      ...(implicationAttesterEnabled
        ? [{
            name: 'implication-attester',
            kind: 'implication-attester' as const,
            enabled: implicationAttesterEnabled,
            restartDelayMs: readNumberFrom(env, ['IMPLICATION_ATTESTER_RESTART_DELAY_MS'], 1000),
            routePrefix: readStringFrom(env, ['IMPLICATION_ATTESTER_ROUTE_PREFIX'], '/implication-attester'),
            config: loadImplicationAttesterConfig(env) as unknown as Record<string, unknown>,
          }]
        : []),
      ...(contentAttesterEnabled
        ? [{
            name: 'content-attester',
            kind: 'content-attester' as const,
            enabled: contentAttesterEnabled,
            restartDelayMs: readNumberFrom(env, ['CONTENT_ATTESTER_RESTART_DELAY_MS'], 1000),
            routePrefix: readStringFrom(env, ['CONTENT_ATTESTER_ROUTE_PREFIX'], '/content-attester'),
            config: { ...loadContentAttesterConfig(env), promptTemplate: readPromptTemplateFromEnv(env) } as unknown as Record<string, unknown>,
          }]
        : []),
      ...(implicationFinderEnabled
        ? [{
            name: 'implication-finder',
            kind: 'implication-finder' as const,
            enabled: implicationFinderEnabled,
            restartDelayMs: readNumberFrom(env, ['IMPLICATION_FINDER_RESTART_DELAY_MS'], 1000),
            config: loadImplicationFinderConfig(env) as unknown as Record<string, unknown>,
          }]
        : []),
      ...(contentFinderEnabled
        ? [{
            name: 'content-finder',
            kind: 'content-finder' as const,
            enabled: contentFinderEnabled,
            restartDelayMs: readNumberFrom(env, ['CONTENT_FINDER_RESTART_DELAY_MS'], 1000),
            config: loadContentFinderConfig(env) as unknown as Record<string, unknown>,
          }]
        : []),
      ...(implicationGraphNudgerEnabled
        ? [{
            name: 'implication-graph-nudger',
            kind: 'implication-graph-nudger' as const,
            enabled: implicationGraphNudgerEnabled,
            restartDelayMs: readNumberFrom(env, ['IMPLICATION_GRAPH_NUDGER_RESTART_DELAY_MS'], 1000),
            routePrefix: readStringFrom(env, ['IMPLICATION_GRAPH_NUDGER_ROUTE_PREFIX'], '/implication-graph-nudger'),
            config: loadImplicationGraphNudgerConfig(env) as unknown as Record<string, unknown>,
          }]
        : []),
      ...(bridgeCreatorEnabled
        ? [{
            name: 'bridge-creator',
            kind: 'bridge-creator' as const,
            enabled: bridgeCreatorEnabled,
            restartDelayMs: readNumberFrom(env, ['BRIDGE_CREATOR_RESTART_DELAY_MS'], 1000),
            routePrefix: readStringFrom(env, ['BRIDGE_CREATOR_ROUTE_PREFIX'], '/bridge-creator'),
            config: loadBridgeCreatorConfig(env) as unknown as Record<string, unknown>,
          }]
        : []),
      ...(explorerCuratorEnabled
        ? [{
            name: 'explorer-curator',
            kind: 'explorer-curator' as const,
            enabled: explorerCuratorEnabled,
            restartDelayMs: readNumberFrom(env, ['EXPLORER_CURATOR_RESTART_DELAY_MS'], 1000),
            routePrefix: readStringFrom(env, ['EXPLORER_CURATOR_ROUTE_PREFIX'], '/explorer-curator'),
            config: loadExplorerCuratorConfig(env) as unknown as Record<string, unknown>,
          }]
        : []),
    ],
  };
}
