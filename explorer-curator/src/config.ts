import type { LlmNudgerConfig } from '@commonality/nudger-core';

export interface ExplorerCuratorConfig extends LlmNudgerConfig {
  stream: string;
  curatorIntervalMs: number;
  intakeIntervalMs: number;
  fullReviewIntervalMs: number;
  pendingImportanceThreshold: number;
  trustedImplicationAttesters?: string[];
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ExplorerCuratorConfig {
  function requireFrom(name: string): string {
    const value = env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  function readString(names: readonly string[], fallback: string): string {
    for (const name of names) {
      const value = env[name];
      if (value) return value;
    }
    return fallback;
  }

  function readNumber(names: readonly string[], fallback: number): number {
    const raw = readString(names, '');
    if (!raw) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric environment variable: ${names[0]}`);
    }
    return parsed;
  }

  function readCsv(names: readonly string[]): string[] | undefined {
    const raw = readString(names, '');
    if (!raw) return undefined;
    const values = raw.split(',').map((value) => value.trim()).filter(Boolean);
    return values.length > 0 ? values : undefined;
  }

  return {
    nudgerPrivateKey: requireFrom('EXPLORER_CURATOR_PRIVATE_KEY'),
    ethereumRpcUrl: readString(
      ['EXPLORER_CURATOR_ETHEREUM_RPC_URL', 'ETHEREUM_RPC_URL'],
      '',
    ),
    indexerUrl: readString(['EXPLORER_CURATOR_INDEXER_URL', 'INDEXER_URL'], 'http://localhost:3001'),
    ipfsApiUrl: readString(['EXPLORER_CURATOR_IPFS_API', 'IPFS_API'], 'http://localhost:5001'),
    ipfsGatewayUrl: readString(['EXPLORER_CURATOR_IPFS_GATEWAY', 'IPFS_GATEWAY'], 'http://localhost:8080'),
    openRouterApiKey: requireFrom('OPENROUTER_API_KEY'),
    openRouterModel: readString(['EXPLORER_CURATOR_OPENROUTER_MODEL', 'OPENROUTER_MODEL'], 'anthropic/claude-3.5-haiku'),
    name: readString(['EXPLORER_CURATOR_NAME'], 'Fundable Project Explorer'),
    description: readString(['EXPLORER_CURATOR_DESCRIPTION'], 'Curates a map of fundable project areas and personalizes suggestions'),
    sourceType: readString(['EXPLORER_CURATOR_SOURCE_TYPE'], 'explorer-curator'),
    version: readString(['EXPLORER_CURATOR_VERSION'], '0.1.0'),
    nudgePublicationsContractAddress: requireFrom('NUDGE_PUBLICATIONS_CONTRACT_ADDRESS'),
    stream: readString(['EXPLORER_CURATOR_STREAM', 'EXPLORER_STREAM'], 'fundable-project-explorer'),
    curatorIntervalMs: readNumber(['EXPLORER_CURATOR_INTERVAL_MS', 'CURATOR_INTERVAL_MS'], 6 * 60 * 60 * 1000),
    intakeIntervalMs: readNumber(['EXPLORER_CURATOR_INTAKE_INTERVAL_MS', 'CURATOR_INTAKE_INTERVAL_MS'], 15 * 60 * 1000),
    fullReviewIntervalMs: readNumber(['EXPLORER_CURATOR_FULL_REVIEW_INTERVAL_MS', 'CURATOR_FULL_REVIEW_INTERVAL_MS'], 6 * 60 * 60 * 1000),
    pendingImportanceThreshold: readNumber(['EXPLORER_CURATOR_PENDING_IMPORTANCE_THRESHOLD', 'CURATOR_PENDING_IMPORTANCE_THRESHOLD'], 25),
    trustedImplicationAttesters: readCsv(['EXPLORER_CURATOR_TRUSTED_IMPLICATION_ATTESTERS', 'TRUSTED_IMPLICATION_ATTESTERS']),
  };
}

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

function readCsvEnv(name: string): string[] | undefined {
  const rawValue = process.env[name];
  if (!rawValue) return undefined;
  const values = rawValue.split(',').map((value) => value.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
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
    name: readStringEnv('NUDGER_NAME', 'Fundable Project Explorer'),
    description: readStringEnv('NUDGER_DESCRIPTION', 'Curates a map of fundable project areas and personalizes suggestions'),
    sourceType: readStringEnv('NUDGER_SOURCE_TYPE', 'explorer-curator'),
    version: readStringEnv('NUDGER_VERSION', '0.1.0'),
    nudgePublicationsContractAddress: requireEnv('NUDGE_PUBLICATIONS_CONTRACT_ADDRESS', process.env.NUDGE_PUBLICATIONS_CONTRACT_ADDRESS),
    stream: readStringEnv('EXPLORER_STREAM', 'fundable-project-explorer'),
    curatorIntervalMs: readNumberEnv('CURATOR_INTERVAL_MS', 6 * 60 * 60 * 1000),
    intakeIntervalMs: readNumberEnv('CURATOR_INTAKE_INTERVAL_MS', 15 * 60 * 1000),
    fullReviewIntervalMs: readNumberEnv('CURATOR_FULL_REVIEW_INTERVAL_MS', 6 * 60 * 60 * 1000),
    pendingImportanceThreshold: readNumberEnv('CURATOR_PENDING_IMPORTANCE_THRESHOLD', 25),
    trustedImplicationAttesters: readCsvEnv('TRUSTED_IMPLICATION_ATTESTERS'),
  };
}
