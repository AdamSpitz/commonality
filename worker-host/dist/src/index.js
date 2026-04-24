import express from 'express';
import { workerAppFactories, workerFactories } from './serviceRegistry.js';
import { createWorkerHost } from './supervisor.js';
export function createWorkerHostApp(config, factories = {}) {
    const app = express();
    const resolvedWorkerAppFactories = factories.workerAppFactories ?? workerAppFactories;
    const routedWorkers = config.workers.filter((worker) => worker.routePrefix);
    for (const worker of routedWorkers) {
        const factory = resolvedWorkerAppFactories[worker.kind];
        if (!factory) {
            throw new Error(`Worker "${worker.name}" (${worker.kind}) does not expose an HTTP app`);
        }
        app.use(worker.routePrefix, factory(worker.config));
    }
    app.get('/health', (_req, res) => {
        res.json({
            status: 'ok',
            services: Object.fromEntries(routedWorkers.map((worker) => [worker.name, worker.routePrefix])),
        });
    });
    return app;
}
export function run(config) {
    const host = createWorkerHost({
        workers: config.workers,
        factories: workerFactories,
    });
    const hasHttpRoutes = config.workers.some((worker) => worker.routePrefix);
    let server;
    if (hasHttpRoutes) {
        const app = createWorkerHostApp(config);
        server = app.listen(config.port, () => {
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
            await new Promise((resolve, reject) => {
                server.close((error) => {
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
//# sourceMappingURL=index.js.map