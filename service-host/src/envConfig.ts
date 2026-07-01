import type { HostedServiceConfig, ServiceHostConfig, ServiceKind } from './config.js';
import { serviceKinds } from './config.js';
import { loadConfigFromEnv as loadImplicationAttesterConfig } from '@commonality/implication-attester';
import { loadConfigFromEnv as loadBeatAgentConfig } from '@commonality/beat-agent';
import { loadConfigFromEnv as loadBeatMemoryConfig } from '@commonality/beat-memory';
import { loadConfigFromEnv as loadContentAttesterConfig } from '@commonality/content-attester';
import { loadConfigFromEnv as loadImplicationFinderConfig } from '@commonality/implication-finder';
import { loadConfigFromEnv as loadContentFinderConfig } from '@commonality/content-finder';
import { loadConfigFromEnv as loadImplicationGraphNudgerConfig } from '@commonality/implication-graph-nudger';
import { loadConfigFromEnv as loadBridgeCreatorConfig } from '@commonality/bridge-creator';
import { loadConfigFromEnv as loadExplorerCuratorConfig } from '@commonality/explorer-curator';
import { loadConfigFromEnv as loadRecurringPledgeSchedulerConfig } from './recurringPledgeScheduler.js';

const httpServiceKinds = new Set<ServiceKind>([
  'implication-graph-nudger',
  'bridge-creator',
  'explorer-curator',
  'implication-attester',
  'content-attester',
  'beat-memory',
  'beat-agent',
]);

function readOptionalStringFrom(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = env[name];
    if (value) return value;
  }
  return undefined;
}

function readNumberFrom(
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

function readBooleanFrom(
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

// Multi-instance support

function kindToEnvPrefix(kind: ServiceKind): string {
  return kind.toUpperCase().replace(/-/g, '_');
}

function deriveKindFromInstanceName(instanceName: string): ServiceKind {
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

function buildInstanceEnv(
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

const serviceConfigLoaders: Record<ServiceKind, (env: NodeJS.ProcessEnv) => Record<string, unknown>> = {
  'implication-attester': (e) => loadImplicationAttesterConfig(e) as unknown as Record<string, unknown>,
  'content-attester': (e) => loadContentAttesterConfig(e) as unknown as Record<string, unknown>,
  'beat-memory': (e) => loadBeatMemoryConfig(e) as unknown as Record<string, unknown>,
  'beat-agent': (e) => loadBeatAgentConfig(e) as unknown as Record<string, unknown>,
  'implication-finder': (e) => loadImplicationFinderConfig(e) as unknown as Record<string, unknown>,
  'content-finder': (e) => loadContentFinderConfig(e) as unknown as Record<string, unknown>,
  'implication-graph-nudger': (e) => loadImplicationGraphNudgerConfig(e) as unknown as Record<string, unknown>,
  'bridge-creator': (e) => loadBridgeCreatorConfig(e) as unknown as Record<string, unknown>,
  'explorer-curator': (e) => loadExplorerCuratorConfig(e) as unknown as Record<string, unknown>,
  'recurring-pledge-scheduler': (e) => loadRecurringPledgeSchedulerConfig(e) as unknown as Record<string, unknown>,
};

function buildInstanceService(
  instanceName: string,
  env: NodeJS.ProcessEnv,
): HostedServiceConfig {
  const kind = deriveKindFromInstanceName(instanceName);
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
    config: serviceConfigLoaders[kind](instanceEnv),
  };
}

function buildInstancesFromEnv(env: NodeJS.ProcessEnv): HostedServiceConfig[] {
  const raw = env.SERVICE_HOST_INSTANCES;
  if (!raw) return [];

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((name) => buildInstanceService(name, env));
}

// Single-instance-per-kind (legacy) support

function buildSingleKindService(
  kind: ServiceKind,
  enabled: boolean,
  env: NodeJS.ProcessEnv,
): HostedServiceConfig | null {
  if (!enabled) return null;

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
    config: serviceConfigLoaders[kind](env),
  };
}

export function loadServiceHostConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ServiceHostConfig {
  const instances = buildInstancesFromEnv(env);

  if (instances.length > 0) {
    return {
      port: readNumberFrom(env, ['SERVICE_HOST_PORT', 'PORT'], 3000),
      services: instances,
    };
  }

  const implicationAttesterEnabled = readBooleanFrom(env, ['IMPLICATION_ATTESTER_ENABLED'], true);
  const contentAttesterEnabled = readBooleanFrom(env, ['CONTENT_ATTESTER_ENABLED'], true);
  const beatMemoryEnabled = readBooleanFrom(env, ['BEAT_MEMORY_ENABLED'], false);
  const beatAgentEnabled = readBooleanFrom(env, ['BEAT_AGENT_ENABLED'], false);
  const implicationFinderEnabled = readBooleanFrom(env, ['IMPLICATION_FINDER_ENABLED'], true);
  const contentFinderEnabled = readBooleanFrom(env, ['CONTENT_FINDER_ENABLED'], true);
  const implicationGraphNudgerEnabled = readBooleanFrom(env, ['IMPLICATION_GRAPH_NUDGER_ENABLED'], true);
  const bridgeCreatorEnabled = readBooleanFrom(env, ['BRIDGE_CREATOR_ENABLED'], true);
  const explorerCuratorEnabled = readBooleanFrom(env, ['EXPLORER_CURATOR_ENABLED'], true);
  const recurringPledgeSchedulerEnabled = readBooleanFrom(env, ['RECURRING_PLEDGE_SCHEDULER_ENABLED'], false);

  return {
    port: readNumberFrom(env, ['SERVICE_HOST_PORT', 'PORT'], 3000),
    services: [
      buildSingleKindService('implication-attester', implicationAttesterEnabled, env),
      buildSingleKindService('content-attester', contentAttesterEnabled, env),
      buildSingleKindService('beat-memory', beatMemoryEnabled, env),
      buildSingleKindService('beat-agent', beatAgentEnabled, env),
      buildSingleKindService('implication-finder', implicationFinderEnabled, env),
      buildSingleKindService('content-finder', contentFinderEnabled, env),
      buildSingleKindService('implication-graph-nudger', implicationGraphNudgerEnabled, env),
      buildSingleKindService('bridge-creator', bridgeCreatorEnabled, env),
      buildSingleKindService('explorer-curator', explorerCuratorEnabled, env),
      buildSingleKindService('recurring-pledge-scheduler', recurringPledgeSchedulerEnabled, env),
    ].filter((service): service is HostedServiceConfig => service !== null),
  };
}
