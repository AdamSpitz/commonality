import { readFile, writeFile } from 'node:fs/promises';

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
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as FinderState;
    return {
      lastBlockSeen: parsed.lastBlockSeen ?? '0',
      evaluatedPairs: parsed.evaluatedPairs ?? [],
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export async function saveState(filePath: string, state: FinderState): Promise<void> {
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

export function pairKey(fromCid: string, toCid: string): string {
  return `${fromCid}:${toCid}`;
}
