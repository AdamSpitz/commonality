import type { DisplayableDocument } from '../displayable-documents/displayable-document.js';
import { classifyWorkRefName, type WorkRefKind } from './names.js';
import { parseWorkRecord, type AcceptanceBody, type ContributionLinkBody, type DecisionBody, type OfferBody, type RequestBody, type ResponseBody } from './documents.js';

export interface WorkRefUpdate {
  owner: string;
  name: string;
  value: string;
  blockNumber: string;
  logIndex: number;
  timestamp: string;
}

export interface NoteBackingSnapshot {
  id: string;
  active: boolean;
  tokenType: number;
  token: string;
  amount: string;
  owner: string;
}

export interface Version<T> {
  cid: string;
  actor: string;
  timestamp: string;
  blockNumber: string;
  logIndex: number;
  retracted: boolean;
  body: T;
}

export interface RequestRecord {
  actor: string;
  slug: string;
  versions: Version<RequestBody>[];
  current: Version<RequestBody> | null;
}

export interface OfferRecord {
  actor: string;
  slug: string;
  versions: Version<OfferBody>[];
  current: Version<OfferBody> | null;
}

export interface ResponseRecord {
  actor: string;
  slug: string;
  versions: Version<ResponseBody>[];
  current: Version<ResponseBody> | null;
}

export interface AcceptanceRecord {
  actor: string;
  responseOwner: string;
  responseSlug: string;
  versions: Version<AcceptanceBody>[];
  current: Version<AcceptanceBody> | null;
  authorityMatchesProvider: boolean;
}

export interface DecisionRecord {
  actor: string;
  versions: Version<DecisionBody>[];
  current: Version<DecisionBody> | null;
}

export interface ContributionLinkRecord {
  actor: string;
  slug: string;
  versions: Version<ContributionLinkBody>[];
  current: Version<ContributionLinkBody> | null;
}

export interface BackingSlice {
  offerActor: string;
  offerSlug: string;
  noteId: string | null;
  recognized: bigint;
  unavailableReason: string | null;
}

export interface CurrencyTotals {
  token: string;
  chainId: number;
  unfundedIntention: bigint;
  verifiedBacking: bigint;
  approved: bigint;
  contributed: bigint;
  refunded: bigint;
}

export interface WorkRequestBoard {
  requests: RequestRecord[];
  offers: OfferRecord[];
  responses: ResponseRecord[];
  acceptances: AcceptanceRecord[];
  decisions: DecisionRecord[];
  contributionLinks: ContributionLinkRecord[];
  backing: BackingSlice[];
}

interface Series {
  kind: WorkRefKind;
  owner: string;
  name: string;
  updates: WorkRefUpdate[];
}

function byChain(a: WorkRefUpdate, b: WorkRefUpdate): number {
  const block = BigInt(a.blockNumber) - BigInt(b.blockNumber);
  if (block !== 0n) return block < 0n ? -1 : 1;
  return a.logIndex - b.logIndex;
}

function groupSeries(updates: readonly WorkRefUpdate[]): Series[] {
  const groups = new Map<string, Series>();
  for (const update of updates) {
    const kind = classifyWorkRefName(update.name);
    if (!kind) continue;
    const key = `${update.owner.toLowerCase()}:${update.name}`;
    const existing = groups.get(key);
    if (existing) existing.updates.push(update);
    else groups.set(key, { kind, owner: update.owner.toLowerCase(), name: update.name, updates: [update] });
  }
  for (const series of groups.values()) series.updates.sort(byChain);
  return [...groups.values()];
}

function versionsFrom<T>(
  series: Series,
  documentsByCid: ReadonlyMap<string, { document: DisplayableDocument; retracted: boolean }>,
  read: (document: DisplayableDocument) => T | null,
): Version<T>[] {
  const versions: Version<T>[] = [];
  for (const update of series.updates) {
    const cid = update.value.trim();
    if (!cid) continue;
    const found = documentsByCid.get(cid);
    if (!found) continue;
    const body = read(found.document);
    if (!body) continue;
    versions.push({
      cid,
      actor: series.owner,
      timestamp: update.timestamp,
      blockNumber: update.blockNumber,
      logIndex: update.logIndex,
      retracted: found.retracted,
      body,
    });
  }
  return versions;
}

function currentOf<T>(versions: Version<T>[], series: Series): Version<T> | null {
  const tip = series.updates.at(-1)?.value.trim() ?? '';
  if (!tip) return null;
  for (let index = versions.length - 1; index >= 0; index -= 1) {
    if (versions[index]?.cid === tip) return versions[index] ?? null;
  }
  return null;
}

export function isOfferLive(offer: OfferBody, nowMs: number): boolean {
  if (offer.status !== 'open') return false;
  const expiry = Date.parse(offer.expiry);
  return Number.isFinite(expiry) && expiry > nowMs;
}

