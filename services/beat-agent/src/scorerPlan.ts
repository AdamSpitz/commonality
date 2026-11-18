import type {
	BeatAgentConfidence,
	BeatAgentDecision,
	BeatAgentEvaluationResult,
	BeatAgentScorerResult,
} from "./types.js";

export interface BeatAgentRawScorerResult {
	decision: boolean;
	confidence: BeatAgentConfidence;
	reasoning: string;
}

export interface BeatAgentScorerDefinition {
	id: string;
	promptTemplate: string;
}

export interface BeatAgentScorerPlanRule {
	whenDecision?: BeatAgentDecision;
	whenSide?: "left" | "right" | "unclear";
	whenSubstantive?: boolean;
	require: string[];
}

/**
 * Which extra scorers run after the beat prompt, and how their results combine.
 * The rule table is deployment config (for example the civility scorer table), not hardcoded policy.
 */
export interface BeatAgentScorerPlan {
	scorers: BeatAgentScorerDefinition[];
	rules: BeatAgentScorerPlanRule[];
	minimumConfidence: BeatAgentConfidence;
}

const confidenceRank: Record<BeatAgentConfidence, number> = {
	low: 0,
	medium: 1,
	high: 2,
};

export function selectScorerPlanRule(
	plan: BeatAgentScorerPlan,
	beatResult: BeatAgentEvaluationResult,
): BeatAgentScorerPlanRule | null {
	const side = beatResult.extensions?.side;
	const substantive = beatResult.extensions?.substantive;
	return (
		plan.rules.find((rule) => {
			if (rule.whenDecision && rule.whenDecision !== beatResult.decision) return false;
			if (rule.whenSide && rule.whenSide !== side) return false;
			if (rule.whenSubstantive !== undefined && rule.whenSubstantive !== substantive) {
				return false;
			}
			return true;
		}) ?? null
	);
}

export async function applyScorerPlan(params: {
	plan: BeatAgentScorerPlan;
	beatResult: BeatAgentEvaluationResult;
	evaluateScorer: (scorer: BeatAgentScorerDefinition) => Promise<BeatAgentRawScorerResult>;
}): Promise<BeatAgentEvaluationResult> {
	if (params.beatResult.decision !== "positive") return params.beatResult;
	const rule = selectScorerPlanRule(params.plan, params.beatResult);
	if (!rule) {
		return {
			...params.beatResult,
			decision: "abstain",
			abstainReason: "other",
			reasoning: `${params.beatResult.reasoning} No scorer-plan rule matched this beat result.`,
		};
	}

	if (rule.require.length === 0) {
		return params.beatResult;
	}

	const scorerResults: BeatAgentScorerResult[] = [];
	for (const id of rule.require) {
		const scorer = params.plan.scorers.find((candidate) => candidate.id === id);
		if (!scorer) {
			throw new Error(`Scorer plan requires unknown scorer: ${id}`);
		}
		const raw = await params.evaluateScorer(scorer);
		if (typeof raw.decision !== "boolean" || !(raw.confidence in confidenceRank) || !raw.reasoning?.trim()) {
			throw new Error(`Scorer ${id} returned a malformed result`);
		}
		scorerResults.push({
			id,
			decision: raw.decision ? "positive" : "negative",
			confidence: raw.confidence,
			reasoning: raw.reasoning,
		});
	}

	const minimum = confidenceRank[params.plan.minimumConfidence];
	if (minimum === undefined) throw new Error("Invalid scorer-plan minimum confidence");
	const failed = scorerResults.filter(
		(result) =>
			result.decision !== "positive" || confidenceRank[result.confidence] < minimum,
	);
	if (failed.length > 0) {
		return {
			...params.beatResult,
			decision: "negative",
			confidence: weakestConfidence(scorerResults),
			reasoning: `Required scorers did not all pass at ${params.plan.minimumConfidence} confidence: ${failed.map((result) => result.id).join(", ")}.`,
			abstainReason: undefined,
			scorerResults,
		};
	}

	return {
		...params.beatResult,
		decision: "positive",
		confidence: weakestConfidence([...scorerResults, { id: "beat", ...params.beatResult }]),
		abstainReason: undefined,
		scorerResults,
	};
}

function weakestConfidence(results: BeatAgentScorerResult[]): BeatAgentConfidence {
	return results.reduce<BeatAgentConfidence>((weakest, result) => {
		return confidenceRank[result.confidence] < confidenceRank[weakest]
			? result.confidence
			: weakest;
	}, "high");
}
