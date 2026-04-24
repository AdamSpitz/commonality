import type { HostedWorkerConfig } from './config.js';
import type { WorkerFactory, WorkerRunHandle } from './serviceRegistry.js';

export interface SupervisorLogger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

interface WorkerRuntime {
  definition: HostedWorkerConfig;
  handle?: WorkerRunHandle;
  restartTimer?: NodeJS.Timeout;
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

const NEVER: Promise<void> = new Promise(() => {});

function normalizeFinished(handle: WorkerRunHandle): Promise<void> {
  return handle.finished ?? NEVER;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

export function createWorkerHost(params: CreateWorkerHostParams): WorkerHostHandle {
  const logger = params.logger ?? console;
  const runtimes = new Map<string, WorkerRuntime>();
  let started = false;
  let stopping = false;

  const cancelRestart = (runtime: WorkerRuntime): void => {
    if (!runtime.restartTimer) {
      return;
    }
    clearTimeout(runtime.restartTimer);
    runtime.restartTimer = undefined;
  };

  const scheduleRestart = (runtime: WorkerRuntime, reason: unknown): void => {
    if (stopping) {
      return;
    }

    cancelRestart(runtime);
    const restartDelayMs = runtime.definition.restartDelayMs ?? 1000;
    logger.error(
      `[worker-host] Worker "${runtime.definition.name}" failed: ${formatError(reason)}`,
    );
    logger.info(
      `[worker-host] Restarting "${runtime.definition.name}" in ${restartDelayMs}ms.`,
    );

    runtime.restartTimer = setTimeout(() => {
      runtime.restartTimer = undefined;
      startRuntime(runtime);
    }, restartDelayMs);
  };

  const startRuntime = (runtime: WorkerRuntime): void => {
    if (stopping || runtime.definition.enabled === false) {
      return;
    }

    logger.info(
      `[worker-host] Starting "${runtime.definition.name}" (${runtime.definition.kind}).`,
    );

    let handle: WorkerRunHandle;
    try {
      handle = params.factories[runtime.definition.kind](runtime.definition.config);
    } catch (error) {
      scheduleRestart(runtime, error);
      return;
    }

    runtime.handle = handle;

    void normalizeFinished(handle).then(
      () => {
        if (stopping || runtime.handle !== handle) {
          return;
        }
        runtime.handle = undefined;
        scheduleRestart(runtime, new Error('worker stopped unexpectedly'));
      },
      (error) => {
        if (stopping || runtime.handle !== handle) {
          return;
        }
        runtime.handle = undefined;
        scheduleRestart(runtime, error);
      },
    );
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

        const runtime: WorkerRuntime = { definition: worker };
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

      await Promise.all(
        [...runtimes.values()].map(async (runtime) => {
          const handle = runtime.handle;
          runtime.handle = undefined;
          if (!handle) {
            return;
          }
          await handle.stop();
          await normalizeFinished(handle);
        }),
      );
    },
  };
}
