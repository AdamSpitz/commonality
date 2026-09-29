import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Hex } from 'viem';
import { groupCampaignWrites, splitNativeCost } from './campaignBatching.js';
import type { PlannedAction } from './campaignPlanner.js';

export const CAMPAIGN_EXECUTION_VERSION = 'commonality-campaign-execution-v1' as const;

export type CampaignActionStatus = 'planned' | 'submitted' | 'mined' | 'failed';

export interface CampaignReceipt {
  status: 'success' | 'reverted';
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  blockNumber?: bigint;
}

export interface CampaignExecutionAdapter {
  estimateNativeCost(action: PlannedAction): Promise<bigint>;
  /** Cost of one transaction that submits this whole group. Falls back to the sum of per-action estimates. */
  estimateGroupCost?(actions: readonly PlannedAction[]): Promise<bigint>;
  submit(action: PlannedAction): Promise<Hex>;
  /** One transaction for every action in the group. Required when a group has more than one action. */
  submitGroup?(actions: readonly PlannedAction[]): Promise<Hex>;
  getReceipt(transactionHash: Hex): Promise<CampaignReceipt | null>;
  classifyError(error: unknown): { retryable: boolean; category: string; message: string };
}

export interface CampaignActionExecution {
  actionId: string;
  status: CampaignActionStatus;
  attempts: number;
  transactionHash?: Hex;
  submittedAt?: string;
  minedAt?: string;
  blockNumber?: string;
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
  /** False when the deployed PublishedData contract has no publishDataBatch. Defaults to true. */
  batchPublishes?: boolean;
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
    transactions: new Set(state.actions.map((action) => action.transactionHash).filter((hash) => hash !== undefined)).size,
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
  const groups = groupCampaignWrites(actions, { batchPublishes: options.batchPublishes });
  let reservedNativeCost = state.actions.reduce((sum, record) => sum + BigInt(record.nativeCost ?? 0), 0n);
  let transactionCount = new Set(state.actions.map((record) => record.transactionHash).filter((hash) => hash !== undefined)).size;
  let lastSubmissionAt = 0;
  let stopped = false;
  let stateWrite = Promise.resolve();
  let submissionLock = Promise.resolve();
  const save = async (): Promise<void> => {
    state!.updatedAt = now().toISOString();
    stateWrite = stateWrite.then(() => persistState(options.statePath, state!));
    await stateWrite;
  };

  const applyReceipt = async (members: readonly PlannedAction[], transactionHash: Hex): Promise<boolean> => {
    const receipt = await adapter.getReceipt(transactionHash);
    if (!receipt) return false;
    const memberRecords = members.map((action) => records.get(action.id)!);
    const previousCost = memberRecords.reduce((sum, record) => sum + BigInt(record.nativeCost ?? 0), 0n);
    const actualCost = receipt.gasUsed * receipt.effectiveGasPrice;
    const shares = splitNativeCost(actualCost, memberRecords.length);
    reservedNativeCost += actualCost - previousCost;
    const minedAt = now().toISOString();
    memberRecords.forEach((record, index) => {
      record.gasUsed = receipt.gasUsed.toString();
      record.nativeCost = shares[index].toString();
      record.minedAt = minedAt;
      if (receipt.blockNumber !== undefined) record.blockNumber = receipt.blockNumber.toString();
      record.status = receipt.status === 'success' ? 'mined' : 'failed';
      if (receipt.status === 'reverted') record.failure = { category: 'contract-revert', message: 'transaction reverted' };
    });
    await save();
    return true;
  };

  const submitWithinBudget = async (members: readonly PlannedAction[], estimate: bigint): Promise<void> => {
    const previous = submissionLock;
    let release = (): void => undefined;
    submissionLock = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      if (transactionCount >= options.transactionCap) throw new Error(`campaign transaction cap ${options.transactionCap} would be exceeded`);
      if (reservedNativeCost + estimate > options.nativeTokenBudget) throw new Error(`campaign native-token budget ${options.nativeTokenBudget} would be exceeded`);
      const pacingWait = Math.max(0, lastSubmissionAt + options.pacingMs - Date.now());
      if (pacingWait > 0) await sleep(pacingWait);
      const memberRecords = members.map((action) => records.get(action.id)!);
      for (const record of memberRecords) record.attempts += 1;
      const transactionHash = members.length === 1
        ? await adapter.submit(members[0])
        : await adapter.submitGroup!(members);
      lastSubmissionAt = Date.now();
      const shares = splitNativeCost(estimate, memberRecords.length);
      const submittedAt = now().toISOString();
      memberRecords.forEach((record, index) => {
        record.status = 'submitted';
        record.transactionHash = transactionHash;
        record.nativeCost = shares[index].toString();
        record.submittedAt = submittedAt;
      });
      transactionCount += 1; reservedNativeCost += estimate;
      await save();
    } finally { release(); }
  };

  const run = async (members: readonly PlannedAction[]): Promise<void> => {
    const memberRecords = () => members.map((action) => records.get(action.id)!);
    let receiptRetries = 0;
    for (;;) {
      if (options.shouldStop?.()) { stopped = true; return; }
      const current = memberRecords();
      if (current.every((record) => record.status === 'submitted')) {
        try {
          const mined = await applyReceipt(members, current[0].transactionHash!);
          if (!mined) return;
          return;
        } catch (error) {
          const failure = adapter.classifyError(error);
          receiptRetries += 1;
          if (failure.retryable && receiptRetries <= options.maxRetries) { await sleep(options.retryBackoffMs * receiptRetries); continue; }
          return;
        }
      }
      try {
        if (members.length > 1 && !adapter.submitGroup) throw new Error('campaign adapter cannot submit a batched write group');
        const estimate = adapter.estimateGroupCost
          ? await adapter.estimateGroupCost(members)
          : (await Promise.all(members.map((action) => adapter.estimateNativeCost(action)))).reduce((sum, cost) => sum + cost, 0n);
        await submitWithinBudget(members, estimate);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('campaign ')) throw error;
        const failure = adapter.classifyError(error);
        const attempts = memberRecords()[0]?.attempts ?? 0;
        if (failure.retryable && attempts <= options.maxRetries) { await sleep(options.retryBackoffMs * attempts); continue; }
        for (const record of memberRecords()) {
          record.status = 'failed';
          record.failure = { category: failure.category, message: failure.message };
        }
        await save();
        return;
      }
    }
  };

  const readyWork = (): PlannedAction[][] => {
    const work: PlannedAction[][] = [];
    for (const members of groups) {
      const pending = members.filter((action) => {
        const status = records.get(action.id)!.status;
        return status !== 'mined' && status !== 'failed';
      });
      const submitted = pending.filter((action) => records.get(action.id)!.status === 'submitted');
      if (submitted.length > 0) {
        work.push(submitted);
        continue;
      }
      const planned = pending.filter((action) => action.dependsOn.every((dependency) => records.get(dependency)?.status === 'mined'));
      if (planned.length > 0) work.push(planned);
    }
    return work;
  };

  while (!stopped) {
    if (options.shouldStop?.()) { stopped = true; break; }
    const ready = readyWork();
    if (ready.length === 0) break;
    const batch = ready.slice(0, options.concurrency);
    await Promise.all(batch.map(run));
    if (batch.every((members) => members.every((action) => records.get(action.id)!.status === 'submitted'))) break;
  }
  await stateWrite;
  return summarize(state, stopped);
}
