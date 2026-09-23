/**
 * Cause roster documents: ordered planks, optional mediator, and versioned extras.
 * Financial enrichment (attestations, project boards) stays in the Commonality app.
 * Document kind strings stay `causestarter.*` so already-published CIDs keep reading.
 */

import {
  createDisplayableDocument,
  publishedDataCidForDocument,
  type DisplayableDocument,
} from './displayable-document.js';
import { RESERVED_REF_NAMES } from '../mutable-refs/reserved-names.js';
import type { IpfsCidV1 } from '../../utils/cid-types.js';

export const ROSTER_KIND = 'causestarter.roster' as const;
export const ROSTER_SCHEMA_VERSION = 1 as const;

export const ROSTER_COHERENCE_TOPIC_DOCUMENT: DisplayableDocument = createDisplayableDocument({
  format: 'text/plain',
  content: 'This is the well-known topic for cause-roster coherence attestations in Commonality.',
  extras: {
    statementType: 'topic',
    kind: 'causestarter.roster-coherence',
  },
});

export const ROSTER_COHERENCE_CLAIM_DOCUMENT: DisplayableDocument = createDisplayableDocument({
  format: 'text/plain',
  content:
    'This roster is coherently constructed: its published issues match its title and summary, and it hides no riders. This is a claim about construction only, not about merit.',
  extras: {
    statementType: 'claim',
    kind: 'causestarter.roster-coherence',
  },
});

export const ROSTER_COHERENCE_TOPIC: IpfsCidV1 = publishedDataCidForDocument(
  ROSTER_COHERENCE_TOPIC_DOCUMENT,
) as IpfsCidV1;

export const ROSTER_COHERENCE_CLAIM: IpfsCidV1 = publishedDataCidForDocument(
  ROSTER_COHERENCE_CLAIM_DOCUMENT,
) as IpfsCidV1;

export interface CauseMediator {
  address: string;
  serviceUrl: string;
  name: string;
  description: string;
}

/** Link from a modified/bridge roster back to its cluster publication. */
export interface RosterBridgeLink {
  clusterOwner: `0x${string}`;
  clusterSlug: string;
  role: 'modified' | 'bridge';
  parentOwner?: `0x${string}`;
  parentSlug?: string;
}

export interface CauseAnchor {
  combinator: 'all' | 'any';
  cid: string;
  operandCids: string[];
}

export interface GeographicBoardRule {
  /** Specific-to-broad place path, e.g. ["Ontario", "Canada"]. */
  within: string[];
}

/** Factual view rules carried on the roster. Matching projects is a funding concern. */
export type BoardInclusionRules = {
  geographic?: GeographicBoardRule;
};

export interface RosterFields {
  title: string;
  summary: string;
  plankCids: string[];
  mediatorBlurb: string;
  mediator?: CauseMediator;
  bridgeCluster?: RosterBridgeLink;
  anchors?: CauseAnchor[];
  contactUrl?: string;
  inclusionRules?: BoardInclusionRules;
}

