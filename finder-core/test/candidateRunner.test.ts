import assert from "node:assert";
import { describe, it } from "mocha";
import { runFinderCandidatePass, type FinderProcessedItemBase } from "../src/candidateRunner.js";

interface ProcessedItem extends FinderProcessedItemBase {
	detail?: string;
}

describe("runFinderCandidatePass", () => {
	it("processes candidates, skips completed items, and records failures for retry", async () => {
		const processedItems: Record<string, ProcessedItem> = {
			already: { processedAt: "earlier", status: "submitted" },
			failedOnce: { processedAt: "earlier", status: "failed", retries: 1 },
			failedTooOften: { processedAt: "earlier", status: "failed", retries: 2 },
		};

		const summary = await runFinderCandidatePass({
			items: ["already", "thin", "good", "failedOnce", "failedTooOften"],
			processedItems,
			getItemId: (item) => item,
			selectCandidate: (item) => (item === "thin" ? null : { id: item }),
			submitCandidate: async ({ candidate, nowIso }) => {
				if (candidate.id === "failedOnce") {
					throw new Error("still broken");
				}
				return { processedAt: nowIso, status: "submitted", detail: candidate.id };
			},
			buildNotPromisingProcessedItem: ({ nowIso }) => ({
				processedAt: nowIso,
				status: "not_promising",
			}),
			buildFailedProcessedItem: ({ previous, error, nowIso }) => ({
				processedAt: nowIso,
				status: "failed",
				retries: (previous?.retries ?? 0) + 1,
				lastError: error instanceof Error ? error.message : String(error),
			}),
			maxRetries: 2,
			now: new Date("2026-01-02T03:04:05.000Z"),
		});

		assert.deepStrictEqual(summary, {
			scannedItemCount: 5,
			skippedAlreadyProcessedCount: 2,
			notPromisingCount: 1,
			submittedCount: 1,
			failedCandidateIds: ["failedOnce"],
		});
		assert.strictEqual(processedItems.thin.status, "not_promising");
		assert.strictEqual(processedItems.good.detail, "good");
		assert.strictEqual(processedItems.failedOnce.retries, 2);
		assert.strictEqual(processedItems.failedOnce.lastError, "still broken");
	});
});
