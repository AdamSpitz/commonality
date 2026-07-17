import type { Address } from 'viem';
import type { PublishedDataCache, PublishedDataId, PublishedDataReadResult } from './types.js';

export async function readData(
  cache: PublishedDataCache,
  publisher: Address,
  dataId: PublishedDataId,
): Promise<PublishedDataReadResult> {
  const published = await cache.isPublished(publisher, dataId);
  if (!published) return { status: 'not-published' };

  const data = await cache.getPublishedData(publisher, dataId);
  if (!data) return { status: 'not-published' };

  const retracted = await cache.isRetracted(publisher, dataId);
  if (retracted) return { status: 'retracted', retractedData: data };

  return { status: 'active', data };
}

export async function readActiveData(
  cache: PublishedDataCache,
  publisher: Address,
  dataId: PublishedDataId,
): Promise<Uint8Array | null> {
  const result = await readData(cache, publisher, dataId);
  return result.status === 'active' ? result.data : null;
}

export async function readRetractions(
  cache: Pick<PublishedDataCache, 'isRetracted'>,
  dataId: PublishedDataId,
  retractors: readonly Address[],
): Promise<Address[]> {
  const honoredRetractors: Address[] = [];
  for (const retractor of retractors) {
    if (await cache.isRetracted(retractor, dataId)) honoredRetractors.push(retractor);
  }
  return honoredRetractors;
}
