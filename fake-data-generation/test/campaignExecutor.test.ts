import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { Hex } from 'viem';
import { executeCampaignPlan, type CampaignExecutionAdapter } from '../campaignExecutor.js';
import type { PlannedAction } from '../campaignPlanner.js';

const actions: PlannedAction[] = [
  { id: 'action-1', sequence: 1, type: 'publish-statement', actorUserId: null, statementId: 'statement-1', dependsOn: [] },
  { id: 'action-2', sequence: 2, type: 'set-belief', actorUserId: 'user-1', statementId: 'statement-1', dependsOn: ['action-1'] },
  { id: 'action-3', sequence: 3, type: 'deposit-note', actorUserId: 'user-1', noteId: 'note-1', dependsOn: [] },
  { id: 'action-4', sequence: 4, type: 'delegate-note', actorUserId: 'user-1', noteId: 'note-1', delegateUserId: 'user-2', dependsOn: ['action-3'] },
];

function silentAdapter(submitted: string[]): CampaignExecutionAdapter {
  return {
    estimateNativeCost: async () => 10n,
    submit: async (action) => {
      submitted.push(action.id);
      return `0x${action.sequence.toString(16).padStart(64, '0')}` as Hex;
    },
    getReceipt: async () => ({ status: 'success', gasUsed: 2n, effectiveGasPrice: 3n }),
    classifyError: (error) => ({ retryable: false, category: 'rpc', message: (error as Error).message }),
  };
}

function adapter(submitted: string[], attempts = new Map<string, number>()): CampaignExecutionAdapter {
  return {
    estimateNativeCost: async () => 10n,
    submit: async (action) => {
      attempts.set(action.id, (attempts.get(action.id) ?? 0) + 1);
      if (action.id === 'action-3' && attempts.get(action.id) === 1) throw new Error('rate limited');
      submitted.push(action.id);
      return `0x${action.sequence.toString(16).padStart(64, '0')}` as Hex;
    },
    getReceipt: async () => ({ status: 'success', gasUsed: 2n, effectiveGasPrice: 3n }),
    classifyError: (error) => ({ retryable: (error as Error).message === 'rate limited', category: 'rpc', message: (error as Error).message }),
  };
}