export interface RosterExtras extends RosterFields {
  kind: typeof ROSTER_KIND;
  version: typeof ROSTER_SCHEMA_VERSION;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 64;
export const MAX_TITLE_LENGTH = 120;
export const MAX_SUMMARY_LENGTH = 2000;
export const MAX_MEDIATOR_BLURB_LENGTH = 1000;
const MAX_CONTACT_URL_LENGTH = 300;

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

export function validateSlug(slug: string): string | null {
  if (!slug) return 'Choose a URL slug for this cause.';
  if (slug.length > MAX_SLUG_LENGTH) return `Slug must be at most ${MAX_SLUG_LENGTH} characters.`;
  if (!SLUG_PATTERN.test(slug)) {
    return 'Slug must be lowercase letters, numbers, and hyphens (no leading/trailing hyphen).';
  }
  if (RESERVED_REF_NAMES.has(slug)) {
    return `“${slug}” is reserved. Pick a different slug.`;
  }
  return null;
}

export function parseContactUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, MAX_CONTACT_URL_LENGTH);
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'mailto:') {
      return parsed.href.startsWith('mailto:') ? parsed.href : undefined;
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function parseCauseMediator(value: unknown): CauseMediator | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const description = typeof record.description === 'string' ? record.description.trim() : '';
  const address = typeof record.address === 'string' ? record.address.trim() : '';
  const serviceUrl = typeof record.serviceUrl === 'string' ? record.serviceUrl.trim() : '';
  if (!name || !description || !address || !serviceUrl) return undefined;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return undefined;
  try {
    if (!['http:', 'https:'].includes(new URL(serviceUrl).protocol)) return undefined;
  } catch {
    return undefined;
  }
  return {
    name: name.slice(0, MAX_MEDIATOR_BLURB_LENGTH),
    description: description.slice(0, MAX_MEDIATOR_BLURB_LENGTH),
    address,
    serviceUrl: serviceUrl.replace(/\/+$/, ''),
  };
}

export function parseRosterBridgeLink(value: unknown): RosterBridgeLink | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const clusterOwner = typeof record.clusterOwner === 'string' ? record.clusterOwner.trim() : '';
  const clusterSlug = typeof record.clusterSlug === 'string' ? record.clusterSlug.trim() : '';
  const role = record.role;
  if (!/^0x[0-9a-fA-F]{40}$/.test(clusterOwner)) return undefined;
  if (validateSlug(clusterSlug)) return undefined;
  if (role !== 'modified' && role !== 'bridge') return undefined;
  const parentOwner = typeof record.parentOwner === 'string' ? record.parentOwner.trim() : '';
  const parentSlug = typeof record.parentSlug === 'string' ? record.parentSlug.trim() : '';
  const parent = /^0x[0-9a-fA-F]{40}$/.test(parentOwner) && !validateSlug(parentSlug)
    ? { parentOwner: parentOwner.toLowerCase() as `0x${string}`, parentSlug }
    : {};
  return {
    clusterOwner: clusterOwner.toLowerCase() as `0x${string}`,
    clusterSlug,
    role,
    ...parent,
  };
}

export function mediatorBlurbFrom(mediator: CauseMediator | undefined): string {
  if (!mediator) return '';
  const name = mediator.name.trim();
  const description = mediator.description.trim();
  if (name && description) return `${name}: ${description}`;
  return name || description;
}

export function parsePlacePath(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    const parts = value.split(',').slice(0, 8).map((part) => part.trim().slice(0, 120)).filter(Boolean);
    return parts.length > 0 ? parts : undefined;
  }
  if (!Array.isArray(value)) return undefined;
  const parts = value.slice(0, 8).filter((part): part is string => typeof part === 'string')
    .map((part) => part.trim().slice(0, 120)).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function parseBoardInclusionRules(value: unknown): BoardInclusionRules | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const geographic = (value as Record<string, unknown>).geographic;
  if (!geographic || typeof geographic !== 'object' || Array.isArray(geographic)) return undefined;
  const within = parsePlacePath((geographic as Record<string, unknown>).within);
  return within ? { geographic: { within } } : undefined;
}

export function parseAnchors(value: unknown): CauseAnchor[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const anchors: CauseAnchor[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const combinator = record.combinator;
    if (combinator !== 'all' && combinator !== 'any') continue;
    const cid = typeof record.cid === 'string' ? record.cid.trim() : '';
    if (!cid) continue;
    if (!Array.isArray(record.operandCids)) continue;
    const operandCids = record.operandCids
      .filter((operand): operand is string => typeof operand === 'string' && Boolean(operand.trim()))
      .map((operand) => operand.trim());
    if (operandCids.length < 2) continue;
    anchors.push({ combinator, cid, operandCids });
  }
  return anchors.length > 0 ? anchors : undefined;
}

