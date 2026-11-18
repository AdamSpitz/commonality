import { pathToFileURL } from "node:url";
import type { IpfsCidV1 } from "@commonality/sdk/utils";
import {
	createBeatAgentServiceApp,
	defaultUploadExplanation,
	appendEvaluationLogToJsonl,
	findExistingAttestationFromJsonl,
} from "./app.js";
import {
	createScoredBeatFinderCandidateSelector,
	runBeatFinderOnce,
} from "./finder.js";
import {
	generateBeatAgentWorkerMetrics,
	formatBeatAgentWorkerMetricsReport,
	appendMetricsToJsonl,
} from "./metrics.js";
import {
	checkBeatAgentBalance,
	publishBeatAgentAttestation,
	getBeatAgentBlockchainClients,
	findExistingBeatAgentAttestationOnChain,
} from "./blockchain.js";
import {
	loadConfig,
	getIpfsConfig,
	getPaymentConfig,
	type BeatAgentConfig,
} from "./config.js";
import { resolveBeatAgentContentForRequest } from "./content.js";
import { buildBeatAgentEvaluationContext } from "./context.js";
import { readFileSync } from "node:fs";
import { evaluateContentWithLLM } from "@commonality/content-attester";
import { evaluateBeatContentWithLLM } from "./evaluator.js";
import {
	applyScorerPlan,
	type BeatAgentScorerPlan,
} from "./scorerPlan.js";

export type {
	BeatAgentAppConfig,
	BeatAgentAppDependencies,
} from "./app.js";

export type {
	BeatAgentAttesterModeConfig,
	BeatAgentContentSource,
	ProcessBeatAgentEvaluationDependencies,
	ProcessBeatAgentEvaluationResult,
} from "./attester.js";

export type {
	BeatAgentBlockchainConfig,
	HasBeatAgentAttestationParams,
} from "./blockchain.js";

export type { BeatAgentConfig } from "./config.js";

export type { BeatAgentExistingAttestation } from "./types.js";

export type { BuildBeatAgentEvaluationContextParams } from "./context.js";

export type {
	BeatAgentContentResolutionOptions,
	PlatformLocalContextResponse,
} from "./content.js";

export type {
	EvaluateBeatContentWithLlmParams,
	BeatRequestJsonCompletionFn,
} from "./evaluator.js";

export type {
	BeatFinderCandidate,
	BeatFinderCandidateSelector,
	BeatFinderCandidateSelectorParams,
	BeatFinderItemScore,
	BeatFinderProcessedItem,
	BeatFinderProcessedStatus,
	BeatFinderRunSummary,
	BeatFinderScoringConfig,
	BeatFinderState,
	RunBeatFinderOnceParams,
} from "./finder.js";

export type {
	BeatAgentAbstainReason,
	BeatAgentAmbientContextCitation,
	BeatAgentConfidence,
	BeatAgentDecision,
	BeatAgentEvaluateResponse,
	BeatAgentEvaluationContext,
	BeatAgentEvaluationLogEntry,
	BeatAgentEvaluationRequest,
	BeatAgentEvaluationResult,
	BeatAgentExplanationDocument,
	BeatAgentLocalContextCitation,
	CreateBeatAgentEvaluationLogEntryParams,
	CreateBeatAgentExplanationDocumentParams,
} from "./types.js";

export {
	appendEvaluationLogToJsonl,
	createBeatAgentServiceApp,
	defaultUploadExplanation,
	findExistingAttestationFromJsonl,
	listEvaluationLogEntries,
} from "./app.js";

export { applyScorerPlan, selectScorerPlanRule } from "./scorerPlan.js";
export type {
	BeatAgentScorerPlan,
	BeatAgentScorerPlanRule,
	BeatAgentScorerDefinition,
} from "./scorerPlan.js";

export {
	processBeatAgentEvaluation,
	validateBeatAgentEvaluationRequest,
} from "./attester.js";

export {
	checkBeatAgentBalance,
	findExistingBeatAgentAttestationOnChain,
	getBeatAgentBlockchainClients,
	getSubjectIdForContentCanonicalId,
	hasBeatAgentAttestation,
	publishBeatAgentAttestation,
} from "./blockchain.js";

export {
	getIpfsConfig,
	getPaymentConfig,
	loadConfig,
	loadConfigFromEnv,
} from "./config.js";

export {
	extractTextFromStructuredContent,
	extractCanonicalIdFromStructuredContent,
	fetchPlatformLocalContextForBeatAgent,
	fetchUrlContentForBeatAgent,
	resolveBeatAgentContent,
	resolveBeatAgentContentForRequest,
	stripHtmlToText,
} from "./content.js";

export { buildBeatAgentEvaluationContext } from "./context.js";

export {
	buildBeatAgentPrompt,
	evaluateBeatContentWithLLM,
	normalizeBeatAgentEvaluationResult,
} from "./evaluator.js";

