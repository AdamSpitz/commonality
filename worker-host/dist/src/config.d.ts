export declare const workerKinds: readonly ["implication-finder", "content-finder", "implication-graph-nudger", "bridge-creator", "explorer-curator"];
export type WorkerKind = (typeof workerKinds)[number];
export interface HostedWorkerConfig {
    name: string;
    kind: WorkerKind;
    config: Record<string, unknown>;
    enabled?: boolean;
    restartDelayMs?: number;
}
export interface WorkerHostConfig {
    workers: HostedWorkerConfig[];
}
export declare function parseWorkerHostConfig(value: unknown): WorkerHostConfig;
export declare function loadWorkerHostConfig(configPath: string): Promise<WorkerHostConfig>;
export declare function getWorkerHostConfigPath(argv: string[], env?: NodeJS.ProcessEnv): string;
//# sourceMappingURL=config.d.ts.map