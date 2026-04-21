import type { LlmNudgerConfig } from '@commonality/nudger-core';

function requireEnv(name: string, value: string | undefined = process.env[name]): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function readStringEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function readNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return parsed;
}

export interface ExplorerCuratorConfig extends LlmNudgerConfig {
  stream: string;
  curatorIntervalMs: number;
}

export function loadConfig(): ExplorerCuratorConfig {
  return {
    nudgerPrivateKey: requireEnv('NUDGER_PRIVATE_KEY', process.env.NUDGER_PRIVATE_KEY) as `0x${string}`,
    ethereumRpcUrl: requireEnv('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL),
    indexerUrl: readStringEnv('INDEXER_URL', 'http://localhost:3001'),
    ipfsApiUrl: readStringEnv('IPFS_API', 'http://localhost:5001'),
    ipfsGatewayUrl: readStringEnv('IPFS_GATEWAY', 'http://localhost:8080'),
    openRouterApiKey: requireEnv('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY),
    openRouterModel: readStringEnv('OPENROUTER_MODEL', 'anthropic/claude-3.5-haiku'),
    port: readNumberEnv('PORT', 3004),
    name: readStringEnv('NUDGER_NAME', 'Fundable Project Explorer'),
    description: readStringEnv('NUDGER_DESCRIPTION', 'Curates a map of fundable project areas and personalizes suggestions'),
    sourceType: readStringEnv('NUDGER_SOURCE_TYPE', 'explorer-curator'),
    version: readStringEnv('NUDGER_VERSION', '0.1.0'),
    nudgePublicationsContractAddress: requireEnv('NUDGE_PUBLICATIONS_CONTRACT_ADDRESS', process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS),
    stream: readStringEnv('EXPLORER_STREAM', 'fundable-project-explorer'),
    curatorIntervalMs: readNumberEnv('CURATOR_INTERVAL_MS', 6 * 60 * 60 * 1000),
  };
}
