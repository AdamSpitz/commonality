import { loadJsonState, saveJsonState } from '@commonality/finder-core';

export interface ContentFinderState {
  processedSubmissionKeys: string[];
  queuedKeys?: string[];
  spendPeriod?: string;
  reservedUsd?: number;
  settledUsd?: number;
  droppedDuplicateCount?: number;
  droppedQueueFullCount?: number;
  droppedBudgetCount?: number;
}

const EMPTY_STATE: ContentFinderState = {
  processedSubmissionKeys: [],
  queuedKeys: [],
  reservedUsd: 0,
  settledUsd: 0,
  droppedDuplicateCount: 0,
  droppedQueueFullCount: 0,
  droppedBudgetCount: 0,
};

export async function loadState(filePath: string): Promise<ContentFinderState> {
  return loadJsonState(
    filePath,
    (value: unknown) => {
      const parsed = value as Partial<ContentFinderState>;
      return {
        processedSubmissionKeys: parsed.processedSubmissionKeys ?? [],
        queuedKeys: parsed.queuedKeys ?? [],
        spendPeriod: parsed.spendPeriod,
        reservedUsd: parsed.reservedUsd ?? 0,
        settledUsd: parsed.settledUsd ?? 0,
        droppedDuplicateCount: parsed.droppedDuplicateCount ?? 0,
        droppedQueueFullCount: parsed.droppedQueueFullCount ?? 0,
        droppedBudgetCount: parsed.droppedBudgetCount ?? 0,
      };
    },
    () => ({ ...EMPTY_STATE }),
  );
}

export async function saveState(filePath: string, state: ContentFinderState): Promise<void> {
  await saveJsonState(filePath, state);
}
