import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	createScoredBeatFinderCandidateSelector,
	loadBeatFinderState,
	runBeatFinderOnce,
	saveBeatFinderState,
	scoreBeatFinderItem,
} from "../src/index.js";
import {
	saveBeatIngestionState,
	type BeatIngestionState,
} from "@commonality/beat-memory";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
	const dir = await mkdtemp(join(tmpdir(), "beat-agent-finder-"));
	try {
		return await fn(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

function response(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: { "content-type": "application/json" },
	});
}

describe("beat finder", () => {
	it("submits promising unprocessed ingested items and records attester responses", async () => {
		await withTempDir(async (dir) => {
			const ingestionStateFilePath = join(dir, "ingestion.json");
			const finderStateFilePath = join(dir, "finder.json");
			const ingestionState: BeatIngestionState = {
				schemaVersion: 1,
				sourceCursors: {},
				items: [
					{
						contentCanonicalId: "twitter:tweet:1",
						sourceId: "account:moderate",
						platform: "twitter",
						contentUrl: "https://x.example/1",
						text: "A thoughtful bridge-building post.",
						observedAt: "2026-05-15T10:00:00.000Z",
						ingestedAt: "2026-05-15T10:01:00.000Z",
					},
					{
						contentCanonicalId: "twitter:tweet:2",
						sourceId: "account:moderate",
						platform: "twitter",
						text: "   ",
						observedAt: "2026-05-15T10:02:00.000Z",
						ingestedAt: "2026-05-15T10:03:00.000Z",
					},
				],
			};
			await saveBeatIngestionState(ingestionStateFilePath, ingestionState);

			const submittedBodies: unknown[] = [];
			const submittedFinderKeys: (string | null)[] = [];
			const fetchImpl: typeof fetch = async (
				_input: RequestInfo | URL,
				init?: RequestInit,
			) => {
				try {
					submittedBodies.push(JSON.parse(init?.body as string));
				} catch (error) {
					throw new Error(
						`Invalid finder request JSON: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
				const headers = new Headers(init?.headers);
				submittedFinderKeys.push(headers.get("x-finder-key"));
				return response({
					alreadyAttested: false,
					decision: "positive",
					confidence: "high",
					reasoning: "Looks aligned.",
					subjectId: "0xsubject",
					explanationCid: "bafyexplanation",
					transactionHash: "0xtx",
					processingTime: 123,
				});
			};

			const summary = await runBeatFinderOnce({
				ingestionStateFilePath,
				finderStateFilePath,
				targetStatementCid: "bafystatement",
				attesterEndpoint: "https://beat.example/evaluate-content",
				trustedFinderKey: "shared-secret",
				fetchImpl,
				now: new Date("2026-05-15T12:00:00.000Z"),
			});

			assert.deepEqual(summary, {
				scannedItemCount: 2,
				skippedAlreadyProcessedCount: 0,
				notPromisingCount: 1,
				submittedCount: 1,
				failedCandidateIds: [],
			});
			assert.deepEqual(submittedBodies, [
				{
					contentCanonicalId: "twitter:tweet:1",
					statementCid: "bafystatement",
					contentUrl: "https://x.example/1",
				},
			]);
			assert.deepEqual(submittedFinderKeys, ["shared-secret"]);

			const state = await loadBeatFinderState(finderStateFilePath);
			assert.equal(
				state.processedItems["twitter:tweet:1"]?.status,
				"submitted",
			);
			assert.equal(
				state.processedItems["twitter:tweet:1"]?.decision,
				"positive",
			);
			assert.equal(
				state.processedItems["twitter:tweet:1"]?.transactionHash,
				"0xtx",
			);
			assert.equal(
				state.processedItems["twitter:tweet:2"]?.status,
				"not_promising",
			);
		});
	});

	it("skips processed items and leaves failed submissions unprocessed for retry", async () => {
		await withTempDir(async (dir) => {
			const ingestionStateFilePath = join(dir, "ingestion.json");
			const finderStateFilePath = join(dir, "finder.json");
			await saveBeatIngestionState(ingestionStateFilePath, {
				schemaVersion: 1,
				sourceCursors: {},
				items: [
					{
						contentCanonicalId: "already-done",
						sourceId: "rss:local",
						text: "A substantive post that has already been processed and recorded.",
						observedAt: "2026-05-15T10:00:00.000Z",
						ingestedAt: "2026-05-15T10:01:00.000Z",
					},
					{
						contentCanonicalId: "will-fail",
						sourceId: "rss:local",
						text: "A substantive candidate post that should be submitted for evaluation.",
						observedAt: "2026-05-15T10:02:00.000Z",
						ingestedAt: "2026-05-15T10:03:00.000Z",
					},
				],
			});
			await saveBeatFinderState(finderStateFilePath, {
				schemaVersion: 1,
				processedItems: {
					"already-done": {
						processedAt: "2026-05-15T11:00:00.000Z",
						status: "submitted",
						decision: "positive",
						confidence: "high",
					},
				},
			});

			const firstSummary = await runBeatFinderOnce({
				ingestionStateFilePath,
				finderStateFilePath,
				targetStatementCid: "bafystatement",
				attesterEndpoint: "https://beat.example/evaluate-content",
				fetchImpl: async () => response({ error: "bad" }, { status: 500 }),
			});
			assert.equal(firstSummary.skippedAlreadyProcessedCount, 1);
			assert.deepEqual(firstSummary.failedCandidateIds, ["will-fail"]);

			const secondSummary = await runBeatFinderOnce({
				ingestionStateFilePath,
				finderStateFilePath,
				targetStatementCid: "bafystatement",
				attesterEndpoint: "https://beat.example/evaluate-content",
				fetchImpl: async () =>
					response({
						alreadyAttested: false,
						decision: "negative",
						confidence: "medium",
						reasoning: "Not aligned.",
						subjectId: "0xsubject",
						explanationCid: null,
						transactionHash: null,
						processingTime: 25,
					}),
				now: new Date("2026-05-15T12:05:00.000Z"),
			});

			assert.equal(secondSummary.skippedAlreadyProcessedCount, 1);
			assert.equal(secondSummary.submittedCount, 1);
			const state = await loadBeatFinderState(finderStateFilePath);
			assert.equal(state.processedItems["will-fail"]?.status, "submitted");
			assert.equal(state.processedItems["will-fail"]?.decision, "negative");
		});
	});
});

function makeItem(
	overrides: Partial<{ text: string; contentUrl: string }> = {},
) {
	return {
		contentCanonicalId: "twitter:tweet:1",
		sourceId: "account:moderate",
		platform: "twitter" as const,
		text: overrides.text ?? "A thoughtful and substantive post about policy.",
		observedAt: "2026-05-15T10:00:00.000Z",
		ingestedAt: "2026-05-15T10:01:00.000Z",
		...(overrides.contentUrl !== undefined
			? { contentUrl: overrides.contentUrl }
			: {}),
	};
}

describe("scoreBeatFinderItem", () => {
	it("accepts a normal substantive post", () => {
		const score = scoreBeatFinderItem(makeItem());
		assert.equal(score.promising, true);
	});

	it("rejects empty text", () => {
		const score = scoreBeatFinderItem(makeItem({ text: "" }));
		assert.equal(score.promising, false);
		assert.match(score.reason, /empty/);
	});

	it("rejects whitespace-only text", () => {
		const score = scoreBeatFinderItem(makeItem({ text: "   \n\t  " }));
		assert.equal(score.promising, false);
		assert.match(score.reason, /empty/);
	});

	it("rejects text with excessive URL density", () => {
		const score = scoreBeatFinderItem(
			makeItem({
				text: "https://example.com https://example.com/b https://example.com/c real word",
			}),
		);
		assert.equal(score.promising, false);
		assert.match(score.reason, /URL density/);
	});

	it("rejects text whose substantive content is too short after stripping noise", () => {
		const score = scoreBeatFinderItem(
			makeItem({ text: "@alice @bob @carol #politics" }),
		);
		assert.equal(score.promising, false);
		assert.match(score.reason, /substantive/);
	});

	it("rejects text with too few substantive words", () => {
		// 'phenomenologically correct' has 24 substantive chars but only 2 words
		const score = scoreBeatFinderItem(
			makeItem({ text: "phenomenologically correct" }),
		);
		assert.equal(score.promising, false);
		assert.match(score.reason, /substantive words/);
	});

	it("rejects excessively all-caps text", () => {
		const score = scoreBeatFinderItem(
			makeItem({
				text: "THIS IS A COMPLETELY OUTRAGEOUS AND WRONG POLICY DECISION",
			}),
		);
		assert.equal(score.promising, false);
		assert.match(score.reason, /all-caps/);
	});

	it("accepts all-caps within threshold", () => {
		const score = scoreBeatFinderItem(
			makeItem({ text: "The NATO summit confirmed a new agreement today." }),
		);
		assert.equal(score.promising, true);
	});

	it("respects custom minSubstantiveLength", () => {
		const item = makeItem({ text: "Good point here." });
		const strict = scoreBeatFinderItem(item, { minSubstantiveLength: 50 });
		assert.equal(strict.promising, false);
		const lenient = scoreBeatFinderItem(item, { minSubstantiveLength: 5 });
		assert.equal(lenient.promising, true);
	});

	it("respects custom maxAllCapsRatio", () => {
		const item = makeItem({ text: "NATO IS GOOD for stability" });
		const strict = scoreBeatFinderItem(item, { maxAllCapsRatio: 0.3 });
		assert.equal(strict.promising, false);
		const lenient = scoreBeatFinderItem(item, { maxAllCapsRatio: 0.9 });
		assert.equal(lenient.promising, true);
	});
});

describe("createScoredBeatFinderCandidateSelector", () => {
	const statementCid = "bafystatement" as const;

	it("returns a candidate with contentUrl when available", async () => {
		const selector = createScoredBeatFinderCandidateSelector();
		const item = makeItem({ contentUrl: "https://x.example/1" });
		const candidate = await selector({
			item,
			targetStatementCid: statementCid,
		});
		assert.ok(candidate);
		assert.equal(candidate.request.contentUrl, "https://x.example/1");
		assert.equal(candidate.request.contentText, undefined);
	});

	it("falls back to contentText when no contentUrl", async () => {
		const selector = createScoredBeatFinderCandidateSelector();
		const item = makeItem();
		const candidate = await selector({
			item,
			targetStatementCid: statementCid,
		});
		assert.ok(candidate);
		assert.equal(candidate.request.contentText, item.text);
		assert.equal(candidate.request.contentUrl, undefined);
	});

	it("returns null for items that fail scoring", async () => {
		const selector = createScoredBeatFinderCandidateSelector();
		const item = makeItem({ text: "" });
		const candidate = await selector({
			item,
			targetStatementCid: statementCid,
		});
		assert.equal(candidate, null);
	});

	it("records scoring reason in the candidate", async () => {
		const selector = createScoredBeatFinderCandidateSelector();
		const item = makeItem();
		const candidate = await selector({
			item,
			targetStatementCid: statementCid,
		});
		assert.ok(candidate);
		assert.ok(candidate.reason.includes("words"));
	});

	it("accepts a candidate whose text contains a beat keyword", async () => {
		const selector = createScoredBeatFinderCandidateSelector({
			beatKeywords: ["immigration", "border"],
		});
		const item = makeItem({
			text: "A thoughtful post about immigration policy reform.",
		});
		const candidate = await selector({
			item,
			targetStatementCid: statementCid,
		});
		assert.ok(candidate);
	});

	it("rejects a candidate whose text contains no beat keywords", async () => {
		const selector = createScoredBeatFinderCandidateSelector({
			beatKeywords: ["immigration", "border"],
		});
		const item = makeItem({
			text: "A substantive post about healthcare policy and costs.",
		});
		const candidate = await selector({
			item,
			targetStatementCid: statementCid,
		});
		assert.equal(candidate, null);
	});

	it("keyword matching is case-insensitive", async () => {
		const selector = createScoredBeatFinderCandidateSelector({
			beatKeywords: ["Immigration"],
		});
		const item = makeItem({ text: "A post about IMMIGRATION reform." });
		const candidate = await selector({
			item,
			targetStatementCid: statementCid,
		});
		assert.ok(candidate);
	});

	it("respects onBeatMinKeywordMatches threshold", async () => {
		const selector = createScoredBeatFinderCandidateSelector({
			beatKeywords: ["immigration", "border", "asylum"],
			onBeatMinKeywordMatches: 2,
		});
		const oneMatch = makeItem({
			text: "A substantive post about immigration enforcement measures.",
		});
		assert.equal(
			await selector({ item: oneMatch, targetStatementCid: statementCid }),
			null,
		);

		const twoMatches = makeItem({
			text: "A substantive post about immigration and border crossings.",
		});
		assert.ok(
			await selector({ item: twoMatches, targetStatementCid: statementCid }),
		);
	});

	it("passes all items when beatKeywords is empty array", async () => {
		const selector = createScoredBeatFinderCandidateSelector({
			beatKeywords: [],
		});
		const item = makeItem({
			text: "A substantive post with no particular topic.",
		});
		const candidate = await selector({
			item,
			targetStatementCid: statementCid,
		});
		assert.ok(candidate);
	});
});
