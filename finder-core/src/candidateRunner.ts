export type FinderProcessedStatus = "submitted" | "not_promising" | "failed";

export interface FinderProcessedItemBase {
	processedAt: string;
	status: FinderProcessedStatus;
	retries?: number;
	lastError?: string;
	reason?: string;
}

export interface FinderRunSummary {
	scannedItemCount: number;
	skippedAlreadyProcessedCount: number;
	notPromisingCount: number;
	submittedCount: number;
	failedCandidateIds: string[];
}

export async function runFinderCandidatePass<TItem, TCandidate, TProcessed extends FinderProcessedItemBase>(params: {
	items: TItem[];
	processedItems: Record<string, TProcessed>;
	getItemId: (item: TItem) => string;
	selectCandidate: (item: TItem) => Promise<TCandidate | null> | TCandidate | null;
	submitCandidate: (params: {
		item: TItem;
		candidate: TCandidate;
		nowIso: string;
	}) => Promise<TProcessed>;
	buildNotPromisingProcessedItem: (params: { item: TItem; nowIso: string }) => TProcessed;
	buildFailedProcessedItem: (params: {
		item: TItem;
		candidate: TCandidate;
		previous: TProcessed | undefined;
		error: unknown;
		nowIso: string;
	}) => TProcessed;
	now?: Date;
	maxRetries?: number;
}): Promise<FinderRunSummary> {
	const nowIso = (params.now ?? new Date()).toISOString();
	const summary: FinderRunSummary = {
		scannedItemCount: 0,
		skippedAlreadyProcessedCount: 0,
		notPromisingCount: 0,
		submittedCount: 0,
		failedCandidateIds: [],
	};

	for (const item of params.items) {
		summary.scannedItemCount += 1;
		const itemId = params.getItemId(item);
		const previous = params.processedItems[itemId];

		if (previous && previous.status !== "failed") {
			summary.skippedAlreadyProcessedCount += 1;
			continue;
		}

		if (previous?.status === "failed") {
			const maxRetries = params.maxRetries ?? 3;
			if ((previous.retries ?? 0) >= maxRetries) {
				summary.skippedAlreadyProcessedCount += 1;
				continue;
			}
		}

		const candidate = await params.selectCandidate(item);
		if (!candidate) {
			params.processedItems[itemId] = params.buildNotPromisingProcessedItem({
				item,
				nowIso,
			});
			summary.notPromisingCount += 1;
			continue;
		}

		try {
			params.processedItems[itemId] = await params.submitCandidate({
				item,
				candidate,
				nowIso,
			});
			summary.submittedCount += 1;
		} catch (error) {
			params.processedItems[itemId] = params.buildFailedProcessedItem({
				item,
				candidate,
				previous,
				error,
				nowIso,
			});
			summary.failedCandidateIds.push(itemId);
		}
	}

	return summary;
}
