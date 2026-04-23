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

export const DEFAULT_IMPLICATION_SCOPE = 'original-variants';
export const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku';

export type ImplicationEvaluationScope = 'all' | 'collection' | 'group' | 'family' | 'original-variants';

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

function extractProliferationSource(record: SeedStatementRecord): { collectionId: string; groupId: string } | null {
  for (const note of record.group.notes ?? []) {
    const match = /^Source:\s+(.+?)\s+\/\s+(.+)$/.exec(note);
    if (match) {
      return {
        collectionId: match[1]!.trim(),
        groupId: match[2]!.trim(),
      };
    }
  }

  return null;
}

function getStatementUid(record: SeedStatementRecord): string {
  return `${record.collection.id}/${record.group.id}/${record.statement.id}`;
}

export async function loadSeedImplicationStatements(): Promise<SeedImplicationStatementRecord[]> {
  const collections = await loadSeedCollections();
  const records = flattenSeedStatements(collections);
  const originalsByUid = new Map<string, SeedStatementRecord>();
  const originalsByStatementId = new Map<string, SeedStatementRecord[]>();

  for (const record of records) {
    if (record.collection.id === 'proliferation') {
      continue;
    }
    originalsByUid.set(getStatementUid(record), record);
    const existing = originalsByStatementId.get(record.statement.id);
    if (existing) {
      existing.push(record);
    } else {
      originalsByStatementId.set(record.statement.id, [record]);
    }
  }

  return records.map((record) => {
    let original: SeedStatementRecord | undefined;
    if (record.collection.id === 'proliferation') {
      const originalId = extractOriginalStatementId(record);
      if (!originalId) {
        throw new Error(`Missing Original note for proliferation statement ${record.statement.id}`);
      }

      const source = extractProliferationSource(record);
      if (source) {
        original = originalsByUid.get(`${source.collectionId}/${source.groupId}/${originalId}`);
      }

      if (!original) {
        const candidates = originalsByStatementId.get(originalId) ?? [];
        if (candidates.length === 1) {
          [original] = candidates;
        } else if (candidates.length > 1) {
          throw new Error(
            `Ambiguous original statement "${originalId}" for ${record.statement.id}; add or fix the group's Source note`
          );
        }
      }
    } else {
      original = record;
    }

    if (!original) {
      throw new Error(`Could not resolve original statement for ${record.statement.id}`);
    }

    return {
      uid: getStatementUid(record),
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
  if (scope === 'original-variants') {
    return buildOriginalVariantPairs(statements);
  }

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

function buildOriginalVariantPairs(
  statements: SeedImplicationStatementRecord[]
): SeedImplicationPair[] {
  const originals = statements
    .filter((statement) => statement.collectionId !== 'proliferation')
    .sort((a, b) => a.uid.localeCompare(b.uid));
  const variantsByOriginalUid = new Map<string, SeedImplicationStatementRecord[]>();

  for (const statement of statements) {
    if (statement.collectionId !== 'proliferation') {
      continue;
    }

    const originalUid = `${statement.originalCollectionId}/${statement.originalGroupId}/${statement.originalStatementId}`;
    const variants = variantsByOriginalUid.get(originalUid);
    if (variants) {
      variants.push(statement);
    } else {
      variantsByOriginalUid.set(originalUid, [statement]);
    }
  }

  const pairs: SeedImplicationPair[] = [];
  for (const original of originals) {
    const variants = [...(variantsByOriginalUid.get(original.uid) ?? [])].sort((a, b) => a.uid.localeCompare(b.uid));
    const bucketKey = original.uid;

    for (const variant of variants) {
      pairs.push({
        pairId: `${original.uid}->${variant.uid}`,
        bucketKey,
        from: original,
        to: variant,
      });
      pairs.push({
        pairId: `${variant.uid}->${original.uid}`,
        bucketKey,
        from: variant,
        to: original,
      });
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
    case 'original-variants':
      return `${statement.originalCollectionId}/${statement.originalGroupId}/${statement.originalStatementId}`;
  }
}