export function allocateBacking(input: {
  offers: OfferRecord[];
  notes: readonly NoteBackingSnapshot[];
  settlementTokens: readonly string[];
  nowMs: number;
}): BackingSlice[] {
  const notes = new Map(input.notes.map((note) => [note.id, note]));
  const allowed = new Set(input.settlementTokens.map((token) => token.toLowerCase()));
  const live = input.offers.flatMap((offer) => {
    const current = offer.current;
    if (!current || !isOfferLive(current.body, input.nowMs)) return [];
    return [{ offer, current }];
  }).sort((a, b) => {
    const block = BigInt(a.current.blockNumber) - BigInt(b.current.blockNumber);
    if (block !== 0n) return block < 0n ? -1 : 1;
    return a.current.logIndex - b.current.logIndex;
  });

  const remaining = new Map<string, bigint>();
  const slices: BackingSlice[] = [];
  for (const { offer, current } of live) {
    const noteId = current.body.backingNoteId;
    if (!noteId) {
      slices.push({ offerActor: offer.actor, offerSlug: offer.slug, noteId: null, recognized: 0n, unavailableReason: null });
      continue;
    }
    const note = notes.get(noteId);
    if (!note || !note.active) {
      slices.push({ offerActor: offer.actor, offerSlug: offer.slug, noteId, recognized: 0n, unavailableReason: 'note-inactive' });
      continue;
    }
    if (note.tokenType !== 0) {
      slices.push({ offerActor: offer.actor, offerSlug: offer.slug, noteId, recognized: 0n, unavailableReason: 'not-settlement-note' });
      continue;
    }
    if (note.owner.toLowerCase() !== offer.actor) {
      slices.push({ offerActor: offer.actor, offerSlug: offer.slug, noteId, recognized: 0n, unavailableReason: 'author-lacks-authority' });
      continue;
    }
    if (note.token.toLowerCase() !== current.body.token.toLowerCase()) {
      slices.push({ offerActor: offer.actor, offerSlug: offer.slug, noteId, recognized: 0n, unavailableReason: 'token-mismatch' });
      continue;
    }
    if (allowed.size > 0 && !allowed.has(note.token.toLowerCase())) {
      slices.push({ offerActor: offer.actor, offerSlug: offer.slug, noteId, recognized: 0n, unavailableReason: 'token-not-eligible' });
      continue;
    }
    if (!remaining.has(noteId)) remaining.set(noteId, BigInt(note.amount));
    const left = remaining.get(noteId)!;
    const want = BigInt(current.body.amount);
    const recognized = left < want ? left : want;
    remaining.set(noteId, left - recognized);
    slices.push({
      offerActor: offer.actor,
      offerSlug: offer.slug,
      noteId,
      recognized,
      unavailableReason: recognized === 0n ? 'note-already-allocated' : null,
    });
  }
  return slices;
}

function readKind<T>(document: DisplayableDocument, kind: string): T | null {
  const parsed = parseWorkRecord(document);
  if (!parsed || parsed.kind !== kind) return null;
  return parsed.body as T;
}

export function assembleWorkRequestBoard(input: {
  updates: readonly WorkRefUpdate[];
  documentsByCid: ReadonlyMap<string, { document: DisplayableDocument; retracted: boolean }>;
  notes: readonly NoteBackingSnapshot[];
  settlementTokens: readonly string[];
  nowMs: number;
}): WorkRequestBoard {
  const requests: RequestRecord[] = [];
  const offers: OfferRecord[] = [];
  const responses: ResponseRecord[] = [];
  const acceptances: AcceptanceRecord[] = [];
  const decisions: DecisionRecord[] = [];
  const contributionLinks: ContributionLinkRecord[] = [];
  const acceptanceSeries: Series[] = [];

  for (const series of groupSeries(input.updates)) {
    if (series.kind === 'request') {
      const versions = versionsFrom(series, input.documentsByCid, (document) => readKind<RequestBody>(document, 'commonality.work-request'));
      const slug = series.name.slice('wr:req:'.length);
      requests.push({ actor: series.owner, slug, versions: versions.filter((version) => version.body.slug === slug), current: null });
      requests.at(-1)!.current = currentOf(requests.at(-1)!.versions, series);
    } else if (series.kind === 'offer') {
      const versions = versionsFrom(series, input.documentsByCid, (document) => readKind<OfferBody>(document, 'commonality.work-offer'));
      const slug = series.name.slice('wr:offer:'.length);
      offers.push({ actor: series.owner, slug, versions: versions.filter((version) => version.body.slug === slug), current: null });
      offers.at(-1)!.current = currentOf(offers.at(-1)!.versions, series);
    } else if (series.kind === 'response') {
      const versions = versionsFrom(series, input.documentsByCid, (document) => readKind<ResponseBody>(document, 'commonality.work-response'));
      const slug = series.name.slice('wr:resp:'.length);
      responses.push({ actor: series.owner, slug, versions: versions.filter((version) => version.body.slug === slug), current: null });
      responses.at(-1)!.current = currentOf(responses.at(-1)!.versions, series);
    } else if (series.kind === 'acceptance') {
      acceptanceSeries.push(series);
    } else if (series.kind === 'decision') {
      const versions = versionsFrom(series, input.documentsByCid, (document) => readKind<DecisionBody>(document, 'commonality.work-decision'));
      decisions.push({ actor: series.owner, versions, current: currentOf(versions, series) });
    } else {
      const versions = versionsFrom(series, input.documentsByCid, (document) => readKind<ContributionLinkBody>(document, 'commonality.work-contribution-link'));
      const slug = series.name.slice('wr:link:'.length);
      contributionLinks.push({ actor: series.owner, slug, versions: versions.filter((version) => version.body.slug === slug), current: null });
      contributionLinks.at(-1)!.current = currentOf(contributionLinks.at(-1)!.versions, series);
    }
  }

  for (const series of acceptanceSeries) {
    const versions = versionsFrom(series, input.documentsByCid, (document) => readKind<AcceptanceBody>(document, 'commonality.work-acceptance'));
    const parts = series.name.split(':');
    const responseOwner = parts[2] ?? '';
    const responseSlug = parts.slice(3).join(':');
    const matching = versions.filter((version) => version.body.responseOwner.toLowerCase() === responseOwner && version.body.responseSlug === responseSlug);
    const current = currentOf(matching, series);
    const response = responses.find((item) => item.actor === responseOwner && item.slug === responseSlug);
    const provider = response?.current?.body.providerAddress.toLowerCase();
    acceptances.push({
      actor: series.owner,
      responseOwner,
      responseSlug,
      versions: matching,
      current,
      authorityMatchesProvider: provider !== undefined && series.owner === provider,
    });
  }

  return {
    requests,
    offers,
    responses,
    acceptances,
    decisions,
    contributionLinks,
    backing: allocateBacking({ offers, notes: input.notes, settlementTokens: input.settlementTokens, nowMs: input.nowMs }),
  };
}

