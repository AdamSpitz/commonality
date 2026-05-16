import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import {
  generateBeatAgentWorkerMetrics,
  formatBeatAgentWorkerMetricsReport,
  appendMetricsToJsonl,
  loadMetricsHistory,
} from '../src/index.js';
import type {
  BeatAgentWorkerMetrics,
  GenerateBeatAgentWorkerMetricsParams,
} from '../src/index.js';
import type { CoverageGapSummary } from '../src/index.js';

const NOW = new Date('2026-05-16T12:00:00.000Z');

const baseParams: GenerateBeatAgentWorkerMetricsParams = {
  beatId: 'test-beat',
  now: NOW,
};

describe('generateBeatAgentWorkerMetrics', () => {
  it('returns nulls for all sections when no data provided', () => {
    const m = generateBeatAgentWorkerMetrics(baseParams);
    assert.equal(m.beatId, 'test-beat');
    assert.equal(m.generatedAt, NOW.toISOString());
    assert.equal(m.ingestion, null);
    assert.equal(m.memory, null);
    assert.equal(m.extraction, null);
    assert.equal(m.compaction, null);
    assert.equal(m.evaluation, null);
    assert.equal(m.finder, null);
  });

  it('builds ingestion metrics from summary', () => {
    const m = generateBeatAgentWorkerMetrics({
      ...baseParams,
      ingestionSummary: {
        fetchedSourceIds: ['src-a', 'src-b'],
        skippedSources: [
          { sourceId: 'src-c', reason: 'rate_limited' },
          { sourceId: 'src-d', reason: 'missing_credentials' },
          { sourceId: 'src-e', reason: 'rate_limited' },
        ],
        newItemCount: 15,
        duplicateItemCount: 3,
        anomalies: [],
      },
    });
    assert.ok(m.ingestion);
    assert.equal(m.ingestion.fetchedSourceCount, 2);
    assert.equal(m.ingestion.skippedSourceCount, 3);
    assert.equal(m.ingestion.skippedByReason.rate_limited, 2);
    assert.equal(m.ingestion.skippedByReason.missing_credentials, 1);
    assert.equal(m.ingestion.newItemCount, 15);
    assert.equal(m.ingestion.duplicateItemCount, 3);
  });

  it('builds memory metrics including stale observation count', () => {
    // One observation fresh (3 days), one stale (20 days).
    const freshEnd = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const staleEnd = new Date(NOW.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
    const m = generateBeatAgentWorkerMetrics({
      ...baseParams,
      staleObservationDays: 14,
      memoryObservations: [
        {
          id: 'obs-1',
          beatId: 'test-beat',
          kind: 'item_observation',
          observation: 'A fresh observation',
          observedAtStart: freshEnd,
          observedAtEnd: freshEnd,
          confidence: 'medium',
          supportingContentIds: ['twitter:tweet:1'],
          sourceAuthors: ['@alice'],
          keywords: ['politics'],
          createdAt: freshEnd,
        },
        {
          id: 'obs-2',
          beatId: 'test-beat',
          kind: 'compacted_summary',
          observation: 'A stale summary',
          observedAtStart: staleEnd,
          observedAtEnd: staleEnd,
          confidence: 'low',
          supportingContentIds: ['twitter:tweet:2', 'twitter:tweet:3'],
          sourceAuthors: ['@bob'],
          keywords: ['economy'],
          createdAt: staleEnd,
        },
      ],
    });
    assert.ok(m.memory);
    assert.equal(m.memory.totalObservations, 2);
    assert.equal(m.memory.itemObservationCount, 1);
    assert.equal(m.memory.summaryObservationCount, 1);
    assert.equal(m.memory.staleObservationCount, 1);
    assert.equal(m.memory.oldestObservationAt, staleEnd);
    assert.equal(m.memory.newestObservationAt, freshEnd);
  });

  it('builds memory metrics with empty observations', () => {
    const m = generateBeatAgentWorkerMetrics({ ...baseParams, memoryObservations: [] });
    assert.ok(m.memory);
    assert.equal(m.memory.totalObservations, 0);
    assert.equal(m.memory.staleObservationCount, 0);
    assert.equal(m.memory.oldestObservationAt, null);
    assert.equal(m.memory.newestObservationAt, null);
  });

  it('builds extraction metrics', () => {
    const m = generateBeatAgentWorkerMetrics({
      ...baseParams,
      extractionSummary: {
        itemCount: 10,
        observationCount: 8,
        duplicateObservationCount: 2,
        failedItemCount: 1,
        failedItems: [{ contentCanonicalId: 'twitter:tweet:bad', errorMessage: 'timeout' }],
        retriedItemCount: 0,
        totalRetryCount: 0,
      },
    });
    assert.ok(m.extraction);
    assert.equal(m.extraction.processedItemCount, 10);
    assert.equal(m.extraction.newObservationCount, 8);
    assert.equal(m.extraction.duplicateObservationCount, 2);
    assert.equal(m.extraction.failedItemCount, 1);
  });

  it('builds compaction metrics', () => {
    const m = generateBeatAgentWorkerMetrics({
      ...baseParams,
      compactionSummary: { compactedObservationCount: 12, createdSummaryCount: 3 },
    });
    assert.ok(m.compaction);
    assert.equal(m.compaction.compactedObservationCount, 12);
    assert.equal(m.compaction.createdSummaryCount, 3);
  });

  it('builds evaluation metrics from coverage summary', () => {
    const coverage: CoverageGapSummary = {
      period: { start: '2026-05-01T00:00:00.000Z', end: '2026-05-16T00:00:00.000Z' },
      totalEntries: 100,
      totalAbstentions: 30,
      totalPositive: 50,
      totalNegative: 20,
      overallAbstentionRate: 0.3,
      byReason: {
        outside_beat: { count: 20, contentExamples: [] },
        insufficient_ambient_context: { count: 7, contentExamples: [] },
        insufficient_local_context: { count: 2, contentExamples: [] },
        unsupported_platform: { count: 1, contentExamples: [] },
        other: { count: 0, contentExamples: [] },
      },
      byPlatform: [],
      repeatedAbstainContentIds: [],
    };
    const m = generateBeatAgentWorkerMetrics({ ...baseParams, coverageSummary: coverage });
    assert.ok(m.evaluation);
    assert.equal(m.evaluation.totalDecisions, 100);
    assert.equal(m.evaluation.positiveCount, 50);
    assert.equal(m.evaluation.negativeCount, 20);
    assert.equal(m.evaluation.abstainCount, 30);
    assert.equal(m.evaluation.abstentionRate, 0.3);
    assert.equal(m.evaluation.publicationCount, 50);
    // Reasons should be sorted descending and exclude zeros.
    assert.equal(m.evaluation.topAbstainReasons[0].reason, 'outside_beat');
    assert.equal(m.evaluation.topAbstainReasons[0].count, 20);
    assert.equal(m.evaluation.topAbstainReasons.length, 4); // 'other' with count 0 excluded
  });

  it('builds finder metrics', () => {
    const m = generateBeatAgentWorkerMetrics({
      ...baseParams,
      finderSummary: {
        scannedItemCount: 40,
        skippedAlreadyProcessedCount: 30,
        notPromisingCount: 5,
        submittedCount: 4,
        failedCandidateIds: ['twitter:tweet:bad1', 'twitter:tweet:bad2'],
      },
    });
    assert.ok(m.finder);
    assert.equal(m.finder.scannedItemCount, 40);
    assert.equal(m.finder.skippedAlreadyProcessedCount, 30);
    assert.equal(m.finder.submittedCount, 4);
    assert.equal(m.finder.notPromisingCount, 5);
    assert.equal(m.finder.failedCount, 2);
  });
});

const baseMetrics: BeatAgentWorkerMetrics = {
  generatedAt: NOW.toISOString(),
  beatId: 'test-beat',
  ingestion: null,
  memory: null,
  extraction: null,
  compaction: null,
  evaluation: null,
  finder: null,
};

describe('appendMetricsToJsonl and loadMetricsHistory', () => {
  it('creates file and appends a single entry', async () => {
    const filePath = join(tmpdir(), `metrics-test-single-${Date.now()}.jsonl`);
    try {
      await appendMetricsToJsonl(filePath)(baseMetrics);
      const history = await loadMetricsHistory(filePath);
      assert.equal(history.length, 1);
      assert.deepEqual(history[0], baseMetrics);
    } finally {
      await rm(filePath, { force: true });
    }
  });

  it('appends multiple entries in order', async () => {
    const filePath = join(tmpdir(), `metrics-test-multi-${Date.now()}.jsonl`);
    const entry1: BeatAgentWorkerMetrics = { ...baseMetrics, generatedAt: '2026-05-16T10:00:00.000Z' };
    const entry2: BeatAgentWorkerMetrics = { ...baseMetrics, generatedAt: '2026-05-16T11:00:00.000Z' };
    try {
      await appendMetricsToJsonl(filePath)(entry1);
      await appendMetricsToJsonl(filePath)(entry2);
      const history = await loadMetricsHistory(filePath);
      assert.equal(history.length, 2);
      assert.equal(history[0].generatedAt, '2026-05-16T10:00:00.000Z');
      assert.equal(history[1].generatedAt, '2026-05-16T11:00:00.000Z');
    } finally {
      await rm(filePath, { force: true });
    }
  });

  it('returns [] for missing file', async () => {
    const filePath = join(tmpdir(), `metrics-test-missing-${Date.now()}.jsonl`);
    const history = await loadMetricsHistory(filePath);
    assert.deepEqual(history, []);
  });
});

describe('formatBeatAgentWorkerMetricsReport', () => {
  it('produces a non-empty string containing the beat ID', () => {
    const metrics: BeatAgentWorkerMetrics = {
      generatedAt: NOW.toISOString(),
      beatId: 'us-political-twitter',
      ingestion: null,
      memory: null,
      extraction: null,
      compaction: null,
      evaluation: null,
      finder: null,
    };
    const report = formatBeatAgentWorkerMetricsReport(metrics);
    assert.ok(report.includes('us-political-twitter'));
  });

  it('includes ingestion section when data present', () => {
    const metrics = generateBeatAgentWorkerMetrics({
      beatId: 'test-beat',
      now: NOW,
      ingestionSummary: {
        fetchedSourceIds: ['a', 'b'],
        skippedSources: [{ sourceId: 'c', reason: 'rate_limited' }],
        newItemCount: 7,
        duplicateItemCount: 1,
        anomalies: [],
      },
    });
    const report = formatBeatAgentWorkerMetricsReport(metrics);
    assert.ok(report.includes('INGESTION'));
    assert.ok(report.includes('rate_limited'));
    assert.ok(report.includes('7'));
  });

  it('includes evaluation abstain reasons in report', () => {
    const coverage: CoverageGapSummary = {
      period: { start: '2026-05-01T00:00:00.000Z', end: '2026-05-16T00:00:00.000Z' },
      totalEntries: 10,
      totalAbstentions: 6,
      totalPositive: 3,
      totalNegative: 1,
      overallAbstentionRate: 0.6,
      byReason: {
        outside_beat: { count: 5, contentExamples: [] },
        insufficient_ambient_context: { count: 1, contentExamples: [] },
        insufficient_local_context: { count: 0, contentExamples: [] },
        unsupported_platform: { count: 0, contentExamples: [] },
        other: { count: 0, contentExamples: [] },
      },
      byPlatform: [],
      repeatedAbstainContentIds: [],
    };
    const metrics = generateBeatAgentWorkerMetrics({ beatId: 'test-beat', now: NOW, coverageSummary: coverage });
    const report = formatBeatAgentWorkerMetricsReport(metrics);
    assert.ok(report.includes('EVALUATIONS'));
    assert.ok(report.includes('outside_beat'));
    assert.ok(report.includes('60.0%'));
  });
});
