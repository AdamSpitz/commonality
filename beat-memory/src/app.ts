import express, { type Express, type Request, type Response } from "express";
import type { BeatMemoryConfig } from "./config.js";
import {
	calculateObservationDiversityMultiplier,
	getObservationTimeSpanHours,
	retrieveRelevantObservations,
	type BeatMemoryObservation,
	type ObservationDiversityOptions,
} from "./memory.js";
import { isBeatMemoryPurpose, type BeatMemoryPurpose } from "./types.js";

export interface BeatMemoryContextCitation {
	id: string;
	observation: string;
	confidence: "high" | "medium" | "low";
	supportingItemIds: string[];
	observedAtStart: string;
	observedAtEnd: string;
	purpose?: BeatMemoryPurpose[];
	sourceAuthorCount?: number;
	timeSpanHours?: number;
	diversityScore?: number;
}

export interface BeatMemoryAppDependencies {
	getConfig: () => BeatMemoryConfig;
	queryBeatContext?: (params: {
		topic: string;
		purposes?: BeatMemoryPurpose[];
	}) => Promise<BeatMemoryContextCitation[]>;
}

export function createBeatMemoryApp(
	dependencies: BeatMemoryAppDependencies,
): Express {
	const app = express();
	app.use(express.json());

	app.get("/health", (_req: Request, res: Response) => {
		res.json({ ok: true, serviceType: "beat-memory" });
	});

	app.get("/metadata", (_req: Request, res: Response) => {
		const config = dependencies.getConfig();
		res.json({
			serviceType: "beat-memory",
			beatId: config.beatId,
			purposes: config.purposes,
			capabilities: ["context_api"],
		});
	});

	app.get("/context", async (req: Request, res: Response) => {
		if (!dependencies.queryBeatContext) {
			res
				.status(404)
				.json({
					error: "not_configured",
					message: "Beat memory context API is not configured.",
				});
			return;
		}

		const topic =
			typeof req.query.topic === "string" ? req.query.topic.trim() : "";
		if (!topic) {
			res
				.status(400)
				.json({
					error: "invalid_request",
					message: "Missing required query parameter: topic",
				});
			return;
		}

		const purpose =
			typeof req.query.purpose === "string" ? req.query.purpose : undefined;
		if (purpose && !isBeatMemoryPurpose(purpose)) {
			res
				.status(400)
				.json({
					error: "invalid_request",
					message: `Invalid purpose: ${purpose}`,
				});
			return;
		}

		const purposes: BeatMemoryPurpose[] = purpose
			? [purpose as BeatMemoryPurpose]
			: ["bridge_opportunity_context", "general_beat_context"];
		res.json({
			beatId: dependencies.getConfig().beatId,
			topic,
			observations: await dependencies.queryBeatContext({ topic, purposes }),
		});
	});

	return app;
}

export function createJsonFileBeatContextQuery(params: {
	beatId: string;
	memoryFilePath: string;
	diversityOptions?: ObservationDiversityOptions;
}): (query: {
	topic: string;
	purposes?: BeatMemoryPurpose[];
}) => Promise<BeatMemoryContextCitation[]> {
	return async (query) => {
		const observations = await retrieveRelevantObservations({
			beatId: params.beatId,
			memoryFilePath: params.memoryFilePath,
			queryText: query.topic,
			purposes: query.purposes,
			maxObservations: 8,
			diversityOptions: params.diversityOptions,
		});
		return observations.map((observation) =>
			observationToContextCitation(observation, params.diversityOptions),
		);
	};
}

function observationToContextCitation(
	observation: BeatMemoryObservation,
	diversityOptions?: ObservationDiversityOptions,
): BeatMemoryContextCitation {
	return {
		id: observation.id,
		observation: observation.observation,
		confidence: observation.confidence,
		supportingItemIds: observation.supportingContentIds,
		observedAtStart: observation.observedAtStart,
		observedAtEnd: observation.observedAtEnd,
		purpose: observation.purposes,
		sourceAuthorCount: observation.sourceAuthors.length,
		timeSpanHours: roundTo(getObservationTimeSpanHours(observation), 2),
		diversityScore: roundTo(
			calculateObservationDiversityMultiplier(observation, diversityOptions),
			3,
		),
	};
}

function roundTo(value: number, digits: number): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}
