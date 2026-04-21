/**
 * Fetches the domain field from a statement's IPFS content.
 * Returns null if the statement content cannot be fetched or parsed.
 */
export async function fetchStatementDomain(
  ipfsGatewayUrl: string,
  cid: string,
): Promise<string | null> {
  try {
    const response = await fetch(`${ipfsGatewayUrl}/ipfs/${cid}`);
    if (!response.ok) return null;
    const content = await response.json() as Record<string, unknown>;
    return typeof content?.domain === 'string' ? content.domain : null;
  } catch {
    return null;
  }
}

/**
 * Fetches domains for all unique CIDs in parallel.
 * Returns a map from CID to domain (entries with null domain are omitted).
 */
export async function fetchStatementDomains(
  ipfsGatewayUrl: string,
  cids: string[],
): Promise<Map<string, string>> {
  const uniqueCids = [...new Set(cids)];
  const results = await Promise.all(
    uniqueCids.map(async (cid) => {
      const domain = await fetchStatementDomain(ipfsGatewayUrl, cid);
      return { cid, domain };
    }),
  );

  const domainMap = new Map<string, string>();
  for (const { cid, domain } of results) {
    if (domain !== null) {
      domainMap.set(cid, domain);
    }
  }
  return domainMap;
}
