#!/usr/bin/env node
// Configure first-testnet noninflammatory content-attestation defaults.
// This writes non-secret-ish policy/config values to .env.secrets because that
// is the operator-local source copied into Render sync:false fields.

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const secretsPath = join(rootDir, ".env.secrets");
const statelessPromptPath = join(
	rootDir,
	"content-attester/prompts/perspective-neutral.md",
);
const beatPromptPath = join(
	rootDir,
	"beat-agent/prompts/us-politics-civility.md",
);

const args = new Map();
for (const arg of process.argv.slice(2)) {
	const [key, ...valueParts] = arg.replace(/^--/, "").split("=");
	args.set(key, valueParts.join("="));
}

const seedUploadPath =
	args.get("seed-upload-output") ||
	join(rootDir, "fake-data-generation/output/seed-statements.uploads.json");
const topicStatementId =
	args.get("alignment-topic-statement-id") || "noninflammatory-civility-topic";
const explicitTopicCid =
	args.get("alignment-topic-statement-cid") ||
	process.env.ALIGNMENT_TOPIC_STATEMENT_CID;
const xBearerToken =
	args.get("x-api-bearer-token") || process.env.X_API_BEARER_TOKEN;

function parseEnv(content) {
	const entries = new Map();
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const index = trimmed.indexOf("=");
		if (index === -1) continue;
		entries.set(trimmed.slice(0, index), trimmed.slice(index + 1));
	}
	return entries;
}

async function readText(path) {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (error?.code === "ENOENT") return "";
		throw error;
	}
}

async function findUploadedSeedStatementCid(path, statementId) {
	const raw = await readText(path);
	if (!raw) return "";
	let uploads;
	try {
		uploads = JSON.parse(raw);
	} catch (error) {
		throw new Error(
			`Invalid seed uploads JSON at ${path}: ${error instanceof Error ? error.message : "unknown parse error"}`,
		);
	}
	const match = uploads.find((upload) => upload.statementId === statementId);
	return match?.cid || "";
}

function upsertEnv(content, entries) {
	const keys = new Set(Object.keys(entries));
	const lines = content ? content.replace(/\n*$/, "").split("\n") : [];
	const seen = new Set();
	const updated = lines.map((line) => {
		const trimmed = line.trim();
		const index = trimmed.indexOf("=");
		if (!trimmed || trimmed.startsWith("#") || index === -1) return line;
		const key = trimmed.slice(0, index);
		if (!keys.has(key)) return line;
		seen.add(key);
		return `${key}=${entries[key]}`;
	});

	const missing = Object.entries(entries)
		.filter(([key]) => !seen.has(key))
		.map(([key, value]) => `${key}=${value}`);

	if (updated.length > 0 && missing.length > 0) updated.push("");
	return [...updated, ...missing].join("\n") + "\n";
}

const statelessPrompt = await readText(statelessPromptPath);
const beatPrompt = await readText(beatPromptPath);
const existingSecrets = await readText(secretsPath);
const existingEntries = parseEnv(existingSecrets);
const uploadedSeedTopicCid = explicitTopicCid
	? ""
	: await findUploadedSeedStatementCid(seedUploadPath, topicStatementId);
const topicCid = explicitTopicCid || uploadedSeedTopicCid;

const beatDefinition = {
	beatId: "us-politics",
	purposes: ["civility_context", "general_beat_context", "source_management"],
	sources: [
		{
			id: "query:us-politics-common-ground",
			type: "query",
			platform: "twitter",
			locator:
				'("common ground" OR bipartisan OR persuasion OR "good faith") (politics OR policy) lang:en -is:retweet',
			credentialEnvVar: "X_API_BEARER_TOKEN",
			minPollIntervalMs: 900000,
		},
		{
			id: "query:us-politics-civility",
			type: "query",
			platform: "twitter",
			locator:
				'(civility OR noninflammatory OR "steelman" OR "good faith") (democrat OR republican OR liberal OR conservative) lang:en -is:retweet',
			credentialEnvVar: "X_API_BEARER_TOKEN",
			minPollIntervalMs: 900000,
		},
	],
};

