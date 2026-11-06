import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import {
  classifyRpcFailure,
  RPC_MONTHLY_BACKOFF_MAX_MS,
  RPC_MONTHLY_BACKOFF_MIN_MS,
  runPollLoop,
} from './rpc-budget.js';

const monthly = Object.assign(new Error('RPC Request failed.'), {
  details: 'Monthly capacity limit exceeded. Visit https://dashboard.alchemy.com/settings/billing to upgrade your scaling policy.',
  code: 429,
});

describe('rpc budget', () => {
  it('treats a monthly-capacity 429 as a pause and a chain-id mismatch as fatal', () => {
    assert.equal(classifyRpcFailure(monthly), 'monthly-capacity');
    assert.equal(
      classifyRpcFailure(new Error('Your app has exceeded its compute units per second capacity.')),
      'rate-limit',
    );
    assert.equal(
      classifyRpcFailure(new Error('RPC chain ID 1 does not match configured CHAIN_ID 84532')),
      'fatal',
    );
  });

  it('backs off without re-alerting and does not rerun a failed poll as success', async () => {
    const sleeps: number[] = [];
    const logs: string[] = [];
    let calls = 0;
    const signal = new AbortController();
    await runPollLoop({
      serviceName: 'example-worker',
      signal: signal.signal,
      minMonthlyMs: 1000,
      maxMonthlyMs: 4000,
      log: (line) => logs.push(line),
      sleep: async (ms) => {
        sleeps.push(ms);
        if (sleeps.length === 2) signal.abort();
      },
      poll: async () => {
        calls += 1;
        throw monthly;
      },
    });
    assert.equal(calls, 2);
    assert.deepEqual(sleeps, [1000, 2000]);
    assert.equal(logs.length, 1);
    assert.match(logs[0]!, /example-worker/);
    assert.match(logs[0]!, /monthly capacity/i);
    assert.equal(RPC_MONTHLY_BACKOFF_MIN_MS, 60_000);
    assert.equal(RPC_MONTHLY_BACKOFF_MAX_MS, 6 * 60 * 60 * 1000);
  });

  it('resets the monthly backoff after a successful poll', async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const signal = new AbortController();
    await runPollLoop({
      serviceName: 'example-worker',
      signal: signal.signal,
      minMonthlyMs: 1000,
      maxMonthlyMs: 8000,
      log: () => {},
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      poll: async () => {
        calls += 1;
        if (calls === 2) return;
        if (calls === 3) signal.abort();
        throw monthly;
      },
    });
    assert.deepEqual(sleeps, [1000, 1000]);
  });
});
