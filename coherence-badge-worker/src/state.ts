import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Address } from 'viem';

export interface WorkerCursor { blockNumber: bigint; logIndex: number }
export interface WorkerStateIdentity { chainId: number; mutableRefUpdaterAddress: Address }

interface StoredState {
  chainId?: number;
  mutableRefUpdaterAddress?: string;
  blockNumber?: string;
  logIndex?: number;
}

export async function readCursor(
  path: string,
  fallbackBlock: bigint,
  identity: WorkerStateIdentity,
): Promise<WorkerCursor> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as StoredState;
    if (parsed.blockNumber === undefined || parsed.logIndex === undefined) throw new Error('missing cursor');
    if (parsed.chainId !== identity.chainId
      || parsed.mutableRefUpdaterAddress?.toLowerCase() !== identity.mutableRefUpdaterAddress.toLowerCase()) {
      throw new Error('state belongs to a different chain or MutableRefUpdater contract');
    }
    return { blockNumber: BigInt(parsed.blockNumber), logIndex: parsed.logIndex };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { blockNumber: fallbackBlock, logIndex: -1 };
    }
    throw new Error(`Cannot read coherence worker state ${path}: ${String(error)}`);
  }
}

export async function writeCursor(
  path: string,
  cursor: WorkerCursor,
  identity: WorkerStateIdentity,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify({
    chainId: identity.chainId,
    mutableRefUpdaterAddress: identity.mutableRefUpdaterAddress,
    blockNumber: cursor.blockNumber.toString(),
    logIndex: cursor.logIndex,
  })}\n`);
  await rename(temporary, path);
}
