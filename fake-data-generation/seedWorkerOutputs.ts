// Local-dev/test scaffolding only — NOT the production explorer map.
//
// This produces a deterministic `fundable-project-explorer` collection from the
// formal seed statements so local dev and tests have *something* to render
// without running an LLM. It is intentionally crude (first N seed statements,
// truncated labels, topicArea = collection title, no parent/child depth).
//
// In production the map is NOT seeded or frozen: the real Explorer Curator
// (`explorer-curator/`) runs live and cause-neutral over all on-chain
// statements and picks up the seed statements early simply because they are
// early content. See specs/tech/subsystems/conceptspace/explorer.md
// ("Still needed", decision 2026-06-17).
import fs from 'fs/promises';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { flattenSeedStatements, loadSeedCollections, type SeedCollection, type SeedStatementRecord } from './seed-content-format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DEFAULT_SEED_WORKER_OUTPUTS_PATH = join(__dirname, 'data', 'seed-worker-outputs.json');
export const SEED_WORKER_OUTPUTS_ALGORITHM = 'deterministic-seed-content-fixture-v1';

export interface SeedStatementRef {
  collectionId: string;
  groupId: string;
  statementId: string;
}

export interface StoredCuratedCollectionEntry extends SeedStatementRef {
  label: string;
  topicArea: string;
}

export interface StoredSeedNudge {
  target: SeedStatementRef;
  suggested: SeedStatementRef;
  reason: string;
  confidence: number;
}

export interface StoredSeedFinderPair {
  from: SeedStatementRef;
  to: SeedStatementRef;
  reason: string;
}

export interface StoredSeedWorkerOutputs {
  schemaVersion: 1;
  generatedAt: string;
  algorithm: typeof SEED_WORKER_OUTPUTS_ALGORITHM;
  seedContentFingerprint: string;
  explorerCollection: {
    stream: 'fundable-project-explorer';
    entries: StoredCuratedCollectionEntry[];
  };
  nudgeBatch: {
    nudges: StoredSeedNudge[];
  };
  implicationFinder: {
    pairs: StoredSeedFinderPair[];
  };
}

export interface ResolvedSeedStatement extends SeedStatementRef {
  text: string;
  role: string | null;
}

function refForRecord(record: SeedStatementRecord): SeedStatementRef {
  return {
    collectionId: record.collection.id,
    groupId: record.group.id,
    statementId: record.statement.id,
  };
}

function refKey(ref: SeedStatementRef): string {
  return `${ref.collectionId}/${ref.groupId}/${ref.statementId}`;
}

function shortLabel(text: string): string {
  return text.length > 72 ? `${text.slice(0, 69)}...` : text;
}

export function computeSeedContentFingerprint(collections: SeedCollection[]): string {
  const stableJson = JSON.stringify(collections.map((collection) => ({
    id: collection.id,
    groups: collection.groups.map((group) => ({
      id: group.id,
      statements: group.statements.map((statement) => ({
        id: statement.id,
        text: statement.text,
        role: statement.role ?? null,
        createdDate: statement.createdDate ?? null,
      })),
    })),
  })));
  return createHash('sha256').update(stableJson).digest('hex');
}

export async function loadOriginalSeedStatementRecords(): Promise<SeedStatementRecord[]> {
  const collections = (await loadSeedCollections()).filter((collection) => collection.id !== 'proliferation');
  return flattenSeedStatements(collections);
}

