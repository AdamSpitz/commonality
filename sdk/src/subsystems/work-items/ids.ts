import { getAddress, type Address, type Hex } from 'viem';
import { hashCanonicalId } from '../../content-identity/ids.js';

/** Maximum UTF-8 byte length accepted by ContentRegistry.registerWorks. */
export const MAX_WORK_ID_BYTES = 512;

/**
 * Hash a work id the same way content funding hashes a canonical content id:
 * keccak256 of the exact UTF-8 bytes. Do not trim or lowercase here.
 */
export function workIdHash(workId: string): Hex {
  assertValidWorkId(workId);
  return hashCanonicalId(workId);
}

export function assertValidWorkId(workId: string): void {
  if (typeof workId !== 'string') {
    throw new Error('A work id must be a string.');
  }
  const size = new TextEncoder().encode(workId).length;
  if (size === 0 || size > MAX_WORK_ID_BYTES) {
    throw new Error(`A work id must be 1 to ${MAX_WORK_ID_BYTES} UTF-8 bytes.`);
  }
}

/** Id the project factory assigns when the creator does not supply one. */
export function defaultProjectWorkId(project: Address): string {
  return `project:${getAddress(project).toLowerCase()}`;
}

/** Left-padded 20-byte address subject. Other bytes32 values are work hashes, not addresses. */
export function projectAddressFromAttestationSubject(subjectId: string): Address | null {
  const hex = subjectId.trim().toLowerCase().replace(/^0x/, '');
  if (!/^0{24}[0-9a-f]{40}$/.test(hex)) return null;
  return getAddress(`0x${hex.slice(24)}`);
}

export type WorkItemDescription = {
  id: string;
  description?: string;
  descriptionCid?: string;
};

/** Read optional extras.workItems. Unknown shapes are skipped. */
export function workItemsFromExtras(extras: Record<string, unknown> | undefined): WorkItemDescription[] {
  const raw = extras?.workItems;
  if (!Array.isArray(raw)) return [];
  const items: WorkItemDescription[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== 'string' || record.id.length === 0) continue;
    items.push({
      id: record.id,
      ...(typeof record.description === 'string' ? { description: record.description } : {}),
      ...(typeof record.descriptionCid === 'string' ? { descriptionCid: record.descriptionCid } : {}),
    });
  }
  return items;
}
