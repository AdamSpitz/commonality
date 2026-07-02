import { runFinderCandidatePass, type FinderProcessedItemBase, type FinderRunSummary } from "./candidateRunner.js";
import { loadJsonState, saveJsonState } from "./state.js";

export async function runJsonStateFinderCandidatePass<
	TItem,
	TCandidate,
	TProcessed extends FinderProcessedItemBase,
	TState extends { processedItems: Record<string, TProcessed> },
>(params: {
	stateFilePath: string;
	items: TItem[];
	parseState: (value: unknown) => TState;
	createEmptyState: () => TState;
	getItemId: (item: TItem) => string;
	selectCandidate: (
		item: TItem,
	) => Promise<TCandidate | null> | TCandidate | null;
	submitCandidate: (params: {
		item: TItem;
		candidate: TCandidate;
		nowIso: string;
	}) => Promise<TProcessed>;
	buildNotPromisingProcessedItem: (params: {
		item: TItem;
		nowIso: string;
	}) => TProcessed;
	buildFailedProcessedItem: (params: {
		item: TItem;
		candidate: TCandidate;
		previous: TProcessed | undefined;
		error: unknown;
		nowIso: string;
	}) => TProcessed;
	now?: Date;
	maxRetries?: number;
}): Promise<{ state: TState; summary: FinderRunSummary }> {
	const state = await loadJsonState(
		params.stateFilePath,
		params.parseState,
		params.createEmptyState,
	);
	const summary = await runFinderCandidatePass({
		items: params.items,
		processedItems: state.processedItems,
		getItemId: params.getItemId,
		selectCandidate: params.selectCandidate,
		submitCandidate: params.submitCandidate,
		buildNotPromisingProcessedItem: params.buildNotPromisingProcessedItem,
		buildFailedProcessedItem: params.buildFailedProcessedItem,
		now: params.now,
		maxRetries: params.maxRetries,
	});

	await saveJsonState(params.stateFilePath, state);
	return { state, summary };
}
