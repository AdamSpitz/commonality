import { fetchFromIpfs, type IpfsConfig } from '@commonality/attester-core';
import type { IpfsCidV1 } from '@commonality/sdk';
import type { BeatAgentContentSource } from './attester.js';

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
