import { readFileSync } from 'node:fs';
import type { WorkerHostConfig } from './config.js';

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

function readStringEnv(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback?: string,
): string {
  const value = readOptionalStringEnv(env, names);
  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${names[0]}`);
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

function readOptionalBoolean(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: boolean,
): boolean {
  const rawValue = readOptionalStringEnv(env, names);
  if (!rawValue) {
    return fallback;
  }

  const lower = rawValue.toLowerCase();
  if (lower === 'true' || lower === '1') {
    return true;
  }
  if (lower === 'false' || lower === '0') {
    return false;
  }

  throw new Error(`Invalid boolean environment variable: ${names[0]} must be true/false/1/0`);
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

export function loadServiceHostConfigFromEnv(env: NodeJS.ProcessEnv = process.env): WorkerHostConfig {
  const implicationAttesterEnabled = readOptionalBoolean(env, ['IMPLICATION_ATTESTER_ENABLED'], true);
  const contentAttesterEnabled = readOptionalBoolean(env, ['CONTENT_ATTESTER_ENABLED'], true);
  const implicationFinderEnabled = readOptionalBoolean(env, ['IMPLICATION_FINDER_ENABLED'], true);
  const contentFinderEnabled = readOptionalBoolean(env, ['CONTENT_FINDER_ENABLED'], true);
  const implicationGraphNudgerEnabled = readOptionalBoolean(env, ['IMPLICATION_GRAPH_NUDGER_ENABLED'], true);
  const bridgeCreatorEnabled = readOptionalBoolean(env, ['BRIDGE_CREATOR_ENABLED'], true);
  const explorerCuratorEnabled = readOptionalBoolean(env, ['EXPLORER_CURATOR_ENABLED'], true);

  return {
    port: readNumberEnv(env, ['SERVICE_HOST_PORT', 'PORT'], 3000),
    workers: [
      ...(implicationAttesterEnabled ? [
      {
        name: 'implication-attester',
        kind: 'implication-attester' as const,
        enabled: implicationAttesterEnabled,
        restartDelayMs: readNumberEnv(env, ['IMPLICATION_ATTESTER_RESTART_DELAY_MS'], 1000),
        routePrefix: readStringEnv(
          env,
          ['IMPLICATION_ATTESTER_ROUTE_PREFIX'],
          '/implication-attester',
        ),
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
      ] : []),
      ...(contentAttesterEnabled ? [
      {
        name: 'content-attester',
        kind: 'content-attester' as const,
        enabled: contentAttesterEnabled,
        routePrefix: readStringEnv(
          env,
          ['CONTENT_ATTESTER_ROUTE_PREFIX'],
          '/content-attester',
        ),
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
      ] : []),
      ...(implicationFinderEnabled ? [
      {
        name: 'implication-finder',
        kind: 'implication-finder' as const,
        enabled: implicationFinderEnabled,
        restartDelayMs: readNumberEnv(env, ['IMPLICATION_FINDER_RESTART_DELAY_MS'], 1000),
        config: {
          eventCacheUrl: readStringEnv(
            env,
            ['IMPLICATION_FINDER_EVENT_CACHE_URL', 'EVENT_CACHE_URL'],
          ),
          attesterUrl: requireEnv(
            'IMPLICATION_FINDER_ATTESTER_URL',
            env.IMPLICATION_FINDER_ATTESTER_URL,
          ),
          attesterFinderKey: requireEnv(
            'IMPLICATION_FINDER_ATTESTER_FINDER_KEY',
            env.IMPLICATION_FINDER_ATTESTER_FINDER_KEY,
          ),
          beliefsContractAddress: requireEnv(
            'BELIEFS_CONTRACT_ADDRESS',
            env.BELIEFS_CONTRACT_ADDRESS,
          ),
          implicationsContractAddress: requireEnv(
            'IMPLICATIONS_CONTRACT_ADDRESS',
            env.IMPLICATIONS_CONTRACT_ADDRESS,
          ),
          ipfsGatewayUrl: readStringEnv(
            env,
            ['IMPLICATION_FINDER_IPFS_GATEWAY_URL', 'IPFS_GATEWAY_URL', 'IPFS_GATEWAY'],
          ),
          pollIntervalMs: readNumberEnv(env, ['IMPLICATION_FINDER_POLL_INTERVAL_MS'], 30000),
          topNStatements: readNumberEnv(env, ['IMPLICATION_FINDER_TOP_N_STATEMENTS'], 20),
          minBelieverThreshold: readNumberEnv(
            env,
            ['IMPLICATION_FINDER_MIN_BELIEVER_THRESHOLD'],
            2,
          ),
          stateFilePath: readStringEnv(
            env,
            ['IMPLICATION_FINDER_STATE_FILE_PATH'],
            './finder-state.json',
          ),
        },
      },
      ] : []),
      ...(contentFinderEnabled ? [
      {
        name: 'content-finder',
        kind: 'content-finder' as const,
        enabled: contentFinderEnabled,
        restartDelayMs: readNumberEnv(env, ['CONTENT_FINDER_RESTART_DELAY_MS'], 1000),
        config: {
          platformApiUrl: readStringEnv(
            env,
            ['CONTENT_FINDER_PLATFORM_API_URL', 'PLATFORM_API_URL'],
          ),
          attesterUrl: requireEnv(
            'CONTENT_FINDER_ATTESTER_URL',
            env.CONTENT_FINDER_ATTESTER_URL,
          ),
          attesterFinderKey: requireEnv(
            'CONTENT_FINDER_ATTESTER_FINDER_KEY',
            env.CONTENT_FINDER_ATTESTER_FINDER_KEY,
          ),
          pollIntervalMs: readNumberEnv(env, ['CONTENT_FINDER_POLL_INTERVAL_MS'], 30000),
          submissionsApiUrl: readOptionalStringEnv(env, ['CONTENT_FINDER_SUBMISSIONS_API_URL']),
          submissionsFilePath: readStringEnv(
            env,
            ['CONTENT_FINDER_SUBMISSIONS_FILE_PATH'],
            './content-finder-submissions.json',
          ),
          stateFilePath: readStringEnv(
            env,
            ['CONTENT_FINDER_STATE_FILE_PATH'],
            './content-finder-state.json',
          ),
        },
      },
      ] : []),
      ...(implicationGraphNudgerEnabled ? [
      {
        name: 'implication-graph-nudger',
        kind: 'implication-graph-nudger' as const,
        enabled: implicationGraphNudgerEnabled,
        restartDelayMs: readNumberEnv(env, ['IMPLICATION_GRAPH_NUDGER_RESTART_DELAY_MS'], 1000),
        routePrefix: readStringEnv(
          env,
          ['IMPLICATION_GRAPH_NUDGER_ROUTE_PREFIX'],
          '/implication-graph-nudger',
        ),
        config: {
          nudgerPrivateKey: requireEnv(
            'IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY',
            env.IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY,
          ),
          ethereumRpcUrl: readStringEnv(
            env,
            ['IMPLICATION_GRAPH_NUDGER_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL'],
          ),
          indexerUrl: readStringEnv(
            env,
            ['IMPLICATION_GRAPH_NUDGER_INDEXER_URL', 'INDEXER_URL'],
          ),
          ipfsApiUrl: readStringEnv(
            env,
            ['IMPLICATION_GRAPH_NUDGER_IPFS_API', 'IPFS_API'],
            'http://localhost:5001',
          ),
          ipfsGatewayUrl: readStringEnv(
            env,
            ['IMPLICATION_GRAPH_NUDGER_IPFS_GATEWAY', 'IPFS_GATEWAY'],
            'http://localhost:8080',
          ),
          name: readStringEnv(
            env,
            ['IMPLICATION_GRAPH_NUDGER_NAME'],
            'Implication Graph Nudger',
          ),
          description: readStringEnv(
            env,
            ['IMPLICATION_GRAPH_NUDGER_DESCRIPTION'],
            'Suggests statements based on the implication graph',
          ),
          sourceType: readStringEnv(
            env,
            ['IMPLICATION_GRAPH_NUDGER_SOURCE_TYPE'],
            'implication-graph',
          ),
          version: readStringEnv(env, ['IMPLICATION_GRAPH_NUDGER_VERSION'], '0.1.0'),
          nudgePublicationsContractAddress: requireEnv(
            'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
            env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS,
          ),
        },
      },
      ] : []),
      ...(bridgeCreatorEnabled ? [
      {
        name: 'bridge-creator',
        kind: 'bridge-creator' as const,
        enabled: bridgeCreatorEnabled,
        restartDelayMs: readNumberEnv(env, ['BRIDGE_CREATOR_RESTART_DELAY_MS'], 1000),
        routePrefix: readStringEnv(
          env,
          ['BRIDGE_CREATOR_ROUTE_PREFIX'],
          '/bridge-creator',
        ),
        config: {
          nudgerPrivateKey: requireEnv(
            'BRIDGE_CREATOR_PRIVATE_KEY',
            env.BRIDGE_CREATOR_PRIVATE_KEY,
          ),
          ethereumRpcUrl: readStringEnv(
            env,
            ['BRIDGE_CREATOR_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL'],
          ),
          indexerUrl: readStringEnv(
            env,
            ['BRIDGE_CREATOR_INDEXER_URL', 'INDEXER_URL'],
          ),
          ipfsApiUrl: readStringEnv(
            env,
            ['BRIDGE_CREATOR_IPFS_API', 'IPFS_API'],
            'http://localhost:5001',
          ),
          ipfsGatewayUrl: readStringEnv(
            env,
            ['BRIDGE_CREATOR_IPFS_GATEWAY', 'IPFS_GATEWAY'],
            'http://localhost:8080',
          ),
          openRouterApiKey: requireEnv('OPENROUTER_API_KEY', env.OPENROUTER_API_KEY),
          openRouterModel: readStringEnv(
            env,
            ['BRIDGE_CREATOR_OPENROUTER_MODEL', 'OPENROUTER_MODEL'],
            'anthropic/claude-3.5-haiku',
          ),
          name: readStringEnv(env, ['BRIDGE_CREATOR_NAME'], 'Bridge Creator'),
          description: readStringEnv(
            env,
            ['BRIDGE_CREATOR_DESCRIPTION'],
            'Creates synthesized bridge statements from moderate positions',
          ),
          sourceType: readStringEnv(
            env,
            ['BRIDGE_CREATOR_SOURCE_TYPE'],
            'bridge-creator',
          ),
          version: readStringEnv(env, ['BRIDGE_CREATOR_VERSION'], '0.1.0'),
          nudgePublicationsContractAddress: requireEnv(
            'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
            env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS,
          ),
          commonalityStatements: readStringEnv(env, ['BRIDGE_CREATOR_COMMONALITY_STATEMENTS'], '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        },
      },
      ] : []),
      ...(explorerCuratorEnabled ? [
      {
        name: 'explorer-curator',
        kind: 'explorer-curator' as const,
        enabled: explorerCuratorEnabled,
        restartDelayMs: readNumberEnv(env, ['EXPLORER_CURATOR_RESTART_DELAY_MS'], 1000),
        routePrefix: readStringEnv(
          env,
          ['EXPLORER_CURATOR_ROUTE_PREFIX'],
          '/explorer-curator',
        ),
        config: {
          nudgerPrivateKey: requireEnv(
            'EXPLORER_CURATOR_PRIVATE_KEY',
            env.EXPLORER_CURATOR_PRIVATE_KEY,
          ),
          ethereumRpcUrl: readStringEnv(
            env,
            ['EXPLORER_CURATOR_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL'],
          ),
          indexerUrl: readStringEnv(
            env,
            ['EXPLORER_CURATOR_INDEXER_URL', 'INDEXER_URL'],
          ),
          ipfsApiUrl: readStringEnv(
            env,
            ['EXPLORER_CURATOR_IPFS_API', 'IPFS_API'],
            'http://localhost:5001',
          ),
          ipfsGatewayUrl: readStringEnv(
            env,
            ['EXPLORER_CURATOR_IPFS_GATEWAY', 'IPFS_GATEWAY'],
            'http://localhost:8080',
          ),
          openRouterApiKey: requireEnv('OPENROUTER_API_KEY', env.OPENROUTER_API_KEY),
          openRouterModel: readStringEnv(
            env,
            ['EXPLORER_CURATOR_OPENROUTER_MODEL', 'OPENROUTER_MODEL'],
            'anthropic/claude-3.5-haiku',
          ),
          name: readStringEnv(
            env,
            ['EXPLORER_CURATOR_NAME'],
            'Fundable Project Explorer',
          ),
          description: readStringEnv(
            env,
            ['EXPLORER_CURATOR_DESCRIPTION'],
            'Curates a map of fundable project areas and personalizes suggestions',
          ),
          sourceType: readStringEnv(
            env,
            ['EXPLORER_CURATOR_SOURCE_TYPE'],
            'explorer-curator',
          ),
          version: readStringEnv(env, ['EXPLORER_CURATOR_VERSION'], '0.1.0'),
          nudgePublicationsContractAddress: requireEnv(
            'NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
            env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS,
          ),
          stream: readStringEnv(
            env,
            ['EXPLORER_CURATOR_STREAM', 'EXPLORER_STREAM'],
            'fundable-project-explorer',
          ),
          curatorIntervalMs: readNumberEnv(
            env,
            ['EXPLORER_CURATOR_INTERVAL_MS', 'CURATOR_INTERVAL_MS'],
            6 * 60 * 60 * 1000,
          ),
        },
      },
      ] : []),
    ],
  };
}

export const loadWorkerHostConfigFromEnv = loadServiceHostConfigFromEnv;
