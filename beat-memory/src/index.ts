import {
	createLlmMemoryCompactor,
	createLlmObservationExtractor,
	createLlmPurposeSummarySnapshotGenerator,
	createLlmSourceManagementReportGenerator,
} from "./extractor.js";
import {
	loadBeatIngestionState,
	runBeatIngestionOnce,
	type BeatIngestionRunSummary,
	type BeatSourceAdapter,
	type BeatSourceType,
} from "./ingestion.js";
import {
	compactBeatMemory,
	extractObservationsFromItems,
	generatePurposeSummarySnapshots,
	generateSourceManagementObservations,
	generateSourceManagementReport,
	loadBeatContextMemoryState,
	type CompactBeatMemorySummary,
	type ExtractObservationsSummary,
	type GeneratePurposeSummarySnapshotsSummary,
	type GenerateSourceManagementObservationsSummary,
	type GenerateSourceManagementReportSummary,
} from "./memory.js";
import { createTallyIndexerBeatSourceAdapter } from "./tallyIndexerAdapter.js";
import { createTwitterBeatSourceAdapters } from "./twitterAdapter.js";
import { createBeatMemoryApp, createJsonFileBeatContextQuery } from "./app.js";
import { loadConfigFromEnv, type BeatMemoryConfig } from "./config.js";

export { createBeatMemoryApp, createJsonFileBeatContextQuery } from "./app.js";
export type {
	BeatMemoryAppDependencies,
	BeatMemoryContextCitation,
} from "./app.js";
export { loadConfigFromEnv, loadConfig } from "./config.js";
export type { BeatMemoryConfig } from "./config.js";
export {
	createLlmMemoryCompactor,
	createLlmObservationExtractor,
	createLlmPurposeSummarySnapshotGenerator,
	createLlmSourceManagementReportGenerator,
} from "./extractor.js";
export type {
	LlmMemoryCompactorConfig,
	LlmObservationExtractorConfig,
	LlmPurposeSummarySnapshotGeneratorConfig,
	LlmSourceManagementReportGeneratorConfig,
} from "./extractor.js";
export {
	detectIngestionAnomalies,
	loadBeatIngestionState,
	runBeatIngestionOnce,
	saveBeatIngestionState,
} from "./ingestion.js";
export type {
	BeatDefinition,
	BeatIngestedItem,
	BeatIngestionAnomaly,
	BeatIngestionAnomalyOptions,
	BeatIngestionRunSummary,
	BeatIngestionSkippedSource,
	BeatIngestionState,
	BeatSource,
	BeatSourceAdapter,
	BeatSourceCursor,
	BeatSourceFetchResult,
	BeatSourceType,
	RunBeatIngestionOnceParams,
} from "./ingestion.js";
export {
	calculateObservationDiversityMultiplier,
	compactBeatMemory,
	detectContestedObservations,
	extractObservationsFromItems,
	generatePurposeSummarySnapshots,
	generateSourceManagementObservations,
	generateSourceManagementReport,
	getObservationStaleDays,
	getObservationTimeSpanHours,
	loadBeatContextMemoryState,
	retrieveRelevantObservations,
	saveBeatContextMemoryState,
} from "./memory.js";
export type {
	BeatContextMemoryState,
	BeatMemoryCompactor,
	BeatMemoryObservation,
	BeatMemoryObservationKind,
	BeatObservationExtractor,
	BeatPurposeSummarySnapshot,
	BeatPurposeSummarySnapshotDraft,
	BeatPurposeSummarySnapshotGenerator,
	BeatPurposeSummarySnapshotGeneratorParams,
	BeatSourceManagementHealthFlags,
	BeatSourceManagementProposedUpdate,
	BeatSourceManagementReport,
	BeatSourceManagementReportDraft,
	BeatSourceManagementReportGenerator,
	BeatSourceManagementReportGeneratorParams,
	BeatSourceManagementActionType,
	CompactBeatMemoryParams,
	CompactBeatMemorySummary,
	ContestedObservationGroup,
	ExtractionRetryOptions,
	ExtractObservationsFailedItem,
	ExtractedBeatObservation,
	ExtractObservationsFromItemsParams,
	ExtractObservationsSummary,
	GeneratePurposeSummarySnapshotsParams,
	GeneratePurposeSummarySnapshotsSummary,
	GenerateSourceManagementObservationsParams,
	GenerateSourceManagementObservationsSummary,
	GenerateSourceManagementReportParams,
	GenerateSourceManagementReportSummary,
	ObservationDiversityOptions,
	RetrieveRelevantObservationsParams,
} from "./memory.js";
export {
	wrapUntrusted,
	sanitizeUntrustedKind,
	sanitizeUntrustedText,
} from "./promptSafety.js";
export {
	extractTextFromStructuredContent,
	stripHtmlToText,
} from "./structuredContent.js";
export {
	createTallyIndexerBeatSourceAdapter,
	TallyIndexerBeatSourceAdapter,
} from "./tallyIndexerAdapter.js";
export {
	createTwitterBeatSourceAdapters,
	TwitterBeatSourceClient,
} from "./twitterAdapter.js";
export type { TallyIndexerBeatSourceAdapterConfig } from "./tallyIndexerAdapter.js";
export type { TwitterBeatSourceAdapterConfig } from "./twitterAdapter.js";
export type { BeatMemoryConfidence, BeatMemoryPurpose } from "./types.js";
export {
	defaultBeatMemoryPurposes,
	isBeatMemoryPurpose,
	normalizeBeatMemoryPurposes,
} from "./types.js";

