import { mkdir, open, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { loadJsonState } from '@commonality/finder-core';

export interface ContentFinderQueueItem {
  lane: 'finder' | 'suggestion';
  dedupeKey: string;
  enqueuedAt: string;
}

export interface ContentFinderState {
  processedSubmissionKeys: string[];
  queuedKeys?: string[];
  queuedItems?: ContentFinderQueueItem[];
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
        queuedItems: Array.isArray(parsed.queuedItems)
          ? parsed.queuedItems.filter((item): item is ContentFinderQueueItem =>
            !!item && (item.lane === 'finder' || item.lane === 'suggestion') && typeof item.dedupeKey === 'string')
          : undefined,
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
  await mkdir(dirname(filePath), { recursive: true });
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    existing = {};
  }
  await writeFile(filePath, JSON.stringify({ ...existing, ...state }, null, 2));
}

/** Serializes finder and beat-memory updates when they share a spend file. */
export async function withStateLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const path = `${filePath}.lock`;
  await mkdir(dirname(filePath), { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      const handle = await open(path, 'wx');
      try {
        return await fn();
      } finally {
        await handle.close();
        await unlink(path).catch(() => undefined);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || Date.now() - started > 5000) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}
