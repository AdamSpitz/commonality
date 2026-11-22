/**
 * Work-pledges and work-requests: a person offers a skill toward one statement,
 * or asks for a skill toward one statement.
 *
 * These are their own published documents. They are not statement signatures,
 * money pledges, projects, or requests for work. See
 * specs/product/volunteer-discovery.md.
 */
import {
  createDisplayableDocument,
  publishedDataCidForDocument,
  type DisplayableDocument,
} from '../displayable-documents/displayable-document.js';
import type { PublishedDataCid } from '../published-data/index.js';

export const WORK_PLEDGE_KIND = 'commonality.work-pledge';
export const WORK_REQUEST_KIND = 'commonality.work-request-for-skill';
export const VOLUNTEER_DISCOVERY_SCHEMA = 1 as const;

const MAX_SKILLS = 5;
const MAX_SKILL_LENGTH = 40;
const MAX_NOTE_LENGTH = 280;

export type VolunteerDiscoveryKind = typeof WORK_PLEDGE_KIND | typeof WORK_REQUEST_KIND;

export interface VolunteerDiscoveryBody {
  statementCid: string;
  skills: string[];
  note: string;
}

export interface VolunteerDiscoveryRecord extends VolunteerDiscoveryBody {
  kind: VolunteerDiscoveryKind;
  cid: PublishedDataCid;
  author: string;
}

function requireText(value: string, label: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  if (trimmed.length > max) throw new Error(`${label} must be at most ${max} characters.`);
  return trimmed;
}

/** Lowercase, collapse whitespace, drop empties and duplicates, cap the list. */
export function normalizeSkills(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const value of values) {
    const skill = value.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!skill || seen.has(skill)) continue;
    if (skill.length > MAX_SKILL_LENGTH) {
      throw new Error(`A skill must be at most ${MAX_SKILL_LENGTH} characters.`);
    }
    seen.add(skill);
    skills.push(skill);
    if (skills.length > MAX_SKILLS) {
      throw new Error(`At most ${MAX_SKILLS} skills.`);
    }
  }
  if (skills.length === 0) throw new Error('At least one skill is required.');
  return skills;
}

function body(input: VolunteerDiscoveryBody): VolunteerDiscoveryBody {
  const statementCid = input.statementCid.trim();
  if (!statementCid) throw new Error('Statement is required.');
  return {
    statementCid,
    skills: normalizeSkills(input.skills),
    note: requireText(input.note, 'Note', MAX_NOTE_LENGTH),
  };
}

function build(kind: VolunteerDiscoveryKind, title: string, input: VolunteerDiscoveryBody): DisplayableDocument {
  const fields = body(input);
  return createDisplayableDocument({
    format: 'text/plain',
    content: [`# ${title}`, `Skills: ${fields.skills.join(', ')}`, fields.note].join('\n'),
    references: [{ cid: fields.statementCid, label: 'statement' }],
    extras: { kind, schemaVersion: VOLUNTEER_DISCOVERY_SCHEMA, ...fields },
  });
}

export function buildWorkPledgeDocument(input: VolunteerDiscoveryBody): DisplayableDocument {
  return build(WORK_PLEDGE_KIND, 'Work-pledge', input);
}

export function buildWorkSkillRequestDocument(input: VolunteerDiscoveryBody): DisplayableDocument {
  return build(WORK_REQUEST_KIND, 'Work-request', input);
}

export function cidForVolunteerDiscoveryDocument(document: DisplayableDocument): PublishedDataCid {
  return publishedDataCidForDocument(document);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export function parseVolunteerDiscoveryDocument(document: DisplayableDocument): Omit<VolunteerDiscoveryRecord, 'cid' | 'author'> | null {
  const record = asRecord(document.extras);
  if (!record || record.schemaVersion !== VOLUNTEER_DISCOVERY_SCHEMA) return null;
  if (record.kind !== WORK_PLEDGE_KIND && record.kind !== WORK_REQUEST_KIND) return null;
  if (typeof record.statementCid !== 'string' || !record.statementCid.trim()) return null;
  if (typeof record.note !== 'string' || !record.note.trim()) return null;
  if (!Array.isArray(record.skills)) return null;
  const skills = record.skills.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  if (skills.length === 0) return null;
  return {
    kind: record.kind,
    statementCid: record.statementCid,
    skills,
    note: record.note,
  };
}
