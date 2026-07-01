import assert from "node:assert/strict";
import { encodeEventTopics, encodeAbiParameters } from "viem";
import { cidToBytes32 } from "@commonality/sdk/utils";
import { TallyIndexerBeatSourceAdapter } from "../src/tallyIndexerAdapter.js";

const DIRECT_SUPPORT_ABI = [
	{
		type: "event",
		name: "DirectSupport",
		inputs: [
			{ indexed: true, name: "user", type: "address" },
			{ indexed: true, name: "statementId", type: "bytes32" },
			{ indexed: false, name: "beliefState", type: "uint8" },
		],
	},
] as const;

const STATEMENT_CID =
	"bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
const USER = "0x0000000000000000000000000000000000000abc";

function directSupportRawEvent(blockNumber: string, beliefState = 1) {
	const topics = encodeEventTopics({
		abi: DIRECT_SUPPORT_ABI,
		eventName: "DirectSupport",
		args: {
			user: USER,
			statementId: cidToBytes32(STATEMENT_CID),
		},
	});
	return {
		id: `0x${blockNumber}-0`,
		eventName: "DirectSupport",
		contractAddress: "0x0000000000000000000000000000000000000001",
		blockNumber,
		blockTimestamp: "1767225600",
		transactionHash: `0x${blockNumber.padStart(64, "0")}`,
		logIndex: 0,
		topic0: topics[0],
		topic1: topics[1],
		topic2: topics[2],
		topic3: null,
		data: encodeAbiParameters([{ type: "uint8" }], [beliefState]),
	};
}

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

describe("Tally indexer beat source adapter", () => {
	it("fetches DirectSupport events from the indexer and maps them to ingested items", async () => {
		const requestedUrls: string[] = [];
		const adapter = new TallyIndexerBeatSourceAdapter({
			fetch: (async (url: string | URL | Request) => {
				requestedUrls.push(String(url));
				return jsonResponse({ items: [directSupportRawEvent("123")] });
			}) as typeof fetch,
			fetchStatementText: async () =>
				"A statement about practical common ground.",
			limit: 25,
		});

		const result = await adapter.fetchSource(
			{
				id: "tally:local",
				type: "tally_indexer",
				locator: "http://localhost:42069",
				platform: "tally",
			},
			{ lastFetchedAt: "2026-01-01T00:00:00Z", cursor: "100" },
		);

		assert.equal(
			requestedUrls[0],
			"http://localhost:42069/api/events?eventName=DirectSupport&limit=25&blockNumber_gte=101",
		);
		assert.equal(result.cursor, "123");
		assert.equal(result.items.length, 1);
		assert.match(
			result.items[0]?.contentCanonicalId ?? "",
			/^tally:direct-support:0x0+123:0$/,
		);
		assert.equal(result.items[0]?.authorId?.toLowerCase(), USER);
		assert.equal(result.items[0]?.platform, "tally");
		assert.match(result.items[0]?.text ?? "", /signed\/believes statement/);
		assert.match(result.items[0]?.text ?? "", /practical common ground/);
	});

	it("keeps source items usable when statement text is unavailable", async () => {
		const adapter = new TallyIndexerBeatSourceAdapter({
			fetch: (async () =>
				jsonResponse({
					items: [directSupportRawEvent("124", 2)],
				})) as typeof fetch,
			fetchStatementText: async () => null,
		});

		const result = await adapter.fetchSource(
			{
				id: "tally:local",
				type: "tally_indexer",
				locator: "http://localhost:42069",
			},
			undefined,
		);

		assert.equal(result.cursor, "124");
		assert.match(result.items[0]?.text ?? "", /disbelieves statement/);
		assert.match(result.items[0]?.text ?? "", /Statement text was unavailable/);
	});
});
