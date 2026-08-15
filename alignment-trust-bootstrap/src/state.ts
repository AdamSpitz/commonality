import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Address } from 'viem';

export interface Cursor { blockNumber: bigint; logIndex: number }
export interface StateIdentity { chainId: number; alignmentAttestationsAddress: Address }

export async function readCursor(path: string, fallback: bigint, identity: StateIdentity): Promise<Cursor> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    if (parsed.chainId !== identity.chainId
      || String(parsed.alignmentAttestationsAddress).toLowerCase() !== identity.alignmentAttestationsAddress.toLowerCase()) {
      throw new Error('state belongs to a different chain or alignment contract');
    }
    return { blockNumber: BigInt(String(parsed.blockNumber)), logIndex: Number(parsed.logIndex) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { blockNumber: fallback, logIndex: -1 };
    throw new Error(`Cannot read alignment trust bootstrap state ${path}: ${String(error)}`);
  }
}

export async function writeCursor(path: string, cursor: Cursor, identity: StateIdentity): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify({
    ...identity,
    blockNumber: cursor.blockNumber.toString(),
    logIndex: cursor.logIndex,
  })}\n`);
  await rename(temporary, path);
}
