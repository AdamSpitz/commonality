import type { LlmNudgerConfig } from '@commonality/nudger-core';
import { parseTrustedContextSources, type TrustedContextSourceConfig } from './contextSources.js';

export interface BridgeCreatorConfig extends LlmNudgerConfig {
  commonalityStatements: string[];
  trustedContextSources: TrustedContextSourceConfig[];
  anchorStorePath: string;
  strategyPromptUrl: string;
  publicBaseUrl: string;
  publicationDedupStatePath: string;
  contact?: string;
}

function requireFrom(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readString(env: NodeJS.ProcessEnv, names: readonly string[], fallback: string): string {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return fallback;
}

function requireAny(env: NodeJS.ProcessEnv, names: readonly string[]): string {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
}

function readCommaSeparated(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeCreatorConfig {
  return {
    nudgerPrivateKey: requireFrom(env, 'BRIDGE_CREATOR_PRIVATE_KEY'),
    ethereumRpcUrl: requireAny(env, ['BRIDGE_CREATOR_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL']),
    indexerUrl: readString(env, ['BRIDGE_CREATOR_INDEXER_URL', 'INDEXER_URL'], 'http://localhost:3001'),
    ipfsApiUrl: readString(env, ['BRIDGE_CREATOR_IPFS_API', 'IPFS_API'], 'http://localhost:5001'),
    ipfsGatewayUrl: readString(env, ['BRIDGE_CREATOR_IPFS_GATEWAY', 'IPFS_GATEWAY'], 'http://localhost:8080'),
    openRouterApiKey: requireFrom(env, 'OPENROUTER_API_KEY'),
    openRouterModel: readString(env, ['BRIDGE_CREATOR_OPENROUTER_MODEL', 'OPENROUTER_MODEL'], 'anthropic/claude-3.5-haiku'),
    name: readString(env, ['BRIDGE_CREATOR_NAME'], 'Bridge Creator'),
    description: readString(env, ['BRIDGE_CREATOR_DESCRIPTION'], 'Creates synthesized bridge statements from moderate positions'),
    sourceType: readString(env, ['BRIDGE_CREATOR_SOURCE_TYPE'], 'bridge-creator'),
    version: readString(env, ['BRIDGE_CREATOR_VERSION'], '0.1.0'),
    nudgePublicationsContractAddress: requireFrom(env, 'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS'),
    commonalityStatements: readCommaSeparated(env.BRIDGE_CREATOR_COMMONALITY_STATEMENTS),
    trustedContextSources: parseTrustedContextSources(env.BRIDGE_CREATOR_CSM_CONTEXT_SOURCES),
    anchorStorePath: readString(env, ['BRIDGE_CREATOR_ANCHOR_STORE_PATH'], 'bridge-creator/data/seed-anchors.json'),
    strategyPromptUrl: readString(env, ['BRIDGE_CREATOR_STRATEGY_PROMPT_URL'], '/strategy-prompt'),
    publicBaseUrl: readString(env, ['BRIDGE_CREATOR_PUBLIC_BASE_URL'], ''),
    publicationDedupStatePath: readString(
      env,
      ['BRIDGE_CREATOR_PUBLICATION_DEDUP_STATE_PATH'],
      'bridge-creator/data/publication-dedup-state.json',
    ),
    contact: env.BRIDGE_CREATOR_CONTACT || undefined,
  };
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): BridgeCreatorConfig {
  return loadConfig(env);
}