export async function buildSeedWorkerOutputs(generatedAt = new Date().toISOString()): Promise<StoredSeedWorkerOutputs> {
  const collections = (await loadSeedCollections()).filter((collection) => collection.id !== 'proliferation');
  const records = flattenSeedStatements(collections);
  const simpleRecords = records.slice(0, 40);

  const explorerEntries = simpleRecords.map((record) => ({
    ...refForRecord(record),
    label: shortLabel(record.statement.text),
    topicArea: record.collection.title,
  }));

  const byCollectionGroup = new Map<string, SeedStatementRecord[]>();
  for (const record of records) {
    const key = `${record.collection.id}/${record.group.id}`;
    byCollectionGroup.set(key, [...(byCollectionGroup.get(key) ?? []), record]);
  }

  const nudges: StoredSeedNudge[] = [];
  for (const target of records.slice(0, 25)) {
    const peers = byCollectionGroup.get(`${target.collection.id}/${target.group.id}`) ?? [];
    const suggested = peers.find((candidate) => candidate.statement.id !== target.statement.id)
      ?? records.find((candidate) => candidate.collection.id === target.collection.id && candidate.statement.id !== target.statement.id);
    if (!suggested) continue;
    nudges.push({
      target: refForRecord(target),
      suggested: refForRecord(suggested),
      reason: `Seeded local-dev suggestion: another statement in ${target.group.title}.`,
      confidence: 0.6,
    });
  }

  const finderPairs: StoredSeedFinderPair[] = [];
  for (const [key, groupRecords] of [...byCollectionGroup.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...groupRecords].sort((a, b) => a.statement.id.localeCompare(b.statement.id));
    for (let index = 0; index < sorted.length - 1 && finderPairs.length < 40; index++) {
      const from = sorted[index]!;
      const to = sorted[index + 1]!;
      finderPairs.push({
        from: refForRecord(from),
        to: refForRecord(to),
        reason: `Seeded implication-finder candidate from ${key}.`,
      });
    }
  }

  return {
    schemaVersion: 1,
    generatedAt,
    algorithm: SEED_WORKER_OUTPUTS_ALGORITHM,
    seedContentFingerprint: computeSeedContentFingerprint(collections),
    explorerCollection: {
      stream: 'fundable-project-explorer',
      entries: explorerEntries,
    },
    nudgeBatch: {
      nudges,
    },
    implicationFinder: {
      pairs: finderPairs,
    },
  };
}

export async function loadSeedWorkerOutputs(path = DEFAULT_SEED_WORKER_OUTPUTS_PATH): Promise<StoredSeedWorkerOutputs> {
  const raw = JSON.parse(await fs.readFile(path, 'utf8')) as StoredSeedWorkerOutputs;
  validateSeedWorkerOutputs(raw);
  return raw;
}

export function validateSeedWorkerOutputs(outputs: StoredSeedWorkerOutputs): void {
  if (outputs.schemaVersion !== 1) throw new Error('Unsupported seed worker outputs schemaVersion');
  if (outputs.algorithm !== SEED_WORKER_OUTPUTS_ALGORITHM) throw new Error('Unsupported seed worker outputs algorithm');
  if (!outputs.seedContentFingerprint) throw new Error('Missing seedContentFingerprint');
  if (outputs.explorerCollection.stream !== 'fundable-project-explorer') throw new Error('Unexpected explorer stream');
  if (!Array.isArray(outputs.explorerCollection.entries)) throw new Error('Missing explorer entries');
  if (!Array.isArray(outputs.nudgeBatch.nudges)) throw new Error('Missing nudge batch');
  if (!Array.isArray(outputs.implicationFinder.pairs)) throw new Error('Missing implication finder pairs');
}

export async function verifySeedWorkerOutputs(path = DEFAULT_SEED_WORKER_OUTPUTS_PATH): Promise<void> {
  const expected = await buildSeedWorkerOutputs('IGNORED');
  const actual = await loadSeedWorkerOutputs(path);

  if (actual.seedContentFingerprint !== expected.seedContentFingerprint) {
    throw new Error('seed-worker-outputs.json is stale: seedContentFingerprint does not match current seed content');
  }

  const comparableActual = { ...actual, generatedAt: 'IGNORED' };
  const comparableExpected = { ...expected, generatedAt: 'IGNORED' };
  if (JSON.stringify(comparableActual) !== JSON.stringify(comparableExpected)) {
    throw new Error('seed-worker-outputs.json is stale: deterministic outputs differ from current generator');
  }
}

export function buildSeedStatementRefMap<T extends { collectionId: string; groupId: string; statementId: string }>(records: T[]): Map<string, T> {
  return new Map(records.map((record) => [refKey(record), record]));
}

export function getSeedStatementRefKey(ref: SeedStatementRef): string {
  return refKey(ref);
}
