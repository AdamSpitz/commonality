import { run as runBridgeCreator } from '@commonality/bridge-creator';
import { run as runContentFinder } from '@commonality/content-finder';
import { run as runExplorerCurator } from '@commonality/explorer-curator';
import { run as runImplicationFinder } from '@commonality/implication-finder';
import { run as runImplicationGraphNudger } from '@commonality/implication-graph-nudger';
import type { WorkerKind } from './config.js';

export interface WorkerRunHandle {
  stop: () => Promise<void>;
  finished?: Promise<void>;
}

export type WorkerFactory = (config: Record<string, unknown>) => WorkerRunHandle;

export const workerFactories: Record<WorkerKind, WorkerFactory> = {
  'implication-finder': (config) => runImplicationFinder(
    config as unknown as Parameters<typeof runImplicationFinder>[0],
  ),
  'content-finder': (config) => runContentFinder(
    config as unknown as Parameters<typeof runContentFinder>[0],
  ),
  'implication-graph-nudger': (config) => runImplicationGraphNudger(
    config as unknown as Parameters<typeof runImplicationGraphNudger>[0],
  ),
  'bridge-creator': (config) => runBridgeCreator(
    config as unknown as Parameters<typeof runBridgeCreator>[0],
  ),
  'explorer-curator': (config) => runExplorerCurator(
    config as unknown as Parameters<typeof runExplorerCurator>[0],
  ),
};
