import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Address } from 'viem';

export interface MirrorStateIdentity {
  chainId: number;
  publishedDataAddress: Address;
}

interface StoredMirrorState {
  chainId?: number;
  publishedDataAddress?: string;
  nextBlock?: string;
}

export async function readNextBlock(
  path: string,
  fallback: bigint,
  identity: MirrorStateIdentity,
): Promise<bigint> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as StoredMirrorState;
    if (!parsed.nextBlock) throw new Error('missing nextBlock');
    if (parsed.chainId !== identity.chainId
      || parsed.publishedDataAddress?.toLowerCase() !== identity.publishedDataAddress.toLowerCase()) {
      throw new Error('state belongs to a different chain or PublishedData contract');
    }
    return BigInt(parsed.nextBlock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw new Error(`Cannot read mirror state ${path}: ${String(error)}`);
  }
}

export async function writeNextBlock(
  path: string,
  nextBlock: bigint,
  identity: MirrorStateIdentity,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  const state = {
    chainId: identity.chainId,
    publishedDataAddress: identity.publishedDataAddress,
    nextBlock: nextBlock.toString(),
  };
  await writeFile(temporary, `${JSON.stringify(state)}\n`);
  await rename(temporary, path);
}
