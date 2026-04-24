import express, { type Express } from 'express';
import { type WorkerHostConfig } from './config.js';
import { workerAppFactories, workerFactories, type WorkerAppFactory } from './serviceRegistry.js';
import { createWorkerHost } from './supervisor.js';

export interface WorkerHostAppFactories {
  workerAppFactories?: Partial<Record<string, WorkerAppFactory>>;
}

export function createWorkerHostApp(
  config: WorkerHostConfig,
  factories: WorkerHostAppFactories = {},
): Express {
  const app = express();
  const resolvedWorkerAppFactories = factories.workerAppFactories ?? workerAppFactories;
  const routedWorkers = config.workers.filter((worker) => worker.routePrefix);

  for (const worker of routedWorkers) {
    const factory = resolvedWorkerAppFactories[worker.kind];
    if (!factory) {
      throw new Error(`Worker "${worker.name}" (${worker.kind}) does not expose an HTTP app`);
    }

    app.use(worker.routePrefix!, factory(worker.config));
  }

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      services: Object.fromEntries(
        routedWorkers.map((worker) => [worker.name, worker.routePrefix]),
      ),
    });
  });

  return app;
}

export interface WorkerHostRunHandle {
  server?: import('node:http').Server;
  stop: () => Promise<void>;
}

export function run(config: WorkerHostConfig): WorkerHostRunHandle {
  const host = createWorkerHost({
    workers: config.workers,
    factories: workerFactories,
  });
  const hasHttpRoutes = config.workers.some((worker) => worker.routePrefix);
  let server: import('node:http').Server | undefined;

  if (hasHttpRoutes) {
    const app = createWorkerHostApp(config);
    server = app.listen(config.port!, () => {
      console.log(`Worker host listening on port ${config.port}`);
      for (const worker of config.workers.filter((entry) => entry.routePrefix)) {
        console.log(`Mounted "${worker.name}" at ${worker.routePrefix}`);
      }
    });
  }

  host.start();

  return {
    server,
    stop: async () => {
      await host.stop();
      if (!server) {
        return;
      }
      await new Promise<void>((resolve, reject) => {
        server!.close((error?: Error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
