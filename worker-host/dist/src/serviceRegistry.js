import { run as runBridgeCreator } from '@commonality/bridge-creator';
import { run as runContentFinder } from '@commonality/content-finder';
import { run as runExplorerCurator } from '@commonality/explorer-curator';
import { run as runImplicationFinder } from '@commonality/implication-finder';
import { run as runImplicationGraphNudger } from '@commonality/implication-graph-nudger';
export const workerFactories = {
    'implication-finder': (config) => runImplicationFinder(config),
    'content-finder': (config) => runContentFinder(config),
    'implication-graph-nudger': (config) => runImplicationGraphNudger(config),
    'bridge-creator': (config) => runBridgeCreator(config),
    'explorer-curator': (config) => runExplorerCurator(config),
};
//# sourceMappingURL=serviceRegistry.js.map