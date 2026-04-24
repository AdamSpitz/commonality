export interface FinderConfig {
  eventCacheUrl: string;
  attesterUrl: string;
  attesterFinderKey: string;
  beliefsContractAddress: `0x${string}`;
  implicationsContractAddress: `0x${string}`;
  ipfsGatewayUrl: string;
  pollIntervalMs: number;
  topNStatements: number;
  minBelieverThreshold: number;
  stateFilePath: string;
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

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): FinderConfig {
  return {
    eventCacheUrl: readStringFrom(
      ['IMPLICATION_FINDER_EVENT_CACHE_URL', 'EVENT_CACHE_URL'],
      env,
    ),
    attesterUrl: requireEnvFrom('IMPLICATION_FINDER_ATTESTER_URL', env),
    attesterFinderKey: requireEnvFrom('IMPLICATION_FINDER_ATTESTER_FINDER_KEY', env),
    beliefsContractAddress: requireEnvFrom('BELIEFS_CONTRACT_ADDRESS', env) as `0x${string}`,
    implicationsContractAddress: requireEnvFrom('IMPLICATIONS_CONTRACT_ADDRESS', env) as `0x${string}`,
    ipfsGatewayUrl: readStringFrom(
      ['IMPLICATION_FINDER_IPFS_GATEWAY_URL', 'IPFS_GATEWAY_URL', 'IPFS_GATEWAY'],
      env,
    ),
    pollIntervalMs: readNumberFrom(['IMPLICATION_FINDER_POLL_INTERVAL_MS'], env, 30000),
    topNStatements: readNumberFrom(['IMPLICATION_FINDER_TOP_N_STATEMENTS'], env, 20),
    minBelieverThreshold: readNumberFrom(['IMPLICATION_FINDER_MIN_BELIEVER_THRESHOLD'], env, 2),
    stateFilePath: readStringFrom(['IMPLICATION_FINDER_STATE_FILE_PATH'], env, './finder-state.json'),
  };
}

export function loadConfig(): FinderConfig {
  const required = (name: string, value: string | undefined): string => {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  return {
    eventCacheUrl: required('EVENT_CACHE_URL', process.env.EVENT_CACHE_URL),
    attesterUrl: required('ATTESTER_URL', process.env.ATTESTER_URL),
    attesterFinderKey: required('ATTESTER_FINDER_KEY', process.env.ATTESTER_FINDER_KEY),
    beliefsContractAddress: required('BELIEFS_CONTRACT_ADDRESS', process.env.BELIEFS_CONTRACT_ADDRESS) as `0x${string}`,
    implicationsContractAddress: required('IMPLICATIONS_CONTRACT_ADDRESS', process.env.IMPLICATIONS_CONTRACT_ADDRESS) as `0x${string}`,
    ipfsGatewayUrl: required('IPFS_GATEWAY_URL', process.env.IPFS_GATEWAY_URL),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10),
    topNStatements: parseInt(process.env.TOP_N_STATEMENTS || '20', 10),
    minBelieverThreshold: parseInt(process.env.MIN_BELIEVER_THRESHOLD || '2', 10),
    stateFilePath: process.env.STATE_FILE_PATH || './finder-state.json',
  };
}
