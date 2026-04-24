import { pathToFileURL } from 'node:url';
import { getWorkerHostConfigPath, loadWorkerHostConfig } from './config.js';
import { loadWorkerHostConfigFromEnv } from './envConfig.js';
import { run } from './index.js';
async function main() {
    const configPath = process.argv[2] || process.env.WORKER_HOST_CONFIG;
    const config = configPath
        ? await loadWorkerHostConfig(getWorkerHostConfigPath(process.argv))
        : loadWorkerHostConfigFromEnv();
    const host = run(config);
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
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main().catch((error) => {
        console.error('[worker-host] Startup failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=cli.js.map