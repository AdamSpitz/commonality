import assert from "node:assert/strict";
import { applyScorerPlan, type BeatAgentScorerPlan } from "../src/scorerPlan.js";

const plan: BeatAgentScorerPlan = {
	minimumConfidence: "medium",
	scorers: [
		{ id: "neutral", promptTemplate: "n" },
		{ id: "right-evaluating-left", promptTemplate: "r" },
		{ id: "left-evaluating-right", promptTemplate: "l" },
	],
	rules: [
		{ whenDecision: "positive", whenSide: "left", whenSubstantive: true, require: ["neutral", "right-evaluating-left"] },
		{ whenDecision: "positive", whenSide: "unclear", whenSubstantive: true, require: ["neutral", "right-evaluating-left", "left-evaluating-right"] },
		{ whenDecision: "abstain", require: [] },
	],
};

describe("scorer plan", () => {
	it("preserves a negative beat judgment even with a catch-all scorer rule", async () => {
		const result = await applyScorerPlan({
			plan: { ...plan, rules: [{ require: ["neutral"] }] },
			beatResult: { decision: "negative", confidence: "high", reasoning: "Not substantive" },
			evaluateScorer: async () => { throw new Error("must not run"); },
		});
		assert.equal(result.decision, "negative");
	});

	it("does not upgrade low beat confidence when extra scorers pass", async () => {
		const result = await applyScorerPlan({
			plan: { ...plan, rules: [{ require: ["neutral"] }] },
			beatResult: { decision: "positive", confidence: "low", reasoning: "Uncertain beat" },
			evaluateScorer: async () => ({ decision: true, confidence: "high", reasoning: "Civil" }),
		});
		assert.equal(result.confidence, "low");
	});
	it("runs only the scorers required for the classified side", async () => {
		const called: string[] = [];
		const result = await applyScorerPlan({
			plan,
			beatResult: {
				decision: "positive",
				confidence: "high",
				reasoning: "In beat and substantive.",
				extensions: { side: "left", substantive: true },
			},
			evaluateScorer: async (scorer) => {
				called.push(scorer.id);
				return { decision: true, confidence: "high", reasoning: "ok" };
			},
		});
		assert.deepEqual(called, ["neutral", "right-evaluating-left"]);
		assert.equal(result.decision, "positive");
		assert.equal(result.scorerResults?.length, 2);
	});

	it("does not qualify when a required scorer is only low confidence", async () => {
		const result = await applyScorerPlan({
			plan,
			beatResult: {
				decision: "positive",
				confidence: "high",
				reasoning: "In beat.",
				extensions: { side: "left", substantive: true },
			},
			evaluateScorer: async () => ({ decision: true, confidence: "low", reasoning: "unsure" }),
		});
		assert.equal(result.decision, "negative");
	});

	it("abstains when no rule matches an indeterminate side", async () => {
		const result = await applyScorerPlan({
			plan,
			beatResult: {
				decision: "positive",
				confidence: "high",
				reasoning: "Maybe in beat.",
				extensions: { substantive: true },
			},
			evaluateScorer: async () => {
				throw new Error("should not run");
			},
		});
		assert.equal(result.decision, "abstain");
	});
});
