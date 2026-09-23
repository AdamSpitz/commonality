import {
  createBeatMemoryApp,
  run as runBeatMemory,
} from '@commonality/beat-memory';
import {
  createBridgeCreatorApp,
  run as runBridgeCreator,
} from '@commonality/bridge-creator';
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
import type { ConceptspaceServiceKind } from './config.js';
import type { ServiceFactory } from './serviceTypes.js';

export type ServiceAppFactory = (config: Record<string, unknown>) => Express;

export const conceptspaceServiceFactories: Record<ConceptspaceServiceKind, ServiceFactory> = {
  'implication-finder': (worker) => runImplicationFinder(
    worker.config as unknown as Parameters<typeof runImplicationFinder>[0],
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
  'beat-memory': (worker) => runBeatMemory(
    worker.config as unknown as Parameters<typeof runBeatMemory>[0],
  ),
};

export const conceptspaceServiceAppFactories: Partial<Record<ConceptspaceServiceKind, ServiceAppFactory>> = {
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
  'beat-memory': (config) => createBeatMemoryApp(
    config as unknown as Parameters<typeof createBeatMemoryApp>[0],
  ),
};