export {
	createScoredBeatFinderCandidateSelector,
	defaultBeatFinderCandidateSelector,
	loadBeatFinderState,
	runBeatFinderOnce,
	saveBeatFinderState,
	scoreBeatFinderItem,
} from "./finder.js";

export {
	createBeatAgentEvaluationLogEntry,
	createBeatAgentExplanationDocument,
	shouldPublishBeatAgentAttestation,
	validateBeatAgentEvaluationResult,
} from "./types.js";

export type {
	CoverageGapByReason,
	CoverageGapCount,
	CoverageGapSummary,
	MineCoverageGapsParams,
	PlatformGap,
} from "./coverage.js";

export {
	mineCoverageGaps,
	mineCoverageGapsFromFile,
} from "./coverage.js";

export type {
	BeatAgentCompactionMetrics,
	BeatAgentEvaluationMetrics,
	BeatAgentExtractionMetrics,
	BeatAgentFinderMetrics,
	BeatAgentIngestionMetrics,
	BeatAgentMemoryMetrics,
	BeatAgentWorkerMetrics,
	GenerateBeatAgentWorkerMetricsParams,
} from "./metrics.js";

export {
	appendMetricsToJsonl,
	formatBeatAgentWorkerMetricsReport,
	generateBeatAgentWorkerMetrics,
	loadMetricsHistory,
} from "./metrics.js";

export interface BeatAgentRunHandle {
	stop: () => Promise<void>;
}

function loadScorerPlan(filePath: string | undefined): BeatAgentScorerPlan | null {
	if (!filePath) return null;
	return JSON.parse(readFileSync(filePath, "utf-8")) as BeatAgentScorerPlan;
}

async function evaluateWithOptionalScorerPlan(
	config: BeatAgentConfig,
	request: import("./types.js").BeatAgentEvaluationRequest,
	content: string,
	context: import("./types.js").BeatAgentEvaluationContext,
) {
	const beatResult = await evaluateBeatContentWithLLM({
		beatId: config.beatId,
		attesterName: config.attesterName,
		content,
		request,
		context,
		apiKey: config.openRouterApiKey,
		model: config.openRouterModel,
		promptTemplate: config.promptTemplate,
		maxUntrustedChars: config.maxUntrustedChars,
	});
	const plan = loadScorerPlan(config.scorerPlanFilePath);
	if (!plan) return beatResult;
	return applyScorerPlan({
		plan,
		beatResult,
		evaluateScorer: async (scorer) => {
			const result = await evaluateContentWithLLM({
				content: request.quotedContent?.length
					? `Author post:\n${content}\n\nQuoted posts (context only; evaluate the author's use of these quotes):\n${request.quotedContent.map((quote) => quote.text).join("\n\n")}`
					: content,
				declaredPerspective: request.declaredPerspective,
				apiKey: config.openRouterApiKey,
				model: config.openRouterModel,
				promptTemplate: scorer.promptTemplate,
				attesterName: `${config.attesterName}:${scorer.id}`,
			});
			return {
				decision: result.decision,
				confidence: result.confidence,
				reasoning: result.reasoning,
			};
		},
	});
}

