import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { postJsonCandidate } from "../src/http.js";

function response(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers: { "content-type": "application/json" },
	});
}

describe("postJsonCandidate", () => {
	it("posts JSON candidate requests with optional headers", async () => {
		let submittedBody: unknown;
		let finderKey: string | null = null;
		const fetchImpl: typeof fetch = async (_input, init) => {
			try {
				submittedBody = JSON.parse(init?.body as string);
			} catch (error) {
				throw new Error(
					`Invalid candidate request JSON: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			finderKey = new Headers(init?.headers).get("x-finder-key");
			return response({ decision: "positive" });
		};

		const result = await postJsonCandidate<
			{ contentCanonicalId: string },
			{ decision: string }
		>({
			endpointUrl: "https://finder.example/evaluate-content",
			body: { contentCanonicalId: "twitter:tweet:1" },
			headers: { "x-finder-key": "shared-secret" },
			fetchImpl,
		});

		assert.deepEqual(submittedBody, { contentCanonicalId: "twitter:tweet:1" });
		assert.equal(finderKey, "shared-secret");
		assert.deepEqual(result, { decision: "positive" });
	});

	it("throws on non-2xx responses", async () => {
		await assert.rejects(
			postJsonCandidate({
				endpointUrl: "https://finder.example/evaluate-content",
				body: { contentCanonicalId: "twitter:tweet:1" },
				fetchImpl: async () => response({ error: "bad" }, { status: 503 }),
			}),
			/Finder candidate submission failed with HTTP 503/,
		);
	});
});
