import assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
	createScoredTextCandidateSelector,
	createScoredTextEvaluationCandidateSelector,
	scoreTextCandidate,
} from "../src/contentScoring.js";

describe("scoreTextCandidate", () => {
	it("accepts substantive text", () => {
		const score = scoreTextCandidate(
			"A thoughtful and substantive post about policy.",
		);
		assert.equal(score.promising, true);
		assert.match(score.reason, /substantive content/);
	});

	it("rejects empty or mostly noisy social text", () => {
		assert.equal(scoreTextCandidate("").promising, false);
		const score = scoreTextCandidate("@alice @bob #politics");
		assert.equal(score.promising, false);
		assert.match(score.reason, /substantive/);
	});

	it("applies optional keyword gating", () => {
		const miss = scoreTextCandidate(
			"A substantive post about healthcare policy and costs.",
			{ keywords: ["immigration", "border"] },
		);
		assert.equal(miss.promising, false);
		assert.match(miss.reason, /0 of 2 keywords/);

		const hit = scoreTextCandidate(
			"A substantive post about immigration and border policy.",
			{ keywords: ["immigration", "border"], minKeywordMatches: 2 },
		);
		assert.equal(hit.promising, true);
	});

	it("honors basic quality thresholds", () => {
		assert.equal(
			scoreTextCandidate("https://a.example https://b.example real words")
				.promising,
			false,
		);
		assert.equal(
			scoreTextCandidate("THIS IS A COMPLETELY OUTRAGEOUS POLICY DECISION")
				.promising,
			false,
		);
		assert.equal(
			scoreTextCandidate("Good point here.", { minSubstantiveLength: 5 })
				.promising,
			true,
		);
	});
});

describe("createScoredTextEvaluationCandidateSelector", () => {
	interface Item {
		id: string;
		text: string;
		url?: string;
	}

	it("builds a canonical-id request with contentUrl when available", async () => {
		const selector = createScoredTextEvaluationCandidateSelector<
			Item,
			{
				contentCanonicalId: string;
				statementCid: string;
				contentUrl?: string;
				contentText?: string;
			}
		>({
			getText: (item) => item.text,
			getContentCanonicalId: (item) => item.id,
			getContentUrl: (item) => item.url,
			getStatementCid: () => "bafystatement",
		});

		const candidate = await selector({
			item: {
				id: "twitter:tweet:1",
				text: "A substantive post about immigration policy reform.",
				url: "https://x.example/1",
			},
		});

		assert.ok(candidate);
		assert.deepEqual(candidate.request, {
			contentCanonicalId: "twitter:tweet:1",
			statementCid: "bafystatement",
			contentUrl: "https://x.example/1",
		});
		assert.match(candidate.reason, /substantive content/);
	});

	it("falls back to trimmed contentText when no contentUrl is available", async () => {
		const selector = createScoredTextEvaluationCandidateSelector<
			Item,
			{
				contentCanonicalId: string;
				statementCid: string;
				contentUrl?: string;
				contentText?: string;
			}
		>({
			getText: (item) => item.text,
			getContentCanonicalId: (item) => item.id,
			getStatementCid: () => "bafystatement",
		});

		const candidate = await selector({
			item: {
				id: "twitter:tweet:2",
				text: "  A substantive post about healthcare policy reform.  ",
			},
		});

		assert.ok(candidate);
		assert.deepEqual(candidate.request, {
			contentCanonicalId: "twitter:tweet:2",
			statementCid: "bafystatement",
			contentText: "A substantive post about healthcare policy reform.",
		});
	});

	it("returns null for items that fail text scoring", async () => {
		const selector = createScoredTextEvaluationCandidateSelector<
			Item,
			{ contentCanonicalId: string; statementCid: string }
		>({
			getText: (item) => item.text,
			getContentCanonicalId: (item) => item.id,
			getStatementCid: () => "bafystatement",
		});

		assert.equal(
			await selector({ item: { id: "twitter:tweet:3", text: "" } }),
			null,
		);
	});
});

describe("createScoredTextCandidateSelector", () => {
	it("adapts generic text scoring into typed candidates", () => {
		const selector = createScoredTextCandidateSelector<
			{ id: string; text: string },
			{ id: string; reason: string; body: string }
		>({
			getText: (item) => item.text,
			buildCandidate: ({ item, score, text }) => ({
				id: item.id,
				reason: score.reason,
				body: text.trim(),
			}),
		});

		assert.equal(selector({ item: { id: "empty", text: " " } }), null);
		assert.deepEqual(
			selector({
				item: { id: "post-1", text: " A thoughtful policy post. " },
			}),
			{
				id: "post-1",
				reason: "substantive content (4 words, 25 chars)",
				body: "A thoughtful policy post.",
			},
		);
	});
});
