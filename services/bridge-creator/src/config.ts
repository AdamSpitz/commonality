import { PRODUCTION_OPENROUTER_MODEL } from '@commonality/attester-core';
import type { LlmNudgerConfig } from '@commonality/nudger-core';
import { parseTrustedContextSources, type TrustedContextSourceConfig } from './contextSources.js';
import { loadMediatorConfigArtifact } from './mediatorConfig.js';
import type { ParentCauseRef } from './clusterFromTick.js';

export interface BridgeCreatorConfig extends LlmNudgerConfig {
  trustedContextSources: TrustedContextSourceConfig[];
  contextMaxAgeMs: number;
  labels: { sideA: string; sideB: string };
  mediatorConfigPath?: string;
  strategyPrompt?: string;
  anchorStorePath: string;
  strategyPromptUrl: string;
  publicBaseUrl: string;
  publicationDedupStatePath: string;
  tickIntervalMs: number;
  anchorReflectionIntervalMs: number;
  anchorReflectionOutcomeSummaryPath?: string;
  implicationsContractAddress?: `0x${string}`;
  /** Optional PublishedData contract for bridge-created conceptspace statements. */
  publishedDataContractAddress?: `0x${string}`;
  mutableRefUpdaterContractAddress?: `0x${string}`;
  parentCauses: ParentCauseRef[];
  clusterSlug?: string;
  contact?: string;
  corsOrigins: string[];
  // External bridge-proposal API (POST /propose-bridge), paid via x402.
  proposalStorePath: string;
  paymentAddress?: string;
  serviceMarginPercent: number;
  ethUsdPrice: number;
  proposalEstimatedInputTokens: number;
  proposalEstimatedOutputTokens: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
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

function readOptionalAddress(value: string | undefined): `0x${string}` | undefined {
  return value ? (value as `0x${string}`) : undefined;
}

function readInteger(env: NodeJS.ProcessEnv, names: readonly string[], fallback: number): number {
  const raw = readString(env, names, String(fallback));
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable must be a positive integer: ${names.join(' or ')}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeCreatorConfig {
  const contextMaxAgeMs = readInteger(env, ['BRIDGE_CREATOR_CONTEXT_MAX_AGE_MS'], 24 * 60 * 60 * 1000);
  const mediatorConfigPath = env.BRIDGE_CREATOR_MEDIATOR_CONFIG_PATH || undefined;
  const mediator = mediatorConfigPath ? loadMediatorConfigArtifact(mediatorConfigPath, env) : undefined;
  const labelPair = env.BRIDGE_CREATOR_LABELS ? parseLabelPair(env.BRIDGE_CREATOR_LABELS) : undefined;

  return {
    nudgerPrivateKey: mediator ? requireFrom(env, mediator.signer_private_key_env) : requireFrom(env, 'BRIDGE_CREATOR_PRIVATE_KEY'),
    ethereumRpcUrl: requireAny(env, ['BRIDGE_CREATOR_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL']),
    indexerUrl: readString(env, ['BRIDGE_CREATOR_INDEXER_URL', 'INDEXER_URL'], 'http://localhost:3001'),
    ipfsApiUrl: readString(env, ['BRIDGE_CREATOR_IPFS_API', 'IPFS_API'], 'http://localhost:5001'),
    ipfsGatewayUrl: readString(env, ['BRIDGE_CREATOR_IPFS_GATEWAY', 'IPFS_GATEWAY'], 'http://localhost:8080'),
    openRouterApiKey: requireFrom(env, 'OPENROUTER_API_KEY'),
    openRouterModel: readString(env, ['BRIDGE_CREATOR_OPENROUTER_MODEL', 'OPENROUTER_MODEL'], PRODUCTION_OPENROUTER_MODEL),
    name: mediator?.name ?? readString(env, ['BRIDGE_CREATOR_NAME'], 'Bridge Creator'),
    description: mediator?.description ?? readString(env, ['BRIDGE_CREATOR_DESCRIPTION'], 'Creates bridge statements between two sides of a cause'),
    sourceType: readString(env, ['BRIDGE_CREATOR_SOURCE_TYPE'], 'bridge-creator'),
    version: readString(env, ['BRIDGE_CREATOR_VERSION'], '0.1.0'),
    nudgePublicationsContractAddress: requireFrom(env, 'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS'),
    trustedContextSources: (mediator?.context_sources ?? parseTrustedContextSources(
      env.BRIDGE_CREATOR_CONTEXT_SOURCES ?? env.BRIDGE_CREATOR_CSM_CONTEXT_SOURCES,
    )).map((source) => ({
      ...source,
      maxAgeMs: source.maxAgeMs ?? contextMaxAgeMs,
    })),
    contextMaxAgeMs,
    labels: mediator
      ? { sideA: mediator.labels.side_a, sideB: mediator.labels.side_b }
      : labelPair ?? { sideA: 'left', sideB: 'right' },
    mediatorConfigPath,
    strategyPrompt: mediator?.strategy_prompt,
    anchorStorePath: readString(env, ['BRIDGE_CREATOR_ANCHOR_STORE_PATH'], 'services/bridge-creator/data/seed-anchors.json'),
    strategyPromptUrl: readString(env, ['BRIDGE_CREATOR_STRATEGY_PROMPT_URL'], '/strategy-prompt'),
    publicBaseUrl: readString(env, ['BRIDGE_CREATOR_PUBLIC_BASE_URL'], ''),
    publicationDedupStatePath: readString(
      env,
      ['BRIDGE_CREATOR_PUBLICATION_DEDUP_STATE_PATH'],
      'services/bridge-creator/data/publication-dedup-state.json',
    ),
    tickIntervalMs: readInteger(env, ['BRIDGE_CREATOR_TICK_INTERVAL_MS'], 60 * 60 * 1000),
    anchorReflectionIntervalMs: readInteger(env, ['BRIDGE_CREATOR_ANCHOR_REFLECTION_INTERVAL_MS'], 24 * 60 * 60 * 1000),
    anchorReflectionOutcomeSummaryPath: env.BRIDGE_CREATOR_ANCHOR_REFLECTION_OUTCOME_SUMMARY_PATH || undefined,
    implicationsContractAddress: readOptionalAddress(env.IMPLICATIONS_CONTRACT_ADDRESS),
    publishedDataContractAddress: readOptionalAddress(env.PUBLISHED_DATA_CONTRACT_ADDRESS),
    mutableRefUpdaterContractAddress: readOptionalAddress(env.MUTABLE_REF_UPDATER_CONTRACT_ADDRESS),
    parentCauses: mediator?.parent_causes ?? [],
    clusterSlug: mediator?.cluster_slug,
    contact: env.BRIDGE_CREATOR_CONTACT || undefined,
    corsOrigins: parseCorsOrigins(env.BRIDGE_CREATOR_CORS_ORIGINS),
    proposalStorePath: readString(env, ['BRIDGE_CREATOR_PROPOSAL_STORE_PATH'], 'services/bridge-creator/data/proposals.json'),
    paymentAddress: env.BRIDGE_CREATOR_PAYMENT_ADDRESS || undefined,
    serviceMarginPercent: readInteger(env, ['BRIDGE_CREATOR_SERVICE_MARGIN_PERCENT', 'SERVICE_MARGIN_PERCENT'], 20),
    ethUsdPrice: readInteger(env, ['BRIDGE_CREATOR_ETH_USD_PRICE', 'ETH_USD_PRICE'], 3000),
    proposalEstimatedInputTokens: readInteger(env, ['BRIDGE_CREATOR_PROPOSAL_ESTIMATED_INPUT_TOKENS'], 1500),
    proposalEstimatedOutputTokens: readInteger(env, ['BRIDGE_CREATOR_PROPOSAL_ESTIMATED_OUTPUT_TOKENS'], 300),
    rateLimitWindowMs: readInteger(env, ['BRIDGE_CREATOR_RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_WINDOW_MS'], 60_000),
    rateLimitMaxRequests: readInteger(env, ['BRIDGE_CREATOR_RATE_LIMIT_MAX_REQUESTS', 'RATE_LIMIT_MAX_REQUESTS'], 10),
  };
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return ['*'];
  const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0) throw new Error('BRIDGE_CREATOR_CORS_ORIGINS must contain at least one origin');
  return origins;
}

function parseLabelPair(value: string): { sideA: string; sideB: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('BRIDGE_CREATOR_LABELS must be a JSON label pair'); }
  if (!Array.isArray(parsed) || parsed.length !== 2 || parsed.some((label) => typeof label !== 'string' || !label.trim())) {
    throw new Error('BRIDGE_CREATOR_LABELS must be a JSON array containing two non-empty labels');
  }
  return { sideA: parsed[0].trim(), sideB: parsed[1].trim() };
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): BridgeCreatorConfig {
  return loadConfig(env);
}
