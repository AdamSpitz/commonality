import { getServiceHostConfigPath, loadServiceHostConfig } from './config.js';
import { loadConceptspaceServiceHostConfigFromEnv } from './conceptspaceEnvConfig.js';
import {
  conceptspaceServiceAppFactories,
  conceptspaceServiceFactories,
} from './conceptspaceServiceRegistry.js';
import { run } from './hostRuntime.js';

export async function startConceptspaceHost(): Promise<void> {
  const configPath = process.argv[2] || process.env.SERVICE_HOST_CONFIG;
  const config = configPath
    ? await loadServiceHostConfig(getServiceHostConfigPath(process.argv))
    : loadConceptspaceServiceHostConfigFromEnv();
  for (const service of config.services) {
    if (!(service.kind in conceptspaceServiceFactories)) {
      throw new Error(
        `Service "${service.name}" (${service.kind}) is not a Conceptspace service.`,
      );
    }
  }
  const host = run(config, {
    factories: conceptspaceServiceFactories,
    serviceAppFactories: conceptspaceServiceAppFactories,
  });
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[service-host] Received ${signal}; shutting down.`);
    await host.stop();
  };
  process.on('SIGINT', () => {
    void shutdown('SIGINT').then(() => process.exit(0), (error) => {
      console.error('[service-host] Shutdown failed:', error);
      process.exit(1);
    });
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM').then(() => process.exit(0), (error) => {
      console.error('[service-host] Shutdown failed:', error);
      process.exit(1);
    });
  });
}