export function requestVersionCids(request: RequestRecord): Set<string> {
  return new Set(request.versions.map((version) => version.cid));
}

export function totalsForRequest(board: WorkRequestBoard, request: RequestRecord, nowMs: number): CurrencyTotals[] {
  const versions = requestVersionCids(request);
  const relatedOffers = board.offers.filter((offer) => offer.current && versions.has(offer.current.body.requestVersionCid));
  const buckets = new Map<string, CurrencyTotals>();
  const bucketFor = (token: string, chainId: number) => {
    const key = `${chainId}:${token.toLowerCase()}`;
    const existing = buckets.get(key);
    if (existing) return existing;
    const created: CurrencyTotals = { token: token.toLowerCase(), chainId, unfundedIntention: 0n, verifiedBacking: 0n, approved: 0n, contributed: 0n, refunded: 0n };
    buckets.set(key, created);
    return created;
  };

  for (const offer of relatedOffers) {
    const current = offer.current;
    if (!current || !isOfferLive(current.body, nowMs)) continue;
    const bucket = bucketFor(current.body.token, current.body.chainId);
    const slice = board.backing.find((item) => item.offerActor === offer.actor && item.offerSlug === offer.slug);
    const recognized = slice?.recognized ?? 0n;
    const amount = BigInt(current.body.amount);
    bucket.verifiedBacking += recognized;
    const uncovered = amount > recognized ? amount - recognized : 0n;
    bucket.unfundedIntention += uncovered;
  }

  const offerIds = new Set(relatedOffers.map((offer) => `${offer.actor}:${offer.slug}`));
  const approvedOffers = new Set<string>();
  for (const decision of board.decisions) {
    const current = decision.current;
    if (!current || current.body.outcome !== 'approve') continue;
    if (decision.actor !== current.body.offerOwner.toLowerCase()) continue;
    const key = `${current.body.offerOwner.toLowerCase()}:${current.body.offerSlug}`;
    if (!offerIds.has(key)) continue;
    approvedOffers.add(key);
  }
  for (const key of approvedOffers) {
    const offer = relatedOffers.find((item) => `${item.actor}:${item.slug}` === key);
    if (!offer?.current || !isOfferLive(offer.current.body, nowMs)) continue;
    bucketFor(offer.current.body.token, offer.current.body.chainId).approved += BigInt(offer.current.body.amount);
  }

  const seen = new Set<string>();
  for (const link of board.contributionLinks) {
    const current = link.current;
    if (!current) continue;
    const offer = relatedOffers.find((item) => item.versions.some((version) => version.cid === current.body.offerVersionCid));
    if (!offer) continue;
    if (seen.has(current.body.txHash)) continue;
    seen.add(current.body.txHash);
    const bucket = bucketFor(current.body.token, current.body.chainId);
    if (current.body.refundTxHash) bucket.refunded += BigInt(current.body.amount);
    else bucket.contributed += BigInt(current.body.amount);
  }

  return [...buckets.values()];
}

/** Latest recorded decision for a response, if the offer author published it. Silence is not a decline. */
export function decisionFor(
  board: WorkRequestBoard,
  offer: OfferRecord,
  response: ResponseRecord,
): DecisionRecord | null {
  return board.decisions.find((decision) => {
    const current = decision.current;
    return current
      && decision.actor === offer.actor
      && current.body.offerSlug === offer.slug
      && current.body.responseOwner.toLowerCase() === response.actor
      && current.body.responseSlug === response.slug;
  }) ?? null;
}
