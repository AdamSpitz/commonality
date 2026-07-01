import { readFileSync } from "node:fs";
import type { BeatDefinition } from "./ingestion.js";
import {
	normalizeBeatMemoryPurposes,
	type BeatMemoryPurpose,
} from "./types.js";

export interface BeatMemoryConfig {
	beatId: string;
	purposes: BeatMemoryPurpose[];
	beatDefinition?: BeatDefinition;
	ingestionStateFilePath?: string;
	memoryFilePath?: string;
	metricsLogFilePath?: string;
	workerPollIntervalMs: number;
	memoryCompactionOlderThanMs: number;
	memoryCompactionMinObservations: number;
	llmExtractionEnabled: boolean;
	openRouterApiKey?: string;
	openRouterModel: string;
	maxUntrustedChars: number;
}

function readOptionalStringFrom(
	names: readonly string[],
	env: NodeJS.ProcessEnv,
): string | undefined {
	for (const name of names) {
		const value = env[name];
		if (value) return value;
	}
	return undefined;
}

function readStringFrom(
	names: readonly string[],
	env: NodeJS.ProcessEnv,
	fallback: string,
): string {
	return readOptionalStringFrom(names, env) ?? fallback;
}

function readNumberFrom(
	names: readonly string[],
	env: NodeJS.ProcessEnv,
	fallback: number,
): number {
	const raw = readOptionalStringFrom(names, env);
	if (!raw) return fallback;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed))
		throw new Error(`Invalid numeric environment variable: ${names[0]}`);
	return parsed;
}

function readBooleanFrom(
	names: readonly string[],
	env: NodeJS.ProcessEnv,
	fallback: boolean,
): boolean {
	const raw = readOptionalStringFrom(names, env);
	if (!raw) return fallback;
	const lower = raw.toLowerCase();
	if (lower === "true" || lower === "1") return true;
	if (lower === "false" || lower === "0") return false;
	throw new Error(
		`Invalid boolean environment variable: ${names[0]} must be true/false/1/0`,
	);
}

function readBeatDefinitionFromEnv(
	env: NodeJS.ProcessEnv,
): BeatDefinition | undefined {
	const raw = readOptionalStringFrom(["BEAT_MEMORY_BEAT_DEFINITION_JSON"], env);
	const filePath = readOptionalStringFrom(
		["BEAT_MEMORY_BEAT_DEFINITION_FILE"],
		env,
	);
	const json = raw ?? (filePath ? readFileSync(filePath, "utf8") : undefined);
	if (!json) return undefined;

	let parsed: unknown;
	try {
		parsed = JSON.parse(json) as unknown;
	} catch (error) {
		throw new Error(
			`Invalid beat definition JSON: ${error instanceof Error ? error.message : "unknown parse error"}`,
		);
	}
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		!("beatId" in parsed) ||
		!("sources" in parsed) ||
		!Array.isArray((parsed as Partial<BeatDefinition>).sources)
	) {
		throw new Error("Invalid beat definition; expected beatId and sources[]");
	}

	return {
		...(parsed as BeatDefinition),
		purposes: normalizeBeatMemoryPurposes(
			(parsed as Partial<BeatDefinition>).purposes,
		),
	};
}

export function loadConfigFromEnv(
	env: NodeJS.ProcessEnv = process.env,
): BeatMemoryConfig {
	const beatDefinition = readBeatDefinitionFromEnv(env);
	const purposes = normalizeBeatMemoryPurposes(
		readOptionalStringFrom(["BEAT_MEMORY_PURPOSES"], env)
			?.split(",")
			.map((purpose) => purpose.trim())
			.filter(Boolean) ?? beatDefinition?.purposes,
	);

	return {
		beatId: readStringFrom(
			["BEAT_MEMORY_BEAT_ID"],
			env,
			beatDefinition?.beatId ?? "default-beat",
		),
		purposes,
		beatDefinition,
		ingestionStateFilePath: readOptionalStringFrom(
			["BEAT_MEMORY_INGESTION_STATE_FILE"],
			env,
		),
		memoryFilePath: readOptionalStringFrom(["BEAT_MEMORY_MEMORY_FILE"], env),
		metricsLogFilePath: readOptionalStringFrom(
			["BEAT_MEMORY_METRICS_LOG_FILE"],
			env,
		),
		workerPollIntervalMs: readNumberFrom(
			["BEAT_MEMORY_WORKER_POLL_INTERVAL_MS"],
			env,
			60_000,
		),
		memoryCompactionOlderThanMs: readNumberFrom(
			["BEAT_MEMORY_MEMORY_COMPACTION_OLDER_THAN_MS"],
			env,
			7 * 24 * 60 * 60 * 1000,
		),
		memoryCompactionMinObservations: readNumberFrom(
			["BEAT_MEMORY_MEMORY_COMPACTION_MIN_OBSERVATIONS"],
			env,
			50,
		),
		llmExtractionEnabled: readBooleanFrom(
			["BEAT_MEMORY_LLM_EXTRACTION_ENABLED"],
			env,
			false,
		),
		openRouterApiKey: readOptionalStringFrom(
			["BEAT_MEMORY_OPENROUTER_API_KEY", "OPENROUTER_API_KEY"],
			env,
		),
		openRouterModel: readStringFrom(
			["BEAT_MEMORY_OPENROUTER_MODEL", "OPENROUTER_MODEL"],
			env,
			"anthropic/claude-3-sonnet",
		),
		maxUntrustedChars: readNumberFrom(
			["BEAT_MEMORY_MAX_UNTRUSTED_CHARS"],
			env,
			4000,
		),
	};
}

export const loadConfig = loadConfigFromEnv;
