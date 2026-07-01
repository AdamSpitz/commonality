import { loadJsonState, saveJsonState } from "@commonality/finder-core";
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

export interface BeatFinderRunSummary {
	scannedItemCount: number;
	skippedAlreadyProcessedCount: number;
	notPromisingCount: number;
	submittedCount: number;
	failedCandidateIds: string[];
}

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
	const nowIso = (params.now ?? new Date()).toISOString();
	const fetchImpl = params.fetchImpl ?? fetch;
	const selectCandidate =
		params.selectCandidate ?? defaultBeatFinderCandidateSelector;
	const summary: BeatFinderRunSummary = {
		scannedItemCount: 0,
		skippedAlreadyProcessedCount: 0,
		notPromisingCount: 0,
		submittedCount: 0,
		failedCandidateIds: [],
	};

	for (const item of ingestionState.items) {
		summary.scannedItemCount += 1;

		const prev = finderState.processedItems[item.contentCanonicalId];
		if (prev && prev.status !== "failed") {
			summary.skippedAlreadyProcessedCount += 1;
			continue;
		}

		if (prev && prev.status === "failed") {
			const maxRetries = params.maxRetries ?? 3;
			if ((prev.retries ?? 0) >= maxRetries) {
				summary.skippedAlreadyProcessedCount += 1;
				continue;
			}
		}

		const candidate = await selectCandidate({
			item,
			targetStatementCid: params.targetStatementCid,
		});
		if (!candidate) {
			finderState.processedItems[item.contentCanonicalId] = {
				processedAt: nowIso,
				status: "not_promising",
				reason: "candidate selector returned null",
			};
			summary.notPromisingCount += 1;
			continue;
		}

		try {
			const response = await submitBeatFinderCandidate({
				attesterEndpoint: params.attesterEndpoint,
				candidate,
				trustedFinderKey: params.trustedFinderKey,
				fetchImpl,
			});
			finderState.processedItems[item.contentCanonicalId] = {
				processedAt: nowIso,
				status: "submitted",
				attesterEndpoint: params.attesterEndpoint,
				decision: response.decision,
				confidence: response.confidence,
				transactionHash: response.transactionHash,
				explanationCid: response.explanationCid,
				reason: candidate.reason,
			};
			summary.submittedCount += 1;
		} catch (error) {
			finderState.processedItems[item.contentCanonicalId] = {
				processedAt: nowIso,
				status: "failed",
				retries: (prev?.retries ?? 0) + 1,
				lastError: error instanceof Error ? error.message : String(error),
				reason: candidate.reason,
			};
			summary.failedCandidateIds.push(item.contentCanonicalId);
		}
	}

	await saveBeatFinderState(params.finderStateFilePath, finderState);
	return summary;
}

export interface BeatFinderScoringConfig {
	minSubstantiveLength?: number;
	minSubstantiveWords?: number;
	maxUrlDensity?: number;
	maxAllCapsRatio?: number;
	beatKeywords?: string[];
	onBeatMinKeywordMatches?: number;
}

export interface BeatFinderItemScore {
	promising: boolean;
	reason: string;
}

function stripNoise(text: string): string {
	return text
		.replace(/@\w+/g, "")
		.replace(/#\w+/g, "")
		.replace(/https?:\/\/\S+/gi, "")
		.replace(/\s+/g, " ")
		.trim();
}

function urlTokenCount(text: string): number {
	return (text.match(/https?:\/\/\S+/gi) ?? []).length;
}

function spaceTokenCount(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

function countKeywordMatches(text: string, keywords: string[]): number {
	const lower = text.toLowerCase();
	return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

function allCapsLetterRatio(text: string): number {
	const letters = text.replace(/[^a-zA-Z]/g, "");
	if (!letters) return 0;
	return (letters.match(/[A-Z]/g) ?? []).length / letters.length;
}

export function scoreBeatFinderItem(
	item: BeatIngestedItem,
	config: BeatFinderScoringConfig = {},
): BeatFinderItemScore {
	const {
		minSubstantiveLength = 15,
		minSubstantiveWords = 3,
		maxUrlDensity = 0.5,
		maxAllCapsRatio = 0.8,
		beatKeywords,
		onBeatMinKeywordMatches = 1,
	} = config;

	const text = item.text.trim();
	if (!text) {
		return { promising: false, reason: "empty text" };
	}

	const totalTokens = spaceTokenCount(text);
	const urlCount = urlTokenCount(text);
	if (totalTokens > 0 && urlCount / totalTokens > maxUrlDensity) {
		return {
			promising: false,
			reason: `high URL density (${urlCount}/${totalTokens} tokens)`,
		};
	}

	const substantive = stripNoise(text);
	if (substantive.length < minSubstantiveLength) {
		return {
			promising: false,
			reason: `insufficient substantive content (${substantive.length} chars, minimum ${minSubstantiveLength})`,
		};
	}

	const substantiveWords = substantive.split(/\s+/).filter(Boolean);
	if (substantiveWords.length < minSubstantiveWords) {
		return {
			promising: false,
			reason: `too few substantive words (${substantiveWords.length}, minimum ${minSubstantiveWords})`,
		};
	}

	const capsRatio = allCapsLetterRatio(substantive);
	if (capsRatio > maxAllCapsRatio) {
		return {
			promising: false,
			reason: `excessive all-caps (${(capsRatio * 100).toFixed(0)}% of letters)`,
		};
	}

	if (beatKeywords && beatKeywords.length > 0) {
		const matches = countKeywordMatches(text, beatKeywords);
		if (matches < onBeatMinKeywordMatches) {
			return {
				promising: false,
				reason: `off beat (0 of ${beatKeywords.length} keywords matched; need ${onBeatMinKeywordMatches})`,
			};
		}
	}

	return {
		promising: true,
		reason: `substantive content (${substantiveWords.length} words, ${substantive.length} chars)`,
	};
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
