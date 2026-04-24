import assert from 'node:assert';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, it } from 'mocha';
import type { HostedWorkerConfig } from '../src/config.js';
import { createWorkerHost } from '../src/supervisor.js';
import type { WorkerFactory, WorkerRunHandle } from '../src/serviceRegistry.js';

function createWorkerDefinition(overrides: Partial<HostedWorkerConfig> = {}): HostedWorkerConfig {
  return {
    name: 'test-worker',
    kind: 'implication-finder',
    config: {},
    restartDelayMs: 10,
    ...overrides,
  };
}

describe('createWorkerHost', () => {
  it('restarts a worker when its run handle rejects unexpectedly', async () => {
    let starts = 0;
    let currentReject: ((error: Error) => void) | undefined;
    let currentResolve: (() => void) | undefined;

    const factory: WorkerFactory = () => {
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

    const host = createWorkerHost({
      workers: [createWorkerDefinition()],
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

  it('does not restart a worker after shutdown begins', async () => {
    let starts = 0;
    let rejectFinished: ((error: Error) => void) | undefined;
    let resolveStopped: (() => void) | undefined;

    const factory: WorkerFactory = () => {
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

    const host = createWorkerHost({
      workers: [createWorkerDefinition()],
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

  it('skips disabled workers', async () => {
    let started = false;
    const factory: WorkerFactory = () => {
      started = true;
      const handle: WorkerRunHandle = {
        stop: async () => {},
      };
      return handle;
    };

    const host = createWorkerHost({
      workers: [createWorkerDefinition({ enabled: false })],
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
