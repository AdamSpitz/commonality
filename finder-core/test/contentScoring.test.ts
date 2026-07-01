import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { scoreTextCandidate } from "../src/contentScoring.js";

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
