import { mkdir, appendFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
	getObservationStaleDays,
	type BeatMemoryObservation,
	type BeatIngestionRunSummary,
	type BeatIngestionSkippedSource,
	type ExtractObservationsSummary,
	type CompactBeatMemorySummary,
} from "@commonality/beat-memory";
import type { BeatFinderRunSummary } from "./finder.js";
import type { CoverageGapSummary } from "./coverage.js";

export interface BeatAgentIngestionMetrics {
	fetchedSourceCount: number;
	skippedSourceCount: number;
	skippedByReason: Partial<
		Record<BeatIngestionSkippedSource["reason"], number>
	>;
	newItemCount: number;
	duplicateItemCount: number;
	anomalyCount: number;
}

export interface BeatAgentMemoryMetrics {
	totalObservations: number;
	itemObservationCount: number;
	summaryObservationCount: number;
	staleObservationCount: number;
	oldestObservationAt: string | null;
	newestObservationAt: string | null;
}

export interface BeatAgentExtractionMetrics {
	processedItemCount: number;
	newObservationCount: number;
	duplicateObservationCount: number;
	failedItemCount: number;
}

export interface BeatAgentCompactionMetrics {
	compactedObservationCount: number;
	createdSummaryCount: number;
}

export interface BeatAgentEvaluationMetrics {
	totalDecisions: number;
	positiveCount: number;
	negativeCount: number;
	abstainCount: number;
	abstentionRate: number;
	publicationCount: number;
	topAbstainReasons: Array<{ reason: string; count: number }>;
	period: { start: string; end: string };
}

export interface BeatAgentFinderMetrics {
	scannedItemCount: number;
	skippedAlreadyProcessedCount: number;
	submittedCount: number;
	notPromisingCount: number;
	failedCount: number;
}

export interface BeatAgentWorkerMetrics {
	generatedAt: string;
	beatId: string;
	ingestion: BeatAgentIngestionMetrics | null;
	memory: BeatAgentMemoryMetrics | null;
	extraction: BeatAgentExtractionMetrics | null;
	compaction: BeatAgentCompactionMetrics | null;
	evaluation: BeatAgentEvaluationMetrics | null;
	finder: BeatAgentFinderMetrics | null;
}

export interface GenerateBeatAgentWorkerMetricsParams {
	beatId: string;
	now?: Date;
	staleObservationDays?: number;
	ingestionSummary?: BeatIngestionRunSummary;
	memoryObservations?: BeatMemoryObservation[];
	extractionSummary?: ExtractObservationsSummary;
	compactionSummary?: CompactBeatMemorySummary;
	coverageSummary?: CoverageGapSummary;
	finderSummary?: BeatFinderRunSummary;
}

function buildIngestionMetrics(
	s: BeatIngestionRunSummary,
): BeatAgentIngestionMetrics {
	const skippedByReason: Partial<
		Record<BeatIngestionSkippedSource["reason"], number>
	> = {};
	for (const skipped of s.skippedSources) {
		skippedByReason[skipped.reason] =
			(skippedByReason[skipped.reason] ?? 0) + 1;
	}
	return {
		fetchedSourceCount: s.fetchedSourceIds.length,
		skippedSourceCount: s.skippedSources.length,
		skippedByReason,
		newItemCount: s.newItemCount,
		duplicateItemCount: s.duplicateItemCount,
		anomalyCount: s.anomalies.length,
	};
}

