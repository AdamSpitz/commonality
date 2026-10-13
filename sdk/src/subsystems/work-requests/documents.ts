import {
  createDisplayableDocument,
  publishedDataCidForDocument,
  type DisplayableDocument,
} from '../displayable-documents/displayable-document.js';
import type { PublishedDataCid } from '../published-data/index.js';

export const WORK_RECORD_SCHEMA = 1 as const;

export type WorkRecordKind =
  | 'commonality.work-request'
  | 'commonality.work-offer'
  | 'commonality.work-response'
  | 'commonality.work-acceptance'
  | 'commonality.work-decision'
  | 'commonality.work-contribution-link';

export interface RequestBody {
  slug: string;
  outcome: string;
  requirements: string[];
  participationLimits: string[];
  statementCids: string[];
  contextNote: string;
  responseDeadline: string | null;
  previousCid: string | null;
}

export interface OfferBody {
  slug: string;
  requestVersionCid: string;
  amount: string;
  token: string;
  chainId: number;
  expiry: string;
  approvalAuthority: 'offer-author';
  conditions: string;
  backingNoteId: string | null;
  status: 'open' | 'withdrawn';
  previousCid: string | null;
}

export interface ResponseBody {
  slug: string;
  requestVersionCid: string;
  chainId: number;
  projectAddress: string;
  providerAddress: string;
  workItemIds: string[];
  scope: string;
  exceptions: string;
  capacity: string;
  previousCid: string | null;
}

export interface AcceptanceBody {
  responseOwner: string;
  responseSlug: string;
  responseVersionCid: string;
  capacity: string;
  previousCid: string | null;
}

export interface DecisionBody {
  offerOwner: string;
  offerSlug: string;
  responseOwner: string;
  responseSlug: string;
  offerVersionCid: string;
  responseVersionCid: string;
  outcome: 'approve' | 'decline';
  explanation: string;
  previousCid: string | null;
}

export interface ContributionLinkBody {
  slug: string;
  offerVersionCid: string;
  responseVersionCid: string;
  chainId: number;
  projectAddress: string;
  txHash: string;
  amount: string;
  token: string;
  refundTxHash: string | null;
  previousCid: string | null;
}

export type WorkRecordBody =
  | { kind: 'commonality.work-request'; body: RequestBody }
  | { kind: 'commonality.work-offer'; body: OfferBody }
  | { kind: 'commonality.work-response'; body: ResponseBody }
  | { kind: 'commonality.work-acceptance'; body: AcceptanceBody }
  | { kind: 'commonality.work-decision'; body: DecisionBody }
  | { kind: 'commonality.work-contribution-link'; body: ContributionLinkBody };

function lines(title: string, rows: Array<[string, string]>): string {
  const body = rows.filter(([, value]) => value.trim().length > 0).map(([label, value]) => `${label}: ${value}`);
  return [`# ${title}`, ...body].join('\n');
}

function extras(kind: WorkRecordKind, fields: Record<string, unknown>): Record<string, unknown> {
  return { kind, schemaVersion: WORK_RECORD_SCHEMA, ...fields };
}

function cleanList(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

function requireAmount(value: string): string {
  if (!/^[0-9]+$/.test(value) || value === '0') throw new Error('Amount must be a positive integer in token base units.');
  return value;
}

function requireAddress(value: string, label: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`${label} must be an address.`);
  return value.toLowerCase();
}

function requireHash(value: string, label: string): string {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`${label} must be a transaction hash.`);
  return value.toLowerCase();
}

export function buildWorkRequestDocument(input: RequestBody): DisplayableDocument {
  const body: RequestBody = {
    ...input,
    slug: input.slug,
    outcome: requireText(input.outcome, 'Outcome'),
    requirements: cleanList(input.requirements),
    participationLimits: cleanList(input.participationLimits),
    statementCids: cleanList(input.statementCids),
    contextNote: input.contextNote.trim(),
    responseDeadline: input.responseDeadline?.trim() || null,
    previousCid: input.previousCid,
  };
  return createDisplayableDocument({
    format: 'text/plain',
    content: lines('Request for work', [
      ['Outcome', body.outcome],
      ['Requirements', body.requirements.join('; ')],
      ['Participation limits', body.participationLimits.join('; ')],
      ['Context', body.contextNote],
      ['Response deadline', body.responseDeadline ?? ''],
    ]),
    references: body.statementCids.map((cid) => ({ cid, label: 'statement' })),
    extras: extras('commonality.work-request', { ...body }),
  });
}

