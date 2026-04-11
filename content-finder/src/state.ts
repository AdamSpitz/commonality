import { loadJsonState, saveJsonState } from '@commonality/finder-core';

export interface ContentFinderState {
  processedSubmissionKeys: string[];
}

const EMPTY_STATE: ContentFinderState = {
  processedSubmissionKeys: [],
};

export async function loadState(filePath: string): Promise<ContentFinderState> {
  return loadJsonState(
    filePath,
    (value: unknown) => {
      const parsed = value as Partial<ContentFinderState>;
      return {
        processedSubmissionKeys: parsed.processedSubmissionKeys ?? [],
      };
    },
    () => ({ ...EMPTY_STATE }),
  );
}

export async function saveState(filePath: string, state: ContentFinderState): Promise<void> {
  await saveJsonState(filePath, state);
}
