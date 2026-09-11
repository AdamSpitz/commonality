import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getAddress, isAddress, zeroAddress, type Address } from 'viem';
import { ensureIpfsCidV1, type IpfsCidV1 } from '@commonality/sdk/utils';
import type { CampaignPlan } from './campaignPlanner.js';

export const CAMPAIGN_RUNTIME_BINDINGS_VERSION = 'commonality-campaign-runtime-bindings-v1' as const;

export interface CampaignCauseBinding {
  owner: Address;
  refName: string;
  rosterCid: IpfsCidV1;
}

export interface CampaignNoteBinding {
  contractAddress: Address;
  noteId: string;
}

/**
 * Public, execution-produced identifiers needed to turn planned IDs into SDK
 * queries. This artifact deliberately contains no wallet private keys.
 */
export interface CampaignRuntimeBindings {
  version: typeof CAMPAIGN_RUNTIME_BINDINGS_VERSION;
  campaignId: string;
  manifestFingerprint: string;
  updatedAt: string;
  users: Record<string, Address>;
  statements: Record<string, IpfsCidV1>;
  causes: Record<string, CampaignCauseBinding>;
  projects: Record<string, Address>;
  notes: Record<string, CampaignNoteBinding>;
}

export function createEmptyRuntimeBindings(plan: CampaignPlan, now: Date = new Date()): CampaignRuntimeBindings {
  return {
    version: CAMPAIGN_RUNTIME_BINDINGS_VERSION,
    campaignId: plan.campaignId,
    manifestFingerprint: plan.manifestFingerprint,
    updatedAt: now.toISOString(),
    users: {}, statements: {}, causes: {}, projects: {}, notes: {},
  };
}

function validateAddress(value: unknown, label: string): asserts value is Address {
  if (typeof value !== 'string' || !isAddress(value) || getAddress(value) === zeroAddress) {
    throw new Error(`${label} is not a valid non-zero address`);
  }
}

function validateKeys(label: string, values: Record<string, unknown>, allowed: Set<string>): void {
  for (const id of Object.keys(values)) if (!allowed.has(id)) throw new Error(`${label} contains unknown planned ID ${id}`);
}

function validateBindingValues(bindings: CampaignRuntimeBindings): void {
  for (const [id, address] of Object.entries(bindings.users)) validateAddress(address, `user ${id}`);
  for (const [id, cid] of Object.entries(bindings.statements)) {
    try { ensureIpfsCidV1(cid); } catch { throw new Error(`statement ${id} is not a valid CIDv1`); }
  }
  for (const [id, cause] of Object.entries(bindings.causes)) {
    validateAddress(cause.owner, `cause ${id} owner`);
    if (!cause.refName.trim()) throw new Error(`cause ${id} has an empty ref name`);
    try { ensureIpfsCidV1(cause.rosterCid); } catch { throw new Error(`cause ${id} roster is not a valid CIDv1`); }
  }
  for (const [id, address] of Object.entries(bindings.projects)) validateAddress(address, `project ${id}`);
  for (const [id, note] of Object.entries(bindings.notes)) {
    validateAddress(note.contractAddress, `note ${id} contract`);
    if (!/^(0|[1-9][0-9]*)$/.test(note.noteId)) throw new Error(`note ${id} has an invalid on-chain ID`);
  }
}

function missingBindings(kind: string, plannedIds: Set<string>, values: Record<string, unknown>): string[] {
  return [...plannedIds].filter((id) => !values[id]).map((id) => `${kind}:${id}`);
}

function requireCompleteBindings(bindings: CampaignRuntimeBindings, ids: Record<'user' | 'statement' | 'cause' | 'project' | 'note', Set<string>>): void {
  const missing = [
    ...missingBindings('user', ids.user, bindings.users),
    ...missingBindings('statement', ids.statement, bindings.statements),
    ...missingBindings('cause', ids.cause, bindings.causes),
    ...missingBindings('project', ids.project, bindings.projects),
    ...missingBindings('note', ids.note, bindings.notes),
  ];
  if (missing.length > 0) throw new Error(`runtime bindings are incomplete: ${missing.join(', ')}`);
}

export function validateRuntimeBindings(plan: CampaignPlan, bindings: CampaignRuntimeBindings, options: { complete?: boolean } = {}): void {
  if (bindings.version !== CAMPAIGN_RUNTIME_BINDINGS_VERSION || bindings.campaignId !== plan.campaignId || bindings.manifestFingerprint !== plan.manifestFingerprint) {
    throw new Error('runtime bindings do not match this campaign plan');
  }
  if (!Number.isFinite(Date.parse(bindings.updatedAt))) throw new Error('runtime bindings updatedAt is not a valid timestamp');

  const userIds = new Set(plan.users.map((item) => item.id));
  const statementIds = new Set(plan.statements.map((item) => item.id));
  const causeIds = new Set(plan.statements.map((item) => item.causeId));
  const projectIds = new Set(plan.projects.map((item) => item.id));
  const noteIds = new Set(plan.actions.flatMap((item) => item.noteId ? [item.noteId] : []));
  validateKeys('users', bindings.users, userIds);
  validateKeys('statements', bindings.statements, statementIds);
  validateKeys('causes', bindings.causes, causeIds);
  validateKeys('projects', bindings.projects, projectIds);
  validateKeys('notes', bindings.notes, noteIds);

  validateBindingValues(bindings);
  if (options.complete) requireCompleteBindings(bindings, { user: userIds, statement: statementIds, cause: causeIds, project: projectIds, note: noteIds });
}

export async function writeRuntimeBindings(plan: CampaignPlan, bindings: CampaignRuntimeBindings, outputPath: string): Promise<void> {
  validateRuntimeBindings(plan, bindings);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(bindings, null, 2)}\n`);
  await rename(temporaryPath, outputPath);
}

export async function loadRuntimeBindings(plan: CampaignPlan, inputPath: string, options: { complete?: boolean } = {}): Promise<CampaignRuntimeBindings> {
  const bindings = JSON.parse(await readFile(inputPath, 'utf8')) as CampaignRuntimeBindings;
  validateRuntimeBindings(plan, bindings, options);
  return bindings;
}
