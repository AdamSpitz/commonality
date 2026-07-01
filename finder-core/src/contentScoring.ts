export interface TextCandidateScoringConfig {
	minSubstantiveLength?: number;
	minSubstantiveWords?: number;
	maxUrlDensity?: number;
	maxAllCapsRatio?: number;
	keywords?: string[];
	minKeywordMatches?: number;
}

export interface TextCandidateScore {
	promising: boolean;
	reason: string;
}

export function stripSocialTextNoise(text: string): string {
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

export function scoreTextCandidate(
	textInput: string,
	config: TextCandidateScoringConfig = {},
): TextCandidateScore {
	const {
		minSubstantiveLength = 15,
		minSubstantiveWords = 3,
		maxUrlDensity = 0.5,
		maxAllCapsRatio = 0.8,
		keywords,
		minKeywordMatches = 1,
	} = config;

	const text = textInput.trim();
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

	const substantive = stripSocialTextNoise(text);
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

	if (keywords && keywords.length > 0) {
		const matches = countKeywordMatches(text, keywords);
		if (matches < minKeywordMatches) {
			return {
				promising: false,
				reason: `off beat (${matches} of ${keywords.length} keywords matched; need ${minKeywordMatches})`,
			};
		}
	}

	return {
		promising: true,
		reason: `substantive content (${substantiveWords.length} words, ${substantive.length} chars)`,
	};
}
