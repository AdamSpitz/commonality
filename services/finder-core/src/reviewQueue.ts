export type ReviewLane = "finder" | "suggestion";

export interface ReviewQueueItem {
	lane: ReviewLane;
	dedupeKey: string;
	enqueuedAt: string;
}

export interface ReviewQueueLimits {
	finderCapacity: number;
	suggestionCapacity: number;
}

export interface EnqueueReviewResult {
	accepted: boolean;
	reason?: "duplicate" | "lane_full";
	/** True when this submission was already queued. Repeats do not raise priority. */
	alreadyQueued: boolean;
}

/**
 * Bounded review queue. Dedupes before paid evaluation. A repeat suggestion
 * does not move an item forward in the queue.
 */
export function enqueueReview<T extends ReviewQueueItem>(
	queue: T[],
	item: T,
	limits: ReviewQueueLimits,
): EnqueueReviewResult {
	if (queue.some((existing) => existing.dedupeKey === item.dedupeKey)) {
		return { accepted: false, reason: "duplicate", alreadyQueued: true };
	}
	const laneCount = queue.filter((existing) => existing.lane === item.lane).length;
	const capacity = item.lane === "finder" ? limits.finderCapacity : limits.suggestionCapacity;
	if (laneCount >= capacity) {
		return { accepted: false, reason: "lane_full", alreadyQueued: false };
	}
	queue.push(item);
	return { accepted: true, alreadyQueued: false };
}

export interface SpendBudget {
	ceilingUsd: number;
	reservedUsd: number;
	settledUsd: number;
}

/** Reserve estimated cost before an in-flight paid call. Returns false if the ceiling would be exceeded. */
export function reserveSpend(budget: SpendBudget, estimatedUsd: number): boolean {
	if (budget.reservedUsd + budget.settledUsd + estimatedUsd > budget.ceilingUsd) {
		return false;
	}
	budget.reservedUsd += estimatedUsd;
	return true;
}

export function settleSpend(budget: SpendBudget, estimatedUsd: number, actualUsd = estimatedUsd): void {
	budget.reservedUsd = Math.max(0, budget.reservedUsd - estimatedUsd);
	budget.settledUsd += actualUsd;
}

export function releaseSpend(budget: SpendBudget, estimatedUsd: number): void {
	budget.reservedUsd = Math.max(0, budget.reservedUsd - estimatedUsd);
}

/**
 * Take up to batchSize items, filling each lane's share first.
 * Unused slots from an empty lane go to the other lane.
 */
export function takeReviewBatch<T extends ReviewQueueItem>(
	queue: readonly T[],
	batchSize: number,
	finderShare: number,
): T[] {
	if (batchSize <= 0) return [];
	const share = Math.min(1, Math.max(0, finderShare));
	const finderSlots = Math.round(batchSize * share);
	const suggestionSlots = batchSize - finderSlots;
	const taken: T[] = [];
	let finder = 0;
	let suggestion = 0;
	for (const item of queue) {
		if (item.lane === "finder" && finder < finderSlots) {
			taken.push(item);
			finder++;
		} else if (item.lane === "suggestion" && suggestion < suggestionSlots) {
			taken.push(item);
			suggestion++;
		}
	}
	for (const item of queue) {
		if (taken.length >= batchSize) break;
		if (!taken.includes(item)) taken.push(item);
	}
	return taken;
}
