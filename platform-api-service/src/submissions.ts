import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseContentFundingUrl } from '@commonality/sdk/content-funding';
import { ensureIpfsCidV1, type IpfsCidV1 } from '@commonality/sdk/utils';
import { HttpError } from './errors.js';

export interface ContentSubmission {
  contentUrl: string;
  statementCid: IpfsCidV1;
  declaredPerspective?: string;
}

export interface ContentSubmissionStore {
  list(): Promise<ContentSubmission[]>;
  enqueue(submission: ContentSubmission): Promise<ContentSubmission>;
}

export class FileContentSubmissionStore implements ContentSubmissionStore {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async list(): Promise<ContentSubmission[]> {
    return await readSubmissionFile(this.filePath);
  }

  async enqueue(submission: ContentSubmission): Promise<ContentSubmission> {
    await this.runExclusive(async () => {
      const existing = await readSubmissionFile(this.filePath);
      if (existing.some((entry) => submissionKey(entry) === submissionKey(submission))) {
        throw new HttpError(
          409,
          'content_submission_exists',
          'This content submission is already queued',
        );
      }

      existing.push(submission);
      await writeSubmissionFile(this.filePath, existing);
    });

    return submission;
  }

  private async runExclusive<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.writeChain;
    let release!: () => void;
    this.writeChain = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await work();
    } finally {
      release();
    }
  }
}

export function parseContentSubmission(value: unknown): ContentSubmission {
  if (!value || typeof value !== 'object') {
    throw new HttpError(400, 'invalid_request', 'Content submission must be a JSON object');
  }

  const entry = value as Record<string, unknown>;
  const contentUrl = normalizeRequiredString(entry.contentUrl, 'contentUrl');
  const statementCid = normalizeStatementCid(entry.statementCid);
  const declaredPerspective = normalizeOptionalString(entry.declaredPerspective, 'declaredPerspective');

  try {
    parseContentFundingUrl(contentUrl);
  } catch (error) {
    throw new HttpError(
      400,
      'invalid_request',
      error instanceof Error ? error.message : 'Invalid content URL',
    );
  }

  return {
    contentUrl,
    statementCid,
    declaredPerspective,
  };
}

export function submissionKey(submission: ContentSubmission): string {
  return [
    submission.statementCid,
    submission.contentUrl,
    submission.declaredPerspective ?? '',
  ].join(':');
}

async function readSubmissionFile(filePath: string): Promise<ContentSubmission[]> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('Submission file must contain a JSON array');
    }

    return parsed.map((entry) => parseContentSubmission(entry));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    if (error instanceof HttpError) {
      throw error;
    }

    throw new Error(
      `Failed to read content submissions from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function writeSubmissionFile(
  filePath: string,
  submissions: ContentSubmission[],
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tempFilePath = `${filePath}.tmp`;
  await writeFile(tempFilePath, JSON.stringify(submissions, null, 2) + '\n', 'utf-8');
  await rename(tempFilePath, filePath);
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'invalid_request', `Missing required field: ${fieldName}`);
  }

  return value.trim();
}

function normalizeOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'invalid_request', `${fieldName} must be a string when provided`);
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function normalizeStatementCid(value: unknown): IpfsCidV1 {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'invalid_request', 'Missing required field: statementCid');
  }

  try {
    return ensureIpfsCidV1(value.trim());
  } catch (error) {
    throw new HttpError(
      400,
      'invalid_request',
      error instanceof Error ? error.message : 'Invalid statement CID',
    );
  }
}
