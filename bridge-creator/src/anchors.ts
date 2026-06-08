import { readFileSync } from 'node:fs';
import type { IpfsCidV1 } from '@commonality/sdk';

export type BridgeAnchorStatus = 'active' | 'retired' | 'proposed';

export interface BridgeAnchorRecord {
  id: string;
  cluster_id: string;
  role: string;
  text: string;
  tally_cid: IpfsCidV1 | null;
  topic_tag: string;
  rationale: string;
  status: BridgeAnchorStatus;
  featured: boolean;
  created_at: string;
  last_reviewed_at: string;
}

export interface BridgeAnchorStoreFile {
  anchors: BridgeAnchorRecord[];
}

export function loadAnchorStoreFile(filePath: string): BridgeAnchorStoreFile {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  return normalizeAnchorStoreFile(parsed);
}

export function normalizeAnchorStoreFile(value: unknown): BridgeAnchorStoreFile {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { anchors?: unknown }).anchors)) {
    throw new Error('Anchor store file must contain an anchors array');
  }

  const anchors = (value as { anchors: unknown[] }).anchors.map(normalizeAnchorRecord);
  assertUniqueAnchorIds(anchors);
  return { anchors };
}

export function getActiveAnchors(store: BridgeAnchorStoreFile): BridgeAnchorRecord[] {
  return store.anchors.filter((anchor) => anchor.status === 'active');
}

export function getFeaturedAnchors(store: BridgeAnchorStoreFile): BridgeAnchorRecord[] {
  return store.anchors.filter((anchor) => anchor.status === 'active' && anchor.featured);
}

function normalizeAnchorRecord(value: unknown): BridgeAnchorRecord {
  if (!value || typeof value !== 'object') {
    throw new Error('Anchor record must be an object');
  }

  const record = value as Record<string, unknown>;
  const status = requireStatus(record.status);

  return {
    id: requireString(record.id, 'id'),
    cluster_id: requireString(record.cluster_id, 'cluster_id'),
    role: requireString(record.role, 'role'),
    text: requireString(record.text, 'text'),
    tally_cid: requireNullableString(record.tally_cid, 'tally_cid') as IpfsCidV1 | null,
    topic_tag: requireString(record.topic_tag, 'topic_tag'),
    rationale: requireString(record.rationale, 'rationale'),
    status,
    featured: requireBoolean(record.featured, 'featured', false),
    created_at: requireString(record.created_at, 'created_at'),
    last_reviewed_at: requireString(record.last_reviewed_at, 'last_reviewed_at'),
  };
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Anchor record is missing required string field: ${field}`);
  }
  return value;
}

function requireBoolean(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') {
    throw new Error(`Anchor record field must be a boolean: ${field}`);
  }
  return value;
}

function requireNullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requireString(value, field);
}

function requireStatus(value: unknown): BridgeAnchorStatus {
  if (value === 'active' || value === 'retired' || value === 'proposed') {
    return value;
  }
  throw new Error('Anchor record status must be active, retired, or proposed');
}

function assertUniqueAnchorIds(anchors: BridgeAnchorRecord[]): void {
  const seen = new Set<string>();
  for (const anchor of anchors) {
    if (seen.has(anchor.id)) {
      throw new Error(`Duplicate anchor id: ${anchor.id}`);
    }
    seen.add(anchor.id);
  }
}
