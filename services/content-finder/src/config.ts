export interface ContentFinderConfig {
  platformApiUrl: string;
  attesterUrl: string;
  attesterFinderKey: string;
  pollIntervalMs: number;
  submissionsApiUrl?: string;
  submissionsFilePath: string;
  stateFilePath: string;
  suggestionQueueCapacity: number;
  finderQueueCapacity: number;
  monthlySpendCeilingUsd?: number;
  estimatedEvaluationUsd: number;
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

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ContentFinderConfig {
  return validateConfig({
    platformApiUrl: readStringFrom(
      ['CONTENT_FINDER_PLATFORM_API_URL', 'PLATFORM_API_URL'],
      env,
    ),
    attesterUrl: requireEnvFrom('CONTENT_FINDER_ATTESTER_URL', env),
    attesterFinderKey: requireEnvFrom('CONTENT_FINDER_ATTESTER_FINDER_KEY', env),
    pollIntervalMs: readNumberFrom(['CONTENT_FINDER_POLL_INTERVAL_MS'], env, 30000),
    submissionsApiUrl: readOptionalStringFrom(['CONTENT_FINDER_SUBMISSIONS_API_URL'], env),
    submissionsFilePath: readStringFrom(
      ['CONTENT_FINDER_SUBMISSIONS_FILE_PATH'],
      env,
      './content-finder-submissions.json',
    ),
    stateFilePath: readStringFrom(
      ['CONTENT_FINDER_STATE_FILE_PATH'],
      env,
      './content-finder-state.json',
    ),
    suggestionQueueCapacity: readNumberFrom(['CONTENT_FINDER_SUGGESTION_QUEUE_CAPACITY'], env, 100),
    finderQueueCapacity: readNumberFrom(['CONTENT_FINDER_FINDER_QUEUE_CAPACITY'], env, 100),
    monthlySpendCeilingUsd: readOptionalNumberFrom(['CONTENT_FINDER_MONTHLY_SPEND_CEILING_USD'], env),
    estimatedEvaluationUsd: readNumberFrom(['CONTENT_FINDER_ESTIMATED_EVALUATION_USD'], env, 0),
  });
}

function readOptionalNumberFrom(names: readonly string[], env: NodeJS.ProcessEnv): number | undefined {
  const raw = readOptionalStringFrom(names, env);
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${names[0]}`);
  }
  return parsed;
}

export function loadConfig(): ContentFinderConfig {
  const required = (name: string, value: string | undefined): string => {
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  return validateConfig({
    platformApiUrl: required('PLATFORM_API_URL', process.env.PLATFORM_API_URL),
    attesterUrl: required('ATTESTER_URL', process.env.ATTESTER_URL),
    attesterFinderKey: required('ATTESTER_FINDER_KEY', process.env.ATTESTER_FINDER_KEY),
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10),
    submissionsApiUrl: process.env.SUBMISSIONS_API_URL,
    submissionsFilePath: process.env.SUBMISSIONS_FILE_PATH || './content-finder-submissions.json',
    stateFilePath: process.env.STATE_FILE_PATH || './content-finder-state.json',
    suggestionQueueCapacity: Number(process.env.CONTENT_FINDER_SUGGESTION_QUEUE_CAPACITY || 100),
    finderQueueCapacity: Number(process.env.CONTENT_FINDER_FINDER_QUEUE_CAPACITY || 100),
    monthlySpendCeilingUsd: process.env.CONTENT_FINDER_MONTHLY_SPEND_CEILING_USD
      ? Number(process.env.CONTENT_FINDER_MONTHLY_SPEND_CEILING_USD)
      : undefined,
    estimatedEvaluationUsd: Number(process.env.CONTENT_FINDER_ESTIMATED_EVALUATION_USD || 0),
  });
}

function validateConfig(config: ContentFinderConfig): ContentFinderConfig {
  for (const value of [config.suggestionQueueCapacity, config.finderQueueCapacity]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Queue capacities must be non-negative integers');
  }
  for (const value of [config.estimatedEvaluationUsd, config.monthlySpendCeilingUsd ?? 0]) {
    if (!Number.isFinite(value) || value < 0) throw new Error('Spend limits and estimates must be finite and non-negative');
  }
  if (config.monthlySpendCeilingUsd !== undefined && config.estimatedEvaluationUsd <= 0) {
    throw new Error('A monthly spend ceiling requires a positive evaluation cost estimate');
  }
  return config;
}
