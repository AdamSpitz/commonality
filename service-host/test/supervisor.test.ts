import assert from 'node:assert';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, it } from 'mocha';
import type { HostedServiceConfig } from '../src/config.js';
import { createServiceHost } from '../src/supervisor.js';
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

describe('createServiceHost', () => {
  it('restarts a service when its run handle rejects unexpectedly', async () => {
    let starts = 0;
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
      workers: [createServiceDefinition()],
      factories: {
        'implication-finder': factory,
      },
      logger: { info: () => {}, error: () => {} },
    });

    host.start();
    assert.strictEqual(starts, 1);

    currentReject?.(new Error('boom'));
    await delay(40);

    assert.strictEqual(starts, 2);
    await host.stop();
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
      workers: [createServiceDefinition()],
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
      workers: [createServiceDefinition({ enabled: false })],
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