export function buildWorkOfferDocument(input: OfferBody): DisplayableDocument {
  const body: OfferBody = {
    ...input,
    amount: requireAmount(input.amount),
    token: requireAddress(input.token, 'Token'),
    requestVersionCid: requireText(input.requestVersionCid, 'Request version'),
    expiry: requireText(input.expiry, 'Expiry'),
    conditions: input.conditions.trim(),
    backingNoteId: input.backingNoteId?.trim() || null,
    approvalAuthority: 'offer-author',
  };
  return createDisplayableDocument({
    format: 'text/plain',
    content: lines('Funding offer', [
      ['Request version', body.requestVersionCid],
      ['Amount', `${body.amount} of ${body.token} on chain ${body.chainId}`],
      ['Expiry', body.expiry],
      ['Approval', 'The offer author still decides whether a response is acceptable.'],
      ['Conditions', body.conditions],
      ['Backing note', body.backingNoteId ?? 'none'],
      ['Status', body.status],
    ]),
    extras: extras('commonality.work-offer', { ...body }),
  });
}

export function buildWorkResponseDocument(input: ResponseBody): DisplayableDocument {
  const body: ResponseBody = {
    ...input,
    requestVersionCid: requireText(input.requestVersionCid, 'Request version'),
    projectAddress: requireAddress(input.projectAddress, 'Project'),
    providerAddress: requireAddress(input.providerAddress, 'Provider'),
    workItemIds: cleanList(input.workItemIds),
    scope: requireText(input.scope, 'Scope'),
    exceptions: input.exceptions.trim(),
    capacity: input.capacity.trim(),
  };
  if (body.workItemIds.length === 0) throw new Error('Name at least one work item.');
  return createDisplayableDocument({
    format: 'text/plain',
    content: lines('Response to a request for work', [
      ['Request version', body.requestVersionCid],
      ['Project', body.projectAddress],
      ['Provider', body.providerAddress],
      ['Work items', body.workItemIds.join(', ')],
      ['Scope', body.scope],
      ['Exceptions', body.exceptions],
      ['Capacity', body.capacity],
    ]),
    extras: extras('commonality.work-response', { ...body }),
  });
}

export function buildWorkAcceptanceDocument(input: AcceptanceBody): DisplayableDocument {
  const body: AcceptanceBody = {
    ...input,
    responseOwner: requireAddress(input.responseOwner, 'Response author'),
    responseVersionCid: requireText(input.responseVersionCid, 'Response version'),
    capacity: requireText(input.capacity, 'Capacity'),
  };
  return createDisplayableDocument({
    format: 'text/plain',
    content: lines('Provider acceptance', [
      ['Response version', body.responseVersionCid],
      ['Capacity', body.capacity],
      ['Undertaking', 'The provider accepts the named response and request version. This is not proof the work is done.'],
    ]),
    extras: extras('commonality.work-acceptance', { ...body }),
  });
}

export function buildWorkDecisionDocument(input: DecisionBody): DisplayableDocument {
  const body: DecisionBody = {
    ...input,
    offerOwner: requireAddress(input.offerOwner, 'Offer author'),
    responseOwner: requireAddress(input.responseOwner, 'Response author'),
    offerVersionCid: requireText(input.offerVersionCid, 'Offer version'),
    responseVersionCid: requireText(input.responseVersionCid, 'Response version'),
    explanation: input.explanation.trim(),
  };
  return createDisplayableDocument({
    format: 'text/plain',
    content: lines(body.outcome === 'approve' ? 'Offer approval' : 'Offer decline', [
      ['Offer version', body.offerVersionCid],
      ['Response version', body.responseVersionCid],
      ['Decision', body.outcome],
      ['Explanation', body.explanation],
      ['Limit', 'Approval is not a payment. Decline is not a delivery judgment.'],
    ]),
    extras: extras('commonality.work-decision', { ...body }),
  });
}

export function buildContributionLinkDocument(input: ContributionLinkBody): DisplayableDocument {
  const body: ContributionLinkBody = {
    ...input,
    offerVersionCid: requireText(input.offerVersionCid, 'Offer version'),
    responseVersionCid: requireText(input.responseVersionCid, 'Response version'),
    projectAddress: requireAddress(input.projectAddress, 'Project'),
    txHash: requireHash(input.txHash, 'Contribution'),
    amount: requireAmount(input.amount),
    token: requireAddress(input.token, 'Token'),
    refundTxHash: input.refundTxHash ? requireHash(input.refundTxHash, 'Refund') : null,
  };
  return createDisplayableDocument({
    format: 'text/plain',
    content: lines('Contribution linked to an offer', [
      ['Offer version', body.offerVersionCid],
      ['Response version', body.responseVersionCid],
      ['Project', body.projectAddress],
      ['Contribution', body.txHash],
      ['Amount', body.amount],
      ['Refund', body.refundTxHash ?? 'none'],
    ]),
    extras: extras('commonality.work-contribution-link', { ...body }),
  });
}

export function cidForWorkDocument(document: DisplayableDocument): PublishedDataCid {
  return publishedDataCidForDocument(document);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  return typeof record[key] === 'string' ? record[key] as string : null;
}

