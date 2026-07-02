import assert from "node:assert/strict";
import { describe, it } from "mocha";
import {
	createScoredTextCandidateSelector,
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