export interface BeatMemoryRunHandle {
	stop: () => Promise<void>;
}

export interface BeatMemoryWorkerRunSummary {
	ingestion?: BeatIngestionRunSummary;
	extraction?: ExtractObservationsSummary;
	compaction?: CompactBeatMemorySummary;
	purposeSummarySnapshots?: GeneratePurposeSummarySnapshotsSummary;
	sourceManagementObservations?: GenerateSourceManagementObservationsSummary;
	sourceManagementReport?: GenerateSourceManagementReportSummary;
}

export interface BeatMemoryWorkerDependencies {
	ingestionAdapters?: Partial<Record<BeatSourceType, BeatSourceAdapter>>;
	now?: () => Date;
	env?: NodeJS.ProcessEnv;
	log?: (message: string, data?: unknown) => void;
}

export async function runBeatMemoryWorkerOnce(
	config: BeatMemoryConfig,
	dependencies: BeatMemoryWorkerDependencies = {},
): Promise<BeatMemoryWorkerRunSummary> {
	const log = dependencies.log ?? (() => undefined);
	const now = dependencies.now?.() ?? new Date();
	const env = dependencies.env ?? process.env;
	const summary: BeatMemoryWorkerRunSummary = {};

	if (!config.beatDefinition || !config.ingestionStateFilePath) {
		log(
			"Beat-memory worker skipped: no beat definition or ingestion state file configured.",
		);
		return summary;
	}

	summary.ingestion = await runBeatIngestionOnce({
		definition: config.beatDefinition,
		stateFilePath: config.ingestionStateFilePath,
		adapters: dependencies.ingestionAdapters ?? {
			...createTwitterBeatSourceAdapters({
				bearerToken: env.X_API_BEARER_TOKEN ?? "",
			}),
			tally_indexer: createTallyIndexerBeatSourceAdapter({
				indexerBaseUrl: env.BEAT_MEMORY_TALLY_INDEXER_URL ?? env.INDEXER_URL,
				ipfsGatewayUrl:
					env.BEAT_MEMORY_IPFS_GATEWAY_URL ?? env.IPFS_GATEWAY_URL,
			}),
		},
		now,
		env,
	});
	log("Beat-memory ingestion completed.", { summary: summary.ingestion });

	if (!config.memoryFilePath) {
		return summary;
	}

	const ingestionState = await loadBeatIngestionState(
		config.ingestionStateFilePath,
	);
	const memoryState = await loadBeatContextMemoryState(config.memoryFilePath);
	const observedContentIds = new Set(
		memoryState.observations.flatMap(
			(observation) => observation.supportingContentIds,
		),
	);
	const itemsNeedingExtraction = ingestionState.items.filter(
		(item) => !observedContentIds.has(item.contentCanonicalId),
	);

	summary.extraction = await extractObservationsFromItems({
		beatId: config.beatDefinition.beatId,
		items: itemsNeedingExtraction,
		purposes: config.beatDefinition.purposes,
		memoryFilePath: config.memoryFilePath,
		extractor:
			config.llmExtractionEnabled && config.openRouterApiKey
				? createLlmObservationExtractor({
						apiKey: config.openRouterApiKey,
						model: config.openRouterModel,
						beatId: config.beatDefinition.beatId,
						purposes: config.beatDefinition.purposes,
						maxUntrustedChars: config.maxUntrustedChars,
					})
				: undefined,
		now,
	});
	log("Beat-memory observation extraction completed.", {
		summary: summary.extraction,
	});

	summary.compaction = await compactBeatMemory({
		beatId: config.beatDefinition.beatId,
		memoryFilePath: config.memoryFilePath,
		olderThan: new Date(now.getTime() - config.memoryCompactionOlderThanMs),
		now,
		minObservationsToCompact: config.memoryCompactionMinObservations,
		compactor:
			config.llmExtractionEnabled && config.openRouterApiKey
				? createLlmMemoryCompactor({
						apiKey: config.openRouterApiKey,
						model: config.openRouterModel,
						beatId: config.beatDefinition.beatId,
						maxObservationChars: config.maxUntrustedChars,
					})
				: undefined,
	});
	log("Beat-memory compaction completed.", { summary: summary.compaction });

	summary.purposeSummarySnapshots = await generatePurposeSummarySnapshots({
		beatId: config.beatDefinition.beatId,
		memoryFilePath: config.memoryFilePath,
		purposes: config.beatDefinition.purposes,
		now,
		recentMetrics: {
			ingestion: summary.ingestion,
			extraction: summary.extraction,
			compaction: summary.compaction,
		},
		snapshotGenerator:
			config.llmExtractionEnabled && config.openRouterApiKey
				? createLlmPurposeSummarySnapshotGenerator({
						apiKey: config.openRouterApiKey,
						model: config.openRouterModel,
						maxObservationChars: config.maxUntrustedChars,
					})
				: undefined,
	});
	log("Beat-memory purpose summary snapshots updated.", {
		summary: summary.purposeSummarySnapshots,
	});

	if (config.beatDefinition.purposes.includes("source_management")) {
		const currentSources = config.beatDefinition.sources.map(
			(source) =>
				`${source.id} (${source.type}${source.platform ? `/${source.platform}` : ""}): ${source.locator}`,
		);
		summary.sourceManagementObservations =
			await generateSourceManagementObservations({
				beatId: config.beatDefinition.beatId,
				memoryFilePath: config.memoryFilePath,
				now,
				currentSources,
			});
		log("Beat-memory source-management observations updated.", {
			summary: summary.sourceManagementObservations,
		});

		summary.sourceManagementReport = await generateSourceManagementReport({
			beatDefinition: config.beatDefinition,
			memoryFilePath: config.memoryFilePath,
			now,
			recentMetrics: {
				ingestion: summary.ingestion,
				extraction: summary.extraction,
				compaction: summary.compaction,
			},
			reportGenerator:
				config.llmExtractionEnabled && config.openRouterApiKey
					? createLlmSourceManagementReportGenerator({
							apiKey: config.openRouterApiKey,
							model: config.openRouterModel,
							maxObservationChars: config.maxUntrustedChars,
						})
					: undefined,
		});
		log("Beat-memory source-management report updated.", {
			summary: summary.sourceManagementReport,
		});
	}

	return summary;
}