export function renderRosterContent(fields: RosterFields): string {
  const lines: string[] = [`# ${fields.title}`];
  if (fields.summary.trim()) {
    lines.push('', fields.summary.trim());
  }
  if (fields.plankCids.length > 0) {
    lines.push('', '## Issues');
    for (const cid of fields.plankCids) {
      lines.push(`- ${cid}`);
    }
  }
  if (fields.mediatorBlurb.trim()) {
    lines.push('', '## Mediator', fields.mediatorBlurb.trim());
  }
  const contactUrl = parseContactUrl(fields.contactUrl);
  if (contactUrl) {
    lines.push('', '## Contact', contactUrl);
  }
  const anchors = parseAnchors(fields.anchors);
  if (anchors) {
    lines.push('', '## Graph handles');
    for (const anchor of anchors) {
      lines.push(`- ${anchor.combinator} of ${anchor.operandCids.length} statements: ${anchor.cid}`);
    }
  }
  return lines.join('\n');
}

export function buildRosterDocument(fields: RosterFields): DisplayableDocument {
  const extras: RosterExtras = {
    kind: ROSTER_KIND,
    version: ROSTER_SCHEMA_VERSION,
    title: fields.title,
    summary: fields.summary,
    plankCids: [...fields.plankCids],
    mediatorBlurb: fields.mediatorBlurb,
  };
  const mediator = parseCauseMediator(fields.mediator);
  if (mediator) extras.mediator = mediator;
  const bridgeCluster = parseRosterBridgeLink(fields.bridgeCluster);
  if (bridgeCluster) extras.bridgeCluster = bridgeCluster;
  const anchors = parseAnchors(fields.anchors);
  if (anchors) extras.anchors = anchors;
  const contactUrl = parseContactUrl(fields.contactUrl);
  if (contactUrl) extras.contactUrl = contactUrl;
  const inclusionRules = parseBoardInclusionRules(fields.inclusionRules);
  if (inclusionRules) extras.inclusionRules = inclusionRules;
  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: renderRosterContent(fields),
    references: fields.plankCids.map((cid) => ({ cid, label: 'plank' })),
    extras: extras as unknown as Record<string, unknown>,
  });
}

export function previewRosterCid(fields: RosterFields): string {
  return publishedDataCidForDocument(buildRosterDocument(fields));
}

export function parseRosterDocument(doc: DisplayableDocument): RosterFields | null {
  const extras = doc.extras;
  if (!extras || typeof extras !== 'object') return null;
  if (extras.kind !== ROSTER_KIND) return null;
  if (extras.version !== ROSTER_SCHEMA_VERSION) return null;

  const title = typeof extras.title === 'string' ? extras.title : '';
  const summary = typeof extras.summary === 'string' ? extras.summary : '';
  const mediatorBlurb = typeof extras.mediatorBlurb === 'string' ? extras.mediatorBlurb : '';
  const plankCids = Array.isArray(extras.plankCids)
    ? extras.plankCids.filter((cid): cid is string => typeof cid === 'string' && cid.length > 0)
    : [];

  if (!title.trim() && plankCids.length === 0) return null;
  const mediator = parseCauseMediator(extras.mediator);
  const bridgeCluster = parseRosterBridgeLink(extras.bridgeCluster);
  const anchors = parseAnchors(extras.anchors);
  const contactUrl = parseContactUrl(extras.contactUrl);
  const inclusionRules = parseBoardInclusionRules(extras.inclusionRules);
  return {
    title,
    summary,
    plankCids,
    mediatorBlurb,
    ...(mediator ? { mediator } : {}),
    ...(bridgeCluster ? { bridgeCluster } : {}),
    ...(anchors ? { anchors } : {}),
    ...(contactUrl ? { contactUrl } : {}),
    ...(inclusionRules ? { inclusionRules } : {}),
  };
}
