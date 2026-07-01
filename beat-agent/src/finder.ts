import {
	loadJsonState,
	runFinderCandidatePass,
	saveJsonState,
	scoreTextCandidate,
	type FinderRunSummary,
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

export interface BeatFinderCandidate {
	item: BeatIngestedItem;
	request: BeatAgentEvaluationRequest;
	reason: string;
}

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

export async function loadBeatFinderState(
	filePath: string,
): Promise<BeatFinderState> {
	return loadJsonState(
		filePath,
		(value) => {
			const parsed = value as Partial<BeatFinderState>;
			return {
				schemaVersion: 1,
				processedItems: parsed.processedItems ?? {},
			};
		},
		() => ({ ...emptyState, processedItems: {} }),
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
	const finderState = await loadBeatFinderState(params.finderStateFilePath);
	const fetchImpl = params.fetchImpl ?? fetch;
	const selectCandidate =
		params.selectCandidate ?? defaultBeatFinderCandidateSelector;
	const summary = await runFinderCandidatePass({
		items: ingestionState.items,
		processedItems: finderState.processedItems,
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

	await saveBeatFinderState(params.finderStateFilePath, finderState);
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
	const { beatKeywords, onBeatMinKeywordMatches, ...genericConfig } = config;
	return scoreTextCandidate(item.text, {
		...genericConfig,
		keywords: beatKeywords ?? genericConfig.keywords,
		minKeywordMatches: onBeatMinKeywordMatches ?? genericConfig.minKeywordMatches,
	});
}

export function createScoredBeatFinderCandidateSelector(
	config: BeatFinderScoringConfig = {},
): BeatFinderCandidateSelector {
	return (
		params: BeatFinderCandidateSelectorParams,
	): BeatFinderCandidate | null => {
		const score = scoreBeatFinderItem(params.item, config);
		if (!score.promising) return null;

		const text = params.item.text.trim();
		const source: Pick<
			BeatAgentEvaluationRequest,
			"contentUrl" | "contentText"
		> = params.item.contentUrl
			? { contentUrl: params.item.contentUrl }
			: { contentText: text };

		return {
			item: params.item,
			reason: score.reason,
			request: {
				contentCanonicalId: params.item.contentCanonicalId,
				statementCid: params.targetStatementCid,
				...source,
			},
		};
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
	const response = await params.fetchImpl(params.attesterEndpoint, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...(params.trustedFinderKey
				? { "x-finder-key": params.trustedFinderKey }
				: {}),
		},
		body: JSON.stringify(params.candidate.request),
	});

	if (!response.ok) {
		throw new Error(
			`Beat finder candidate submission failed with HTTP ${response.status}`,
		);
	}

	return (await response.json()) as BeatAgentEvaluateResponse;
}
