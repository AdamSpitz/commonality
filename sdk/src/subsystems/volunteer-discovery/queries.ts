import { getAddress, type Address } from 'viem';
import type { SDKMachinery } from '../../machinery.js';
import { fetchEventsComplete, type RawEventFromCache } from '../../utils/eventCacheClient.js';
import { getContractAddressesForChain } from '../../machinery.js';
import { createDefaultContentResolver } from '../published-data/calldata-resolver.js';
import { resolvePublishedContent, type ContentResolver } from '../published-data/content-resolver.js';
import { publicationPointerFromEvent } from '../published-data/event-cache.js';
import { publishedDataIdToCid } from '../published-data/id.js';
import type { PublishedDataId } from '../published-data/types.js';
import { validateDisplayableDocument } from '../displayable-documents/displayable-document.js';
import {
  parseVolunteerDiscoveryDocument,
  type VolunteerDiscoveryRecord,
} from './documents.js';

function topicToAddress(topic: string | null): Address {
  return getAddress(`0x${topic!.slice(-40)}`);
}

function dataIdOf(event: RawEventFromCache): PublishedDataId {
  return event.topic2!.toLowerCase() as PublishedDataId;
}

/**
 * Every live work-pledge and work-request that names one of the statements.
 *
 * PublishedData logs carry no content and no statement topic, so this reads
 * publication pointers and resolves bytes one at a time, keeping only documents
 * of these two kinds. Fine while the publication set is small; an index is
 * warranted once it is not.
 */
export async function loadVolunteerDiscovery(
  machinery: SDKMachinery,
  statementCids: readonly string[],
  options: { contentResolver?: ContentResolver } = {},
): Promise<VolunteerDiscoveryRecord[]> {
  const wanted = new Set(statementCids);
  if (wanted.size === 0) return [];

  const chainId = machinery.defaultChainId;
  const contractAddress = getContractAddressesForChain(machinery, chainId)?.publishedData;
  const contentResolver = options.contentResolver ?? createDefaultContentResolver(machinery, { chainId });
  if (!contentResolver) return [];

  const [published, retracted] = await Promise.all([
    fetchEventsComplete(machinery, { chainId, contractAddress, eventName: 'DataPublished' }),
    fetchEventsComplete(machinery, { chainId, contractAddress, eventName: 'DataRetracted' }),
  ]);

  const retractedKeys = new Set(
    retracted.map((event) => `${topicToAddress(event.topic1).toLowerCase()}:${dataIdOf(event)}`),
  );

  const records: VolunteerDiscoveryRecord[] = [];
  const seen = new Set<string>();
  for (const event of published) {
    if (!event.topic1 || !event.topic2) continue;
    const author = topicToAddress(event.topic1);
    const dataId = dataIdOf(event);
    const key = `${author.toLowerCase()}:${dataId}`;
    if (retractedKeys.has(key) || seen.has(key)) continue;
    seen.add(key);

    let bytes: Uint8Array;
    try {
      bytes = await resolvePublishedContent(
        contentResolver,
        dataId,
        [publicationPointerFromEvent(event, dataId)],
      );
    } catch {
      continue;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      continue;
    }
    if (!validateDisplayableDocument(raw).valid) continue;
    const parsed = parseVolunteerDiscoveryDocument(raw as Parameters<typeof parseVolunteerDiscoveryDocument>[0]);
    if (!parsed || !wanted.has(parsed.statementCid)) continue;
    records.push({ ...parsed, cid: publishedDataIdToCid(dataId), author });
  }
  return records;
}
