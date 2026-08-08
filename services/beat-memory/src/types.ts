export type BeatMemoryPurpose =
	| "civility_context"
	| "bridge_opportunity_context"
	| "general_beat_context"
	| "source_management";

export type BeatMemoryConfidence = "high" | "medium" | "low";

export const defaultBeatMemoryPurposes: BeatMemoryPurpose[] = [
	"general_beat_context",
];

export function normalizeBeatMemoryPurposes(
	purposes: readonly string[] | undefined,
): BeatMemoryPurpose[] {
	const normalized = (purposes ?? []).filter(
		(purpose): purpose is BeatMemoryPurpose =>
			typeof purpose === "string" && isBeatMemoryPurpose(purpose),
	);
	return normalized.length > 0 ? normalized : [...defaultBeatMemoryPurposes];
}

export function isBeatMemoryPurpose(value: string): value is BeatMemoryPurpose {
	return (
		value === "civility_context" ||
		value === "bridge_opportunity_context" ||
		value === "general_beat_context" ||
		value === "source_management"
	);
}
