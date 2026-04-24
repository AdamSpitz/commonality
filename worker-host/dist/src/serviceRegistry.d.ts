import type { Express } from 'express';
import type { HostedWorkerConfig, WorkerKind } from './config.js';
export interface WorkerRunHandle {
    stop: () => Promise<void>;
    finished?: Promise<void>;
}
export type WorkerFactory = (worker: HostedWorkerConfig) => WorkerRunHandle;
export type WorkerAppFactory = (config: Record<string, unknown>) => Express;
export declare const workerFactories: Record<WorkerKind, WorkerFactory>;
export declare const workerAppFactories: Partial<Record<WorkerKind, WorkerAppFactory>>;
//# sourceMappingURL=serviceRegistry.d.ts.map