import {
  readNumberEnv,
  readStringEnv,
  requireEnv,
  type IpfsConfig,
  type PaymentConfig,
} from '@commonality/attester-core';
import type { IpfsCidV1 } from '@commonality/sdk';
import { readFileSync } from 'fs';

export interface ContentAttesterConfig {
  ethereumPrivateKey: string;
  ethereumRpcUrl: string;
  alignmentAttestationsContractAddress: string;
  alignmentTopicStatementCid: IpfsCidV1;
  openRouterApiKey: string;
  openRouterModel: string;
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
  attesterName: string;
  promptTemplate: string;
  trustedFinderKey?: string;
}

function requireEnvFrom(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readOptionalStringFrom(
  names: readonly string[],
  env: NodeJS.ProcessEnv,
): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return undefined;
}

function readStringFrom(
  names: readonly string[],
  env: NodeJS.ProcessEnv,
  fallback?: string,
): string {
  const value = readOptionalStringFrom(names, env);
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${names[0]}`);
}

function readNumberFrom(
  names: readonly string[],
  env: NodeJS.ProcessEnv,
  fallback: number,
): number {
  const raw = readOptionalStringFrom(names, env);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${names[0]}`);
  }
  return parsed;
}

function readPromptTemplateFromEnv(env: NodeJS.ProcessEnv): string {
  const file = env.CONTENT_ATTESTER_PROMPT_TEMPLATE_FILE;
  if (file) {
    return readFileSync(file, 'utf-8');
  }
  return requireEnvFrom('CONTENT_ATTESTER_PROMPT_TEMPLATE', env);
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ContentAttesterConfig {
  return {
    ethereumPrivateKey: requireEnvFrom('CONTENT_ATTESTER_PRIVATE_KEY', env),
    ethereumRpcUrl: readStringFrom(
      ['CONTENT_ATTESTER_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL'],
      env,
    ),
    alignmentAttestationsContractAddress: requireEnvFrom(
      'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
      env,
    ),
    alignmentTopicStatementCid: requireEnvFrom(
      'ALIGNMENT_TOPIC_STATEMENT_CID',
      env,
    ) as IpfsCidV1,
    openRouterApiKey: requireEnvFrom('OPENROUTER_API_KEY', env),
    openRouterModel: readStringFrom(
      ['CONTENT_ATTESTER_OPENROUTER_MODEL', 'OPENROUTER_MODEL'],
      env,
      'anthropic/claude-3.5-haiku',
    ),
    ipfsApiUrl: readStringFrom(
      ['CONTENT_ATTESTER_IPFS_API', 'IPFS_API'],
      env,
      'http://localhost:5001',
    ),
    ipfsGatewayUrl: readStringFrom(
      ['CONTENT_ATTESTER_IPFS_GATEWAY', 'IPFS_GATEWAY'],
      env,
      'http://localhost:8080',
    ),
    paymentAddress: requireEnvFrom('CONTENT_ATTESTER_PAYMENT_ADDRESS', env),
    serviceMarginPercent: readNumberFrom(
      ['CONTENT_ATTESTER_SERVICE_MARGIN_PERCENT', 'SERVICE_MARGIN_PERCENT'],
      env,
      20,
    ),
    ethUsdPrice: readNumberFrom(
      ['CONTENT_ATTESTER_ETH_USD_PRICE', 'ETH_USD_PRICE'],
      env,
      3000,
    ),
    gasPriceMultiplier: readNumberFrom(
      ['CONTENT_ATTESTER_GAS_PRICE_MULTIPLIER', 'GAS_PRICE_MULTIPLIER'],
      env,
      1.2,
    ),
    estimatedInputTokens: readNumberFrom(
      ['CONTENT_ATTESTER_ESTIMATED_INPUT_TOKENS', 'ESTIMATED_INPUT_TOKENS'],
      env,
      2500,
    ),
    estimatedOutputTokens: readNumberFrom(
      ['CONTENT_ATTESTER_ESTIMATED_OUTPUT_TOKENS', 'ESTIMATED_OUTPUT_TOKENS'],
      env,
      400,
    ),
    rateLimitWindowMs: readNumberFrom(
      ['CONTENT_ATTESTER_RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_WINDOW_MS'],
      env,
      60000,
    ),
    rateLimitMaxRequests: readNumberFrom(
      ['CONTENT_ATTESTER_RATE_LIMIT_MAX_REQUESTS', 'RATE_LIMIT_MAX_REQUESTS'],
      env,
      10,
    ),
    attesterName: readStringFrom(['CONTENT_ATTESTER_NAME'], env, 'content-attester'),
    promptTemplate: readPromptTemplateFromEnv(env),
    trustedFinderKey: readOptionalStringFrom(['CONTENT_ATTESTER_TRUSTED_FINDER_KEY'], env),
  };
}

export function loadConfig(): ContentAttesterConfig {
  const promptTemplateFile = process.env.CONTENT_ATTESTER_PROMPT_TEMPLATE_FILE;
  let promptTemplate: string;
  
  if (promptTemplateFile) {
    promptTemplate = readFileSync(promptTemplateFile, 'utf-8');
  } else {
    promptTemplate = requireEnv('CONTENT_ATTESTER_PROMPT_TEMPLATE', process.env.CONTENT_ATTESTER_PROMPT_TEMPLATE);
  }

  return {
    ethereumPrivateKey: requireEnv('ATTESTER_PRIVATE_KEY', process.env.ATTESTER_PRIVATE_KEY),
    ethereumRpcUrl: requireEnv('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL),
    alignmentAttestationsContractAddress: requireEnv(
      'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
      process.env.ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS,
    ),
    alignmentTopicStatementCid: requireEnv(
      'ALIGNMENT_TOPIC_STATEMENT_CID',
      process.env.ALIGNMENT_TOPIC_STATEMENT_CID,
    ) as IpfsCidV1,
    openRouterApiKey: requireEnv('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY),
    openRouterModel: readStringEnv('OPENROUTER_MODEL', 'anthropic/claude-3.5-haiku'),
    ipfsApiUrl: readStringEnv('IPFS_API', 'http://localhost:5001'),
    ipfsGatewayUrl: readStringEnv('IPFS_GATEWAY', 'http://localhost:8080'),
    paymentAddress: requireEnv('X402_PAYMENT_ADDRESS', process.env.X402_PAYMENT_ADDRESS),
    serviceMarginPercent: readNumberEnv('SERVICE_MARGIN_PERCENT', 20),
    ethUsdPrice: readNumberEnv('ETH_USD_PRICE', 3000),
    gasPriceMultiplier: readNumberEnv('GAS_PRICE_MULTIPLIER', 1.2),
    estimatedInputTokens: readNumberEnv('ESTIMATED_INPUT_TOKENS', 2500),
    estimatedOutputTokens: readNumberEnv('ESTIMATED_OUTPUT_TOKENS', 400),
    rateLimitWindowMs: readNumberEnv('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMaxRequests: readNumberEnv('RATE_LIMIT_MAX_REQUESTS', 10),
    attesterName: readStringEnv('CONTENT_ATTESTER_NAME', 'content-attester'),
    promptTemplate,
    trustedFinderKey: process.env.TRUSTED_FINDER_KEY,
  };
}

export function getIpfsConfig(config: ContentAttesterConfig = loadConfig()): IpfsConfig {
  return {
    apiUrl: config.ipfsApiUrl,
    gatewayUrl: config.ipfsGatewayUrl,
  };
}

export function getPaymentConfig(config: ContentAttesterConfig = loadConfig()): PaymentConfig {
  return {
    openRouterModel: config.openRouterModel,
    estimatedInputTokens: config.estimatedInputTokens,
    estimatedOutputTokens: config.estimatedOutputTokens,
    serviceMarginPercent: config.serviceMarginPercent,
    ethUsdPrice: config.ethUsdPrice,
    paymentAddress: config.paymentAddress,
  };
}