function buildMemoryMetrics(
	observations: BeatMemoryObservation[],
	now: Date,
	staleObservationDays: number,
): BeatAgentMemoryMetrics {
	let itemObservationCount = 0;
	let summaryObservationCount = 0;
	let staleObservationCount = 0;
	let oldestObservationAt: string | null = null;
	let newestObservationAt: string | null = null;

	for (const obs of observations) {
		if (obs.kind === "item_observation") {
			itemObservationCount++;
		} else {
			summaryObservationCount++;
		}
		if (getObservationStaleDays(obs, now) >= staleObservationDays) {
			staleObservationCount++;
		}
		const ts = obs.observedAtEnd;
		if (!oldestObservationAt || ts < oldestObservationAt)
			oldestObservationAt = ts;
		if (!newestObservationAt || ts > newestObservationAt)
			newestObservationAt = ts;
	}

	return {
		totalObservations: observations.length,
		itemObservationCount,
		summaryObservationCount,
		staleObservationCount,
		oldestObservationAt,
		newestObservationAt,
	};
}

function buildExtractionMetrics(
	s: ExtractObservationsSummary,
): BeatAgentExtractionMetrics {
	return {
		processedItemCount: s.itemCount,
		newObservationCount: s.observationCount,
		duplicateObservationCount: s.duplicateObservationCount,
		failedItemCount: s.failedItemCount,
	};
}

function buildCompactionMetrics(
	s: CompactBeatMemorySummary,
): BeatAgentCompactionMetrics {
	return {
		compactedObservationCount: s.compactedObservationCount,
		createdSummaryCount: s.createdSummaryCount,
	};
}

function buildEvaluationMetrics(
	s: CoverageGapSummary,
): BeatAgentEvaluationMetrics {
	const reasons: Array<{ reason: string; count: number }> = [
		{ reason: "outside_beat", count: s.byReason.outside_beat.count },
		{
			reason: "insufficient_ambient_context",
			count: s.byReason.insufficient_ambient_context.count,
		},
		{
			reason: "insufficient_local_context",
			count: s.byReason.insufficient_local_context.count,
		},
		{
			reason: "unsupported_platform",
			count: s.byReason.unsupported_platform.count,
		},
		{ reason: "other", count: s.byReason.other.count },
	]
		.filter((r) => r.count > 0)
		.sort((a, b) => b.count - a.count);

	return {
		totalDecisions: s.totalEntries,
		positiveCount: s.totalPositive,
		negativeCount: s.totalNegative,
		abstainCount: s.totalAbstentions,
		abstentionRate: s.overallAbstentionRate,
		publicationCount: s.totalPositive,
		topAbstainReasons: reasons,
		period: s.period,
	};
}

function buildFinderMetrics(s: BeatFinderRunSummary): BeatAgentFinderMetrics {
	return {
		scannedItemCount: s.scannedItemCount,
		skippedAlreadyProcessedCount: s.skippedAlreadyProcessedCount,
		submittedCount: s.submittedCount,
		notPromisingCount: s.notPromisingCount,
		failedCount: s.failedCandidateIds.length,
	};
}

export function generateBeatAgentWorkerMetrics(
	params: GenerateBeatAgentWorkerMetricsParams,
): BeatAgentWorkerMetrics {
	const now = params.now ?? new Date();
	const staleObservationDays = params.staleObservationDays ?? 14;

	return {
		generatedAt: now.toISOString(),
		beatId: params.beatId,
		ingestion: params.ingestionSummary
			? buildIngestionMetrics(params.ingestionSummary)
			: null,
		memory: params.memoryObservations
			? buildMemoryMetrics(params.memoryObservations, now, staleObservationDays)
			: null,
		extraction: params.extractionSummary
			? buildExtractionMetrics(params.extractionSummary)
			: null,
		compaction: params.compactionSummary
			? buildCompactionMetrics(params.compactionSummary)
			: null,
		evaluation: params.coverageSummary
			? buildEvaluationMetrics(params.coverageSummary)
			: null,
		finder: params.finderSummary
			? buildFinderMetrics(params.finderSummary)
			: null,
	};
}

function pct(rate: number): string {
	return `${(rate * 100).toFixed(1)}%`;
}

