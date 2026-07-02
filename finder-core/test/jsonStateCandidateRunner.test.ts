import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "mocha";
import { runJsonStateFinderCandidatePass } from "../src/jsonStateCandidateRunner.js";

interface TestProcessedItem {
	processedAt: string;
	status: "submitted" | "not_promising" | "failed";
	retries?: number;
	reason?: string;
}

interface TestState {
	schemaVersion: 1;
	processedItems: Record<string, TestProcessedItem>;
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
	const dir = await mkdtemp(join(tmpdir(), "finder-core-json-state-"));
	try {
		return await fn(dir);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

describe("runJsonStateFinderCandidatePass", () => {
	it("loads, mutates, and saves finder state around a candidate pass", async () => {
		await withTempDir(async (dir) => {
			const stateFilePath = join(dir, "finder.json");

			const result = await runJsonStateFinderCandidatePass<
				{ id: string; promising: boolean },
				{ id: string },
				TestProcessedItem,
				TestState
			>({
				stateFilePath,
				items: [
					{ id: "yes", promising: true },
					{ id: "no", promising: false },
				],
				parseState: (value) => value as TestState,
				createEmptyState: () => ({ schemaVersion: 1, processedItems: {} }),
				getItemId: (item) => item.id,
				selectCandidate: (item) => (item.promising ? { id: item.id } : null),
				submitCandidate: async ({ candidate, nowIso }) => ({
					processedAt: nowIso,
					status: "submitted",
					reason: candidate.id,
				}),
				buildNotPromisingProcessedItem: ({ nowIso }) => ({
					processedAt: nowIso,
					status: "not_promising",
				}),
				buildFailedProcessedItem: ({ previous, nowIso }) => ({
					processedAt: nowIso,
					status: "failed",
					retries: (previous?.retries ?? 0) + 1,
				}),
				now: new Date("2026-06-01T00:00:00.000Z"),
			});

			assert.deepEqual(result.summary, {
				scannedItemCount: 2,
				skippedAlreadyProcessedCount: 0,
				notPromisingCount: 1,
				submittedCount: 1,
				failedCandidateIds: [],
			});
			assert.equal(result.state.processedItems.yes?.status, "submitted");
			assert.equal(result.state.processedItems.no?.status, "not_promising");

			let saved: TestState;
			try {
				saved = JSON.parse(await readFile(stateFilePath, "utf8")) as TestState;
			} catch (error) {
				assert.fail(
					`Saved finder state should be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			assert.equal(saved.processedItems.yes?.status, "submitted");
			assert.equal(saved.processedItems.no?.status, "not_promising");
		});
	});
});