export function createBeatAgentApp(config: BeatAgentConfig = loadConfig()) {
	const findExistingAttestationInJsonl = config.evaluationLogFilePath
		? findExistingAttestationFromJsonl(config.evaluationLogFilePath)
		: undefined;
	const findExistingAttestationOnChain =
		findExistingBeatAgentAttestationOnChain(
			config,
			config.alignmentTopicStatementCid,
		);

	async function findExistingAttestation(
		contentCanonicalId: string,
		statementCid: IpfsCidV1,
		scope?: { evaluationVersionId?: string; contentVersion?: string },
	) {
		const localMatch = await findExistingAttestationInJsonl?.(
			contentCanonicalId,
			statementCid,
			scope,
		);
		if (localMatch) {
			return localMatch;
		}
		// A chain attestation is historical evidence, not a pass for the current evaluation version or content version.
		if (scope?.evaluationVersionId || scope?.contentVersion) {
			return null;
		}
		return findExistingAttestationOnChain(contentCanonicalId, statementCid);
	}

	async function getCurrentGasPrice() {
		try {
			const { testClients } = getBeatAgentBlockchainClients(config);
			const gasPrice = await testClients.publicClient.getGasPrice();
			return (
				(gasPrice * BigInt(Math.floor(config.gasPriceMultiplier * 100))) / 100n
			);
		} catch {
			return BigInt(20_000_000_000);
		}
	}

	return createBeatAgentServiceApp({
		getConfig: () => ({
			...config,
			capabilities: [...config.capabilities],
		}),
		getCurrentGasPrice,
		getPaymentConfig: () => getPaymentConfig(config),
		getIpfsConfig: () => getIpfsConfig(config),
		checkAttesterBalance: () => checkBeatAgentBalance(config),
		resolveContent: (request, ipfsConfig) =>
			resolveBeatAgentContentForRequest(request, ipfsConfig, {
				platformApiUrl: config.platformApiUrl,
			}),
		buildEvaluationContext: (request, content) =>
			buildBeatAgentEvaluationContext({
				beatId: config.beatId,
				contentCanonicalId: request.contentCanonicalId,
				contentText: content,
				contentUrl: request.contentUrl,
				memoryFilePath: config.memoryFilePath,
				platformApiUrl: config.platformApiUrl,
				diversityOptions: {
					minAuthorsForFullWeight: config.minAuthorsForFullWeight,
					minHoursForFullWeight: config.minHoursForFullWeight,
					neutralFloor: config.diversityNeutralFloor,
				},
				purposes: ["civility_context", "general_beat_context"],
			}),
		evaluateContent: ({ request, content, context }) =>
			evaluateWithOptionalScorerPlan(config, request, content, context),
		uploadExplanation: defaultUploadExplanation,
		publishAttestation: (contentCanonicalId, statementCid, topicStatementCid) =>
			publishBeatAgentAttestation(
				config,
				contentCanonicalId,
				statementCid,
				topicStatementCid,
			),
		appendEvaluationLog: config.evaluationLogFilePath
			? appendEvaluationLogToJsonl(config.evaluationLogFilePath)
			: undefined,
		findExistingAttestation,
		queryBeatContext: config.memoryFilePath
			? async ({ topic }) => {
					const context = await buildBeatAgentEvaluationContext({
						beatId: config.beatId,
						contentCanonicalId: `context-query:${topic}`,
						contentText: topic,
						memoryFilePath: config.memoryFilePath,
						diversityOptions: {
							minAuthorsForFullWeight: config.minAuthorsForFullWeight,
							minHoursForFullWeight: config.minHoursForFullWeight,
							neutralFloor: config.diversityNeutralFloor,
						},
						purposes: ["general_beat_context", "bridge_opportunity_context"],
					});
					return context.ambientContextUsed;
				}
			: undefined,
		version: "0.1.0",
	});
}

export interface BeatAgentWorkerRunSummary {
	finder?: Awaited<ReturnType<typeof runBeatFinderOnce>>;
}

export interface BeatAgentWorkerDependencies {
	now?: () => Date;
	log?: (message: string, metadata?: Record<string, unknown>) => void;
}

export async function runBeatAgentWorkerOnce(
	config: BeatAgentConfig,
	dependencies: BeatAgentWorkerDependencies = {},
): Promise<BeatAgentWorkerRunSummary> {
	const log = dependencies.log ?? (() => undefined);
	const now = dependencies.now?.() ?? new Date();
	const summary: BeatAgentWorkerRunSummary = {};

	if (
		config.finderEnabled &&
		config.ingestionStateFilePath &&
		config.finderStateFilePath &&
		config.finderAttesterUrl
	) {
		summary.finder = await runBeatFinderOnce({
			ingestionStateFilePath: config.ingestionStateFilePath,
			finderStateFilePath: config.finderStateFilePath,
			attesterEndpoint: config.finderAttesterUrl,
			trustedFinderKey: config.trustedFinderKey,
			targetStatementCid: config.alignmentTopicStatementCid,
			selectCandidate: createScoredBeatFinderCandidateSelector({
				beatKeywords: config.beatKeywords,
			}),
		});
		log("Beat-agent finder completed.", { summary: summary.finder });
	}

	try {
		const metrics = generateBeatAgentWorkerMetrics({
			beatId: config.beatId,
			now,
			finderSummary: summary.finder,
		});
		log(formatBeatAgentWorkerMetricsReport(metrics));
		if (config.metricsLogFilePath) {
			await appendMetricsToJsonl(config.metricsLogFilePath)(metrics);
		}
	} catch {
		// Metrics generation is best-effort; never fail the worker.
	}

	return summary;
}

export function run(
	config: BeatAgentConfig = loadConfig(),
): BeatAgentRunHandle {
	let stopped = false;
	let timer: NodeJS.Timeout | undefined;

	const schedule = (delayMs: number) => {
		if (!stopped) {
			timer = setTimeout(() => {
				void tick();
			}, delayMs);
		}
	};

	const tick = async () => {
		try {
			await runBeatAgentWorkerOnce(config, {
				log: (message, metadata) => console.log(message, metadata ?? ""),
			});
		} catch (error) {
			console.error("Beat-agent worker tick failed.", error);
		} finally {
			schedule(config.workerPollIntervalMs);
		}
	};

	schedule(0);

	return {
		stop: async () => {
			stopped = true;
			if (timer) {
				clearTimeout(timer);
			}
		},
	};
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const config = loadConfig();
	const port = parseInt(process.env.PORT || "3000", 10);
	createBeatAgentApp(config).listen(port, () => {
		console.log(`Beat agent ${config.beatId} listening on port ${port}`);
	});
}
