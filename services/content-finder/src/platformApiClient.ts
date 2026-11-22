import type { ContentAttesterRequest } from './attesterClient.js';

interface ResolvedContentResponse {
  canonicalId: string;
  metadata: Record<string, unknown>;
}

export interface ResolvedContentCandidate extends Pick<ContentAttesterRequest,
  'contentVersion' | 'authorId' | 'isReply' | 'mediaIsPrimary' | 'editableUntil' | 'quotedContent'> {
  canonicalId: string;
  contentUrl: string;
  contentText?: string;
}

export async function resolveContentCandidate(
  platformApiUrl: string,
  contentUrl: string,
  options: { fresh?: boolean } = {},
): Promise<ResolvedContentCandidate> {
  const response = await fetch(`${platformApiUrl}/resolve/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: contentUrl, fresh: options.fresh }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Platform API returned ${response.status}: ${body}`);
  }

  const resolved = await response.json() as ResolvedContentResponse;
  const contentText = typeof resolved.metadata.text === 'string'
    ? resolved.metadata.text
    : undefined;

  return {
    canonicalId: resolved.canonicalId,
    contentUrl,
    contentText,
    ...evaluationMetadata(resolved.metadata),
  };
}

function evaluationMetadata(metadata: Record<string, unknown>): Partial<ContentAttesterRequest> {
  const result: Partial<ContentAttesterRequest> = {};
  for (const key of ['contentVersion', 'authorId', 'editableUntil'] as const) {
    if (metadata[key] !== undefined) {
      if (typeof metadata[key] !== 'string' || !metadata[key].trim()) throw new Error(`Invalid resolved ${key}`);
      result[key] = metadata[key];
    }
  }
  if (result.editableUntil && !Number.isFinite(Date.parse(result.editableUntil))) throw new Error('Invalid resolved editableUntil');
  for (const key of ['isReply', 'mediaIsPrimary'] as const) {
    if (metadata[key] !== undefined) {
      if (typeof metadata[key] !== 'boolean') throw new Error(`Invalid resolved ${key}`);
      result[key] = metadata[key];
    }
  }
  if (metadata.quotedContent !== undefined) {
    if (!Array.isArray(metadata.quotedContent)) throw new Error('Invalid resolved quotedContent');
    result.quotedContent = metadata.quotedContent.map((quote: unknown) => {
      if (!quote || typeof quote !== 'object' || !('text' in quote) || typeof quote.text !== 'string') throw new Error('Invalid resolved quotedContent');
      const item: NonNullable<ContentAttesterRequest['quotedContent']>[number] = { text: quote.text };
      for (const key of ['contentVersion', 'contentCanonicalId'] as const) {
        if (key in quote) {
          const value = (quote as Record<string, unknown>)[key];
          if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid resolved quote ${key}`);
          item[key] = value;
        }
      }
      return item;
    });
  }
  return result;
}
