export type BridgeContextReadiness = "warming" | "ready";

export interface TrustedContextSourceConfig {
	serviceUrl: string;
	expectedSignerAddress?: `0x${string}`;
	maxAgeMs?: number;
	/** Topic query sent to the context source's GET /context endpoint. */
	topic?: string;
	/** Optional beat-memory purpose filter, e.g. bridge_opportunity_context. */
	purpose?: string;
}

export interface BridgeContextObservation {
	id?: string;
	observation: string;
	confidence?: "high" | "medium" | "low";
	observedAtStart?: string;
	observedAtEnd?: string;
	supportingItemIds?: string[];
}

export interface BridgeContextResponse {
	readiness: BridgeContextReadiness;
	summary: string;
	generatedAt?: string;
	signerAddress?: `0x${string}`;
	signature?: string;
	observations?: BridgeContextObservation[];
}

export interface BridgeContextSnapshot {
	source: TrustedContextSourceConfig;
	response: BridgeContextResponse;
}

export interface BridgeContextClientDependencies {
	fetch: typeof fetch;
}

const defaultDependencies: BridgeContextClientDependencies = { fetch };

export function parseTrustedContextSources(
	value: string | undefined,
): TrustedContextSourceConfig[] {
	if (!value?.trim()) return [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch (error) {
		throw new Error(
			`BRIDGE_CREATOR_CSM_CONTEXT_SOURCES must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (!Array.isArray(parsed)) {
		throw new Error("BRIDGE_CREATOR_CSM_CONTEXT_SOURCES must be a JSON array");
	}

	return parsed.map((entry, index) =>
		normalizeTrustedContextSource(entry, index),
	);
}

function normalizeTrustedContextSource(
	entry: unknown,
	index: number,
): TrustedContextSourceConfig {
	if (!entry || typeof entry !== "object") {
		throw new Error(`Context source at index ${index} must be an object`);
	}

	const record = entry as Record<string, unknown>;
	const serviceUrl = record.service_url ?? record.serviceUrl;
	if (typeof serviceUrl !== "string" || !serviceUrl.trim()) {
		throw new Error(`Context source at index ${index} is missing service_url`);
	}

	const expectedSignerAddress =
		record.expected_signer_address ?? record.expectedSignerAddress;
	if (
		expectedSignerAddress !== undefined &&
		typeof expectedSignerAddress !== "string"
	) {
		throw new Error(
			`Context source at index ${index} has a non-string expected_signer_address`,
		);
	}

	const maxAgeMs =
		record.max_age_ms ??
		record.maxAgeMs ??
		record.max_staleness_ms ??
		record.maxStalenessMs;
	let parsedMaxAgeMs: number | undefined;
	if (typeof maxAgeMs === "number") {
		parsedMaxAgeMs = maxAgeMs;
	} else if (typeof maxAgeMs === "string") {
		parsedMaxAgeMs = Number(maxAgeMs);
	}
	if (
		maxAgeMs !== undefined &&
		(!Number.isFinite(parsedMaxAgeMs) || (parsedMaxAgeMs ?? 0) <= 0)
	) {
		throw new Error(`Context source at index ${index} has invalid max_age_ms`);
	}

	const topic = record.topic ?? record.context_topic ?? record.contextTopic;
	if (topic !== undefined && typeof topic !== "string") {
		throw new Error(`Context source at index ${index} has a non-string topic`);
	}

	const purpose =
		record.purpose ?? record.context_purpose ?? record.contextPurpose;
	if (purpose !== undefined && typeof purpose !== "string") {
		throw new Error(
			`Context source at index ${index} has a non-string purpose`,
		);
	}

	return {
		serviceUrl: serviceUrl.trim().replace(/\/+$/, ""),
		expectedSignerAddress: expectedSignerAddress as `0x${string}` | undefined,
		maxAgeMs: parsedMaxAgeMs,
		...(typeof topic === "string" && topic.trim()
			? { topic: topic.trim() }
			: {}),
		...(typeof purpose === "string" && purpose.trim()
			? { purpose: purpose.trim() }
			: {}),
	};
}

export async function fetchBridgeContextSnapshots(
	sources: TrustedContextSourceConfig[],
	dependencies: BridgeContextClientDependencies = defaultDependencies,
): Promise<BridgeContextSnapshot[]> {
	const snapshots: BridgeContextSnapshot[] = [];

	for (const source of sources) {
		const response = await dependencies.fetch(buildContextUrl(source), {
			headers: { accept: "application/json" },
		});

		if (!response.ok) {
			throw new Error(
				`Context source ${source.serviceUrl} returned HTTP ${response.status}`,
			);
		}

		const context = normalizeBridgeContextResponse(
			await response.json(),
			source,
		);
		snapshots.push({ source, response: context });
	}

	return snapshots;
}

function buildContextUrl(source: TrustedContextSourceConfig): string {
	try {
		const url = new URL(`${source.serviceUrl}/context`);
		url.searchParams.set(
			"topic",
			source.topic ?? "current bridge opportunities and coverage gaps",
		);
		if (source.purpose) url.searchParams.set("purpose", source.purpose);
		return url.toString();
	} catch (error) {
		throw new Error(
			`Context source ${source.serviceUrl} has invalid serviceUrl: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function normalizeBridgeContextResponse(
	value: unknown,
	source: TrustedContextSourceConfig,
): BridgeContextResponse {
	if (!value || typeof value !== "object") {
		throw new Error(
			`Context source ${source.serviceUrl} returned a non-object response`,
		);
	}

	const record = value as Record<string, unknown>;
	const observations = normalizeBeatMemoryObservations(
		record.observations,
		source,
	);
	const readiness =
		record.readiness ?? (observations.length > 0 ? "ready" : "warming");
	if (readiness !== "warming" && readiness !== "ready") {
		throw new Error(
			`Context source ${source.serviceUrl} returned invalid readiness`,
		);
	}

	const summary =
		typeof record.summary === "string"
			? record.summary
			: summarizeBeatMemoryObservations(observations);
	if (!summary) {
		throw new Error(
			`Context source ${source.serviceUrl} returned missing summary and no observations`,
		);
	}

	const signerAddress = record.signerAddress ?? record.signer_address;
	if (
		source.expectedSignerAddress &&
		signerAddress !== source.expectedSignerAddress
	) {
		throw new Error(`Context source ${source.serviceUrl} signer mismatch`);
	}

	const generatedAt = record.generatedAt ?? record.generated_at;
	if (generatedAt !== undefined && typeof generatedAt !== "string") {
		throw new Error(
			`Context source ${source.serviceUrl} returned invalid generatedAt`,
		);
	}
	if (source.maxAgeMs && typeof generatedAt === "string") {
		const generatedAtMs = Date.parse(generatedAt);
		if (!Number.isFinite(generatedAtMs)) {
			throw new Error(
				`Context source ${source.serviceUrl} returned unparsable generatedAt`,
			);
		}
		if (Date.now() - generatedAtMs > source.maxAgeMs) {
			throw new Error(`Context source ${source.serviceUrl} context is stale`);
		}
	}

	return {
		readiness,
		summary,
		generatedAt: typeof generatedAt === "string" ? generatedAt : undefined,
		signerAddress: signerAddress as `0x${string}` | undefined,
		signature:
			typeof record.signature === "string" ? record.signature : undefined,
		observations: observations.length ? observations : undefined,
	};
}

function normalizeBeatMemoryObservations(
	value: unknown,
	source: TrustedContextSourceConfig,
): BridgeContextObservation[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(
			`Context source ${source.serviceUrl} returned non-array observations`,
		);
	}

	return value.map((entry, index) => {
		if (!entry || typeof entry !== "object") {
			throw new Error(
				`Context source ${source.serviceUrl} observation ${index} is not an object`,
			);
		}
		const record = entry as Record<string, unknown>;
		if (typeof record.observation !== "string" || !record.observation.trim()) {
			throw new Error(
				`Context source ${source.serviceUrl} observation ${index} is missing observation text`,
			);
		}
		const supportingItemIds = Array.isArray(record.supportingItemIds)
			? record.supportingItemIds.filter(
					(item): item is string => typeof item === "string",
				)
			: undefined;
		return {
			id: typeof record.id === "string" ? record.id : undefined,
			observation: record.observation.trim(),
			confidence:
				record.confidence === "high" ||
				record.confidence === "medium" ||
				record.confidence === "low"
					? record.confidence
					: undefined,
			observedAtStart:
				typeof record.observedAtStart === "string"
					? record.observedAtStart
					: undefined,
			observedAtEnd:
				typeof record.observedAtEnd === "string"
					? record.observedAtEnd
					: undefined,
			supportingItemIds,
		};
	});
}

function summarizeBeatMemoryObservations(
	observations: BridgeContextObservation[],
): string {
	if (!observations.length) return "";
	return observations
		.slice(0, 8)
		.map((observation, index) => `${index + 1}. ${observation.observation}`)
		.join("\n");
}

export function allContextsReady(snapshots: BridgeContextSnapshot[]): boolean {
	return (
		snapshots.length > 0 &&
		snapshots.every((snapshot) => snapshot.response.readiness === "ready")
	);
}
