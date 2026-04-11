interface ResolvedContentResponse {
  canonicalId: string;
  metadata: Record<string, unknown>;
}

export interface ResolvedContentCandidate {
  canonicalId: string;
  contentUrl: string;
  contentText?: string;
}

export async function resolveContentCandidate(
  platformApiUrl: string,
  contentUrl: string,
): Promise<ResolvedContentCandidate> {
  const response = await fetch(`${platformApiUrl}/resolve/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: contentUrl }),
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
  };
}
