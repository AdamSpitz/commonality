const NEVER = new Promise(() => { });
function normalizeFinished(handle) {
    return handle.finished ?? NEVER;
}
function formatError(error) {
    return error instanceof Error ? error.stack ?? error.message : String(error);
}
export function createWorkerHost(params) {
    const logger = params.logger ?? console;
    const runtimes = new Map();
    let started = false;
    let stopping = false;
    const cancelRestart = (runtime) => {
        if (!runtime.restartTimer) {
            return;
        }
        clearTimeout(runtime.restartTimer);
        runtime.restartTimer = undefined;
    };
    const scheduleRestart = (runtime, reason) => {
        if (stopping) {
            return;
        }
        cancelRestart(runtime);
        const restartDelayMs = runtime.definition.restartDelayMs ?? 1000;
        logger.error(`[worker-host] Worker "${runtime.definition.name}" failed: ${formatError(reason)}`);
        logger.info(`[worker-host] Restarting "${runtime.definition.name}" in ${restartDelayMs}ms.`);
        runtime.restartTimer = setTimeout(() => {
            runtime.restartTimer = undefined;
            startRuntime(runtime);
        }, restartDelayMs);
    };
    const startRuntime = (runtime) => {
        if (stopping || runtime.definition.enabled === false) {
            return;
        }
        logger.info(`[worker-host] Starting "${runtime.definition.name}" (${runtime.definition.kind}).`);
        let handle;
        try {
            handle = params.factories[runtime.definition.kind](runtime.definition.config);
        }
        catch (error) {
            scheduleRestart(runtime, error);
            return;
        }
        runtime.handle = handle;
        void normalizeFinished(handle).then(() => {
            if (stopping || runtime.handle !== handle) {
                return;
            }
            runtime.handle = undefined;
            scheduleRestart(runtime, new Error('worker stopped unexpectedly'));
        }, (error) => {
            if (stopping || runtime.handle !== handle) {
                return;
            }
            runtime.handle = undefined;
            scheduleRestart(runtime, error);
        });
    };
    return {
        start: () => {
            if (started) {
                return;
            }
            started = true;
            for (const worker of params.workers) {
                if (worker.enabled === false) {
                    logger.info(`[worker-host] Worker "${worker.name}" is disabled; skipping.`);
                    continue;
                }
                const runtime = { definition: worker };
                runtimes.set(worker.name, runtime);
                startRuntime(runtime);
            }
        },
        stop: async () => {
            if (!started || stopping) {
                return;
            }
            stopping = true;
            for (const runtime of runtimes.values()) {
                cancelRestart(runtime);
            }
            await Promise.all([...runtimes.values()].map(async (runtime) => {
                const handle = runtime.handle;
                runtime.handle = undefined;
                if (!handle) {
                    return;
                }
                await handle.stop();
                await normalizeFinished(handle);
            }));
        },
    };
}
//# sourceMappingURL=supervisor.js.map