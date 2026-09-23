import type { HostedServiceConfig, ServiceKind } from './config.js';
import { serviceKinds } from './config.js';

export const httpServiceKinds = new Set<ServiceKind>([
  'implication-graph-nudger',
  'bridge-creator',
  'explorer-curator',
  'implication-attester',
  'content-attester',
  'beat-memory',
  'beat-agent',
]);

export type ServiceConfigLoader = (env: NodeJS.ProcessEnv) => Record<string, unknown>;

export function readOptionalStringFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return undefined;
}

export function readNumberFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: number,
): number {
  const raw = readOptionalStringFrom(env, names);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${names[0]}`);
  }
  return parsed;
}

export function readBooleanFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
  fallback: boolean,
): boolean {
  const raw = readOptionalStringFrom(env, names);
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower === 'true' || lower === '1') return true;
  if (lower === 'false' || lower === '0') return false;
  throw new Error(`Invalid boolean environment variable: ${names[0]} must be true/false/1/0`);
}

export function kindToEnvPrefix(kind: ServiceKind): string {
  return kind.toUpperCase().replace(/-/g, '_');
}

export function deriveKindFromInstanceName(instanceName: string): ServiceKind {
  const normalized = instanceName.toLowerCase();
  for (const kind of serviceKinds) {
    const kindPrefix = kind + '-';
    const kindUnderscore = kind.replace(/-/g, '_') + '_';
    if (
      normalized === kind ||
      normalized.startsWith(kindPrefix) ||
      normalized.startsWith(kindUnderscore)
    ) {
      return kind;
    }
  }
  throw new Error(
    `Cannot derive service kind from instance name "${instanceName}". ` +
    `Instance names must start with a known kind (${serviceKinds.join(', ')}).`,
  );
}

export function buildInstanceEnv(
  instanceName: string,
  kind: ServiceKind,
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const instancePrefix = instanceName.toUpperCase().replace(/-/g, '_') + '_';
  const kindPrefix = kindToEnvPrefix(kind) + '_';
  const result: NodeJS.ProcessEnv = { ...env };

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (key.startsWith(instancePrefix)) {
      const suffix = key.slice(instancePrefix.length);
      result[kindPrefix + suffix] = value;
    }
  }

  return result;
}

export function buildInstanceService(
  instanceName: string,
  env: NodeJS.ProcessEnv,
  loaders: Partial<Record<ServiceKind, ServiceConfigLoader>>,
): HostedServiceConfig {
  const kind = deriveKindFromInstanceName(instanceName);
  const loader = loaders[kind];
  if (!loader) {
    throw new Error(`No config loader for service kind "${kind}".`);
  }
  const instanceEnv = buildInstanceEnv(instanceName, kind, env);
  const kindPrefix = kindToEnvPrefix(kind);
  const instancePrefix = instanceName.toUpperCase().replace(/-/g, '_') + '_';

  const routePrefix = readOptionalStringFrom(env, [
    `${instancePrefix}ROUTE_PREFIX`,
    `${kindPrefix}_ROUTE_PREFIX`,
  ]);

  const restartDelayMs = readNumberFrom(env, [
    `${instancePrefix}RESTART_DELAY_MS`,
    `${kindPrefix}_RESTART_DELAY_MS`,
  ], 1000);

  const hasHttpApp = httpServiceKinds.has(kind);

  return {
    name: instanceName,
    kind,
    enabled: true,
    restartDelayMs,
    ...(routePrefix ? { routePrefix } : hasHttpApp ? { routePrefix: `/${instanceName}` } : {}),
    config: loader(instanceEnv),
  };
}

export function buildInstancesFromEnv(
  env: NodeJS.ProcessEnv,
  loaders: Partial<Record<ServiceKind, ServiceConfigLoader>>,
): HostedServiceConfig[] {
  const raw = env.SERVICE_HOST_INSTANCES;
  if (!raw) return [];

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((name) => buildInstanceService(name, env, loaders));
}

export function buildSingleKindService(
  kind: ServiceKind,
  enabled: boolean,
  env: NodeJS.ProcessEnv,
  loaders: Partial<Record<ServiceKind, ServiceConfigLoader>>,
): HostedServiceConfig | null {
  if (!enabled) return null;
  const loader = loaders[kind];
  if (!loader) {
    throw new Error(`No config loader for service kind "${kind}".`);
  }

  const kindPrefix = kindToEnvPrefix(kind);
  const restartDelayMs = readNumberFrom(env, [`${kindPrefix}_RESTART_DELAY_MS`], 1000);
  const routePrefix = readOptionalStringFrom(env, [`${kindPrefix}_ROUTE_PREFIX`]);
  const hasHttpApp = httpServiceKinds.has(kind);

  return {
    name: kind,
    kind,
    enabled: true,
    restartDelayMs,
    ...(routePrefix ? { routePrefix } : hasHttpApp ? { routePrefix: `/${kind}` } : {}),
    config: loader(env),
  };
}
