import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function readNextBlock(path: string, fallback: bigint): Promise<bigint> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as { nextBlock?: string };
    if (!parsed.nextBlock) throw new Error('missing nextBlock');
    return BigInt(parsed.nextBlock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw new Error(`Cannot read mirror state ${path}: ${String(error)}`);
  }
}

export async function writeNextBlock(path: string, nextBlock: bigint): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify({ nextBlock: nextBlock.toString() })}\n`);
  await rename(temporary, path);
}
