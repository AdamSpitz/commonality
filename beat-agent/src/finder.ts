import {
	loadJsonState,
	postJsonCandidate,
	runJsonStateFinderCandidatePass,
	saveJsonState,
	createScoredTextEvaluationCandidateSelector,
	scoreTextCandidate,
	type FinderRunSummary,
	type ScoredTextEvaluationCandidate,
	type TextCandidateScore,
	type TextCandidateScoringConfig,
} from "@commonality/finder-core";
import type { IpfsCidV1 } from "@commonality/sdk/utils";
import type {
	BeatAgentEvaluateResponse,
	BeatAgentEvaluationRequest,
} from "./types.js";
import {
	loadBeatIngestionState,
	type BeatIngestedItem,
} from "@commonality/beat-memory";

export type BeatFinderProcessedStatus =
	| "submitted"
	| "not_promising"
	| "failed";

export interface BeatFinderState {
	schemaVersion: 1;
	processedItems: Record<string, BeatFinderProcessedItem>;
}

export interface BeatFinderProcessedItem {
	processedAt: string;
	status: BeatFinderProcessedStatus;
	retries?: number;
	lastError?: string;
	attesterEndpoint?: string;
	decision?: BeatAgentEvaluateResponse["decision"];
	confidence?: BeatAgentEvaluateResponse["confidence"];
	transactionHash?: string | null;
	explanationCid?: IpfsCidV1 | null;
	reason?: string;
}

export type BeatFinderCandidate = ScoredTextEvaluationCandidate<
	BeatIngestedItem,
	BeatAgentEvaluationRequest
>;

export interface BeatFinderCandidateSelectorParams {
	item: BeatIngestedItem;
	targetStatementCid: IpfsCidV1;
}

export type BeatFinderCandidateSelector = (
	params: BeatFinderCandidateSelectorParams,
) => Promise<BeatFinderCandidate | null> | BeatFinderCandidate | null;

export interface RunBeatFinderOnceParams {
	ingestionStateFilePath: string;
	finderStateFilePath: string;
	targetStatementCid: IpfsCidV1;
	attesterEndpoint: string;
	selectCandidate?: BeatFinderCandidateSelector;
	trustedFinderKey?: string;
	fetchImpl?: typeof fetch;
	maxRetries?: number;
	now?: Date;
}

export type BeatFinderRunSummary = FinderRunSummary;

const emptyState: BeatFinderState = {
	schemaVersion: 1,
	processedItems: {},
};

function parseBeatFinderState(value: unknown): BeatFinderState {
	const parsed = value as Partial<BeatFinderState>;
	return {
		schemaVersion: 1,
		processedItems: parsed.processedItems ?? {},
	};
}

function createEmptyBeatFinderState(): BeatFinderState {
	return { ...emptyState, processedItems: {} };
}

export async function loadBeatFinderState(
	filePath: string,
): Promise<BeatFinderState> {
	return loadJsonState(
		filePath,
		parseBeatFinderState,
		createEmptyBeatFinderState,
	);
}

export async function saveBeatFinderState(
	filePath: string,
	state: BeatFinderState,
): Promise<void> {
	await saveJsonState(filePath, state);
}

