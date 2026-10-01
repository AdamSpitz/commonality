import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Address } from 'viem';
import type { RefUpdatedLog } from './worker.js';

export interface WorkerCursor { blockNumber: bigint; logIndex: number }
export interface WorkerStateIdentity { chainId: number; mutableRefUpdaterAddress: Address }
export interface PendingRefUpdate { log: RefUpdatedLog; retryAfter: number }
export interface WorkerState { cursor: WorkerCursor; pending: PendingRefUpdate[] }

interface StoredState {
  chainId?: number;
  mutableRefUpdaterAddress?: string;
  blockNumber?: string;
  logIndex?: number;
  pending?: Array<{ log: Omit<RefUpdatedLog, 'blockNumber'> & { blockNumber: string }; retryAfter: number }>;
}

export async function readState(
  path: string,
  fallbackBlock: bigint,
  identity: WorkerStateIdentity,
): Promise<WorkerState> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as StoredState;
    if (parsed.blockNumber === undefined || parsed.logIndex === undefined) throw new Error('missing cursor');
    if (parsed.chainId !== identity.chainId
      || parsed.mutableRefUpdaterAddress?.toLowerCase() !== identity.mutableRefUpdaterAddress.toLowerCase()) {
      throw new Error('state belongs to a different chain or MutableRefUpdater contract');
    }
    return {
      cursor: { blockNumber: BigInt(parsed.blockNumber), logIndex: parsed.logIndex },
      pending: (parsed.pending ?? []).map(({ log, retryAfter }) => ({
        log: { ...log, blockNumber: BigInt(log.blockNumber) }, retryAfter,
      })),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { cursor: { blockNumber: fallbackBlock, logIndex: -1 }, pending: [] };
    }
    throw new Error(`Cannot read coherence worker state ${path}: ${String(error)}`);
  }
}

export async function writeState(
  path: string,
  state: WorkerState,
  identity: WorkerStateIdentity,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify({
    chainId: identity.chainId,
    mutableRefUpdaterAddress: identity.mutableRefUpdaterAddress,
    blockNumber: state.cursor.blockNumber.toString(),
    logIndex: state.cursor.logIndex,
    pending: state.pending.map(({ log, retryAfter }) => ({
      log: { ...log, blockNumber: log.blockNumber.toString() }, retryAfter,
    })),
  })}\n`);
  await rename(temporary, path);
}

export async function readCursor(path: string, fallbackBlock: bigint, identity: WorkerStateIdentity): Promise<WorkerCursor> {
  return (await readState(path, fallbackBlock, identity)).cursor;
}

export async function writeCursor(path: string, cursor: WorkerCursor, identity: WorkerStateIdentity): Promise<void> {
  await writeState(path, { cursor, pending: [] }, identity);
}
