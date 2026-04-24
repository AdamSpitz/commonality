import {
  createBridgeCreatorApp,
  run as runBridgeCreator,
} from '@commonality/bridge-creator';
import { run as runContentFinder } from '@commonality/content-finder';
import { createContentAttesterApp, run as runContentAttester } from '@commonality/content-attester';
import {
  createExplorerCuratorApp,
  run as runExplorerCurator,
} from '@commonality/explorer-curator';
import { run as runImplicationFinder } from '@commonality/implication-finder';
import {
  createImplicationAttesterApp,
  run as runImplicationAttester,
} from '@commonality/implication-attester';
import {
  createImplicationGraphNudgerApp,
  run as runImplicationGraphNudger,
} from '@commonality/implication-graph-nudger';
import type { Express } from 'express';
import type { HostedWorkerConfig, WorkerKind } from './config.js';

export interface WorkerRunHandle {
  stop: () => Promise<void>;
  finished?: Promise<void>;
}

export type WorkerFactory = (worker: HostedWorkerConfig) => WorkerRunHandle;
export type WorkerAppFactory = (config: Record<string, unknown>) => Express;

export const workerFactories: Record<WorkerKind, WorkerFactory> = {
  'implication-finder': (worker) => runImplicationFinder(
    worker.config as unknown as Parameters<typeof runImplicationFinder>[0],
  ),
  'content-finder': (worker) => runContentFinder(
    worker.config as unknown as Parameters<typeof runContentFinder>[0],
  ),
  'implication-graph-nudger': (worker) => runImplicationGraphNudger(
    worker.config as unknown as Parameters<typeof runImplicationGraphNudger>[0],
  ),
  'bridge-creator': (worker) => runBridgeCreator(
    worker.config as unknown as Parameters<typeof runBridgeCreator>[0],
  ),
  'explorer-curator': (worker) => runExplorerCurator(
    worker.config as unknown as Parameters<typeof runExplorerCurator>[0],
  ),
  'implication-attester': (worker) => runImplicationAttester(
    worker.config as unknown as Parameters<typeof runImplicationAttester>[0],
  ),
  'content-attester': (worker) => runContentAttester(
    worker.config as unknown as Parameters<typeof runContentAttester>[0],
  ),
};

export const workerAppFactories: Partial<Record<WorkerKind, WorkerAppFactory>> = {
  'implication-graph-nudger': (config) => createImplicationGraphNudgerApp(
    config as unknown as Parameters<typeof createImplicationGraphNudgerApp>[0],
  ),
  'bridge-creator': (config) => createBridgeCreatorApp(
    config as unknown as Parameters<typeof createBridgeCreatorApp>[0],
  ),
  'explorer-curator': (config) => createExplorerCuratorApp(
    config as unknown as Parameters<typeof createExplorerCuratorApp>[0],
  ),
  'implication-attester': (config) => createImplicationAttesterApp(
    config as unknown as Parameters<typeof createImplicationAttesterApp>[0],
  ),
  'content-attester': (config) => createContentAttesterApp(
    config as unknown as Parameters<typeof createContentAttesterApp>[0],
  ),
};
