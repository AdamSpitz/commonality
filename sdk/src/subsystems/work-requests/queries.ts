import type { Address } from 'viem';
import type { SDKMachinery } from '../../machinery.js';
import { fetchAllRefUpdatedEvents, fetchEvents, padAddressAsTopic } from '../../utils/eventCacheClient.js';
import { decodeProjectCreatedEvent } from '../../utils/event-decoders/lazy-giving.js';
import { decodeMutableRefEvent } from '../../utils/event-decoders/mutable-refs.js';
import { getNote } from '../delegation/queries.js';
import { createDefaultDocumentReader } from '../displayable-documents/displayable-document.js';
import type { DisplayableDocument } from '../displayable-documents/displayable-document.js';
import { getProjectContributions, getProjectRefunds } from '../lazy-giving/queries.js';
import { getProjectWorkState } from '../work-items/queries.js';
import {
  assembleWorkRequestBoard,
  paymentEvidenceFromChainPayments,
  type ChainPaymentRecord,
  type NoteBackingSnapshot,
  type PaymentEvidence,
  type ProjectWorkAuthority,
  type WorkRefUpdate,
  type WorkRequestBoard,
} from './fold.js';
import { classifyWorkRefName } from './names.js';

function projectAddresses(documents: ReadonlyMap<string, { document: DisplayableDocument }>): Address[] {
  const found = new Set<string>();
  for (const entry of documents.values()) {
    const value = entry.document.extras?.projectAddress;
    if (typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)) found.add(value.toLowerCase());
  }
  return [...found] as Address[];
}

/** ProjectCreated is emitted by the factory `getProjectWorkState` reads. Not a new table. */
async function factoryForProject(machinery: SDKMachinery, project: Address): Promise<Address | null> {
  try {
    const raw = await fetchEvents(machinery, {
      eventName: 'ProjectCreated',
      topic3: padAddressAsTopic(project),
      limit: 10,
    });
    for (const event of raw) {
      const decoded = decodeProjectCreatedEvent(event);
      if (!decoded || decoded.assuranceContract.toLowerCase() !== project.toLowerCase()) continue;
      if (!/^0x[0-9a-fA-F]{40}$/.test(decoded.contractAddress)) continue;
      return decoded.contractAddress;
    }
  } catch {
    return null;
  }
  return null;
}

async function loadProjectAuthority(
  machinery: SDKMachinery,
  project: Address,
  chainId: number | null,
): Promise<ProjectWorkAuthority | null> {
  if (chainId == null) return null;
  try {
    const factory = await factoryForProject(machinery, project);
    if (!factory) return null;
    const state = await getProjectWorkState(machinery, factory, project);
    if (!state) return null;
    return {
      chainId,
      projectAddress: project.toLowerCase(),
      beneficiaryAddress: state.beneficiaryAddress,
      workItemIds: state.items.map((item) => item.id),
    };
  } catch {
    return null;
  }
}

function chainPayment(record: { projectAddress: string; transactionHash: string; amount: string; tokenAddress: string | null }): ChainPaymentRecord {
  return {
    projectAddress: record.projectAddress,
    transactionHash: record.transactionHash,
    amount: record.amount,
    tokenAddress: record.tokenAddress,
  };
}

function paymentQueryChainId(machinery: SDKMachinery): number | null {
  const queried = machinery.defaultChainId;
  if (queried == null) return null;
  const readChain = machinery.publicClient?.chain?.id;
  if (readChain != null && readChain !== queried) return null;
  return queried;
}

async function loadProjectPayments(
  machinery: SDKMachinery,
  project: Address,
  chainId: number | null,
): Promise<PaymentEvidence[]> {
  if (chainId == null) return [];
  try {
    const [contributions, refunds] = await Promise.all([
      getProjectContributions(machinery, project),
      getProjectRefunds(machinery, project),
    ]);
    return [
      ...paymentEvidenceFromChainPayments(chainId, 'contribution', contributions.map((contribution) => chainPayment({
        projectAddress: contribution.projectAddress,
        transactionHash: contribution.transactionHash,
        amount: contribution.totalCost,
        tokenAddress: contribution.currency.tokenAddress,
      }))),
      ...paymentEvidenceFromChainPayments(chainId, 'refund', refunds.map((refund) => chainPayment({
        projectAddress: refund.projectAddress,
        transactionHash: refund.transactionHash,
        amount: refund.totalRefund,
        tokenAddress: refund.currency.tokenAddress,
      }))),
    ];
  } catch {
    return [];
  }
}

export async function loadWorkRequestBoard(machinery: SDKMachinery, nowMs = Date.now()): Promise<WorkRequestBoard> {
  const raw = await fetchAllRefUpdatedEvents(machinery);
  const updates: WorkRefUpdate[] = [];
  for (const event of raw) {
    const decoded = decodeMutableRefEvent(event);
    if (!decoded || !classifyWorkRefName(decoded.refName)) continue;
    updates.push({
      owner: decoded.owner,
      name: decoded.refName,
      value: decoded.currentRefValue,
      blockNumber: decoded.blockNumber.toString(),
      logIndex: decoded.logIndex,
      timestamp: decoded.blockTimestamp.toString(),
    });
  }

  const reader = createDefaultDocumentReader(machinery);
  const documentsByCid = new Map<string, { document: DisplayableDocument; retracted: boolean }>();
  for (const cid of new Set(updates.map((update) => update.value.trim()).filter(Boolean))) {
    const result = await reader.read(cid as never);
    if (result.status === 'unavailable') throw new Error('Work-record documents are temporarily unavailable.');
    if (result.status === 'active') documentsByCid.set(cid, { document: result.document, retracted: false });
    else if (result.status === 'retracted') documentsByCid.set(cid, { document: result.retractedDocument, retracted: true });
  }

  const noteIds = new Set<string>();
  for (const entry of documentsByCid.values()) {
    const extras = entry.document.extras;
    if (extras && typeof extras.backingNoteId === 'string' && extras.backingNoteId) noteIds.add(extras.backingNoteId);
  }
  const notes: NoteBackingSnapshot[] = [];
  for (const id of noteIds) {
    const note = await getNote(machinery, id);
    if (!note) continue;
    notes.push({
      id: note.id,
      active: note.active,
      tokenType: note.tokenType,
      token: note.token,
      amount: note.amount,
      owner: note.owner,
    });
  }

  const paymentChainId = paymentQueryChainId(machinery);
  const authorityChainId = machinery.publicClient?.chain?.id ?? null;
  const projects = projectAddresses(documentsByCid);
  const loaded = await Promise.all(projects.map(async (project) => {
    const [payments, authority] = await Promise.all([
      loadProjectPayments(machinery, project, paymentChainId),
      loadProjectAuthority(machinery, project, authorityChainId),
    ]);
    return { payments, authority };
  }));

  return assembleWorkRequestBoard({
    updates,
    documentsByCid,
    notes,
    settlementTokens: machinery.settlementTokenAddresses ?? [],
    nowMs,
    chainId: machinery.defaultChainId ?? machinery.publicClient?.chain?.id ?? 31337,
    paymentEvidence: loaded.flatMap((item) => item.payments),
    projectAuthority: loaded.flatMap((item) => item.authority ? [item.authority] : []),
  });
}
