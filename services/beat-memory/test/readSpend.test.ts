import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfigFromEnv } from "../src/config.js";
import { reserveSourceRead, settleSourceRead } from "../src/readSpend.js";
import { runBeatIngestionOnce, type BeatSource } from "../src/ingestion.js";
import { createTwitterBeatSourceAdapters } from "../src/twitterAdapter.js";

describe("source read budget", () => {
	it("rejects negative read estimates", () => {
		assert.throws(() => loadConfigFromEnv({ BEAT_MEMORY_ESTIMATED_READ_USD_PER_POST: "-1" }), /Invalid numeric/);
	});
	it("skips a paid batch that cannot fit while allowing a free source", async () => {
		const directory = await mkdtemp(join(tmpdir(), "beat-read-budget-"));
		try {
			const now = new Date("2026-11-18T12:00:00Z");
			const config = { ...loadConfigFromEnv({}), spendStateFilePath: join(directory, "spend.json"), monthlySpendCeilingUsd: 0.01 };
			let fetched = 0;
			const summary = await runBeatIngestionOnce({
				definition: { beatId: "test", purposes: [], sources: [
					{ id: "paid", type: "query", locator: "test" },
					{ id: "free", type: "rss", locator: "test" },
				] },
				stateFilePath: join(directory, "ingestion.json"),
				adapters: {
					...createTwitterBeatSourceAdapters({ bearerToken: "test", fetch: async () => { throw new Error("Unaffordable request must not run"); } }),
					rss: { fetchSource: async () => { fetched++; return { items: [] }; } },
				},
				beforeSourceFetch: (source, maximum) => reserveSourceRead(config, source, now, maximum),
				afterSourceFetch: (source, count) => settleSourceRead(config, source, count, now),
			});
			assert.equal(fetched, 1);
			assert.deepEqual(summary.skippedSources, [{ sourceId: "paid", reason: "budget" }]);
			assert.equal(JSON.parse(await readFile(config.spendStateFilePath, "utf8")).settledUsd, 0);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	it("reserves the batch maximum and releases unused reads on settlement", async () => {
		const directory = await mkdtemp(join(tmpdir(), "beat-read-budget-"));
		try {
			const config = { ...loadConfigFromEnv({}), spendStateFilePath: join(directory, "spend.json"), monthlySpendCeilingUsd: 0.1 };
			const source: BeatSource = { id: "paid", type: "query", locator: "test" };
			const now = new Date("2026-11-18T12:00:00Z");
			assert.equal(await reserveSourceRead(config, source, now, 20), true);
			assert.equal(await reserveSourceRead(config, { ...source, id: "other" }, now, 1), false);
			await settleSourceRead(config, source, 3, now);
			const state = JSON.parse(await readFile(config.spendStateFilePath, "utf8"));
			assert.equal(state.reservedUsd, 0);
			assert.equal(state.settledUsd, 0.015);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