function stringList(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function parseWorkRecord(document: DisplayableDocument): WorkRecordBody | null {
  const record = asRecord(document.extras);
  if (!record || record.schemaVersion !== WORK_RECORD_SCHEMA || typeof record.kind !== 'string') return null;
  const kind = record.kind as WorkRecordKind;
  if (kind === 'commonality.work-request') {
    const outcome = stringField(record, 'outcome');
    const slug = stringField(record, 'slug');
    if (!outcome || !slug) return null;
    return {
      kind,
      body: {
        slug,
        outcome,
        requirements: stringList(record, 'requirements'),
        participationLimits: stringList(record, 'participationLimits'),
        statementCids: stringList(record, 'statementCids'),
        contextNote: stringField(record, 'contextNote') ?? '',
        responseDeadline: stringField(record, 'responseDeadline'),
        previousCid: stringField(record, 'previousCid'),
      },
    };
  }
  if (kind === 'commonality.work-offer') {
    const slug = stringField(record, 'slug');
    const requestVersionCid = stringField(record, 'requestVersionCid');
    const amount = stringField(record, 'amount');
    const token = stringField(record, 'token');
    const expiry = stringField(record, 'expiry');
    const status = stringField(record, 'status');
    if (!slug || !requestVersionCid || !amount || !token || !expiry) return null;
    if (status !== 'open' && status !== 'withdrawn') return null;
    if (record.approvalAuthority !== 'offer-author') return null;
    return {
      kind,
      body: {
        slug,
        requestVersionCid,
        amount,
        token,
        chainId: typeof record.chainId === 'number' ? record.chainId : 0,
        expiry,
        approvalAuthority: 'offer-author',
        conditions: stringField(record, 'conditions') ?? '',
        backingNoteId: stringField(record, 'backingNoteId'),
        status,
        previousCid: stringField(record, 'previousCid'),
      },
    };
  }
  if (kind === 'commonality.work-response') {
    const slug = stringField(record, 'slug');
    const requestVersionCid = stringField(record, 'requestVersionCid');
    const projectAddress = stringField(record, 'projectAddress');
    const providerAddress = stringField(record, 'providerAddress');
    const scope = stringField(record, 'scope');
    if (!slug || !requestVersionCid || !projectAddress || !providerAddress || !scope) return null;
    return {
      kind,
      body: {
        slug,
        requestVersionCid,
        chainId: typeof record.chainId === 'number' ? record.chainId : 0,
        projectAddress,
        providerAddress,
        workItemIds: stringList(record, 'workItemIds'),
        scope,
        exceptions: stringField(record, 'exceptions') ?? '',
        capacity: stringField(record, 'capacity') ?? '',
        previousCid: stringField(record, 'previousCid'),
      },
    };
  }
  if (kind === 'commonality.work-acceptance') {
    const responseOwner = stringField(record, 'responseOwner');
    const responseSlug = stringField(record, 'responseSlug');
    const responseVersionCid = stringField(record, 'responseVersionCid');
    const capacity = stringField(record, 'capacity');
    if (!responseOwner || !responseSlug || !responseVersionCid || !capacity) return null;
    return {
      kind,
      body: {
        responseOwner,
        responseSlug,
        responseVersionCid,
        capacity,
        previousCid: stringField(record, 'previousCid'),
      },
    };
  }
  if (kind === 'commonality.work-decision') {
    const outcome = stringField(record, 'outcome');
    if (outcome !== 'approve' && outcome !== 'decline') return null;
    const offerOwner = stringField(record, 'offerOwner');
    const offerSlug = stringField(record, 'offerSlug');
    const responseOwner = stringField(record, 'responseOwner');
    const responseSlug = stringField(record, 'responseSlug');
    const offerVersionCid = stringField(record, 'offerVersionCid');
    const responseVersionCid = stringField(record, 'responseVersionCid');
    if (!offerOwner || !offerSlug || !responseOwner || !responseSlug || !offerVersionCid || !responseVersionCid) return null;
    return {
      kind,
      body: {
        offerOwner,
        offerSlug,
        responseOwner,
        responseSlug,
        offerVersionCid,
        responseVersionCid,
        outcome,
        explanation: stringField(record, 'explanation') ?? '',
        previousCid: stringField(record, 'previousCid'),
      },
    };
  }
  if (kind === 'commonality.work-contribution-link') {
    const slug = stringField(record, 'slug');
    const txHash = stringField(record, 'txHash');
    const amount = stringField(record, 'amount');
    const token = stringField(record, 'token');
    const offerVersionCid = stringField(record, 'offerVersionCid');
    const responseVersionCid = stringField(record, 'responseVersionCid');
    const projectAddress = stringField(record, 'projectAddress');
    if (!slug || !txHash || !amount || !token || !offerVersionCid || !responseVersionCid || !projectAddress) return null;
    return {
      kind,
      body: {
        slug,
        offerVersionCid,
        responseVersionCid,
        chainId: typeof record.chainId === 'number' ? record.chainId : 0,
        projectAddress,
        txHash,
        amount,
        token,
        refundTxHash: stringField(record, 'refundTxHash'),
        previousCid: stringField(record, 'previousCid'),
      },
    };
  }
  return null;
}
