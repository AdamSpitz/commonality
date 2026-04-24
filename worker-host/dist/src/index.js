import { getWorkerHostConfigPath, loadWorkerHostConfig } from './config.js';
import { workerFactories } from './serviceRegistry.js';
import { createWorkerHost } from './supervisor.js';
async function main() {
    const configPath = getWorkerHostConfigPath(process.argv);
    const config = await loadWorkerHostConfig(configPath);
    const host = createWorkerHost({
        workers: config.workers,
        factories: workerFactories,
    });
    let shuttingDown = false;
    const shutdown = async (signal) => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;
        console.log(`[worker-host] Received ${signal}; shutting down.`);
        await host.stop();
    };
    process.on('SIGINT', () => {
        void shutdown('SIGINT').then(() => process.exit(0), (error) => {
            console.error('[worker-host] Shutdown failed:', error);
            process.exit(1);
        });
    });
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM').then(() => process.exit(0), (error) => {
            console.error('[worker-host] Shutdown failed:', error);
            process.exit(1);
        });
    });
    host.start();
}
void main().catch((error) => {
    console.error('[worker-host] Startup failed:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map