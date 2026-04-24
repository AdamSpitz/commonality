import type { WorkerKind } from './config.js';
export interface WorkerRunHandle {
    stop: () => Promise<void>;
    finished?: Promise<void>;
}
export type WorkerFactory = (config: Record<string, unknown>) => WorkerRunHandle;
export declare const workerFactories: Record<WorkerKind, WorkerFactory>;
//# sourceMappingURL=serviceRegistry.d.ts.map