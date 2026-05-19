import { readFileSync } from 'node:fs';
import type { IpfsCidV1 } from '@commonality/sdk';
import type { IpfsConfig, PaymentConfig } from '@commonality/attester-core';
import { normalizeBeatAgentPurposes, type BeatAgentConfidence, type BeatAgentPurpose } from './types.js';
import type { BeatDefinition } from './ingestion.js';

export interface BeatAgentConfig {
  beatId: string;
  purposes: BeatAgentPurpose[];
  attesterName: string;
  ethereumPrivateKey: string;
  ethereumRpcUrl: string;
  alignmentAttestationsContractAddress: string;
  alignmentTopicStatementCid: IpfsCidV1;
  openRouterApiKey: string;
  openRouterModel: string;
  promptTemplate: string;
  ipfsApiUrl: string;
  ipfsGatewayUrl: string;
  paymentAddress: string;
  serviceMarginPercent: number;
  ethUsdPrice: number;
  gasPriceMultiplier: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  minimumConfidence: BeatAgentConfidence;
  memoryFilePath?: string;
  evaluationLogFilePath?: string;
  metricsLogFilePath?: string;
  platformApiUrl?: string;
  trustedFinderKey?: string;
  beatDefinition?: BeatDefinition;
  ingestionStateFilePath?: string;
  workerPollIntervalMs: number;
  memoryCompactionOlderThanMs: number;
  memoryCompactionMinObservations: number;
  finderEnabled: boolean;
  finderStateFilePath?: string;
  finderAttesterUrl?: string;
  llmExtractionEnabled?: boolean;
  beatKeywords?: string[];
  minAuthorsForFullWeight: number;
  minHoursForFullWeight: number;
  diversityNeutralFloor: number;
  /** Operator-configured retrieval multipliers keyed by source author/account ID. */
  sourceAuthorWeights?: Record<string, number>;
  maxUntrustedChars: number;
}

function requireEnvFrom(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readOptionalStringFrom(names: readonly string[], env: NodeJS.ProcessEnv): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return undefined;
}

function readStringFrom(names: readonly string[], env: NodeJS.ProcessEnv, fallback?: string): string {
  const value = readOptionalStringFrom(names, env);
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${names[0]}`);
}

function readNumberFrom(names: readonly string[], env: NodeJS.ProcessEnv, fallback: number): number {
  const raw = readOptionalStringFrom(names, env);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${names[0]}`);
  }
  return parsed;
}

function readConfidenceFrom(env: NodeJS.ProcessEnv): BeatAgentConfidence {
  const raw = readStringFrom(['BEAT_AGENT_MINIMUM_CONFIDENCE'], env, 'medium');
  if (raw === 'high' || raw === 'medium' || raw === 'low') {
    return raw;
  }
  throw new Error('Invalid BEAT_AGENT_MINIMUM_CONFIDENCE; expected high, medium, or low');
}

function readPromptTemplateFromEnv(env: NodeJS.ProcessEnv): string {
  const file = env.BEAT_AGENT_PROMPT_TEMPLATE_FILE;
  if (file) {
    return readFileSync(file, 'utf-8');
  }
  return requireEnvFrom('BEAT_AGENT_PROMPT_TEMPLATE', env);
}

