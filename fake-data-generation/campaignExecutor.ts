import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Hex } from 'viem';
import type { PlannedAction } from './campaignPlanner.js';

export const CAMPAIGN_EXECUTION_VERSION = 'commonality-campaign-execution-v1' as const;

export type CampaignActionStatus = 'planned' | 'submitted' | 'mined' | 'failed';

export interface CampaignReceipt {
  status: 'success' | 'reverted';
  gasUsed: bigint;
  effectiveGasPrice: bigint;
}

export interface CampaignExecutionAdapter {
  estimateNativeCost(action: PlannedAction): Promise<bigint>;
  submit(action: PlannedAction): Promise<Hex>;
  getReceipt(transactionHash: Hex): Promise<CampaignReceipt | null>;
  classifyError(error: unknown): { retryable: boolean; category: string; message: string };
}

export interface CampaignActionExecution {
  actionId: string;
  status: CampaignActionStatus;
  attempts: number;
  transactionHash?: Hex;
  gasUsed?: string;
  nativeCost?: string;
  failure?: { category: string; message: string };
}

export interface CampaignExecutionState {
  version: typeof CAMPAIGN_EXECUTION_VERSION;
  campaignId: string;
  manifestFingerprint: string;
  updatedAt: string;
  actions: CampaignActionExecution[];
}

export interface CampaignExecutionOptions {
  statePath: string;
  concurrency: number;
  pacingMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  transactionCap: number;
  nativeTokenBudget: bigint;
  shouldStop?: () => boolean;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface CampaignExecutionSummary {
  stopped: boolean;
  mined: number;
  failed: number;
  submitted: number;
  planned: number;
  transactions: number;
  nativeCost: bigint;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function persistState(statePath: string, state: CampaignExecutionState): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temporaryPath, statePath);
}

