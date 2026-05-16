import { fetchFromIpfs, type IpfsConfig } from '@commonality/attester-core';
import type { IpfsCidV1 } from '@commonality/sdk';
import type { BeatAgentContentSource } from './attester.js';
import type { BeatAgentEvaluationRequest } from './types.js';

export interface BeatAgentContentResolutionOptions {
  platformApiUrl?: string;
  fetchUrlContent?: (url: string) => Promise<string>;
  fetchIpfsContent?: (ipfsConfig: IpfsConfig, cid: IpfsCidV1) => Promise<string>;
  fetchPlatformLocalContext?: (platformApiUrl: string, url: string) => Promise<PlatformLocalContextResponse>;
}

export interface PlatformLocalContextResponse {
  target?: {
    canonicalId?: unknown;
    text?: unknown;
  };
}


export async function resolveBeatAgentContent(
  source: BeatAgentContentSource,
  ipfsConfig: IpfsConfig,
  fetchUrlContent: (url: string) => Promise<string> = fetchUrlContentForBeatAgent,
): Promise<string> {
  if (source.contentText) {
    return source.contentText.trim();
  }

  if (source.contentUrl) {
    return fetchUrlContent(source.contentUrl);
  }

  if (!source.contentCid) {
    throw new Error('Missing content source');
  }

  const rawIpfsContent = await fetchFromIpfs(ipfsConfig, source.contentCid as IpfsCidV1);
  return extractTextFromStructuredContent(rawIpfsContent);
}

export async function resolveBeatAgentContentForRequest(
  request: BeatAgentEvaluationRequest,
  ipfsConfig: IpfsConfig,
  options: BeatAgentContentResolutionOptions = {},
): Promise<string> {
  if (request.contentUrl && options.platformApiUrl) {
    const localContext = await (options.fetchPlatformLocalContext ?? fetchPlatformLocalContextForBeatAgent)(
      options.platformApiUrl,
      request.contentUrl,
    );
    const resolvedCanonicalId = typeof localContext.target?.canonicalId === 'string'
      ? localContext.target.canonicalId
      : undefined;

    if (!resolvedCanonicalId) {
      throw new Error('Platform API local-context response did not include target.canonicalId');
    }
    if (resolvedCanonicalId !== request.contentCanonicalId) {
      throw new Error(
        `Content canonical ID mismatch: request used ${request.contentCanonicalId}, but platform API resolved ${resolvedCanonicalId}`,
      );
    }

    const targetText = typeof localContext.target?.text === 'string'
      ? localContext.target.text.trim()
      : '';
    if (targetText) {
      return targetText;
    }
  }

  if (request.contentCid) {
    const rawIpfsContent = await (options.fetchIpfsContent ?? fetchFromIpfs)(ipfsConfig, request.contentCid as IpfsCidV1);
    const structuredCanonicalId = extractCanonicalIdFromStructuredContent(rawIpfsContent);
    if (structuredCanonicalId && structuredCanonicalId !== request.contentCanonicalId) {
      throw new Error(
        `Content canonical ID mismatch: request used ${request.contentCanonicalId}, but content CID declares ${structuredCanonicalId}`,
      );
    }
    return extractTextFromStructuredContent(rawIpfsContent);
  }

  return resolveBeatAgentContent(toContentSource(request), ipfsConfig, options.fetchUrlContent);
}

function toContentSource(request: BeatAgentEvaluationRequest): BeatAgentContentSource {
  if (request.contentText) {
    return { contentText: request.contentText };
  }
  if (request.contentUrl) {
    return { contentUrl: request.contentUrl };
  }
  if (request.contentCid) {
    return { contentCid: request.contentCid };
  }
  throw new Error('Missing content source');
}

export async function fetchPlatformLocalContextForBeatAgent(
  platformApiUrl: string,
  url: string,
): Promise<PlatformLocalContextResponse> {
  const endpoint = new URL('/context/local', platformApiUrl);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve content URL through platform API: ${response.status} ${response.statusText}`);
  }
  return await response.json() as PlatformLocalContextResponse;
}

export async function fetchUrlContentForBeatAgent(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch content URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();
  if (contentType.includes('text/html')) {
    return stripHtmlToText(body);
  }
  return body.trim();
}

export function extractTextFromStructuredContent(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const content = parsed.content;
    if (content && typeof content === 'object' && typeof (content as { text?: unknown }).text === 'string') {
      return (content as { text: string }).text.trim();
    }
    if (typeof parsed.text === 'string') {
      return parsed.text.trim();
    }
  } catch {
    return raw.trim();
  }
  return raw.trim();
}

export function extractCanonicalIdFromStructuredContent(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.contentCanonicalId === 'string') {
      return parsed.contentCanonicalId;
    }
    if (typeof parsed.canonicalId === 'string') {
      return parsed.canonicalId;
    }
    const content = parsed.content;
    if (content && typeof content === 'object') {
      const contentRecord = content as Record<string, unknown>;
      if (typeof contentRecord.contentCanonicalId === 'string') {
        return contentRecord.contentCanonicalId;
      }
      if (typeof contentRecord.canonicalId === 'string') {
        return contentRecord.canonicalId;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
