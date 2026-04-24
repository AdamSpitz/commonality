import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const workerKinds = [
  'implication-finder',
  'content-finder',
  'implication-graph-nudger',
  'bridge-creator',
  'explorer-curator',
  'implication-attester',
  'content-attester',
] as const;

export type WorkerKind = (typeof workerKinds)[number];

export interface HostedWorkerConfig {
  name: string;
  kind: WorkerKind;
  config: Record<string, unknown>;
  enabled?: boolean;
  restartDelayMs?: number;
  routePrefix?: string;
}

export interface WorkerHostConfig {
  port?: number;
  workers: HostedWorkerConfig[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid worker-host config: ${fieldName} must be a non-empty string`);
  }
  return value;
}

function assertOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid worker-host config: ${fieldName} must be a boolean when provided`);
  }
  return value;
}

function assertOptionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid worker-host config: ${fieldName} must be a non-negative number when provided`);
  }
  return value;
}

function assertOptionalRoutePrefix(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid worker-host config: ${fieldName} must be a non-empty string when provided`);
  }
  if (!value.startsWith('/')) {
    throw new Error(`Invalid worker-host config: ${fieldName} must start with "/"`);
  }
  return value;
}

function assertWorkerKind(value: unknown, fieldName: string): WorkerKind {
  if (typeof value !== 'string' || !workerKinds.includes(value as WorkerKind)) {
    throw new Error(
      `Invalid worker-host config: ${fieldName} must be one of ${workerKinds.join(', ')}`,
    );
  }
  return value as WorkerKind;
}

function parseHostedWorkerConfig(value: unknown, index: number): HostedWorkerConfig {
  if (!isRecord(value)) {
    throw new Error(`Invalid worker-host config: workers[${index}] must be an object`);
  }

  if (!isRecord(value.config)) {
    throw new Error(`Invalid worker-host config: workers[${index}].config must be an object`);
  }

  return {
    name: assertString(value.name, `workers[${index}].name`),
    kind: assertWorkerKind(value.kind, `workers[${index}].kind`),
    config: value.config,
    enabled: assertOptionalBoolean(value.enabled, `workers[${index}].enabled`),
    restartDelayMs: assertOptionalNumber(value.restartDelayMs, `workers[${index}].restartDelayMs`),
    routePrefix: assertOptionalRoutePrefix(value.routePrefix, `workers[${index}].routePrefix`),
  };
}

export function parseWorkerHostConfig(value: unknown): WorkerHostConfig {
  if (!isRecord(value)) {
    throw new Error('Invalid worker-host config: top-level JSON value must be an object');
  }

  if (!Array.isArray(value.workers) || value.workers.length === 0) {
    throw new Error('Invalid worker-host config: workers must be a non-empty array');
  }

  const workers = value.workers.map((worker, index) => parseHostedWorkerConfig(worker, index));
  const port = assertOptionalNumber(value.port, 'port');
  const routedWorkers = workers.filter((worker) => worker.routePrefix && worker.enabled !== false);

  if (routedWorkers.length > 0 && port === undefined) {
    throw new Error('Invalid worker-host config: port is required when any worker has a routePrefix');
  }

  return { port, workers };
}

export async function loadWorkerHostConfig(configPath: string): Promise<WorkerHostConfig> {
  const resolvedPath = resolve(configPath);
  const raw = await readFile(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return parseWorkerHostConfig(parsed);
}

export const loadServiceHostConfig = loadWorkerHostConfig;

export function getServiceHostConfigPath(argv: string[], env = process.env): string {
  const cliPath = argv[2];
  const envPath = env.SERVICE_HOST_CONFIG || env.WORKER_HOST_CONFIG;
  const configPath = cliPath || envPath;
  if (!configPath) {
    throw new Error('Missing service-host config path. Pass a JSON file path or set SERVICE_HOST_CONFIG.');
  }
  return configPath;
}

export function getWorkerHostConfigPath(argv: string[], env = process.env): string {
  return getServiceHostConfigPath(argv, env);
}
