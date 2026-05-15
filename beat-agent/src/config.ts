import { readFileSync } from 'node:fs';
import type { IpfsCidV1 } from '@commonality/sdk';
import type { IpfsConfig, PaymentConfig } from '@commonality/attester-core';
import type { BeatAgentConfidence } from './types.js';

export interface BeatAgentConfig {
  beatId: string;
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
  platformApiUrl?: string;
  trustedFinderKey?: string;
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

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): BeatAgentConfig {
  return {
    beatId: readStringFrom(['BEAT_AGENT_BEAT_ID'], env, 'default-beat'),
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
    platformApiUrl: readOptionalStringFrom(['BEAT_AGENT_PLATFORM_API_URL', 'PLATFORM_API_URL'], env),
    trustedFinderKey: readOptionalStringFrom(['BEAT_AGENT_TRUSTED_FINDER_KEY'], env),
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
