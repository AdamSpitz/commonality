import { type Address } from 'viem';
import { type DisplayableDocument, createDefaultDocumentReader, type DocumentReadResult } from '../../displayable-documents/displayable-document.js';
import { IpfsCidV1 } from '../../../utils/cid-types.js';
import { SDKMachinery } from '../../../machinery.js';
import type { DecodedDirectSupportEvent } from '../../../utils/eventDecoder.js';
import type { StatementContentStatus, StatementListItem } from '../types.js';

export function uniqueAddresses(values: Iterable<string>): Address[] {
  return Array.from(new Set(Array.from(values, value => value.toLowerCase()))).map(value => value as Address);
}

export function publisherCandidatesByStatement(events: readonly DecodedDirectSupportEvent[]): Map<string, Address[]> {
  const byStatement = new Map<string, string[]>();
  for (const event of events) {
    const existing = byStatement.get(event.statementId) ?? [];
    existing.push(event.user);
    byStatement.set(event.statementId, existing);
  }
  return new Map(Array.from(byStatement, ([cid, publishers]) => [cid, uniqueAddresses(publishers)]));
}

function statementDocumentFromReadResult(result: DocumentReadResult): { content: DisplayableDocument | null; status: StatementContentStatus } {
  switch (result.status) {
    case 'active':
      return { content: result.document, status: 'active' };
    case 'retracted':
      return { content: null, status: 'retracted' };
    case 'not-published':
    case 'invalid':
    case 'unavailable':
      return { content: null, status: 'unavailable' };
  }
}

export async function fetchStatementDocument(
  machinery: SDKMachinery,
  cid: IpfsCidV1,
  timeout = 5000,
  _publisherCandidates: readonly Address[] = [],
): Promise<{ content: DisplayableDocument | null; status: StatementContentStatus }> {
  const reader = createDefaultDocumentReader(machinery, { readTimeout: timeout });
  return statementDocumentFromReadResult(await reader.read(cid));
}

export async function enrichWithActiveStatementContent(
  machinery: SDKMachinery,
  items: StatementListItem[],
  publisherCandidates = new Map<string, Address[]>(),
): Promise<StatementListItem[]> {
  const enriched = await Promise.all(items.map(async item => {
    const { content: doc, status } = await fetchStatementDocument(machinery, item.cid, 5000, publisherCandidates.get(item.cid) ?? []);
    if (status === 'retracted') return null;
    const content = status === 'active' ? (doc as unknown as Record<string, unknown> | null)?.content ?? '' : '';
    return {
      ...item,
      title: String(content).split('\n')[0].slice(0, 200),
      excerpt: String(content).slice(0, 200),
    };
  }));
  return enriched.filter((item): item is StatementListItem => item !== null);
}
