import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type BridgeProposalStatus = 'pending' | 'consumed';

/**
 * A bridge suggestion submitted by an external party through the public
 * `POST /propose-bridge` API. Proposals are advisory: the bridge-creator's
 * synthesizer may adopt, adapt, or ignore them — they are simply a way for
 * outsiders to make a suggestion the bridge-creator will hear.
 */
export interface BridgeProposalRecord {
  id: string;
  submitted_at: string;
  proposer?: string;
  suggestion: string;
  left_statement?: string;
  right_statement?: string;
  common_ground?: string;
  topic_tag?: string;
  status: BridgeProposalStatus;
}

export interface BridgeProposalStoreFile {
  proposals: BridgeProposalRecord[];
}

/** The validated shape of an inbound proposal request body. */
export interface BridgeProposalInput {
  suggestion: string;
  proposer?: string;
  leftStatement?: string;
  rightStatement?: string;
  commonGround?: string;
  topicTag?: string;
}

export function loadProposalStoreFile(filePath: string): BridgeProposalStoreFile {
  if (!existsSync(filePath)) return { proposals: [] };
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  return normalizeProposalStoreFile(parsed);
}

export function normalizeProposalStoreFile(value: unknown): BridgeProposalStoreFile {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { proposals?: unknown }).proposals)) {
    throw new Error('Proposal store file must contain a proposals array');
  }

  const proposals = (value as { proposals: unknown[] }).proposals.map(normalizeProposalRecord);
  assertUniqueProposalIds(proposals);
  return { proposals };
}

export function saveProposalStoreFile(filePath: string, store: BridgeProposalStoreFile): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(store, null, 2)}\n`);
}

export function getPendingProposals(store: BridgeProposalStoreFile): BridgeProposalRecord[] {
  return store.proposals.filter((proposal) => proposal.status === 'pending');
}

/**
 * Validate and normalize a raw request body into a {@link BridgeProposalInput}.
 * Throws an Error (with a user-facing message) when the body is invalid.
 */
export function validateProposalInput(body: unknown): BridgeProposalInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  const record = body as Record<string, unknown>;
  const suggestion = optionalString(record.suggestion);
  if (!suggestion) {
    throw new Error('Missing required field: suggestion');
  }
  return {
    suggestion,
    proposer: optionalString(record.proposer),
    leftStatement: optionalString(record.left_statement ?? record.leftStatement),
    rightStatement: optionalString(record.right_statement ?? record.rightStatement),
    commonGround: optionalString(record.common_ground ?? record.commonGround),
    topicTag: optionalString(record.topic_tag ?? record.topicTag),
  };
}

/**
 * Append a new pending proposal to the store on disk and return the stored
 * record (including its generated id and timestamp).
 */
export function appendProposal(
  filePath: string,
  input: BridgeProposalInput,
  now: Date = new Date(),
): BridgeProposalRecord {
  const store = loadProposalStoreFile(filePath);
  const record: BridgeProposalRecord = {
    id: generateProposalId(now),
    submitted_at: now.toISOString(),
    proposer: input.proposer,
    suggestion: input.suggestion,
    left_statement: input.leftStatement,
    right_statement: input.rightStatement,
    common_ground: input.commonGround,
    topic_tag: input.topicTag,
    status: 'pending',
  };
  store.proposals.push(record);
  saveProposalStoreFile(filePath, store);
  return record;
}

/**
 * Mark the given proposal ids as consumed, so a future synthesis tick does not
 * reconsider proposals the synthesizer has already heard. Unknown ids are
 * ignored. No-op when `ids` is empty.
 */
export function markProposalsConsumed(filePath: string, ids: readonly string[]): void {
  if (ids.length === 0) return;
  const store = loadProposalStoreFile(filePath);
  const consumed = new Set(ids);
  let changed = false;
  for (const proposal of store.proposals) {
    if (proposal.status === 'pending' && consumed.has(proposal.id)) {
      proposal.status = 'consumed';
      changed = true;
    }
  }
  if (changed) {
    saveProposalStoreFile(filePath, store);
  }
}

function generateProposalId(now: Date): string {
  return `prop_${now.getTime()}_${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeProposalRecord(value: unknown): BridgeProposalRecord {
  if (!value || typeof value !== 'object') {
    throw new Error('Proposal record must be an object');
  }
  const record = value as Record<string, unknown>;
  return {
    id: requireString(record.id, 'id'),
    submitted_at: requireString(record.submitted_at, 'submitted_at'),
    proposer: optionalString(record.proposer),
    suggestion: requireString(record.suggestion, 'suggestion'),
    left_statement: optionalString(record.left_statement),
    right_statement: optionalString(record.right_statement),
    common_ground: optionalString(record.common_ground),
    topic_tag: optionalString(record.topic_tag),
    status: requireStatus(record.status),
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Proposal record is missing required string field: ${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requireStatus(value: unknown): BridgeProposalStatus {
  if (value === 'pending' || value === 'consumed') {
    return value;
  }
  throw new Error('Proposal record status must be pending or consumed');
}

function assertUniqueProposalIds(proposals: BridgeProposalRecord[]): void {
  const seen = new Set<string>();
  for (const proposal of proposals) {
    if (seen.has(proposal.id)) {
      throw new Error(`Duplicate proposal id: ${proposal.id}`);
    }
    seen.add(proposal.id);
  }
}
