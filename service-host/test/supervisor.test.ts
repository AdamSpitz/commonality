import assert from 'node:assert';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, it } from 'mocha';
import type { HostedServiceConfig } from '../src/config.js';
import { createServiceHost, getRestartDelayMs } from '../src/supervisor.js';
import type { ServiceFactory, ServiceRunHandle } from '../src/serviceRegistry.js';

function createServiceDefinition(overrides: Partial<HostedServiceConfig> = {}): HostedServiceConfig {
  return {
    name: 'test-service',
    kind: 'implication-finder',
    config: {},
    restartDelayMs: 10,
    ...overrides,
  };
}

describe('getRestartDelayMs', () => {
  it('backs off exponentially and caps the delay', () => {
    assert.strictEqual(getRestartDelayMs(0, 1000), 1000);
    assert.strictEqual(getRestartDelayMs(1, 1000), 2000);
    assert.strictEqual(getRestartDelayMs(2, 1000), 4000);
    assert.strictEqual(getRestartDelayMs(10, 1000), 60000);
  });
});

describe('createServiceHost', () => {
  it('restarts a service when its run handle rejects unexpectedly', async () => {
    let starts = 0;
    const infoLogs: string[] = [];
    let currentReject: ((error: Error) => void) | undefined;
    let currentResolve: (() => void) | undefined;

    const factory: ServiceFactory = () => {
      starts++;
      const finished = new Promise<void>((resolve, reject) => {
        currentResolve = resolve;
        currentReject = reject;
      });
      return {
        finished,
        stop: async () => {
          currentResolve?.();
        },
      };
    };

    const host = createServiceHost({
      services: [createServiceDefinition()],
      factories: {
        'implication-finder': factory,
      },
      logger: {
        info: (...args: unknown[]) => {
          infoLogs.push(args.join(' '));
        },
        error: () => {},
      },
    });

    host.start();
    assert.strictEqual(starts, 1);

    currentReject?.(new Error('boom'));
    await delay(40);

    assert.strictEqual(starts, 2);
    assert.match(infoLogs.join('\n'), /restart #1/);
    await host.stop();
  });

  it('backs off repeated restarts for a crash-looping service', async () => {
    let starts = 0;
    const startTimes: number[] = [];

    const factory: ServiceFactory = () => {
      starts++;
      startTimes.push(Date.now());
      return {
        finished: Promise.reject(new Error('boom')),
        stop: async () => {},
      };
    };

    const host = createServiceHost({
      services: [createServiceDefinition({ restartDelayMs: 5 })],
      factories: {
        'implication-finder': factory,
      },
      logger: { info: () => {}, error: () => {} },
    });

    host.start();
    while (starts < 4) {
      await delay(5);
    }
    await host.stop();

    assert.ok(startTimes[2] - startTimes[1] >= 8);
    assert.ok(startTimes[3] - startTimes[2] >= 16);
  });

  it('does not restart a service after shutdown begins', async () => {
    let starts = 0;
    let rejectFinished: ((error: Error) => void) | undefined;
    let resolveStopped: (() => void) | undefined;

    const factory: ServiceFactory = () => {
      starts++;
      const finished = new Promise<void>((resolve, reject) => {
        resolveStopped = resolve;
        rejectFinished = reject;
      });
      return {
        finished,
        stop: async () => {
          resolveStopped?.();
        },
      };
    };

    const host = createServiceHost({
      services: [createServiceDefinition()],
      factories: {
        'implication-finder': factory,
      },
      logger: { info: () => {}, error: () => {} },
    });

    host.start();
    assert.strictEqual(starts, 1);

    const stopPromise = host.stop();
    rejectFinished?.(new Error('boom'));
    await stopPromise;
    await delay(30);

    assert.strictEqual(starts, 1);
  });

  it('skips disabled services', async () => {
    let started = false;
    const factory: ServiceFactory = () => {
      started = true;
      const handle: ServiceRunHandle = {
        stop: async () => {},
      };
      return handle;
    };

    const host = createServiceHost({
      services: [createServiceDefinition({ enabled: false })],
      factories: {
        'implication-finder': factory,
      },
      logger: { info: () => {}, error: () => {} },
    });

    host.start();
    await host.stop();

    assert.strictEqual(started, false);
  });
});