async function loadState(statePath: string): Promise<CampaignExecutionState | null> {
  try {
    return JSON.parse(await readFile(statePath, 'utf8')) as CampaignExecutionState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function summarize(state: CampaignExecutionState, stopped: boolean): CampaignExecutionSummary {
  const count = (status: CampaignActionStatus): number => state.actions.filter((action) => action.status === status).length;
  return {
    stopped,
    mined: count('mined'), failed: count('failed'), submitted: count('submitted'), planned: count('planned'),
    transactions: state.actions.filter((action) => action.transactionHash).length,
    nativeCost: state.actions.reduce((sum, action) => sum + BigInt(action.nativeCost ?? 0), 0n),
  };
}

export async function executeCampaignPlan(input: {
  campaignId: string;
  manifestFingerprint: string;
  actions: readonly PlannedAction[];
  adapter: CampaignExecutionAdapter;
  options: CampaignExecutionOptions;
}): Promise<CampaignExecutionSummary> {
  const { actions, adapter, options } = input;
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) throw new Error('campaign concurrency must be a positive integer');
  if (!Number.isInteger(options.transactionCap) || options.transactionCap < 0) throw new Error('campaign transaction cap must be a non-negative integer');
  if (options.nativeTokenBudget < 0n) throw new Error('campaign native-token budget must be non-negative');
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? defaultSleep;
  let state = await loadState(options.statePath);
  if (!state) {
    state = { version: CAMPAIGN_EXECUTION_VERSION, campaignId: input.campaignId, manifestFingerprint: input.manifestFingerprint, updatedAt: now().toISOString(), actions: actions.map((action) => ({ actionId: action.id, status: 'planned', attempts: 0 })) };
    await persistState(options.statePath, state);
  }
  if (state.version !== CAMPAIGN_EXECUTION_VERSION || state.campaignId !== input.campaignId || state.manifestFingerprint !== input.manifestFingerprint) throw new Error('execution state does not match this campaign plan');
  if (state.actions.length !== actions.length || state.actions.some((item, index) => item.actionId !== actions[index].id)) throw new Error('execution state action list does not match this campaign plan');

  const records = new Map(state.actions.map((record) => [record.actionId, record]));
  let reservedNativeCost = state.actions.reduce((sum, record) => sum + BigInt(record.nativeCost ?? 0), 0n);
  let transactionCount = state.actions.filter((record) => record.transactionHash).length;
  let lastSubmissionAt = 0;
  let stopped = false;
  let stateWrite = Promise.resolve();
  let submissionLock = Promise.resolve();
  const save = async (): Promise<void> => {
    state!.updatedAt = now().toISOString();
    stateWrite = stateWrite.then(() => persistState(options.statePath, state!));
    await stateWrite;
  };

  const submitWithinBudget = async (action: PlannedAction, record: CampaignActionExecution, estimate: bigint): Promise<void> => {
    const previous = submissionLock;
    let release = (): void => undefined;
    submissionLock = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      if (transactionCount >= options.transactionCap) throw new Error(`campaign transaction cap ${options.transactionCap} would be exceeded`);
      if (reservedNativeCost + estimate > options.nativeTokenBudget) throw new Error(`campaign native-token budget ${options.nativeTokenBudget} would be exceeded`);
      const pacingWait = Math.max(0, lastSubmissionAt + options.pacingMs - Date.now());
      if (pacingWait > 0) await sleep(pacingWait);
      record.attempts += 1;
      const transactionHash = await adapter.submit(action);
      lastSubmissionAt = Date.now();
      record.status = 'submitted'; record.transactionHash = transactionHash; record.nativeCost = estimate.toString();
      transactionCount += 1; reservedNativeCost += estimate;
      await save();
    } finally { release(); }
  };

  const run = async (action: PlannedAction): Promise<void> => {
    const record = records.get(action.id)!;
    let receiptRetries = 0;
    for (;;) {
      if (options.shouldStop?.()) { stopped = true; return; }
      if (record.status === 'submitted') {
        try {
          const receipt = await adapter.getReceipt(record.transactionHash!);
          if (!receipt) return;
          const previousCost = BigInt(record.nativeCost ?? 0);
          const actualCost = receipt.gasUsed * receipt.effectiveGasPrice;
          reservedNativeCost += actualCost - previousCost;
          record.gasUsed = receipt.gasUsed.toString(); record.nativeCost = actualCost.toString();
          record.status = receipt.status === 'success' ? 'mined' : 'failed';
          if (receipt.status === 'reverted') record.failure = { category: 'contract-revert', message: 'transaction reverted' };
          await save();
          return;
        } catch (error) {
          const failure = adapter.classifyError(error);
          receiptRetries += 1;
          if (failure.retryable && receiptRetries <= options.maxRetries) { await sleep(options.retryBackoffMs * receiptRetries); continue; }
          return;
        }
      }
      try {
        const estimate = await adapter.estimateNativeCost(action);
        await submitWithinBudget(action, record, estimate);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('campaign ')) throw error;
        const failure = adapter.classifyError(error);
        if (failure.retryable && record.attempts <= options.maxRetries) { await sleep(options.retryBackoffMs * record.attempts); continue; }
        record.status = 'failed'; record.failure = { category: failure.category, message: failure.message };
        await save();
        return;
      }
    }
  };

  while (!stopped) {
    if (options.shouldStop?.()) { stopped = true; break; }
    const ready = actions.filter((action) => {
      const record = records.get(action.id)!;
      if (record.status === 'mined' || record.status === 'failed') return false;
      return record.status === 'submitted' || action.dependsOn.every((dependency) => records.get(dependency)?.status === 'mined');
    });
    if (ready.length === 0) break;
    const batch = ready.slice(0, options.concurrency);
    await Promise.all(batch.map(run));
    if (batch.every((action) => records.get(action.id)!.status === 'submitted')) break;
  }
  await stateWrite;
  return summarize(state, stopped);
}