function readSourceAuthorWeightsFromEnv(env: NodeJS.ProcessEnv): Record<string, number> | undefined {
  const raw = readOptionalStringFrom(['BEAT_AGENT_SOURCE_AUTHOR_WEIGHTS_JSON'], env);
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid BEAT_AGENT_SOURCE_AUTHOR_WEIGHTS_JSON; expected an object mapping source author IDs to numeric weights');
  }
  const entries = Object.entries(parsed)
    .map(([authorId, weight]) => [authorId, Number(weight)] as const)
    .filter(([authorId, weight]) => authorId.trim() && Number.isFinite(weight));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function readBeatDefinitionFromEnv(env: NodeJS.ProcessEnv): BeatDefinition | undefined {
  const file = env.BEAT_AGENT_BEAT_DEFINITION_FILE;
  const raw = file ? readFileSync(file, 'utf-8') : env.BEAT_AGENT_BEAT_DEFINITION_JSON;
  if (!raw) {
    return undefined;
  }

  const parsed = JSON.parse(raw) as BeatDefinition;
  if (!parsed.beatId || !Array.isArray(parsed.sources)) {
    throw new Error('Invalid beat definition; expected beatId and sources[]');
  }
  return {
    ...parsed,
    purposes: normalizeBeatAgentPurposes((parsed as Partial<BeatDefinition>).purposes),
  };
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): BeatAgentConfig {
  return {
    beatId: readStringFrom(['BEAT_AGENT_BEAT_ID'], env, 'default-beat'),
    purposes: normalizeBeatAgentPurposes(readOptionalStringFrom(['BEAT_AGENT_PURPOSES'], env)?.split(',').map((p) => p.trim()).filter(Boolean)),
    attesterName: readStringFrom(['BEAT_AGENT_NAME'], env, 'beat-agent'),
    ethereumPrivateKey: requireEnvFrom('BEAT_AGENT_PRIVATE_KEY', env),
    ethereumRpcUrl: readStringFrom(['BEAT_AGENT_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL'], env),
    alignmentAttestationsContractAddress: requireEnvFrom('ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS', env),
    alignmentTopicStatementCid: requireEnvFrom('ALIGNMENT_TOPIC_STATEMENT_CID', env) as IpfsCidV1,
    openRouterApiKey: requireEnvFrom('OPENROUTER_API_KEY', env),
    openRouterModel: readStringFrom(['BEAT_AGENT_OPENROUTER_MODEL', 'OPENROUTER_MODEL'], env, 'anthropic/claude-3-sonnet'),
    promptTemplate: readPromptTemplateFromEnv(env),
    ipfsApiUrl: readStringFrom(['BEAT_AGENT_IPFS_API', 'IPFS_API'], env, 'http://localhost:5001'),
    ipfsGatewayUrl: readStringFrom(['BEAT_AGENT_IPFS_GATEWAY', 'IPFS_GATEWAY'], env, 'http://localhost:8080'),
    paymentAddress: requireEnvFrom('BEAT_AGENT_PAYMENT_ADDRESS', env),
    serviceMarginPercent: readNumberFrom(['BEAT_AGENT_SERVICE_MARGIN_PERCENT', 'SERVICE_MARGIN_PERCENT'], env, 20),
    ethUsdPrice: readNumberFrom(['BEAT_AGENT_ETH_USD_PRICE', 'ETH_USD_PRICE'], env, 3000),
    gasPriceMultiplier: readNumberFrom(['BEAT_AGENT_GAS_PRICE_MULTIPLIER', 'GAS_PRICE_MULTIPLIER'], env, 1.2),
    estimatedInputTokens: readNumberFrom(['BEAT_AGENT_ESTIMATED_INPUT_TOKENS', 'ESTIMATED_INPUT_TOKENS'], env, 3000),
    estimatedOutputTokens: readNumberFrom(['BEAT_AGENT_ESTIMATED_OUTPUT_TOKENS', 'ESTIMATED_OUTPUT_TOKENS'], env, 500),
    rateLimitWindowMs: readNumberFrom(['BEAT_AGENT_RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_WINDOW_MS'], env, 60000),
    rateLimitMaxRequests: readNumberFrom(['BEAT_AGENT_RATE_LIMIT_MAX_REQUESTS', 'RATE_LIMIT_MAX_REQUESTS'], env, 10),
    minimumConfidence: readConfidenceFrom(env),
    memoryFilePath: readOptionalStringFrom(['BEAT_AGENT_MEMORY_FILE'], env),
    evaluationLogFilePath: readOptionalStringFrom(['BEAT_AGENT_EVALUATION_LOG_FILE'], env),
    metricsLogFilePath: readOptionalStringFrom(['BEAT_AGENT_METRICS_LOG_FILE'], env),
    platformApiUrl: readOptionalStringFrom(['BEAT_AGENT_PLATFORM_API_URL', 'PLATFORM_API_URL'], env),
    trustedFinderKey: readOptionalStringFrom(['BEAT_AGENT_TRUSTED_FINDER_KEY'], env),
    beatDefinition: readBeatDefinitionFromEnv(env),
    ingestionStateFilePath: readOptionalStringFrom(['BEAT_AGENT_INGESTION_STATE_FILE'], env),
    workerPollIntervalMs: readNumberFrom(['BEAT_AGENT_WORKER_POLL_INTERVAL_MS'], env, 60_000),
    memoryCompactionOlderThanMs: readNumberFrom(['BEAT_AGENT_MEMORY_COMPACTION_OLDER_THAN_MS'], env, 21 * 24 * 60 * 60 * 1000),
    memoryCompactionMinObservations: readNumberFrom(['BEAT_AGENT_MEMORY_COMPACTION_MIN_OBSERVATIONS'], env, 3),
    finderEnabled: readOptionalStringFrom(['BEAT_AGENT_FINDER_ENABLED'], env) === 'true',
    finderStateFilePath: readOptionalStringFrom(['BEAT_AGENT_FINDER_STATE_FILE'], env),
    finderAttesterUrl: readOptionalStringFrom(['BEAT_AGENT_FINDER_ATTESTER_URL'], env),
    llmExtractionEnabled: readOptionalStringFrom(['BEAT_AGENT_LLM_EXTRACTION_ENABLED'], env) === 'true',
    beatKeywords: (() => {
      const raw = readOptionalStringFrom(['BEAT_AGENT_BEAT_KEYWORDS'], env);
      if (!raw) return undefined;
      const kws = raw.split(',').map((k) => k.trim()).filter(Boolean);
      return kws.length > 0 ? kws : undefined;
    })(),
    minAuthorsForFullWeight: readNumberFrom(['BEAT_AGENT_MIN_AUTHORS_FOR_FULL_WEIGHT'], env, 3),
    minHoursForFullWeight: readNumberFrom(['BEAT_AGENT_MIN_HOURS_FOR_FULL_WEIGHT'], env, 6),
    diversityNeutralFloor: readNumberFrom(['BEAT_AGENT_DIVERSITY_NEUTRAL_FLOOR'], env, 0.25),
    sourceAuthorWeights: readSourceAuthorWeightsFromEnv(env),
    maxUntrustedChars: readNumberFrom(['BEAT_AGENT_MAX_UNTRUSTED_CHARS'], env, 4000),
  };
}

export const loadConfig = loadConfigFromEnv;

export function getIpfsConfig(config: BeatAgentConfig = loadConfig()): IpfsConfig {
  return {
    apiUrl: config.ipfsApiUrl,
    gatewayUrl: config.ipfsGatewayUrl,
  };
}

export function getPaymentConfig(config: BeatAgentConfig = loadConfig()): PaymentConfig {
  return {
    openRouterModel: config.openRouterModel,
    estimatedInputTokens: config.estimatedInputTokens,
    estimatedOutputTokens: config.estimatedOutputTokens,
    serviceMarginPercent: config.serviceMarginPercent,
    ethUsdPrice: config.ethUsdPrice,
    paymentAddress: config.paymentAddress,
  };
}
