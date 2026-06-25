import fs from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createStatement, type DisplayableDocument, publishDocument } from '@commonality/sdk/displayable-documents';
import type { IPFSConfig } from '@commonality/sdk/utils';

export interface SeedStatement {
  id: string;
  text: string;
  role?: string;
  notes?: string[];
  createdDate?: string;
}

export interface SeedGroup {
  id: string;
  title: string;
  notes?: string[];
  statements: SeedStatement[];
  implicationNotes?: string[];
}

export interface SeedCollection {
  format: 'commonality-seed-content-v1';
  id: string;
  title: string;
  description: string;
  notes?: string[];
  groups: SeedGroup[];
}

export interface SeedStatementRecord {
  collection: SeedCollection;
  group: SeedGroup;
  statement: SeedStatement;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DEFAULT_SEED_CONTENT_DIR = join(__dirname, 'seed-content');
export const DEFAULT_SEED_UNIVERSE_OUTPUT = join(__dirname, 'output', 'seed-universe.json');
export const DEFAULT_SEED_STATEMENTS_OUTPUT = join(__dirname, 'output', 'seed-statements.json');
export const DEFAULT_SEED_UPLOAD_OUTPUT = join(__dirname, 'output', 'seed-statements.uploads.json');

export async function loadSeedCollections(seedContentDir = DEFAULT_SEED_CONTENT_DIR): Promise<SeedCollection[]> {
  const entries = await fs.readdir(seedContentDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();

  const collections = await Promise.all(files.map(async (fileName) => {
    const filePath = join(seedContentDir, fileName);
    const raw = JSON.parse(await fs.readFile(filePath, 'utf8')) as SeedCollection;
    validateSeedCollection(raw, filePath);
    return raw;
  }));

  return collections;
}

export function validateSeedCollection(collection: SeedCollection, sourceLabel = collection.id): void {
  if (collection.format !== 'commonality-seed-content-v1') {
    throw new Error(`${sourceLabel}: unsupported format "${String(collection.format)}"`);
  }
  if (!collection.id || !collection.title || !collection.description) {
    throw new Error(`${sourceLabel}: collection must have id, title, and description`);
  }
  if (!Array.isArray(collection.groups) || collection.groups.length === 0) {
    throw new Error(`${sourceLabel}: collection must contain at least one group`);
  }

  for (const group of collection.groups) {
    if (!group.id || !group.title) {
      throw new Error(`${sourceLabel}: every group must have id and title`);
    }
    if (!Array.isArray(group.statements) || group.statements.length === 0) {
      throw new Error(`${sourceLabel}: group "${group.id}" must contain at least one statement`);
    }
    for (const statement of group.statements) {
      if (!statement.id || !statement.text) {
        throw new Error(`${sourceLabel}: every statement must have id and text`);
      }
    }
  }
}

export function flattenSeedStatements(collections: SeedCollection[]): SeedStatementRecord[] {
  return collections.flatMap((collection) =>
    collection.groups.flatMap((group) =>
      group.statements.map((statement) => ({
        collection,
        group,
        statement,
      }))
    )
  );
}

export function buildUniverseFromSeedCollections(collections: SeedCollection[]): {
  domains: Record<string, { type: 'categorical'; positions: string[] }>;
  statementTemplates: Record<string, Record<string, string[]>>;
} {
  const domains: Record<string, { type: 'categorical'; positions: string[] }> = {};
  const statementTemplates: Record<string, Record<string, string[]>> = {};

  for (const collection of collections) {
    domains[collection.id] = {
      type: 'categorical',
      positions: collection.groups.map((group) => group.id),
    };
    statementTemplates[collection.id] = Object.fromEntries(
      collection.groups.map((group) => [
        group.id,
        group.statements.map((statement) => statement.text),
      ])
    );
  }

  return { domains, statementTemplates };
}

export function createStatementDocumentFromSeed(record: SeedStatementRecord): DisplayableDocument {
  const notes = [
    ...(record.collection.notes ?? []).map((note) => `Collection note: ${note}`),
    ...(record.group.notes ?? []).map((note) => `Group note: ${note}`),
    ...(record.statement.notes ?? []).map((note) => `Statement note: ${note}`),
  ];

  return createStatement({
    content: record.statement.text,
    topic: record.collection.id,
    createdDate: record.statement.createdDate,
    extras: {
      seedCollectionId: record.collection.id,
      seedCollectionTitle: record.collection.title,
      seedGroupId: record.group.id,
      seedGroupTitle: record.group.title,
      seedStatementId: record.statement.id,
      seedRole: record.statement.role ?? null,
      seedNotes: notes,
    },
  });
}

export async function uploadSeedStatementDocument(
  ipfsConfig: IPFSConfig,
  record: SeedStatementRecord
): Promise<string> {
  return publishDocument(ipfsConfig, createStatementDocumentFromSeed(record));
}
