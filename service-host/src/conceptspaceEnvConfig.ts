import { loadConfigFromEnv as loadBeatMemoryConfig } from '@commonality/beat-memory';
import { loadConfigFromEnv as loadBridgeCreatorConfig } from '@commonality/bridge-creator';
import { loadConfigFromEnv as loadExplorerCuratorConfig } from '@commonality/explorer-curator';
import { loadConfigFromEnv as loadImplicationAttesterConfig } from '@commonality/implication-attester';
import { loadConfigFromEnv as loadImplicationFinderConfig } from '@commonality/implication-finder';
import { loadConfigFromEnv as loadImplicationGraphNudgerConfig } from '@commonality/implication-graph-nudger';
import {
  assertConceptspaceServiceKind,
  conceptspaceServiceKinds,
  type ServiceHostConfig,
  type ServiceKind,
} from './config.js';
import {
  buildInstancesFromEnv,
  buildSingleKindService,
  deriveKindFromInstanceName,
  readBooleanFrom,
  readNumberFrom,
  type ServiceConfigLoader,
} from './hostEnv.js';

/** Conceptspace loaders only. Do not import funding services or the pledge scheduler here. */
const conceptspaceConfigLoaders: Partial<Record<ServiceKind, ServiceConfigLoader>> = {
  'implication-attester': (e) => loadImplicationAttesterConfig(e) as unknown as Record<string, unknown>,
  'beat-memory': (e) => loadBeatMemoryConfig(e) as unknown as Record<string, unknown>,
  'implication-finder': (e) => loadImplicationFinderConfig(e) as unknown as Record<string, unknown>,
  'implication-graph-nudger': (e) => loadImplicationGraphNudgerConfig(e) as unknown as Record<string, unknown>,
  'bridge-creator': (e) => loadBridgeCreatorConfig(e) as unknown as Record<string, unknown>,
  'explorer-curator': (e) => loadExplorerCuratorConfig(e) as unknown as Record<string, unknown>,
};

export function loadConceptspaceServiceHostConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ServiceHostConfig {
  for (const name of (env.SERVICE_HOST_INSTANCES ?? '').split(',')) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    assertConceptspaceServiceKind(deriveKindFromInstanceName(trimmed));
  }
  const instances = buildInstancesFromEnv(env, conceptspaceConfigLoaders);
  if (instances.length > 0) {
    return {
      port: readNumberFrom(env, ['SERVICE_HOST_PORT', 'PORT'], 3000),
      services: instances,
    };
  }

  const services = conceptspaceServiceKinds.map((kind) => {
    const enabled = readBooleanFrom(env, [`${kind.toUpperCase().replace(/-/g, '_')}_ENABLED`], defaultEnabled(kind));
    return buildSingleKindService(kind, enabled, env, conceptspaceConfigLoaders);
  }).filter((service) => service !== null);

  return {
    port: readNumberFrom(env, ['SERVICE_HOST_PORT', 'PORT'], 3000),
    services,
  };
}

function defaultEnabled(kind: (typeof conceptspaceServiceKinds)[number]): boolean {
  if (kind === 'beat-memory' || kind === 'explorer-curator') return false;
  return true;
}
