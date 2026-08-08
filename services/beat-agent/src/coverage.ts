import { readFile } from 'node:fs/promises';
import type { BeatAgentEvaluationLogEntry } from './types.js';

export interface CoverageGapCount {
  count: number;
  contentExamples: string[];
}

export interface CoverageGapByReason {
  outside_beat: CoverageGapCount;
  insufficient_local_context: CoverageGapCount;
  insufficient_ambient_context: CoverageGapCount;
  unsupported_platform: CoverageGapCount;
  other: CoverageGapCount;
}

export interface PlatformGap {
  platform: string;
  totalAbstentions: number;
  byReason: CoverageGapByReason;
  totalDecisions: number;
  abstentionRate: number;
}

export interface CoverageGapSummary {
  period: { start: string; end: string };
  totalEntries: number;
  totalAbstentions: number;
  totalPositive: number;
  totalNegative: number;
  overallAbstentionRate: number;
  byReason: CoverageGapByReason;
  byPlatform: PlatformGap[];
  repeatedAbstainContentIds: Array<{
    contentCanonicalId: string;
    count: number;
    latestReason: string;
    latestTimestamp: string;
  }>;
}

export interface MineCoverageGapsParams {
  filePath?: string;
  logLines?: string[];
  limitExamples?: number;
  minRepeatCount?: number;
}

function emptyGapCount(): CoverageGapCount {
  return { count: 0, contentExamples: [] };
}

function emptyByReason(): CoverageGapByReason {
  return {
    outside_beat: emptyGapCount(),
    insufficient_local_context: emptyGapCount(),
    insufficient_ambient_context: emptyGapCount(),
    unsupported_platform: emptyGapCount(),
    other: emptyGapCount(),
  };
}

function extractPlatform(contentCanonicalId: string): string {
  const colonIndex = contentCanonicalId.indexOf(':');
  return colonIndex > 0 ? contentCanonicalId.substring(0, colonIndex) : 'unknown';
}

function addExample(gap: CoverageGapCount, contentCanonicalId: string, limit: number): void {
  if (gap.contentExamples.length < limit) {
    gap.contentExamples.push(contentCanonicalId);
  }
}

function parseLogLines(lines: string[]): BeatAgentEvaluationLogEntry[] {
  const entries: BeatAgentEvaluationLogEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as BeatAgentEvaluationLogEntry);
    } catch {
      // Skip malformed lines.
    }
  }
  return entries;
}

export async function mineCoverageGapsFromFile(
  params: MineCoverageGapsParams = {},
): Promise<CoverageGapSummary | null> {
  if (!params.filePath) return null;
  try {
    const raw = await readFile(params.filePath, 'utf-8');
    return mineCoverageGaps({ ...params, logLines: raw.split('\n') });
  } catch {
    return null;
  }
}

export function mineCoverageGaps(
  params: MineCoverageGapsParams = {},
): CoverageGapSummary {
  const limitExamples = params.limitExamples ?? 3;
  const minRepeatCount = params.minRepeatCount ?? 2;
  const logLines = params.logLines ?? [];
  const entries = parseLogLines(logLines);

  // Sort by timestamp ascending.
  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const byReason: CoverageGapByReason = emptyByReason();
  const platformMap = new Map<string, {
    totalAbstentions: number;
    totalDecisions: number;
    byReason: CoverageGapByReason;
  }>();

  // Track repeated content IDs for abstentions.
  const abstainByContentId = new Map<
    string,
    { count: number; latestReason: string; latestTimestamp: string }
  >();

  let totalPositive = 0;
  let totalNegative = 0;
  let totalAbstentions = 0;
  let minTimestamp = '';
  let maxTimestamp = '';

  for (const entry of entries) {
    if (!minTimestamp || entry.timestamp < minTimestamp) minTimestamp = entry.timestamp;
    if (!maxTimestamp || entry.timestamp > maxTimestamp) maxTimestamp = entry.timestamp;

    const platform = extractPlatform(entry.contentCanonicalId);
    let platformStats = platformMap.get(platform);
    if (!platformStats) {
      platformStats = {
        totalAbstentions: 0,
        totalDecisions: 0,
        byReason: emptyByReason(),
      };
      platformMap.set(platform, platformStats);
    }
    platformStats.totalDecisions++;

    if (entry.decision === 'positive') {
      totalPositive++;
    } else if (entry.decision === 'negative') {
      totalNegative++;
    } else if (entry.decision === 'abstain') {
      totalAbstentions++;
      platformStats.totalAbstentions++;

      const reason = entry.abstainReason ?? 'other';

      // Global reason counts.
      const globalReason = byReason[reason];
      globalReason.count++;
      addExample(globalReason, entry.contentCanonicalId, limitExamples);

      // Platform-level reason counts.
      const platReason = platformStats.byReason[reason];
      platReason.count++;
      addExample(platReason, entry.contentCanonicalId, limitExamples);

      // Track repeated content IDs.
      const existing = abstainByContentId.get(entry.contentCanonicalId);
      if (existing) {
        existing.count++;
        existing.latestReason = reason;
        existing.latestTimestamp = entry.timestamp;
      } else {
        abstainByContentId.set(entry.contentCanonicalId, {
          count: 1,
          latestReason: reason,
          latestTimestamp: entry.timestamp,
        });
      }
    }
  }

  const totalDecisions = entries.length;
  const overallAbstentionRate = totalDecisions > 0
    ? totalAbstentions / totalDecisions
    : 0;

  // Build per-platform gap summaries sorted by abstention count descending.
  const byPlatform: PlatformGap[] = Array.from(platformMap.entries())
    .map(([platform, stats]) => ({
      platform,
      totalAbstentions: stats.totalAbstentions,
      byReason: stats.byReason,
      totalDecisions: stats.totalDecisions,
      abstentionRate: stats.totalDecisions > 0
        ? stats.totalAbstentions / stats.totalDecisions
        : 0,
    }))
    .sort((a, b) => b.totalAbstentions - a.totalAbstentions);

  // Collect content IDs that were repeatedly abstained on.
  const repeatedAbstainContentIds = Array.from(abstainByContentId.entries())
    .filter(([, data]) => data.count >= minRepeatCount)
    .map(([contentCanonicalId, data]) => ({
      contentCanonicalId,
      count: data.count,
      latestReason: data.latestReason,
      latestTimestamp: data.latestTimestamp,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    period: { start: minTimestamp, end: maxTimestamp },
    totalEntries: totalDecisions,
    totalAbstentions,
    totalPositive,
    totalNegative,
    overallAbstentionRate,
    byReason,
    byPlatform,
    repeatedAbstainContentIds,
  };
}
