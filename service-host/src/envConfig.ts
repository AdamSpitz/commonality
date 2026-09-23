import type { HostedServiceConfig, ServiceHostConfig, ServiceKind } from './config.js';
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
import {
  buildInstancesFromEnv,
  buildSingleKindService,
  readBooleanFrom,
  readNumberFrom,
  type ServiceConfigLoader,
} from './hostEnv.js';

const serviceConfigLoaders: Record<ServiceKind, ServiceConfigLoader> = {
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

export function loadServiceHostConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ServiceHostConfig {
  const instances = buildInstancesFromEnv(env, serviceConfigLoaders);

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
  // Off unless explicitly enabled. See ADR 0014.
  const explorerCuratorEnabled = readBooleanFrom(env, ['EXPLORER_CURATOR_ENABLED'], false);
  const recurringPledgeSchedulerEnabled = readBooleanFrom(env, ['RECURRING_PLEDGE_SCHEDULER_ENABLED'], false);

  return {
    port: readNumberFrom(env, ['SERVICE_HOST_PORT', 'PORT'], 3000),
    services: [
      buildSingleKindService('implication-attester', implicationAttesterEnabled, env, serviceConfigLoaders),
      buildSingleKindService('content-attester', contentAttesterEnabled, env, serviceConfigLoaders),
      buildSingleKindService('beat-memory', beatMemoryEnabled, env, serviceConfigLoaders),
      buildSingleKindService('beat-agent', beatAgentEnabled, env, serviceConfigLoaders),
      buildSingleKindService('implication-finder', implicationFinderEnabled, env, serviceConfigLoaders),
      buildSingleKindService('content-finder', contentFinderEnabled, env, serviceConfigLoaders),
      buildSingleKindService('implication-graph-nudger', implicationGraphNudgerEnabled, env, serviceConfigLoaders),
      buildSingleKindService('bridge-creator', bridgeCreatorEnabled, env, serviceConfigLoaders),
      buildSingleKindService('explorer-curator', explorerCuratorEnabled, env, serviceConfigLoaders),
      buildSingleKindService('recurring-pledge-scheduler', recurringPledgeSchedulerEnabled, env, serviceConfigLoaders),
    ].filter((service): service is HostedServiceConfig => service !== null),
  };
}
