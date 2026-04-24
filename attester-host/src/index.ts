import { type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import express, { type Express } from 'express';
import {
  createContentAttesterApp,
  type ContentAttesterConfig,
} from '@commonality/content-attester';
import {
  createImplicationAttesterApp,
  type AttesterConfig,
} from '@commonality/implication-attester';
import {
  getAttesterHostConfigPath,
  loadAttesterHostConfig,
  type AttesterHostConfig,
} from './config.js';
import { loadAttesterHostConfigFromEnv } from './envConfig.js';

export interface AttesterHostAppFactories {
  createImplicationApp?: (config: AttesterConfig) => Express;
  createContentApp?: (config: ContentAttesterConfig) => Express;
}

export interface AttesterHostRunHandle {
  server: Server;
  stop: () => Promise<void>;
}

export function createAttesterHostApp(
  config: AttesterHostConfig,
  factories: AttesterHostAppFactories = {},
): Express {
  const app = express();
  const createImplicationApp = factories.createImplicationApp ?? createImplicationAttesterApp;
  const createContentApp = factories.createContentApp ?? createContentAttesterApp;

  app.use(
    config.implicationAttester.routePrefix,
    createImplicationApp(config.implicationAttester.config),
  );
  app.use(
    config.contentAttester.routePrefix,
    createContentApp(config.contentAttester.config),
  );

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      services: {
        implicationAttester: config.implicationAttester.routePrefix,
        contentAttester: config.contentAttester.routePrefix,
      },
    });
  });

  return app;
}

export function run(config: AttesterHostConfig): AttesterHostRunHandle {
  const app = createAttesterHostApp(config);
  const server = app.listen(config.port, () => {
    console.log(`Attester host listening on port ${config.port}`);
    console.log(`Implication attester mounted at ${config.implicationAttester.routePrefix}`);
    console.log(`Content attester mounted at ${config.contentAttester.routePrefix}`);
  });

  return {
    server,
    stop: () => new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

async function main(): Promise<void> {
  const configPath = process.argv[2] || process.env.ATTESTER_HOST_CONFIG;
  const config = configPath
    ? await loadAttesterHostConfig(getAttesterHostConfigPath(process.argv))
    : loadAttesterHostConfigFromEnv();
  let shuttingDown = false;
  const host = run(config);

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`[attester-host] Received ${signal}; shutting down.`);
    await host.stop();
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT').then(() => process.exit(0), (error) => {
      console.error('[attester-host] Shutdown failed:', error);
      process.exit(1);
    });
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM').then(() => process.exit(0), (error) => {
      console.error('[attester-host] Shutdown failed:', error);
      process.exit(1);
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error) => {
    console.error('[attester-host] Startup failed:', error);
    process.exit(1);
  });
}
