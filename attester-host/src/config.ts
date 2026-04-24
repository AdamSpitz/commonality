import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ContentAttesterConfig } from '@commonality/content-attester';
import type { AttesterConfig } from '@commonality/implication-attester';

export interface HostedAttesterDefinition<TConfig> {
  routePrefix: string;
  config: TConfig;
}

export interface AttesterHostConfig {
  port: number;
  implicationAttester: HostedAttesterDefinition<AttesterConfig>;
  contentAttester: HostedAttesterDefinition<ContentAttesterConfig>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid attester-host config: ${fieldName} must be a non-empty string`);
  }
  return value;
}

function assertNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid attester-host config: ${fieldName} must be a non-negative number`);
  }
  return value;
}

function assertRoutePrefix(value: unknown, fieldName: string): string {
  const routePrefix = assertString(value, fieldName);
  if (!routePrefix.startsWith('/')) {
    throw new Error(`Invalid attester-host config: ${fieldName} must start with "/"`);
  }
  if (routePrefix.length > 1 && routePrefix.endsWith('/')) {
    throw new Error(`Invalid attester-host config: ${fieldName} must not end with "/"`);
  }
  return routePrefix;
}

function parseHostedAttesterDefinition<TConfig>(
  value: unknown,
  fieldName: string,
): HostedAttesterDefinition<TConfig> {
  if (!isRecord(value)) {
    throw new Error(`Invalid attester-host config: ${fieldName} must be an object`);
  }

  if (!isRecord(value.config)) {
    throw new Error(`Invalid attester-host config: ${fieldName}.config must be an object`);
  }

  return {
    routePrefix: assertRoutePrefix(value.routePrefix, `${fieldName}.routePrefix`),
    config: value.config as TConfig,
  };
}

export function parseAttesterHostConfig(value: unknown): AttesterHostConfig {
  if (!isRecord(value)) {
    throw new Error('Invalid attester-host config: top-level JSON value must be an object');
  }

  return {
    port: assertNumber(value.port, 'port'),
    implicationAttester: parseHostedAttesterDefinition<AttesterConfig>(
      value.implicationAttester,
      'implicationAttester',
    ),
    contentAttester: parseHostedAttesterDefinition<ContentAttesterConfig>(
      value.contentAttester,
      'contentAttester',
    ),
  };
}

export async function loadAttesterHostConfig(configPath: string): Promise<AttesterHostConfig> {
  const raw = await readFile(resolve(configPath), 'utf8');
  return parseAttesterHostConfig(JSON.parse(raw) as unknown);
}

export function getAttesterHostConfigPath(argv: string[], env = process.env): string {
  const cliPath = argv[2];
  const envPath = env.ATTESTER_HOST_CONFIG;
  const configPath = cliPath || envPath;
  if (!configPath) {
    throw new Error('Missing attester-host config path. Pass a JSON file path or set ATTESTER_HOST_CONFIG.');
  }
  return configPath;
}
