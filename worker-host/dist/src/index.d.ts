import { type Express } from 'express';
import { type WorkerHostConfig } from './config.js';
import { type WorkerAppFactory } from './serviceRegistry.js';
export interface WorkerHostAppFactories {
    workerAppFactories?: Partial<Record<string, WorkerAppFactory>>;
}
export declare function createWorkerHostApp(config: WorkerHostConfig, factories?: WorkerHostAppFactories): Express;
export interface WorkerHostRunHandle {
    server?: import('node:http').Server;
    stop: () => Promise<void>;
}
export declare function run(config: WorkerHostConfig): WorkerHostRunHandle;
//# sourceMappingURL=index.d.ts.map