import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Hex } from 'viem';
import type { CampaignActionType } from './campaignSchema.js';
import type { CampaignExecutionState } from './campaignExecutor.js';
import type { PlannedAction } from './campaignPlanner.js';

export const CAMPAIGN_RECONCILIATION_VERSION = 'commonality-campaign-reconciliation-v1' as const;
export interface IndexedActionMatch { entityId: string; eventId: string; transactionHash: Hex; indexedAt?: string }
export interface DerivedCheck { name: string; expected: string | number | boolean | null; actual: string | number | boolean | null }
export interface CampaignReconciliationAdapter {
  getChainHead(): Promise<bigint>;
  getIndexerHead(): Promise<bigint>;
  findIndexedAction(action: PlannedAction, transactionHash: Hex): Promise<IndexedActionMatch[]>;
  getDerivedChecks(action: PlannedAction): Promise<DerivedCheck[]>;
}
export type ReconciliationStatus = 'verified' | 'pending' | 'missing' | 'duplicate' | 'derived-mismatch' | 'not-mined';
export interface ActionReconciliation { actionId: string; type: CampaignActionType; status: ReconciliationStatus; transactionHash?: Hex; indexedMatches: IndexedActionMatch[]; derivedChecks: DerivedCheck[]; indexLatencyMs?: number }
export interface CampaignReconciliationReport {
  version: typeof CAMPAIGN_RECONCILIATION_VERSION; campaignId: string; manifestFingerprint: string; generatedAt: string;
  settlingWindowMs: number; settled: boolean; chainHead: string; indexerHead: string; chainHeadLag: string;
  countsByStatus: Record<ReconciliationStatus, number>; countsByType: Record<string, Record<ReconciliationStatus, number>>; actions: ActionReconciliation[];
}
export interface CampaignReconciliationOptions { settlingWindowMs: number; pollIntervalMs: number; now?: () => Date; sleep?: (milliseconds: number) => Promise<void> }

const statuses: ReconciliationStatus[] = ['verified', 'pending', 'missing', 'duplicate', 'derived-mismatch', 'not-mined'];
const emptyCounts = (): Record<ReconciliationStatus, number> => Object.fromEntries(statuses.map((status) => [status, 0])) as Record<ReconciliationStatus, number>;
const delay = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function reconcileCampaign(input: { actions: readonly PlannedAction[]; execution: CampaignExecutionState; adapter: CampaignReconciliationAdapter; options: CampaignReconciliationOptions }): Promise<CampaignReconciliationReport> {
  const { actions, execution, adapter, options } = input;
  if (options.settlingWindowMs < 0 || options.pollIntervalMs < 0) throw new Error('settling and poll intervals must be non-negative');
  if (actions.length === 0) throw new Error('cannot reconcile an empty campaign plan');
  if (execution.actions.length !== actions.length || execution.actions.some((record, index) => record.actionId !== actions[index]?.id)) throw new Error('execution state action list does not match reconciliation plan');
  const now = options.now ?? (() => new Date()); const sleep = options.sleep ?? delay; const started = now().getTime();
  let observations: ActionReconciliation[] = []; let chainHead = 0n; let indexerHead = 0n;
  for (;;) {
    [chainHead, indexerHead] = await Promise.all([adapter.getChainHead(), adapter.getIndexerHead()]);
    observations = await Promise.all(actions.map(async (action, index): Promise<ActionReconciliation> => {
      const record = execution.actions[index];
      if (record.status !== 'mined' || !record.transactionHash) return { actionId: action.id, type: action.type, status: 'not-mined', indexedMatches: [], derivedChecks: [] };
      const [indexedMatches, derivedChecks] = await Promise.all([adapter.findIndexedAction(action, record.transactionHash), adapter.getDerivedChecks(action)]);
      let status: ReconciliationStatus = 'verified';
      if (indexedMatches.length === 0) status = 'pending';
      else if (indexedMatches.length > 1 || new Set(indexedMatches.map((match) => match.entityId)).size > 1) status = 'duplicate';
      else if (derivedChecks.some((check) => check.actual !== check.expected)) status = 'derived-mismatch';
      const indexedAt = indexedMatches[0]?.indexedAt ? Date.parse(indexedMatches[0].indexedAt) : undefined;
      const minedAt = record.minedAt ? Date.parse(record.minedAt) : undefined;
      return { actionId: action.id, type: action.type, status, transactionHash: record.transactionHash, indexedMatches, derivedChecks, ...(indexedAt !== undefined && minedAt !== undefined ? { indexLatencyMs: Math.max(0, indexedAt - minedAt) } : {}) };
    }));
    if (!observations.some((item) => item.status === 'pending') || now().getTime() - started >= options.settlingWindowMs) break;
    await sleep(options.pollIntervalMs);
  }
  if (now().getTime() - started >= options.settlingWindowMs) observations = observations.map((item) => item.status === 'pending' ? { ...item, status: 'missing' } : item);
  const countsByStatus = emptyCounts(); const countsByType: Record<string, Record<ReconciliationStatus, number>> = {};
  for (const item of observations) { countsByStatus[item.status] += 1; (countsByType[item.type] ??= emptyCounts())[item.status] += 1; }
  return { version: CAMPAIGN_RECONCILIATION_VERSION, campaignId: execution.campaignId, manifestFingerprint: execution.manifestFingerprint, generatedAt: now().toISOString(), settlingWindowMs: options.settlingWindowMs, settled: !observations.some((item) => item.status === 'pending'), chainHead: chainHead.toString(), indexerHead: indexerHead.toString(), chainHeadLag: (chainHead > indexerHead ? chainHead - indexerHead : 0n).toString(), countsByStatus, countsByType, actions: observations };
}

export function formatReconciliationReport(report: CampaignReconciliationReport): string {
  const failures = report.actions.filter((action) => !['verified', 'not-mined'].includes(action.status));
  return [`Campaign ${report.campaignId}: ${report.countsByStatus.verified}/${report.actions.length} actions verified`, `Indexer head ${report.indexerHead}; chain head ${report.chainHead}; lag ${report.chainHeadLag} blocks`, failures.length === 0 ? 'No indexing or derived-state discrepancies.' : `Discrepancies: ${failures.map((item) => `${item.actionId} (${item.status})`).join(', ')}`].join('\n');
}

export async function writeReconciliationArtifacts(report: CampaignReconciliationReport, jsonPath: string, summaryPath: string): Promise<void> {
  await mkdir(path.dirname(jsonPath), { recursive: true }); await mkdir(path.dirname(summaryPath), { recursive: true });
  const jsonTemporary = `${jsonPath}.tmp`; const summaryTemporary = `${summaryPath}.tmp`;
  await writeFile(jsonTemporary, `${JSON.stringify(report, null, 2)}\n`); await writeFile(summaryTemporary, `${formatReconciliationReport(report)}\n`);
  await rename(jsonTemporary, jsonPath); await rename(summaryTemporary, summaryPath);
}