export async function runBeatFinderOnce(
	params: RunBeatFinderOnceParams,
): Promise<BeatFinderRunSummary> {
	const ingestionState = await loadBeatIngestionState(
		params.ingestionStateFilePath,
	);
	const fetchImpl = params.fetchImpl ?? fetch;
	const selectCandidate =
		params.selectCandidate ?? defaultBeatFinderCandidateSelector;
	const { summary } = await runJsonStateFinderCandidatePass<
		BeatIngestedItem,
		BeatFinderCandidate,
		BeatFinderProcessedItem,
		BeatFinderState
	>({
		stateFilePath: params.finderStateFilePath,
		items: ingestionState.items,
		parseState: parseBeatFinderState,
		createEmptyState: createEmptyBeatFinderState,
		getItemId: (item) => item.contentCanonicalId,
		selectCandidate: (item) =>
			selectCandidate({ item, targetStatementCid: params.targetStatementCid }),
		submitCandidate: async ({ candidate, nowIso }) => {
			const response = await submitBeatFinderCandidate({
				attesterEndpoint: params.attesterEndpoint,
				candidate,
				trustedFinderKey: params.trustedFinderKey,
				fetchImpl,
			});
			return {
				processedAt: nowIso,
				status: "submitted",
				attesterEndpoint: params.attesterEndpoint,
				decision: response.decision,
				confidence: response.confidence,
				transactionHash: response.transactionHash,
				explanationCid: response.explanationCid,
				reason: candidate.reason,
			};
		},
		buildNotPromisingProcessedItem: ({ nowIso }) => ({
			processedAt: nowIso,
			status: "not_promising",
			reason: "candidate selector returned null",
		}),
		buildFailedProcessedItem: ({ candidate, previous, error, nowIso }) => ({
			processedAt: nowIso,
			status: "failed",
			retries: (previous?.retries ?? 0) + 1,
			lastError: error instanceof Error ? error.message : String(error),
			reason: candidate.reason,
		}),
		maxRetries: params.maxRetries,
		now: params.now,
	});

	return summary;
}

export interface BeatFinderScoringConfig extends TextCandidateScoringConfig {
	beatKeywords?: string[];
	onBeatMinKeywordMatches?: number;
}

export type BeatFinderItemScore = TextCandidateScore;

export function scoreBeatFinderItem(
	item: BeatIngestedItem,
	config: BeatFinderScoringConfig = {},
): BeatFinderItemScore {
	return scoreBeatFinderText(item.text, config);
}

function scoreBeatFinderText(
	text: string,
	config: BeatFinderScoringConfig,
): BeatFinderItemScore {
	return scoreTextCandidate(text, getTextScoringConfig(config));
}

function getTextScoringConfig(
	config: BeatFinderScoringConfig,
): TextCandidateScoringConfig {
	const { beatKeywords, onBeatMinKeywordMatches, ...genericConfig } = config;
	return {
		...genericConfig,
		keywords: beatKeywords ?? genericConfig.keywords,
		minKeywordMatches:
			onBeatMinKeywordMatches ?? genericConfig.minKeywordMatches,
	};
}

export function createScoredBeatFinderCandidateSelector(
	config: BeatFinderScoringConfig = {},
): BeatFinderCandidateSelector {
	const selector = createScoredTextEvaluationCandidateSelector<
		BeatFinderCandidateSelectorParams,
		BeatAgentEvaluationRequest
	>({
		getText: ({ item }) => item.text,
		getContentCanonicalId: ({ item }) => item.contentCanonicalId,
		getContentUrl: ({ item }) => item.contentUrl,
		getStatementCid: ({ item: params }) => params.targetStatementCid,
		config: getTextScoringConfig(config),
	});

	return async (params) => {
		const candidate = await selector({ item: params });
		return candidate ? { ...candidate, item: params.item } : null;
	};
}

export const defaultBeatFinderCandidateSelector: BeatFinderCandidateSelector =
	createScoredBeatFinderCandidateSelector();

async function submitBeatFinderCandidate(params: {
	attesterEndpoint: string;
	candidate: BeatFinderCandidate;
	trustedFinderKey?: string;
	fetchImpl: typeof fetch;
}): Promise<BeatAgentEvaluateResponse> {
	return postJsonCandidate<
		BeatAgentEvaluationRequest,
		BeatAgentEvaluateResponse
	>({
		endpointUrl: params.attesterEndpoint,
		body: params.candidate.request,
		headers: params.trustedFinderKey
			? { "x-finder-key": params.trustedFinderKey }
			: undefined,
		fetchImpl: params.fetchImpl,
	});
}
