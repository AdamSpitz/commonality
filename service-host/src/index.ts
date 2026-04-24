import express, { type Express } from 'express';
import { type ServiceHostConfig } from './config.js';
import { serviceAppFactories, serviceFactories, type ServiceAppFactory } from './serviceRegistry.js';
import { createServiceHost } from './supervisor.js';

export interface ServiceHostAppFactories {
  serviceAppFactories?: Partial<Record<string, ServiceAppFactory>>;
}

export function createServiceHostApp(
  config: ServiceHostConfig,
  factories: ServiceHostAppFactories = {},
): Express {
  const app = express();
  const resolvedServiceAppFactories = factories.serviceAppFactories ?? serviceAppFactories;
  const routedServices = config.services.filter(
    (service) => service.routePrefix && service.enabled !== false,
  );

  for (const service of routedServices) {
    const factory = resolvedServiceAppFactories[service.kind];
    if (!factory) {
      throw new Error(`Service "${service.name}" (${service.kind}) does not expose an HTTP app`);
    }

    app.use(service.routePrefix!, factory(service.config));
  }

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      services: Object.fromEntries(
        routedServices.map((service) => [service.name, service.routePrefix]),
      ),
    });
  });

  return app;
}

export interface ServiceHostRunHandle {
  server?: import('node:http').Server;
  stop: () => Promise<void>;
}

export function run(config: ServiceHostConfig): ServiceHostRunHandle {
  const host = createServiceHost({
    services: config.services,
    factories: serviceFactories,
  });
  const hasHttpRoutes = config.services.some((service) => service.routePrefix);
  let server: import('node:http').Server | undefined;

  if (hasHttpRoutes) {
    const app = createServiceHostApp(config);
    server = app.listen(config.port!, () => {
      console.log(`Service host listening on port ${config.port}`);
      for (const service of config.services.filter((entry) => entry.routePrefix)) {
        console.log(`Mounted "${service.name}" at ${service.routePrefix}`);
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
