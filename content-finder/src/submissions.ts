import { readFile } from 'node:fs/promises';
import type { IpfsCidV1 } from '@commonality/sdk/utils';

export interface ContentSubmission {
  contentUrl: string;
  statementCid: IpfsCidV1;
  declaredPerspective?: string;
}

export async function loadSubmissions(filePath: string): Promise<ContentSubmission[]> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('Submission file must contain a JSON array');
    }

    return parsed.map((entry, index) => parseSubmission(entry, index));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function loadSubmissionsFromApi(apiUrl: string): Promise<ContentSubmission[]> {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Submission API request failed: ${response.status} ${response.statusText}`);
  }

  const parsed = await response.json() as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Submission API response must contain a JSON array');
  }

  return parsed.map((entry, index) => parseSubmission(entry, index));
}

function parseSubmission(value: unknown, index: number): ContentSubmission {
  const entry = value as Partial<ContentSubmission>;
  if (!entry || typeof entry.contentUrl !== 'string' || typeof entry.statementCid !== 'string') {
    throw new Error(`Invalid content submission at index ${index}`);
  }

  if (entry.declaredPerspective !== undefined && typeof entry.declaredPerspective !== 'string') {
    throw new Error(`Invalid declaredPerspective at index ${index}`);
  }

  return {
    contentUrl: entry.contentUrl,
    statementCid: entry.statementCid as IpfsCidV1,
    declaredPerspective: entry.declaredPerspective,
  };
}

export function submissionKey(submission: ContentSubmission): string {
  return [
    submission.statementCid,
    submission.contentUrl,
    submission.declaredPerspective ?? '',
  ].join(':');
}