export function formatBeatAgentWorkerMetricsReport(
	metrics: BeatAgentWorkerMetrics,
): string {
	const lines: string[] = [
		`Beat agent metrics — ${metrics.beatId} — ${metrics.generatedAt}`,
		"=".repeat(60),
	];

	if (metrics.ingestion) {
		const m = metrics.ingestion;
		lines.push(
			"",
			"INGESTION",
			`  Sources fetched: ${m.fetchedSourceCount}  skipped: ${m.skippedSourceCount}`,
		);
		for (const [reason, count] of Object.entries(m.skippedByReason)) {
			lines.push(`    ${reason}: ${count}`);
		}
		lines.push(
			`  New items: ${m.newItemCount}  duplicates: ${m.duplicateItemCount}`,
		);
		if (m.anomalyCount > 0) {
			lines.push(
				`  ANOMALIES DETECTED: ${m.anomalyCount} (check ingestion logs)`,
			);
		}
	}

	if (metrics.memory) {
		const m = metrics.memory;
		lines.push(
			"",
			"MEMORY",
			`  Observations: ${m.totalObservations} (${m.itemObservationCount} raw, ${m.summaryObservationCount} compacted)`,
			`  Stale (>= ${metrics.memory ? "14" : "?"}d): ${m.staleObservationCount}`,
		);
		if (m.oldestObservationAt) {
			lines.push(
				`  Range: ${m.oldestObservationAt} → ${m.newestObservationAt}`,
			);
		}
	}

	if (metrics.extraction) {
		const m = metrics.extraction;
		lines.push(
			"",
			"EXTRACTION",
			`  Items processed: ${m.processedItemCount}  new observations: ${m.newObservationCount}  duplicates: ${m.duplicateObservationCount}  failed: ${m.failedItemCount}`,
		);
	}

	if (metrics.compaction) {
		const m = metrics.compaction;
		lines.push(
			"",
			"COMPACTION",
			`  Observations compacted: ${m.compactedObservationCount}  summaries created: ${m.createdSummaryCount}`,
		);
	}

	if (metrics.evaluation) {
		const m = metrics.evaluation;
		lines.push(
			"",
			"EVALUATIONS",
			`  Total: ${m.totalDecisions}  positive: ${m.positiveCount}  negative: ${m.negativeCount}  abstain: ${m.abstainCount} (${pct(m.abstentionRate)})`,
			`  Publications: ${m.publicationCount}`,
		);
		if (m.topAbstainReasons.length > 0) {
			lines.push("  Abstain reasons:");
			for (const { reason, count } of m.topAbstainReasons) {
				lines.push(`    ${reason}: ${count}`);
			}
		}
		if (m.period.start) {
			lines.push(`  Period: ${m.period.start} → ${m.period.end}`);
		}
	}

	if (metrics.finder) {
		const m = metrics.finder;
		lines.push(
			"",
			"FINDER",
			`  Scanned: ${m.scannedItemCount}  already processed: ${m.skippedAlreadyProcessedCount}`,
			`  Submitted: ${m.submittedCount}  not promising: ${m.notPromisingCount}  failed: ${m.failedCount}`,
		);
	}

	lines.push("");
	return lines.join("\n");
}

export function appendMetricsToJsonl(filePath: string) {
	return async (metrics: BeatAgentWorkerMetrics): Promise<void> => {
		await mkdir(dirname(filePath), { recursive: true });
		await appendFile(filePath, `${JSON.stringify(metrics)}\n`, "utf-8");
	};
}

export async function loadMetricsHistory(
	filePath: string,
): Promise<BeatAgentWorkerMetrics[]> {
	let raw: string;
	try {
		raw = await readFile(filePath, "utf-8");
	} catch {
		return [];
	}
	const metrics: BeatAgentWorkerMetrics[] = [];
	for (const [index, line] of raw.split("\n").entries()) {
		if (!line.trim()) continue;
		try {
			metrics.push(JSON.parse(line) as BeatAgentWorkerMetrics);
		} catch (error) {
			throw new Error(
				`Invalid beat-agent metrics JSONL at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	return metrics;
}
