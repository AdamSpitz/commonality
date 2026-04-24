import { readFileSync } from 'node:fs';
import type { AttesterHostConfig } from './config.js';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readStringEnv(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback?: string,
): string {
  for (const name of names) {
    const value = env[name];
    if (value) {
      return value;
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${names[0]}`);
}

function readOptionalStringEnv(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function readNumberEnv(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: number,
): number {
  const rawValue = readOptionalStringEnv(env, names);
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${names[0]}`);
  }

  return parsed;
}

function readPromptTemplate(
  env: NodeJS.ProcessEnv,
  fileVarName: string,
  valueVarName: string,
): string {
  const promptTemplateFile = env[fileVarName];
  if (promptTemplateFile) {
    return readFileSync(promptTemplateFile, 'utf8');
  }

  return requireEnv(valueVarName, env[valueVarName]);
}

export function loadAttesterHostConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AttesterHostConfig {
  return {
    port: readNumberEnv(env, ['ATTESTER_HOST_PORT', 'PORT'], 3000),
    implicationAttester: {
      routePrefix: readStringEnv(env, ['IMPLICATION_ATTESTER_ROUTE_PREFIX'], '/implication-attester'),
      config: {
        ethereumPrivateKey: requireEnv(
          'IMPLICATION_ATTESTER_PRIVATE_KEY',
          env.IMPLICATION_ATTESTER_PRIVATE_KEY,
        ),
        ethereumRpcUrl: readStringEnv(
          env,
          ['IMPLICATION_ATTESTER_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL'],
        ),
        implicationsContractAddress: requireEnv(
          'IMPLICATIONS_CONTRACT_ADDRESS',
          env.IMPLICATIONS_CONTRACT_ADDRESS,
        ),
        openRouterApiKey: requireEnv('OPENROUTER_API_KEY', env.OPENROUTER_API_KEY),
        openRouterModel: readStringEnv(
          env,
          ['IMPLICATION_ATTESTER_OPENROUTER_MODEL', 'OPENROUTER_MODEL'],
          'anthropic/claude-3.5-haiku',
        ),
        ipfsApiUrl: readStringEnv(
          env,
          ['IMPLICATION_ATTESTER_IPFS_API', 'IPFS_API'],
          'http://localhost:5001',
        ),
        ipfsGatewayUrl: readStringEnv(
          env,
          ['IMPLICATION_ATTESTER_IPFS_GATEWAY', 'IPFS_GATEWAY'],
          'http://localhost:8080',
        ),
        port: 0,
        paymentAddress: requireEnv(
          'IMPLICATION_ATTESTER_PAYMENT_ADDRESS',
          env.IMPLICATION_ATTESTER_PAYMENT_ADDRESS,
        ),
        serviceMarginPercent: readNumberEnv(
          env,
          ['IMPLICATION_ATTESTER_SERVICE_MARGIN_PERCENT', 'SERVICE_MARGIN_PERCENT'],
          20,
        ),
        ethUsdPrice: readNumberEnv(
          env,
          ['IMPLICATION_ATTESTER_ETH_USD_PRICE', 'ETH_USD_PRICE'],
          3000,
        ),
        gasPriceMultiplier: readNumberEnv(
          env,
          ['IMPLICATION_ATTESTER_GAS_PRICE_MULTIPLIER', 'GAS_PRICE_MULTIPLIER'],
          1.2,
        ),
        estimatedInputTokens: readNumberEnv(
          env,
          ['IMPLICATION_ATTESTER_ESTIMATED_INPUT_TOKENS', 'ESTIMATED_INPUT_TOKENS'],
          1000,
        ),
        estimatedOutputTokens: readNumberEnv(
          env,
          ['IMPLICATION_ATTESTER_ESTIMATED_OUTPUT_TOKENS', 'ESTIMATED_OUTPUT_TOKENS'],
          200,
        ),
        rateLimitWindowMs: readNumberEnv(
          env,
          ['IMPLICATION_ATTESTER_RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_WINDOW_MS'],
          60000,
        ),
        rateLimitMaxRequests: readNumberEnv(
          env,
          ['IMPLICATION_ATTESTER_RATE_LIMIT_MAX_REQUESTS', 'RATE_LIMIT_MAX_REQUESTS'],
          10,
        ),
        trustedFinderKey: readOptionalStringEnv(env, ['IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY']),
      },
    },
    contentAttester: {
      routePrefix: readStringEnv(env, ['CONTENT_ATTESTER_ROUTE_PREFIX'], '/content-attester'),
      config: {
        ethereumPrivateKey: requireEnv(
          'CONTENT_ATTESTER_PRIVATE_KEY',
          env.CONTENT_ATTESTER_PRIVATE_KEY,
        ),
        ethereumRpcUrl: readStringEnv(
          env,
          ['CONTENT_ATTESTER_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL'],
        ),
        alignmentAttestationsContractAddress: requireEnv(
          'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
          env.ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS,
        ),
        alignmentTopicStatementCid: requireEnv(
          'ALIGNMENT_TOPIC_STATEMENT_CID',
          env.ALIGNMENT_TOPIC_STATEMENT_CID,
        ) as `bafy${string}`,
        openRouterApiKey: requireEnv('OPENROUTER_API_KEY', env.OPENROUTER_API_KEY),
        openRouterModel: readStringEnv(
          env,
          ['CONTENT_ATTESTER_OPENROUTER_MODEL', 'OPENROUTER_MODEL'],
          'anthropic/claude-3.5-haiku',
        ),
        ipfsApiUrl: readStringEnv(
          env,
          ['CONTENT_ATTESTER_IPFS_API', 'IPFS_API'],
          'http://localhost:5001',
        ),
        ipfsGatewayUrl: readStringEnv(
          env,
          ['CONTENT_ATTESTER_IPFS_GATEWAY', 'IPFS_GATEWAY'],
          'http://localhost:8080',
        ),
        port: 0,
        paymentAddress: requireEnv(
          'CONTENT_ATTESTER_PAYMENT_ADDRESS',
          env.CONTENT_ATTESTER_PAYMENT_ADDRESS,
        ),
        serviceMarginPercent: readNumberEnv(
          env,
          ['CONTENT_ATTESTER_SERVICE_MARGIN_PERCENT', 'SERVICE_MARGIN_PERCENT'],
          20,
        ),
        ethUsdPrice: readNumberEnv(
          env,
          ['CONTENT_ATTESTER_ETH_USD_PRICE', 'ETH_USD_PRICE'],
          3000,
        ),
        gasPriceMultiplier: readNumberEnv(
          env,
          ['CONTENT_ATTESTER_GAS_PRICE_MULTIPLIER', 'GAS_PRICE_MULTIPLIER'],
          1.2,
        ),
        estimatedInputTokens: readNumberEnv(
          env,
          ['CONTENT_ATTESTER_ESTIMATED_INPUT_TOKENS', 'ESTIMATED_INPUT_TOKENS'],
          2500,
        ),
        estimatedOutputTokens: readNumberEnv(
          env,
          ['CONTENT_ATTESTER_ESTIMATED_OUTPUT_TOKENS', 'ESTIMATED_OUTPUT_TOKENS'],
          400,
        ),
        rateLimitWindowMs: readNumberEnv(
          env,
          ['CONTENT_ATTESTER_RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_WINDOW_MS'],
          60000,
        ),
        rateLimitMaxRequests: readNumberEnv(
          env,
          ['CONTENT_ATTESTER_RATE_LIMIT_MAX_REQUESTS', 'RATE_LIMIT_MAX_REQUESTS'],
          10,
        ),
        attesterName: readStringEnv(
          env,
          ['CONTENT_ATTESTER_NAME'],
          'content-attester',
        ),
        promptTemplate: readPromptTemplate(
          env,
          'CONTENT_ATTESTER_PROMPT_TEMPLATE_FILE',
          'CONTENT_ATTESTER_PROMPT_TEMPLATE',
        ),
        trustedFinderKey: readOptionalStringEnv(env, ['CONTENT_ATTESTER_TRUSTED_FINDER_KEY']),
      },
    },
  };
}
