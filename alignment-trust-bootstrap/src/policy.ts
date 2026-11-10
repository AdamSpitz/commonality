import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getAddress, isAddress, type Address } from 'viem';

export function parseDenylist(contents: string): Set<Address> {
  let values: unknown;
  try {
    values = JSON.parse(contents);
  } catch {
    values = contents.split(/\r?\n/).map(line => line.replace(/#.*/, '').trim()).filter(Boolean);
  }
  if (!Array.isArray(values)) throw new Error('denylist must be a JSON array or one address per line');
  const result = new Set<Address>();
  for (const value of values) {
    if (typeof value !== 'string' || !isAddress(value)) throw new Error(`invalid denylist address: ${String(value)}`);
    result.add(getAddress(value));
  }
  return result;
}

export async function loadDenylist(path: string): Promise<Set<Address>> {
  try {
    return parseDenylist(await readFile(path, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Set();
    throw error;
  }
}

/** Create the denylist only when it is missing. An existing file, including an empty one, is never overwritten. */
export async function ensureDenylistFile(path: string, seedAddress: Address | undefined): Promise<'exists' | 'seeded' | 'absent'> {
  try {
    await access(path);
    return 'exists';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (!seedAddress) return 'absent';
  await mkdir(dirname(path), { recursive: true });
  const body = `# Seeded from ALIGNMENT_TRUST_DENYLISTED_ADDRESS. Later edits to this file are kept.
${seedAddress}
`;
  try {
    await writeFile(path, body, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return 'exists';
    throw error;
  }
  return 'seeded';
}