const entries = {
	ALIGNMENT_TOPIC_STATEMENT_CID:
		topicCid ||
		existingEntries.get("ALIGNMENT_TOPIC_STATEMENT_CID") ||
		"TODO_REPLACE_WITH_NONINFLAMMATORY_TOPIC_STATEMENT_CID",
	CONTENT_ATTESTER_NAME: "noninflammatory-neutral",
	CONTENT_ATTESTER_PROMPT_TEMPLATE: JSON.stringify(statelessPrompt).slice(
		1,
		-1,
	),
	BEAT_MEMORY_ENABLED: "true",
	BEAT_MEMORY_BEAT_ID: "us-politics",
	BEAT_MEMORY_PURPOSES:
		"civility_context,general_beat_context,source_management",
	BEAT_MEMORY_BEAT_DEFINITION_JSON: JSON.stringify(beatDefinition),
	BEAT_MEMORY_INGESTION_STATE_FILE:
		"/data/beat-memory/us-politics.ingestion.json",
	BEAT_MEMORY_MEMORY_FILE: "/data/beat-memory/us-politics.memory.json",
	BEAT_MEMORY_METRICS_LOG_FILE: "/data/beat-memory/us-politics.metrics.jsonl",
	BEAT_MEMORY_WORKER_POLL_INTERVAL_MS: "300000",
	BEAT_MEMORY_LLM_EXTRACTION_ENABLED: "true",
	BEAT_AGENT_ENABLED: "true",
	BEAT_AGENT_BEAT_ID: "us-politics",
	BEAT_AGENT_NAME: "us-politics-civility",
	BEAT_AGENT_PROMPT_TEMPLATE: JSON.stringify(beatPrompt).slice(1, -1),
	BEAT_AGENT_INGESTION_STATE_FILE:
		"/data/beat-memory/us-politics.ingestion.json",
	BEAT_AGENT_MEMORY_FILE: "/data/beat-memory/us-politics.memory.json",
	BEAT_AGENT_EVALUATION_LOG_FILE:
		"/data/beat-agent/us-politics.evaluations.jsonl",
	BEAT_AGENT_METRICS_LOG_FILE: "/data/beat-agent/us-politics.metrics.jsonl",
	BEAT_AGENT_FINDER_ENABLED: "false",
	BEAT_AGENT_FINDER_STATE_FILE: "/data/beat-agent/us-politics.finder.json",
	BEAT_AGENT_FINDER_ATTESTER_URL:
		"https://commonality-service-host-attesters.onrender.com/beat-agent/evaluate-content",
	BEAT_AGENT_BEAT_KEYWORDS:
		"politics,policy,democrat,republican,liberal,conservative,bipartisan,civility,persuasion,good faith,common ground",
	BEAT_AGENT_PLATFORM_API_URL: "https://commonality-platform-api.onrender.com",
	BEAT_AGENT_MINIMUM_CONFIDENCE: "medium",
	BEAT_AGENT_ESTIMATED_INPUT_TOKENS: "5000",
	BEAT_AGENT_ESTIMATED_OUTPUT_TOKENS: "700",
};

if (xBearerToken) {
	entries.X_API_BEARER_TOKEN = xBearerToken;
}

const header =
	"# Commonality private deployment secrets. Gitignored; do not commit.\n\n";
const base = existingSecrets || header;
await writeFile(secretsPath, upsertEnv(base, entries));

console.log(`Wrote testnet AI policy defaults to ${secretsPath}`);
console.log("Still manual / product choices:");
console.log(
	`  ALIGNMENT_TOPIC_STATEMENT_CID=${entries.ALIGNMENT_TOPIC_STATEMENT_CID}`,
);
if (uploadedSeedTopicCid) {
	console.log(
		`    Resolved from ${seedUploadPath} statementId=${topicStatementId}`,
	);
}
if (!topicCid && entries.ALIGNMENT_TOPIC_STATEMENT_CID.startsWith("TODO_")) {
	console.log(
		`    Upload seed statements first, or pass --alignment-topic-statement-cid=<CID>. Expected seed statementId=${topicStatementId}.`,
	);
}
if (!xBearerToken && !existingEntries.get("X_API_BEARER_TOKEN")) {
	console.log("  X_API_BEARER_TOKEN is still needed for Twitter/X ingestion.");
}
console.log(
	"Review BEAT_MEMORY_BEAT_DEFINITION_JSON before public use; defaults are intentionally narrow rehearsal queries.",
);
