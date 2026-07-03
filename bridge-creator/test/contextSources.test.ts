import assert from "node:assert";
import {
	allContextsReady,
	fetchBridgeContextSnapshots,
	parseTrustedContextSources,
	type TrustedContextSourceConfig,
} from "../src/contextSources.js";

function jsonResponse(
	body: unknown,
	init: { ok?: boolean; status?: number } = {},
): Response {
	return {
		ok: init.ok ?? true,
		status: init.status ?? 200,
		json: async () => body,
	} as Response;
}

describe("parseTrustedContextSources", () => {
	it("parses the JSON env shape used for trusted CSM context sources", () => {
		assert.deepStrictEqual(
			parseTrustedContextSources(
				JSON.stringify([
					{
						service_url: "http://csm.local/",
						expected_signer_address:
							"0x0000000000000000000000000000000000000001",
						max_staleness_ms: 60000,
						topic: "immigration bridge opportunities",
						purpose: "bridge_opportunity_context",
					},
				]),
			),
			[
				{
					serviceUrl: "http://csm.local",
					expectedSignerAddress: "0x0000000000000000000000000000000000000001",
					maxAgeMs: 60000,
					topic: "immigration bridge opportunities",
					purpose: "bridge_opportunity_context",
				},
			],
		);
	});

	it("defaults to no sources when unset", () => {
		assert.deepStrictEqual(parseTrustedContextSources(undefined), []);
	});
});

describe("fetchBridgeContextSnapshots", () => {
	it("fetches /context from each source and validates the expected signer", async () => {
		const calls: string[] = [];
		const sources: TrustedContextSourceConfig[] = [
			{
				serviceUrl: "http://csm.local",
				expectedSignerAddress: "0x0000000000000000000000000000000000000001",
			},
		];

		const snapshots = await fetchBridgeContextSnapshots(sources, {
			fetch: async (url: Parameters<typeof fetch>[0]) => {
				calls.push(String(url));
				return jsonResponse({
					readiness: "ready",
					summary:
						"Moderate-left and moderate-right signers are converging on immigration enforcement tradeoffs.",
					signer_address: "0x0000000000000000000000000000000000000001",
					generatedAt: "2026-05-21T00:00:00.000Z",
					signature: "0xsig",
				});
			},
		});

		assert.deepStrictEqual(calls, [
			"http://csm.local/context?topic=current+bridge+opportunities+and+coverage+gaps",
		]);
		assert.strictEqual(snapshots[0]?.response.readiness, "ready");
		assert.strictEqual(
			snapshots[0]?.response.signerAddress,
			"0x0000000000000000000000000000000000000001",
		);
	});

	it("rejects stale context before the synthesizer sees it", async () => {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
		await assert.rejects(
			fetchBridgeContextSnapshots(
				[
					{
						serviceUrl: "http://csm.local",
						maxAgeMs: 1000,
					},
				],
				{
					fetch: async () =>
						jsonResponse({
							readiness: "ready",
							summary: "summary",
							generated_at: oneHourAgo,
						}),
				},
			),
			/stale/,
		);
	});

	it("normalizes beat-memory observation responses into bridge context summaries", async () => {
		const snapshots = await fetchBridgeContextSnapshots(
			[
				{
					serviceUrl: "http://beat-memory.local",
					topic: "housing",
					purpose: "bridge_opportunity_context",
				},
			],
			{
				fetch: async (url: Parameters<typeof fetch>[0]) => {
					assert.strictEqual(
						String(url),
						"http://beat-memory.local/context?topic=housing&purpose=bridge_opportunity_context",
					);
					return jsonResponse({
						beatId: "us-political-csm",
						topic: "housing",
						observations: [
							{
								id: "obs-1",
								observation:
									"Both sides are discussing faster permitting with local safeguards.",
								confidence: "medium",
								supportingItemIds: ["tally:1"],
							},
						],
					});
				},
			},
		);

		assert.strictEqual(snapshots[0]?.response.readiness, "ready");
		assert.match(snapshots[0]?.response.summary ?? "", /faster permitting/);
		assert.strictEqual(snapshots[0]?.response.observations?.[0]?.id, "obs-1");
	});

	it("rejects signer mismatches before the synthesizer sees it", async () => {
		await assert.rejects(
			fetchBridgeContextSnapshots(
				[
					{
						serviceUrl: "http://csm.local",
						expectedSignerAddress: "0x0000000000000000000000000000000000000001",
					},
				],
				{
					fetch: async () =>
						jsonResponse({
							readiness: "ready",
							summary: "summary",
							signer_address: "0x0000000000000000000000000000000000000002",
						}),
				},
			),
			/signer mismatch/,
		);
	});
});

describe("allContextsReady", () => {
	it("requires at least one ready context", () => {
		assert.strictEqual(allContextsReady([]), false);
		assert.strictEqual(
			allContextsReady([
				{
					source: { serviceUrl: "http://csm.local" },
					response: {
						readiness: "warming",
						summary: "still building faction map",
					},
				},
			]),
			false,
		);
		assert.strictEqual(
			allContextsReady([
				{
					source: { serviceUrl: "http://csm.local" },
					response: { readiness: "ready", summary: "ready" },
				},
			]),
			true,
		);
	});
});
