import {
	buildCanonicalChannelId,
	buildCanonicalContentId,
	parseCanonicalChannelId,
} from "@commonality/sdk/content-funding";
import type {
	BeatIngestedItem,
	BeatSource,
	BeatSourceAdapter,
	BeatSourceCursor,
	BeatSourceFetchResult,
	BeatSourceType,
} from "./ingestion.js";

export interface TwitterBeatSourceAdapterConfig {
	bearerToken: string;
	apiBaseUrl?: string;
	fetch?: typeof fetch;
	maxResults?: number;
}

interface TwitterUserLookupResponse {
	data?: TwitterUser;
}

interface TwitterTweetCollectionResponse {
	data?: TwitterTweet[];
	includes?: {
		users?: TwitterUser[];
	};
}

interface TwitterTweet {
	id?: string;
	text?: string;
	author_id?: string;
	created_at?: string;
}

interface TwitterUser {
	id?: string;
	name?: string;
	username?: string;
}

const DEFAULT_X_API_BASE_URL = "https://api.x.com";
const DEFAULT_MAX_RESULTS = 20;

export function createTwitterBeatSourceAdapters(
	config: TwitterBeatSourceAdapterConfig,
): Partial<Record<BeatSourceType, BeatSourceAdapter>> {
	const client = new TwitterBeatSourceClient(config);
	return {
		account: {
			fetchSource: (source, cursor) =>
				client.fetchAccountSource(source, cursor),
		},
		query: {
			fetchSource: (source, cursor) => client.fetchQuerySource(source, cursor),
		},
		list: {
			fetchSource: (source, cursor) => client.fetchListSource(source, cursor),
		},
	};
}

export class TwitterBeatSourceClient {
	private readonly apiBaseUrl: string;
	private readonly fetchImpl: typeof fetch;
	private readonly maxResults: number;

	constructor(private readonly config: TwitterBeatSourceAdapterConfig) {
		if (!config.bearerToken.trim()) {
			throw new Error("Twitter/X bearer token is required");
		}
		this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_X_API_BASE_URL).replace(
			/\/$/,
			"",
		);
		this.fetchImpl = config.fetch ?? fetch;
		this.maxResults = clampInteger(
			config.maxResults ?? DEFAULT_MAX_RESULTS,
			10,
			100,
		);
	}

	async fetchAccountSource(
		source: BeatSource,
		cursor: BeatSourceCursor | undefined,
	): Promise<BeatSourceFetchResult> {
		const userId = await this.resolveUserId(source.locator);
		const params = new URLSearchParams({
			max_results: String(this.maxResults),
			"tweet.fields": "author_id,created_at,text",
			expansions: "author_id",
			"user.fields": "id,name,username",
		});
		addSinceId(params, cursor);

		return this.fetchTweetCollection(
			source,
			`/2/users/${encodeURIComponent(userId)}/tweets?${params}`,
		);
	}

	async fetchQuerySource(
		source: BeatSource,
		cursor: BeatSourceCursor | undefined,
	): Promise<BeatSourceFetchResult> {
		const params = new URLSearchParams({
			query: source.locator,
			max_results: String(this.maxResults),
			"tweet.fields": "author_id,created_at,text",
			expansions: "author_id",
			"user.fields": "id,name,username",
		});
		addSinceId(params, cursor);

		return this.fetchTweetCollection(
			source,
			`/2/tweets/search/recent?${params}`,
		);
	}

	async fetchListSource(
		source: BeatSource,
		cursor: BeatSourceCursor | undefined,
	): Promise<BeatSourceFetchResult> {
		const listId = normalizeNumericLocator(source.locator, "Twitter/X list ID");
		const params = new URLSearchParams({
			max_results: String(this.maxResults),
			"tweet.fields": "author_id,created_at,text",
			expansions: "author_id",
			"user.fields": "id,name,username",
		});
		addSinceId(params, cursor);

		return this.fetchTweetCollection(
			source,
			`/2/lists/${encodeURIComponent(listId)}/tweets?${params}`,
		);
	}

	private async resolveUserId(locator: string): Promise<string> {
		const trimmed = locator.trim();
		const canonicalMatch = /^twitter:uid:(\d+)$/.exec(trimmed);
		if (canonicalMatch) return canonicalMatch[1] ?? "";
		if (/^\d+$/.test(trimmed)) return trimmed;

		const handle = normalizeTwitterHandle(trimmed);
		const params = new URLSearchParams({ "user.fields": "id,username" });
		const response = await this.fetchJson<TwitterUserLookupResponse>(
			`/2/users/by/username/${encodeURIComponent(handle)}?${params}`,
		);
		if (!response.data?.id) {
			throw new Error(`Twitter/X account not found for ${locator}`);
		}
		return response.data.id;
	}

	private async fetchTweetCollection(
		source: BeatSource,
		path: string,
	): Promise<BeatSourceFetchResult> {
		const response = await this.fetchJson<TwitterTweetCollectionResponse>(path);
		const items = (response.data ?? [])
			.map((tweet) => tweetToBeatItem(tweet, response.includes?.users, source))
			.filter(isDefined);

		return {
			items,
			cursor:
				maxNumericId(
					items.map((item) =>
						getTweetIdFromCanonicalId(item.contentCanonicalId),
					),
				) ?? undefined,
		};
	}

	private async fetchJson<T>(path: string): Promise<T> {
		const response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
			headers: {
				Authorization: `Bearer ${this.config.bearerToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const body = await safeReadBody(response);
			throw new Error(
				`Twitter/X API request failed with status ${response.status}: ${body}`,
			);
		}

		return (await response.json()) as T;
	}
}

function tweetToBeatItem(
	tweet: TwitterTweet,
	users: TwitterUser[] | undefined,
	source: BeatSource,
): BeatIngestedItem | undefined {
	if (!tweet.id || !tweet.author_id) {
		return undefined;
	}

	const channelId = buildCanonicalChannelId("twitter", tweet.author_id);
	const author = users?.find((user) => user.id === tweet.author_id);
	const observedAt = tweet.created_at ?? new Date().toISOString();
	return {
		contentCanonicalId: buildCanonicalContentId(channelId, tweet.id),
		sourceId: source.id,
		platform: "twitter",
		contentUrl: author?.username
			? `https://x.com/${author.username}/status/${tweet.id}`
			: undefined,
		authorHandle: author?.username ? `@${author.username}` : undefined,
		authorId: `twitter:uid:${tweet.author_id}`,
		text: tweet.text ?? "",
		observedAt,
		ingestedAt: "",
		raw: tweet,
	};
}

