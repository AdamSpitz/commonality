import assert from "node:assert/strict";
import { enqueueReview, reserveSpend, type ReviewQueueItem } from "../src/reviewQueue.js";

describe("review queue", () => {
	it("does not raise priority when the same post is suggested again", () => {
		const queue: ReviewQueueItem[] = [];
		const first = enqueueReview(queue, { lane: "suggestion", dedupeKey: "post-1", enqueuedAt: "t1" }, {
			finderCapacity: 1,
			suggestionCapacity: 1,
		});
		const second = enqueueReview(queue, { lane: "suggestion", dedupeKey: "post-1", enqueuedAt: "t2" }, {
			finderCapacity: 1,
			suggestionCapacity: 1,
		});
		assert.equal(first.accepted, true);
		assert.equal(second.alreadyQueued, true);
		assert.equal(queue[0]?.enqueuedAt, "t1");
	});

	it("keeps finder and suggestion capacity separate", () => {
		const queue: ReviewQueueItem[] = [{ lane: "finder", dedupeKey: "a", enqueuedAt: "t0" }];
		const suggestion = enqueueReview(queue, { lane: "suggestion", dedupeKey: "b", enqueuedAt: "t1" }, {
			finderCapacity: 1,
			suggestionCapacity: 1,
		});
		assert.equal(suggestion.accepted, true);
	});

	it("reserves spend against in-flight cost", () => {
		const budget = { ceilingUsd: 1, reservedUsd: 0.6, settledUsd: 0 };
		assert.equal(reserveSpend(budget, 0.5), false);
		assert.equal(budget.reservedUsd, 0.6);
	});
});
