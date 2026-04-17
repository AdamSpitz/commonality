function requireEnv(name: string, value: string | undefined = process.env[name]): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
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

export interface NudgerConfig {
  nudgerPrivateKey: string;
  ethereumRpcUrl: string;
  indexerUrl: string;
  ipfsApiUrl: string;
  ipfsGatewayUrl: string;
  openRouterApiKey: string;
  openRouterModel: string;
  port: number;
  name: string;
  description: string;
  sourceType: string;
  version: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export function loadConfig(): NudgerConfig {
  return {
    nudgerPrivateKey: requireEnv('NUDGER_PRIVATE_KEY', process.env.NUDGER_PRIVATE_KEY) as `0x${string}`,
    ethereumRpcUrl: requireEnv('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL),
    indexerUrl: readStringEnv('INDEXER_URL', 'http://localhost:3001'),
    ipfsApiUrl: readStringEnv('IPFS_API', 'http://localhost:5001'),
    ipfsGatewayUrl: readStringEnv('IPFS_GATEWAY', 'http://localhost:8080'),
    openRouterApiKey: requireEnv('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY),
    openRouterModel: readStringEnv('OPENROUTER_MODEL', 'anthropic/claude-3.5-haiku'),
    port: readNumberEnv('PORT', 3002),
    name: readStringEnv('NUDGER_NAME', 'Implication Graph Nudger'),
    description: readStringEnv('NUDGER_DESCRIPTION', 'Suggests statements based on the implication graph'),
    sourceType: readStringEnv('NUDGER_SOURCE_TYPE', 'implication-graph'),
    version: readStringEnv('NUDGER_VERSION', '0.1.0'),
    rateLimitWindowMs: readNumberEnv('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMaxRequests: readNumberEnv('RATE_LIMIT_MAX_REQUESTS', 100),
  };
}

export function getIpfsConfig(config: NudgerConfig = loadConfig()) {
  return {
    apiUrl: config.ipfsApiUrl,
    gatewayUrl: config.ipfsGatewayUrl,
  };
}

export function getIndexerConfig(config: NudgerConfig = loadConfig()) {
  return {
    url: config.indexerUrl,
  };
}