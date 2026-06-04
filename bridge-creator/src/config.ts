import type { LlmNudgerConfig } from '@commonality/nudger-core';
import { parseTrustedContextSources, type TrustedContextSourceConfig } from './contextSources.js';

export interface BridgeCreatorConfig extends LlmNudgerConfig {
  trustedContextSources: TrustedContextSourceConfig[];
  contextMaxAgeMs: number;
  anchorStorePath: string;
  strategyPromptUrl: string;
  publicBaseUrl: string;
  publicationDedupStatePath: string;
  tickIntervalMs: number;
  anchorReflectionIntervalMs: number;
  anchorReflectionOutcomeSummaryPath?: string;
  implicationsContractAddress?: `0x${string}`;
  contact?: string;
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
    trustedContextSources: parseTrustedContextSources(env.BRIDGE_CREATOR_CSM_CONTEXT_SOURCES).map((source) => ({
      ...source,
      maxAgeMs: source.maxAgeMs ?? contextMaxAgeMs,
    })),
    contextMaxAgeMs,
    anchorStorePath: readString(env, ['BRIDGE_CREATOR_ANCHOR_STORE_PATH'], 'bridge-creator/data/seed-anchors.json'),
    strategyPromptUrl: readString(env, ['BRIDGE_CREATOR_STRATEGY_PROMPT_URL'], '/strategy-prompt'),
    publicBaseUrl: readString(env, ['BRIDGE_CREATOR_PUBLIC_BASE_URL'], ''),
    publicationDedupStatePath: readString(
      env,
      ['BRIDGE_CREATOR_PUBLICATION_DEDUP_STATE_PATH'],
      'bridge-creator/data/publication-dedup-state.json',
    ),
    tickIntervalMs: readInteger(env, ['BRIDGE_CREATOR_TICK_INTERVAL_MS'], 60 * 60 * 1000),
    anchorReflectionIntervalMs: readInteger(env, ['BRIDGE_CREATOR_ANCHOR_REFLECTION_INTERVAL_MS'], 24 * 60 * 60 * 1000),
    anchorReflectionOutcomeSummaryPath: env.BRIDGE_CREATOR_ANCHOR_REFLECTION_OUTCOME_SUMMARY_PATH || undefined,
    implicationsContractAddress: readOptionalAddress(env.IMPLICATIONS_CONTRACT_ADDRESS),
    contact: env.BRIDGE_CREATOR_CONTACT || undefined,
    proposalStorePath: readString(env, ['BRIDGE_CREATOR_PROPOSAL_STORE_PATH'], 'bridge-creator/data/proposals.json'),
    paymentAddress: env.BRIDGE_CREATOR_PAYMENT_ADDRESS || undefined,
    serviceMarginPercent: readInteger(env, ['BRIDGE_CREATOR_SERVICE_MARGIN_PERCENT', 'SERVICE_MARGIN_PERCENT'], 20),
    ethUsdPrice: readInteger(env, ['BRIDGE_CREATOR_ETH_USD_PRICE', 'ETH_USD_PRICE'], 3000),
    proposalEstimatedInputTokens: readInteger(env, ['BRIDGE_CREATOR_PROPOSAL_ESTIMATED_INPUT_TOKENS'], 1500),
    proposalEstimatedOutputTokens: readInteger(env, ['BRIDGE_CREATOR_PROPOSAL_ESTIMATED_OUTPUT_TOKENS'], 300),
    rateLimitWindowMs: readInteger(env, ['BRIDGE_CREATOR_RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_WINDOW_MS'], 60_000),
    rateLimitMaxRequests: readInteger(env, ['BRIDGE_CREATOR_RATE_LIMIT_MAX_REQUESTS', 'RATE_LIMIT_MAX_REQUESTS'], 10),
  };
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): BridgeCreatorConfig {
  return loadConfig(env);
}