test('persists interruption and resumes without resubmitting mined actions', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-execution-'));
  const statePath = path.join(directory, 'execution.json');
  const submitted: string[] = [];
  try {
    const first = await executeCampaignPlan({ campaignId: 'test', manifestFingerprint: 'fingerprint', actions, adapter: adapter(submitted), options: { statePath, concurrency: 1, pacingMs: 0, maxRetries: 2, retryBackoffMs: 0, transactionCap: 10, nativeTokenBudget: 100n, shouldStop: () => submitted.length >= 2 } });
    assert.equal(first.stopped, true); assert.equal(first.mined, 1); assert.equal(first.submitted, 1);
    const second = await executeCampaignPlan({ campaignId: 'test', manifestFingerprint: 'fingerprint', actions, adapter: adapter(submitted), options: { statePath, concurrency: 2, pacingMs: 0, maxRetries: 2, retryBackoffMs: 0, transactionCap: 10, nativeTokenBudget: 100n } });
    assert.equal(second.mined, 4); assert.equal(second.planned, 0);
    assert.equal(new Set(submitted).size, 4);
    const state = JSON.parse(await readFile(statePath, 'utf8')) as { actions: Array<{ actionId: string; status: string; attempts: number }> };
    assert.ok(state.actions.every((action) => action.status === 'mined'));
    assert.equal(state.actions.find((action) => action.actionId === 'action-3')?.attempts, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('fails closed before exceeding transaction or native-token budgets', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-budget-'));
  const submitted: string[] = [];
  try {
    await assert.rejects(executeCampaignPlan({ campaignId: 'test', manifestFingerprint: 'fingerprint', actions, adapter: adapter(submitted), options: { statePath: path.join(directory, 'cap.json'), concurrency: 4, pacingMs: 0, maxRetries: 0, retryBackoffMs: 0, transactionCap: 1, nativeTokenBudget: 100n } }), /transaction cap/);
    assert.equal(submitted.length, 1);
    submitted.length = 0;
    await assert.rejects(executeCampaignPlan({ campaignId: 'test', manifestFingerprint: 'fingerprint', actions, adapter: adapter(submitted), options: { statePath: path.join(directory, 'budget.json'), concurrency: 1, pacingMs: 0, maxRetries: 0, retryBackoffMs: 0, transactionCap: 10, nativeTokenBudget: 9n } }), /native-token budget/);
    assert.equal(submitted.length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('refuses state from a different immutable plan', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-mismatch-'));
  const statePath = path.join(directory, 'execution.json');
  try {
    await executeCampaignPlan({ campaignId: 'test', manifestFingerprint: 'one', actions: actions.slice(0, 1), adapter: adapter([]), options: { statePath, concurrency: 1, pacingMs: 0, maxRetries: 0, retryBackoffMs: 0, transactionCap: 1, nativeTokenBudget: 10n } });
    await assert.rejects(executeCampaignPlan({ campaignId: 'test', manifestFingerprint: 'two', actions: actions.slice(0, 1), adapter: adapter([]), options: { statePath, concurrency: 1, pacingMs: 0, maxRetries: 0, retryBackoffMs: 0, transactionCap: 1, nativeTokenBudget: 10n } }), /does not match/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('compress replay ignores dueAtSim and finishes without sleeping', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-compress-'));
  const submitted: string[] = [];
  const sleeps: number[] = [];
  const timed = actions.map((action, index) => ({ ...action, dueAtSim: index * 10_000 }));
  try {
    const summary = await executeCampaignPlan({
      campaignId: 'test',
      manifestFingerprint: 'fingerprint',
      actions: timed,
      adapter: silentAdapter(submitted),
      options: {
        statePath: path.join(directory, 'execution.json'),
        heartbeatPath: path.join(directory, 'heartbeat.json'),
        latestHeartbeatPath: path.join(directory, 'latest-heartbeat.json'),
        replay: 'compress',
        concurrency: 1,
        pacingMs: 0,
        maxRetries: 2,
        retryBackoffMs: 0,
        transactionCap: 10,
        nativeTokenBudget: 100n,
        sleep: async (milliseconds) => { sleeps.push(milliseconds); },
      },
    });
    assert.equal(summary.mined, 4);
    assert.equal(sleeps.length, 0);
    const heartbeat = JSON.parse(await readFile(path.join(directory, 'heartbeat.json'), 'utf8')) as { replay: string; planned: number; mined: number; nextDueAtSim: number | null };
    const latest = JSON.parse(await readFile(path.join(directory, 'latest-heartbeat.json'), 'utf8')) as { campaignId: string };
    assert.equal(heartbeat.replay, 'compress');
    assert.equal(heartbeat.mined, 4);
    assert.equal(heartbeat.planned, 0);
    assert.equal(heartbeat.nextDueAtSim, null);
    assert.equal(latest.campaignId, 'test');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('realtime replay sleeps until dueAtSim and resumes from stored startedAt', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-realtime-'));
  const submitted: string[] = [];
  const sleeps: number[] = [];
  let nowMs = 1_000_000;
  const timed = [
    { ...actions[0], dueAtSim: 0 },
    { ...actions[1], dueAtSim: 2 },
  ];
  try {
    const first = await executeCampaignPlan({
      campaignId: 'test',
      manifestFingerprint: 'fingerprint',
      actions: timed,
      adapter: silentAdapter(submitted),
      options: {
        statePath: path.join(directory, 'execution.json'),
        heartbeatPath: path.join(directory, 'heartbeat.json'),
        replay: 'realtime',
        concurrency: 1,
        pacingMs: 0,
        maxRetries: 0,
        retryBackoffMs: 0,
        transactionCap: 10,
        nativeTokenBudget: 100n,
        now: () => new Date(nowMs),
        sleep: async (milliseconds) => { sleeps.push(milliseconds); nowMs += milliseconds; },
        shouldStop: () => sleeps.length >= 1,
      },
    });
    assert.equal(first.stopped, true);
    assert.equal(first.mined, 1);
    const state = JSON.parse(await readFile(path.join(directory, 'execution.json'), 'utf8')) as { replay: { startedAt: string } };
    const startedAt = state.replay.startedAt;
    const second = await executeCampaignPlan({
      campaignId: 'test',
      manifestFingerprint: 'fingerprint',
      actions: timed,
      adapter: silentAdapter(submitted),
      options: {
        statePath: path.join(directory, 'execution.json'),
        heartbeatPath: path.join(directory, 'heartbeat.json'),
        replay: 'realtime',
        concurrency: 1,
        pacingMs: 0,
        maxRetries: 0,
        retryBackoffMs: 0,
        transactionCap: 10,
        nativeTokenBudget: 100n,
        now: () => new Date(nowMs),
        sleep: async (milliseconds) => { sleeps.push(milliseconds); nowMs += milliseconds; },
      },
    });
    assert.equal(second.mined, 2);
    assert.ok(sleeps.length >= 1);
    assert.ok(sleeps.reduce((sum, value) => sum + value, 0) >= 2000);
    const resumed = JSON.parse(await readFile(path.join(directory, 'execution.json'), 'utf8')) as { replay: { startedAt: string } };
    assert.equal(resumed.replay.startedAt, startedAt);
    const heartbeat = JSON.parse(await readFile(path.join(directory, 'heartbeat.json'), 'utf8')) as { replay: string; mined: number; simNow: number };
    assert.equal(heartbeat.replay, 'realtime');
    assert.equal(heartbeat.mined, 2);
    assert.ok(heartbeat.simNow >= 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('a receipt RPC error never causes duplicate transaction submission', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'campaign-receipt-'));
  const submitted: string[] = [];
  const fakeAdapter = adapter(submitted);
  let receiptCalls = 0;
  fakeAdapter.getReceipt = async () => {
    receiptCalls += 1;
    if (receiptCalls === 1) throw new Error('rate limited');
    return { status: 'success', gasUsed: 2n, effectiveGasPrice: 3n };
  };
  try {
    const summary = await executeCampaignPlan({ campaignId: 'test', manifestFingerprint: 'fingerprint', actions: actions.slice(0, 1), adapter: fakeAdapter, options: { statePath: path.join(directory, 'execution.json'), concurrency: 1, pacingMs: 0, maxRetries: 1, retryBackoffMs: 0, transactionCap: 1, nativeTokenBudget: 10n } });
    assert.equal(summary.mined, 1); assert.deepEqual(submitted, ['action-1']); assert.equal(receiptCalls, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
