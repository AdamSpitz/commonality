import type { HostedServiceConfig } from './config.js';
import type { ServiceFactory, ServiceRunHandle } from './serviceRegistry.js';

export interface SupervisorLogger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

interface ServiceRuntime {
  definition: HostedServiceConfig;
  handle?: ServiceRunHandle;
  restartTimer?: NodeJS.Timeout;
  restartCount: number;
}

export interface ServiceHostHandle {
  start: () => void;
  stop: () => Promise<void>;
}

export interface CreateServiceHostParams {
  services: HostedServiceConfig[];
  factories: Record<string, ServiceFactory>;
  logger?: SupervisorLogger;
}

const NEVER: Promise<void> = new Promise(() => {});
const MAX_RESTART_DELAY_MS = 60_000;

export function getRestartDelayMs(restartCount: number, baseDelayMs: number): number {
  return Math.min(baseDelayMs * 2 ** restartCount, MAX_RESTART_DELAY_MS);
}

function normalizeFinished(handle: ServiceRunHandle): Promise<void> {
  return handle.finished ?? NEVER;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

export function createServiceHost(params: CreateServiceHostParams): ServiceHostHandle {
  const logger = params.logger ?? console;
  const runtimes = new Map<string, ServiceRuntime>();
  let started = false;
  let stopping = false;

  const cancelRestart = (runtime: ServiceRuntime): void => {
    if (!runtime.restartTimer) {
      return;
    }
    clearTimeout(runtime.restartTimer);
    runtime.restartTimer = undefined;
  };

  const scheduleRestart = (runtime: ServiceRuntime, reason: unknown): void => {
    if (stopping) {
      return;
    }

    cancelRestart(runtime);
    const restartDelayMs = getRestartDelayMs(
      runtime.restartCount,
      runtime.definition.restartDelayMs ?? 1000,
    );
    runtime.restartCount++;
    logger.error(
      `[service-host] Service "${runtime.definition.name}" failed: ${formatError(reason)}`,
    );
    logger.info(
      `[service-host] Restarting "${runtime.definition.name}" in ${restartDelayMs}ms (restart #${runtime.restartCount}).`,
    );

    runtime.restartTimer = setTimeout(() => {
      runtime.restartTimer = undefined;
      startRuntime(runtime);
    }, restartDelayMs);
  };

  const startRuntime = (runtime: ServiceRuntime): void => {
    if (stopping || runtime.definition.enabled === false) {
      return;
    }

    logger.info(
      `[service-host] Starting "${runtime.definition.name}" (${runtime.definition.kind}).`,
    );

    let handle: ServiceRunHandle;
    try {
      handle = params.factories[runtime.definition.kind](runtime.definition);
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
        scheduleRestart(runtime, new Error('service stopped unexpectedly'));
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

      for (const service of params.services) {
        if (service.enabled === false) {
          logger.info(`[service-host] Service "${service.name}" is disabled; skipping.`);
          continue;
        }

        const runtime: ServiceRuntime = { definition: service, restartCount: 0 };
        runtimes.set(service.name, runtime);
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
