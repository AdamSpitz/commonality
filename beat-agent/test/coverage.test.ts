import assert from 'node:assert/strict';
import { mineCoverageGaps } from '../src/index.js';

describe('beat-agent coverage-gap mining', () => {
  it('returns zeros for empty log lines', () => {
    const summary = mineCoverageGaps({ logLines: [] });
    assert.equal(summary.totalEntries, 0);
    assert.equal(summary.totalAbstentions, 0);
    assert.equal(summary.totalPositive, 0);
    assert.equal(summary.totalNegative, 0);
    assert.equal(summary.overallAbstentionRate, 0);
    assert.equal(summary.byPlatform.length, 0);
    assert.equal(summary.repeatedAbstainContentIds.length, 0);
  });

  it('skips malformed lines and blank lines', () => {
    const summary = mineCoverageGaps({
      logLines: [
        '',
        '   ',
        'not json at all',
        JSON.stringify({
          schemaVersion: 1,
          contentCanonicalId: 'twitter:tweet:1',
          statementCid: 'bafy-s',
          decision: 'positive',
          confidence: 'high',
          reasoning: 'ok',
          timestamp: '2026-05-15T12:00:00.000Z',
        }),
      ],
    });
    assert.equal(summary.totalEntries, 1);
  });

  it('counts decisions and calculates abstention rate', () => {
    const baseEntry = {
      schemaVersion: 1,
      contentCanonicalId: 'twitter:tweet:',
      statementCid: 'bafy-statement',
      confidence: 'medium',
      reasoning: 'A reasoning.',
      timestamp: '2026-05-15T12:00:00.000Z',
      attesterType: 'beat-agent' as const,
      beatId: 'test-beat',
      attesterName: 'test',
      localContextUsed: [],
      ambientContextUsed: [],
      explanationCid: null,
      transactionHash: null,
      processingTime: 100,
    };

    const summary = mineCoverageGaps({
      logLines: [
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:1', timestamp: '2026-05-15T12:00:00.000Z', decision: 'positive' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:2', timestamp: '2026-05-15T12:01:00.000Z', decision: 'negative' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:3', timestamp: '2026-05-15T12:02:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:4', timestamp: '2026-05-15T12:03:00.000Z', decision: 'abstain', abstainReason: 'insufficient_ambient_context' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'youtube:video:5', timestamp: '2026-05-15T12:04:00.000Z', decision: 'positive' }),
      ],
    });

    assert.equal(summary.totalEntries, 5);
    assert.equal(summary.totalPositive, 2);
    assert.equal(summary.totalNegative, 1);
    assert.equal(summary.totalAbstentions, 2);
    assert.equal(summary.overallAbstentionRate, 2 / 5);
  });

  it('aggregates abstentions by reason', () => {
    const baseEntry = {
      schemaVersion: 1,
      contentCanonicalId: 'twitter:tweet:',
      statementCid: 'bafy-statement',
      confidence: 'medium',
      reasoning: 'Reason.',
      timestamp: '2026-05-15T12:00:00.000Z',
      attesterType: 'beat-agent' as const,
      beatId: 'test-beat',
      attesterName: 'test',
      localContextUsed: [],
      ambientContextUsed: [],
      explanationCid: null,
      transactionHash: null,
      processingTime: 100,
    };

    const summary = mineCoverageGaps({
      logLines: [
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:1', timestamp: '2026-05-15T12:00:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:2', timestamp: '2026-05-15T12:01:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:3', timestamp: '2026-05-15T12:02:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:4', timestamp: '2026-05-15T12:03:00.000Z', decision: 'abstain', abstainReason: 'insufficient_local_context' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:5', timestamp: '2026-05-15T12:04:00.000Z', decision: 'abstain', abstainReason: 'insufficient_ambient_context' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:6', timestamp: '2026-05-15T12:05:00.000Z', decision: 'abstain', abstainReason: 'unsupported_platform' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:7', timestamp: '2026-05-15T12:06:00.000Z', decision: 'abstain', abstainReason: 'other' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:8', timestamp: '2026-05-15T12:07:00.000Z', decision: 'abstain' }), // missing reason → 'other'
      ],
    });

    assert.equal(summary.byReason.outside_beat.count, 3);
    assert.equal(summary.byReason.insufficient_local_context.count, 1);
    assert.equal(summary.byReason.insufficient_ambient_context.count, 1);
    assert.equal(summary.byReason.unsupported_platform.count, 1);
    assert.equal(summary.byReason.other.count, 2);
  });

  it('includes content examples up to the limit', () => {
    const baseEntry = {
      schemaVersion: 1,
      contentCanonicalId: 'twitter:tweet:',
      statementCid: 'bafy-statement',
      confidence: 'medium',
      reasoning: 'Reason.',
      timestamp: '2026-05-15T12:00:00.000Z',
      attesterType: 'beat-agent' as const,
      beatId: 'test-beat',
      attesterName: 'test',
      localContextUsed: [],
      ambientContextUsed: [],
      explanationCid: null,
      transactionHash: null,
      processingTime: 100,
    };

    const summary = mineCoverageGaps({
      limitExamples: 2,
      logLines: [
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:a', timestamp: '2026-05-15T12:00:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:b', timestamp: '2026-05-15T12:01:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:c', timestamp: '2026-05-15T12:02:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:d', timestamp: '2026-05-15T12:03:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
      ],
    });

    assert.equal(summary.byReason.outside_beat.count, 4);
    assert.equal(summary.byReason.outside_beat.contentExamples.length, 2);
    assert.deepEqual(summary.byReason.outside_beat.contentExamples, ['twitter:tweet:a', 'twitter:tweet:b']);
  });

  it('groups by platform', () => {
    const baseEntry = {
      schemaVersion: 1,
      contentCanonicalId: '',
      statementCid: 'bafy-statement',
      confidence: 'medium',
      reasoning: 'Reason.',
      timestamp: '2026-05-15T12:00:00.000Z',
      attesterType: 'beat-agent' as const,
      beatId: 'test-beat',
      attesterName: 'test',
      localContextUsed: [],
      ambientContextUsed: [],
      explanationCid: null,
      transactionHash: null,
      processingTime: 100,
    };

    const summary = mineCoverageGaps({
      logLines: [
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:1', timestamp: '2026-05-15T12:00:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:2', timestamp: '2026-05-15T12:01:00.000Z', decision: 'positive' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'youtube:video:3', timestamp: '2026-05-15T12:02:00.000Z', decision: 'abstain', abstainReason: 'unsupported_platform' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'youtube:video:4', timestamp: '2026-05-15T12:03:00.000Z', decision: 'abstain', abstainReason: 'insufficient_local_context' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'bluesky:post:5', timestamp: '2026-05-15T12:04:00.000Z', decision: 'positive' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'no-colon-id', timestamp: '2026-05-15T12:05:00.000Z', decision: 'abstain', abstainReason: 'other' }),
      ],
    });

    assert.equal(summary.byPlatform.length, 4);
    const sorted = [...summary.byPlatform].sort((a, b) => b.totalAbstentions - a.totalAbstentions);

    // youtube: 2 abstentions out of 2 = 100%
    assert.equal(sorted[0].platform, 'youtube');
    assert.equal(sorted[0].totalAbstentions, 2);
    assert.equal(sorted[0].totalDecisions, 2);
    assert.equal(sorted[0].abstentionRate, 1);

    // Remaining three each have ≤1 abstention; lookup by platform for order independence.
    const byName = new Map(sorted.map((p) => [p.platform, p]));
    assert.equal(byName.get('unknown')?.totalAbstentions, 1);
    assert.equal(byName.get('unknown')?.totalDecisions, 1);
    assert.equal(byName.get('twitter')?.totalAbstentions, 1);
    assert.equal(byName.get('twitter')?.totalDecisions, 2);
    assert.equal(byName.get('bluesky')?.totalAbstentions, 0);
    assert.equal(byName.get('bluesky')?.totalDecisions, 1);
  });

  it('detects repeated abstain content IDs', () => {
    const baseEntry = {
      schemaVersion: 1,
      contentCanonicalId: 'twitter:tweet:',
      statementCid: 'bafy-statement',
      confidence: 'medium',
      reasoning: 'Reason.',
      timestamp: '2026-05-15T12:00:00.000Z',
      attesterType: 'beat-agent' as const,
      beatId: 'test-beat',
      attesterName: 'test',
      localContextUsed: [],
      ambientContextUsed: [],
      explanationCid: null,
      transactionHash: null,
      processingTime: 100,
    };

    const summary = mineCoverageGaps({
      logLines: [
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:a', timestamp: '2026-05-15T12:00:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:a', timestamp: '2026-05-15T12:01:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:a', timestamp: '2026-05-15T12:02:00.000Z', decision: 'abstain', abstainReason: 'insufficient_ambient_context' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:b', timestamp: '2026-05-15T12:03:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:c', timestamp: '2026-05-15T12:04:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:b', timestamp: '2026-05-15T12:05:00.000Z', decision: 'negative' }), // not an abstention
      ],
    });

    assert.equal(summary.repeatedAbstainContentIds.length, 1);
    assert.equal(summary.repeatedAbstainContentIds[0].contentCanonicalId, 'twitter:tweet:a');
    assert.equal(summary.repeatedAbstainContentIds[0].count, 3);
    assert.equal(summary.repeatedAbstainContentIds[0].latestReason, 'insufficient_ambient_context');

    // twitter:tweet:b only had one abstention (the other was negative), so not repeated.
  });

  it('respects minRepeatCount', () => {
    const baseEntry = {
      schemaVersion: 1,
      contentCanonicalId: 'twitter:tweet:',
      statementCid: 'bafy-statement',
      confidence: 'medium',
      reasoning: 'Reason.',
      timestamp: '2026-05-15T12:00:00.000Z',
      attesterType: 'beat-agent' as const,
      beatId: 'test-beat',
      attesterName: 'test',
      localContextUsed: [],
      ambientContextUsed: [],
      explanationCid: null,
      transactionHash: null,
      processingTime: 100,
    };

    const summary = mineCoverageGaps({
      minRepeatCount: 3,
      logLines: [
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:a', timestamp: '2026-05-15T12:00:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:a', timestamp: '2026-05-15T12:01:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:b', timestamp: '2026-05-15T12:02:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:b', timestamp: '2026-05-15T12:03:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:b', timestamp: '2026-05-15T12:04:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
      ],
    });

    assert.equal(summary.repeatedAbstainContentIds.length, 1);
    assert.equal(summary.repeatedAbstainContentIds[0].contentCanonicalId, 'twitter:tweet:b');
    assert.equal(summary.repeatedAbstainContentIds[0].count, 3);
  });

  it('reports period from min/max timestamps', () => {
    const baseEntry = {
      schemaVersion: 1,
      contentCanonicalId: 'twitter:tweet:',
      statementCid: 'bafy-statement',
      confidence: 'medium',
      reasoning: 'Reason.',
      attesterType: 'beat-agent' as const,
      beatId: 'test-beat',
      attesterName: 'test',
      localContextUsed: [],
      ambientContextUsed: [],
      explanationCid: null,
      transactionHash: null,
      processingTime: 100,
    };

    const summary = mineCoverageGaps({
      logLines: [
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:1', timestamp: '2026-05-01T00:00:00.000Z', decision: 'positive' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:2', timestamp: '2026-05-15T00:00:00.000Z', decision: 'abstain', abstainReason: 'outside_beat' }),
        JSON.stringify({ ...baseEntry, contentCanonicalId: 'twitter:tweet:3', timestamp: '2026-05-10T00:00:00.000Z', decision: 'negative' }),
      ],
    });

    assert.equal(summary.period.start, '2026-05-01T00:00:00.000Z');
    assert.equal(summary.period.end, '2026-05-15T00:00:00.000Z');
  });
});