function addSinceId(
	params: URLSearchParams,
	cursor: BeatSourceCursor | undefined,
): void {
	if (cursor?.cursor && /^\d+$/.test(cursor.cursor)) {
		params.set("since_id", cursor.cursor);
	}
}

function getTweetIdFromCanonicalId(canonicalId: string): string | null {
	const parts = canonicalId.split(":");
	return parts.length === 4 && /^\d+$/.test(parts[3] ?? "")
		? (parts[3] ?? null)
		: null;
}

function maxNumericId(ids: Array<string | null>): string | null {
	let max: bigint | null = null;
	for (const id of ids) {
		if (!id) continue;
		const value = BigInt(id);
		if (max === null || value > max) {
			max = value;
		}
	}
	return max?.toString() ?? null;
}

function normalizeTwitterHandle(value: string): string {
	const trimmed = value.trim();
	const urlHandle = tryParseTwitterHandleUrl(trimmed);
	const candidate = urlHandle ?? trimmed;
	const withoutAt = candidate.startsWith("@") ? candidate.slice(1) : candidate;
	if (!/^[A-Za-z0-9_]{1,15}$/.test(withoutAt)) {
		throw new Error(`Invalid Twitter/X account locator: ${value}`);
	}
	return withoutAt;
}

function tryParseTwitterHandleUrl(value: string): string | null {
	if (!value.startsWith("http://") && !value.startsWith("https://")) {
		return null;
	}

	const url = new URL(value);
	const host = url.hostname.toLowerCase();
	if (
		!["twitter.com", "www.twitter.com", "x.com", "www.x.com"].includes(host)
	) {
		throw new Error(`Not a Twitter/X URL: ${value}`);
	}

	const firstSegment = url.pathname.split("/").filter(Boolean)[0];
	if (!firstSegment || firstSegment === "i") {
		throw new Error(`Twitter/X account URL must be a profile URL: ${value}`);
	}
	return firstSegment;
}

function normalizeNumericLocator(value: string, label: string): string {
	const trimmed = value.trim();
	if (/^\d+$/.test(trimmed)) {
		return trimmed;
	}

	if (trimmed.startsWith("twitter:uid:")) {
		const parsed = parseCanonicalChannelId(trimmed);
		if (parsed.platform === "twitter") {
			return parsed.stableId;
		}
	}

	throw new Error(`${label} must be numeric: ${value}`);
}

function clampInteger(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) {
		return DEFAULT_MAX_RESULTS;
	}
	return Math.min(Math.max(Math.floor(value), min), max);
}

function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}

async function safeReadBody(response: Response): Promise<string> {
	try {
		return await response.text();
	} catch {
		return "";
	}
}
