import assert from "node:assert/strict";
import {
	createTwitterBeatSourceAdapters,
	TwitterBeatSourceClient,
} from "../src/twitterAdapter.js";

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

describe("Twitter/X beat source adapter", () => {
	it("fetches account timeline sources and maps tweets to beat-ingested items", async () => {
		const requestedUrls: string[] = [];
		const fetchImpl = (async (url: string | URL | Request) => {
			requestedUrls.push(String(url));
			if (String(url).includes("/2/users/by/username/alice")) {
				return jsonResponse({ data: { id: "123", username: "alice" } });
			}
			if (String(url).includes("/2/users/123/tweets")) {
				return jsonResponse({
					data: [
						{
							id: "200",
							text: "A contextual post from the beat.",
							author_id: "123",
							created_at: "2026-05-16T10:00:00Z",
						},
						{
							id: "201",
							text: "A newer post.",
							author_id: "123",
							created_at: "2026-05-16T11:00:00Z",
						},
					],
					includes: {
						users: [{ id: "123", name: "Alice", username: "alice" }],
					},
				});
			}
			throw new Error(`Unexpected URL: ${url}`);
		}) as typeof fetch;

		const client = new TwitterBeatSourceClient({
			bearerToken: "token",
			apiBaseUrl: "https://api.x.test",
			fetch: fetchImpl,
			maxResults: 10,
		});

		const result = await client.fetchAccountSource(
			{
				id: "account:alice",
				type: "account",
				locator: "@alice",
				platform: "twitter",
			},
			{ lastFetchedAt: "2026-05-16T09:00:00Z", cursor: "199" },
		);

		assert.deepEqual(requestedUrls, [
			"https://api.x.test/2/users/by/username/alice?user.fields=id%2Cusername",
			"https://api.x.test/2/users/123/tweets?max_results=10&tweet.fields=author_id%2Ccreated_at%2Ctext&expansions=author_id&user.fields=id%2Cname%2Cusername&since_id=199",
		]);
		assert.equal(result.cursor, "201");
		assert.deepEqual(
			result.items.map((item) => item.contentCanonicalId),
			["twitter:uid:123:200", "twitter:uid:123:201"],
		);
		assert.equal(result.items[0]?.contentUrl, "https://x.com/alice/status/200");
		assert.equal(result.items[0]?.authorHandle, "@alice");
		assert.equal(result.items[0]?.platform, "twitter");
	});

	it("creates query and list adapters using recent-search and list endpoints", async () => {
		const requestedUrls: string[] = [];
		const fetchImpl = (async (url: string | URL | Request) => {
			requestedUrls.push(String(url));
			return jsonResponse({
				data: [
					{
						id: "300",
						text: "Common ground matters.",
						author_id: "555",
						created_at: "2026-05-16T12:00:00Z",
					},
				],
				includes: { users: [{ id: "555", name: "Bob", username: "bob" }] },
			});
		}) as typeof fetch;

		const adapters = createTwitterBeatSourceAdapters({
			bearerToken: "token",
			apiBaseUrl: "https://api.x.test/",
			fetch: fetchImpl,
			maxResults: 5,
		});

		const queryResult = await adapters.query?.fetchSource(
			{
				id: "query:common-ground",
				type: "query",
				locator: '"common ground" lang:en',
				platform: "twitter",
			},
			undefined,
		);
		const listResult = await adapters.list?.fetchSource(
			{ id: "list:civic", type: "list", locator: "777", platform: "twitter" },
			{ lastFetchedAt: "2026-05-16T11:00:00Z", cursor: "299" },
		);

		assert.equal(
			queryResult?.items[0]?.contentCanonicalId,
			"twitter:uid:555:300",
		);
		assert.equal(listResult?.cursor, "300");
		assert.deepEqual(requestedUrls, [
			"https://api.x.test/2/tweets/search/recent?query=%22common+ground%22+lang%3Aen&max_results=10&tweet.fields=author_id%2Ccreated_at%2Ctext&expansions=author_id&user.fields=id%2Cname%2Cusername",
			"https://api.x.test/2/lists/777/tweets?max_results=10&tweet.fields=author_id%2Ccreated_at%2Ctext&expansions=author_id&user.fields=id%2Cname%2Cusername&since_id=299",
		]);
	});
});