export function run(
	config: BeatMemoryConfig = loadConfigFromEnv(),
): BeatMemoryRunHandle {
	let stopped = false;
	let timer: NodeJS.Timeout | undefined;

	const tick = async () => {
		if (stopped) return;
		try {
			await runBeatMemoryWorkerOnce(config, { log: console.log });
		} catch (error) {
			console.error("Beat-memory worker tick failed:", error);
		}
		if (!stopped) timer = setTimeout(tick, config.workerPollIntervalMs);
	};

	void tick();

	return {
		stop: async () => {
			stopped = true;
			if (timer) clearTimeout(timer);
		},
	};
}

export function createApp(config: BeatMemoryConfig = loadConfigFromEnv()) {
	return createBeatMemoryApp({
		getConfig: () => config,
		queryBeatContext: config.memoryFilePath
			? createJsonFileBeatContextQuery({
					beatId: config.beatId,
					memoryFilePath: config.memoryFilePath,
				})
			: undefined,
	});
}

if (
	process.argv[1]?.endsWith("/beat-memory/dist/index.js") ||
	process.argv[1]?.endsWith("/beat-memory/src/index.ts")
) {
	const config = loadConfigFromEnv();
	const port = Number(process.env.PORT ?? 3011);
	createApp(config).listen(port, () => {
		console.log(`Beat memory ${config.beatId} listening on port ${port}`);
	});
	run(config);
}
