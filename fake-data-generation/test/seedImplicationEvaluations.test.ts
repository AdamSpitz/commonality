import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSeedImplicationPairs,
  compareEvaluations,
  extractOriginalStatementId,
  getPromptFingerprint,
  loadSeedImplicationStatements,
  type SeedImplicationStatementRecord,
  type StoredSeedImplicationEvaluation,
} from '../seedImplicationEvaluations.js';

function makeStatement(overrides: Partial<SeedImplicationStatementRecord>): SeedImplicationStatementRecord {
  return {
    uid: 'base/group/statement',
    collectionId: 'base',
    groupId: 'group',
    statementId: 'statement',
    role: null,
    text: 'text',
    originalStatementId: 'statement',
    originalCollectionId: 'base',
    originalGroupId: 'group',
    ...overrides,
  };
}

test('extractOriginalStatementId parses proliferation note', () => {
  const originalId = extractOriginalStatementId({
    collection: { format: 'commonality-seed-content-v1', id: 'proliferation', title: 'p', description: 'p', groups: [] },
    group: { id: 'g', title: 'G', statements: [] },
    statement: { id: 'variant', text: 'Variant', notes: ['Original: base-statement'] },
  });

  assert.equal(originalId, 'base-statement');
});

test('loadSeedImplicationStatements supports repeated local statement ids', async () => {
  const statements = await loadSeedImplicationStatements();

  const abortionPoleLeft = statements.find((statement) => statement.uid === 'hidden-majority/abortion/pole-left');
  const immigrationPoleLeft = statements.find((statement) => statement.uid === 'hidden-majority/immigration/pole-left');

  assert.ok(abortionPoleLeft);
  assert.ok(immigrationPoleLeft);
  assert.notEqual(abortionPoleLeft.uid, immigrationPoleLeft.uid);
  assert.equal(abortionPoleLeft.originalStatementId, 'pole-left');
  assert.equal(immigrationPoleLeft.originalStatementId, 'pole-left');
});

test('loadSeedImplicationStatements resolves proliferation variants via source note', async () => {
  const statements = await loadSeedImplicationStatements();

  const variant = statements.find(
    (statement) => statement.uid === 'proliferation/hidden-majority-abortion/pole-left-close-1'
  );

  assert.ok(variant);
  assert.equal(variant.originalCollectionId, 'hidden-majority');
  assert.equal(variant.originalGroupId, 'abortion');
  assert.equal(variant.originalStatementId, 'pole-left');
});

test('group scope merges originals with proliferation variants by original group', () => {
  const statements = [
    makeStatement({
      uid: 'meta/commonality/base-a',
      collectionId: 'meta',
      groupId: 'commonality',
      statementId: 'base-a',
      originalStatementId: 'base-a',
      originalCollectionId: 'meta',
      originalGroupId: 'commonality',
    }),
    makeStatement({
      uid: 'proliferation/variants/base-a-close',
      collectionId: 'proliferation',
      groupId: 'variants',
      statementId: 'base-a-close',
      originalStatementId: 'base-a',
      originalCollectionId: 'meta',
      originalGroupId: 'commonality',
    }),
    makeStatement({
      uid: 'meta/commonality/base-b',
      collectionId: 'meta',
      groupId: 'commonality',
      statementId: 'base-b',
      originalStatementId: 'base-b',
      originalCollectionId: 'meta',
      originalGroupId: 'commonality',
    }),
  ];

  const pairs = buildSeedImplicationPairs(statements, 'group');
  assert.equal(pairs.length, 6);
  assert.ok(pairs.every((pair) => pair.bucketKey === 'meta/commonality'));
});

test('compareEvaluations reports missing, extra, and mismatched pairs', () => {
  const a = makeStatement({ uid: 'a', statementId: 'a', originalStatementId: 'a' });
  const b = makeStatement({ uid: 'b', statementId: 'b', originalStatementId: 'b' });
  const expectedPairs = [
    { pairId: 'a->b', bucketKey: 'bucket', from: a, to: b },
  ];

  const saved: StoredSeedImplicationEvaluation[] = [
    {
      pairId: 'a->b',
      bucketKey: 'bucket',
      from: a,
      to: b,
      implies: true,
      confidence: 'high',
      reasoning: 'r',
      model: 'm',
      promptFingerprint: 'p',
      evaluatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      pairId: 'obsolete',
      bucketKey: 'bucket',
      from: a,
      to: a,
      implies: false,
      confidence: 'low',
      reasoning: 'r',
      model: 'm',
      promptFingerprint: 'p',
      evaluatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const report = compareEvaluations(expectedPairs, saved, new Map([
    ['a->b', { implies: false, confidence: 'medium' }],
  ]));

  assert.deepEqual(report.extraPairIds, ['obsolete']);
  assert.deepEqual(report.missingPairIds, []);
  assert.equal(report.mismatches.length, 1);
  assert.equal(report.mismatches[0]!.pairId, 'a->b');
});

test('getPromptFingerprint is stable', () => {
  assert.equal(getPromptFingerprint('abc'), getPromptFingerprint('abc'));
  assert.notEqual(getPromptFingerprint('abc'), getPromptFingerprint('abd'));
});
