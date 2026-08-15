import { readFile } from 'node:fs/promises';
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
