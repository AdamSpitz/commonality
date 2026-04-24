import { pathToFileURL } from 'node:url';
import { getServiceHostConfigPath, loadServiceHostConfig } from './config.js';
import { loadServiceHostConfigFromEnv } from './envConfig.js';
import { run } from './index.js';

async function main(): Promise<void> {
  const configPath = process.argv[2] || process.env.SERVICE_HOST_CONFIG;
  const config = configPath
    ? await loadServiceHostConfig(getServiceHostConfigPath(process.argv))
    : loadServiceHostConfigFromEnv();
  const host = run(config);
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error('[service-host] Startup failed:', error);
    process.exit(1);
  });
}
