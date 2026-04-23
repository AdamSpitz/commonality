import fs from 'fs/promises';
import { createHash } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  flattenSeedStatements,
  loadSeedCollections,
  type SeedStatementRecord,
} from './seed-content-format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const DEFAULT_IMPLICATION_SCOPE = 'group';
export const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku';

export type ImplicationEvaluationScope = 'all' | 'collection' | 'group' | 'family';

export interface SeedImplicationStatementRecord {
  uid: string;
  collectionId: string;
  groupId: string;
  statementId: string;
  role: string | null;
  text: string;
  originalStatementId: string;
  originalCollectionId: string;
  originalGroupId: string;
}

export interface SeedImplicationPair {
  pairId: string;
  bucketKey: string;
  from: SeedImplicationStatementRecord;
  to: SeedImplicationStatementRecord;
}

export interface StoredSeedImplicationEvaluation {
  pairId: string;
  bucketKey: string;
  from: SeedImplicationStatementRecord;
  to: SeedImplicationStatementRecord;
  implies: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  model: string;
  promptFingerprint: string;
  evaluatedAt: string;
}

export interface SeedImplicationEvaluationMetadata {
  generatedAt: string;
  scope: ImplicationEvaluationScope;
  statementCount: number;
  pairCount: number;
  model: string;
  promptFingerprint: string;
}

export interface SeedImplicationVerificationReport {
  expectedPairCount: number;
  savedPairCount: number;
  missingPairIds: string[];
  extraPairIds: string[];
  mismatches: Array<{
    pairId: string;
    expected: { implies: boolean; confidence: 'high' | 'medium' | 'low' };
    actual: { implies: boolean; confidence: 'high' | 'medium' | 'low' };
  }>;
}

export function getDefaultEvaluationsPath(scope: ImplicationEvaluationScope = DEFAULT_IMPLICATION_SCOPE): string {
  return join(__dirname, 'data', `seed-implication-evaluations.${scope}.json`);
}

export function getDefaultMetadataPath(scope: ImplicationEvaluationScope = DEFAULT_IMPLICATION_SCOPE): string {
  return join(__dirname, 'data', `seed-implication-evaluations.${scope}.metadata.json`);
}

export function getPromptFingerprint(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex');
}

export function extractOriginalStatementId(record: SeedStatementRecord): string | null {
  for (const note of record.statement.notes ?? []) {
    const match = /^Original:\s+(.+)$/.exec(note);
    if (match) {
      return match[1]!.trim();
    }
  }

  return null;
}

export async function loadSeedImplicationStatements(): Promise<SeedImplicationStatementRecord[]> {
  const collections = await loadSeedCollections();
  const records = flattenSeedStatements(collections);
  const originals = new Map<string, SeedStatementRecord>();

  for (const record of records) {
    if (record.collection.id === 'proliferation') {
      continue;
    }
    if (originals.has(record.statement.id)) {
      throw new Error(`Duplicate seed statement id outside proliferation: ${record.statement.id}`);
    }
    originals.set(record.statement.id, record);
  }

  return records.map((record) => {
    const originalId = record.collection.id === 'proliferation'
      ? extractOriginalStatementId(record)
      : record.statement.id;

    if (!originalId) {
      throw new Error(`Missing Original note for proliferation statement ${record.statement.id}`);
    }

    const original = originals.get(originalId);
    if (!original) {
      throw new Error(`Could not resolve original statement "${originalId}" for ${record.statement.id}`);
    }

    return {
      uid: `${record.collection.id}/${record.group.id}/${record.statement.id}`,
      collectionId: record.collection.id,
      groupId: record.group.id,
      statementId: record.statement.id,
      role: record.statement.role ?? null,
      text: record.statement.text,
      originalStatementId: original.statement.id,
      originalCollectionId: original.collection.id,
      originalGroupId: original.group.id,
    };
  });
}

export function buildSeedImplicationPairs(
  statements: SeedImplicationStatementRecord[],
  scope: ImplicationEvaluationScope
): SeedImplicationPair[] {
  const buckets = new Map<string, SeedImplicationStatementRecord[]>();

  for (const statement of statements) {
    const bucketKey = getBucketKey(statement, scope);
    const bucket = buckets.get(bucketKey);
    if (bucket) {
      bucket.push(statement);
    } else {
      buckets.set(bucketKey, [statement]);
    }
  }

  const pairs: SeedImplicationPair[] = [];
  for (const [bucketKey, bucketStatements] of [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sortedStatements = [...bucketStatements].sort((a, b) => a.uid.localeCompare(b.uid));
    for (const from of sortedStatements) {
      for (const to of sortedStatements) {
        if (from.uid === to.uid) {
          continue;
        }
        pairs.push({
          pairId: `${from.uid}->${to.uid}`,
          bucketKey,
          from,
          to,
        });
      }
    }
  }

  return pairs;
}

export async function loadStoredSeedImplicationEvaluations(
  filePath: string
): Promise<StoredSeedImplicationEvaluation[]> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as StoredSeedImplicationEvaluation[];
}

export async function writeSeedImplicationEvaluations(
  evaluationsPath: string,
  metadataPath: string,
  evaluations: StoredSeedImplicationEvaluation[],
  metadata: SeedImplicationEvaluationMetadata
): Promise<void> {
  await fs.mkdir(dirname(evaluationsPath), { recursive: true });
  await fs.writeFile(evaluationsPath, JSON.stringify(evaluations, null, 2) + '\n');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
}

export function compareEvaluations(
  expectedPairs: SeedImplicationPair[],
  savedEvaluations: StoredSeedImplicationEvaluation[],
  actualByPairId: Map<string, Pick<StoredSeedImplicationEvaluation, 'implies' | 'confidence'>>
): SeedImplicationVerificationReport {
  const expectedPairIds = new Set(expectedPairs.map((pair) => pair.pairId));
  const savedPairIds = new Set(savedEvaluations.map((evaluation) => evaluation.pairId));

  const missingPairIds = [...expectedPairIds].filter((pairId) => !savedPairIds.has(pairId)).sort();
  const extraPairIds = [...savedPairIds].filter((pairId) => !expectedPairIds.has(pairId)).sort();

  const mismatches = savedEvaluations.flatMap((saved) => {
    const actual = actualByPairId.get(saved.pairId);
    if (!actual) {
      return [];
    }
    if (actual.implies === saved.implies && actual.confidence === saved.confidence) {
      return [];
    }
    return [{
      pairId: saved.pairId,
      expected: { implies: saved.implies, confidence: saved.confidence },
      actual: { implies: actual.implies, confidence: actual.confidence },
    }];
  });

  return {
    expectedPairCount: expectedPairs.length,
    savedPairCount: savedEvaluations.length,
    missingPairIds,
    extraPairIds,
    mismatches,
  };
}

function getBucketKey(
  statement: SeedImplicationStatementRecord,
  scope: ImplicationEvaluationScope
): string {
  switch (scope) {
    case 'all':
      return 'all';
    case 'collection':
      return statement.originalCollectionId;
    case 'group':
      return `${statement.originalCollectionId}/${statement.originalGroupId}`;
    case 'family':
      return statement.originalStatementId;
  }
}
