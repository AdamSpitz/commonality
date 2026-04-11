import { loadJsonState, saveJsonState } from '@commonality/finder-core';

export interface FinderState {
  /** Last block number we've processed up to. */
  lastBlockSeen: string;
  /** Set of "fromCid:toCid" pairs we've already sent to the attester. */
  evaluatedPairs: string[];
}

const EMPTY_STATE: FinderState = {
  lastBlockSeen: '0',
  evaluatedPairs: [],
};

export async function loadState(filePath: string): Promise<FinderState> {
  return loadJsonState(
    filePath,
    (value: unknown) => {
      const parsed = value as Partial<FinderState>;
      return {
        lastBlockSeen: parsed.lastBlockSeen ?? '0',
        evaluatedPairs: parsed.evaluatedPairs ?? [],
      };
    },
    () => ({ ...EMPTY_STATE }),
  );
}

export async function saveState(filePath: string, state: FinderState): Promise<void> {
  await saveJsonState(filePath, state);
}

export function pairKey(fromCid: string, toCid: string): string {
  return `${fromCid}:${toCid}`;
}
