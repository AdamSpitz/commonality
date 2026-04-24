import { createBridgeCreatorApp, run as runBridgeCreator, } from '@commonality/bridge-creator';
import { run as runContentFinder } from '@commonality/content-finder';
import { createExplorerCuratorApp, run as runExplorerCurator, } from '@commonality/explorer-curator';
import { run as runImplicationFinder } from '@commonality/implication-finder';
import { createImplicationGraphNudgerApp, run as runImplicationGraphNudger, } from '@commonality/implication-graph-nudger';
export const workerFactories = {
    'implication-finder': (worker) => runImplicationFinder(worker.config),
    'content-finder': (worker) => runContentFinder(worker.config),
    'implication-graph-nudger': (worker) => runImplicationGraphNudger(worker.config, { startServer: !worker.routePrefix }),
    'bridge-creator': (worker) => runBridgeCreator(worker.config, { startServer: !worker.routePrefix }),
    'explorer-curator': (worker) => runExplorerCurator(worker.config, { startServer: !worker.routePrefix }),
};
export const workerAppFactories = {
    'implication-graph-nudger': (config) => createImplicationGraphNudgerApp(config),
    'bridge-creator': (config) => createBridgeCreatorApp(config),
    'explorer-curator': (config) => createExplorerCuratorApp(config),
};
//# sourceMappingURL=serviceRegistry.js.map