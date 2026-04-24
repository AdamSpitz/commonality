import type { HostedWorkerConfig } from './config.js';
import type { WorkerFactory } from './serviceRegistry.js';
export interface SupervisorLogger {
    info: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}
export interface WorkerHostHandle {
    start: () => void;
    stop: () => Promise<void>;
}
export interface CreateWorkerHostParams {
    workers: HostedWorkerConfig[];
    factories: Record<string, WorkerFactory>;
    logger?: SupervisorLogger;
}
export declare function createWorkerHost(params: CreateWorkerHostParams): WorkerHostHandle;
//# sourceMappingURL=supervisor.d.ts.map