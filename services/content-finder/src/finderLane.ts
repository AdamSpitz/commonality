import { readFile } from 'node:fs/promises';

export interface FinderLaneItem {
  contentCanonicalId: string;
  contentUrl?: string;
  text: string;
  authorId?: string;
  contentVersion?: string;
  isReply?: boolean;
  mediaIsPrimary?: boolean;
  editableUntil?: string;
  quotedText?: string;
}

export function finderDedupeKey(contentCanonicalId: string, statementCid: string): string {
  return `finder:${contentCanonicalId}:${statementCid}`;
}

/** Posts still inside an edit window, replies, and media-primary posts are not review candidates. */
export function isFinderReviewCandidate(item: FinderLaneItem, now = new Date()): boolean {
  if (item.isReply || item.mediaIsPrimary) return false;
  if (item.editableUntil && Date.parse(item.editableUntil) > now.getTime()) return false;
  return Boolean(item.text?.trim());
}

export async function loadFinderLaneItems(filePath: string): Promise<FinderLaneItem[]> {
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as { items?: FinderLaneItem[] };
  return parsed.items ?? [];
}
