/**
 * The IPFS-backed `ContentResolver`: the first durable answer to "where do the bytes live?".
 *
 * Calldata recovery (`calldata-resolver.ts`) depends on RPC providers retaining transaction
 * history indefinitely, which is an availability assumption we do not control. This resolver is
 * the durable mirror behind it — see
 * specs/tech/subsystems/published-data/README.md § "Retrieval is a swappable seam".
 *
 * What makes it cheap is that no extra state is needed to find the content. `dataId` **is**
 * `sha256(content)`, and a CIDv1 with the raw multicodec plus a sha2-256 multihash is exactly
 * that digest, so `publishedDataIdToCid` turns the on-chain pointer straight into the lookup key.
 * There is no manifest, no mapping table, and no second pointer to publish or keep in sync. Note
 * the consequence for whoever writes the copier: bytes must be added with `--cid-version=1
 * --raw-leaves` so the CID really is `sha256(content)`. Default `ipfs add` flags chunk into
 * dag-pb and produce a different CID, which would silently break this derivation.
 *
 * This resolver ignores `publisher` and the transaction fields entirely. That is the point: the
 * same bytes published by anyone resolve identically, which is what lets a third party heal a
 * missing mirror without our involvement.
 */

import type { SDKMachinery } from '../../machinery.js';
import { publishedDataIdToCid, type PublishedDataCid } from './id.js';
import type { ContentResolver, PublicationPointer } from './content-resolver.js';

/**
 * Fetches the raw bytes for a CID, or null if this backend simply does not have them.
 *
 * Injected rather than built in so tests need not stand up a gateway, and so an embedder can
 * supply a local node, a pinning service, or a browser helia instance instead of an HTTP gateway.
 */
export type PublishedDataCidFetcher = (cid: PublishedDataCid) => Promise<Uint8Array | null>;

export interface IpfsContentResolverOptions {
  fetchCid: PublishedDataCidFetcher;
}

/**
 * Build a ContentResolver that reads content from IPFS, keyed on the content hash alone.
 *
 * No verification happens here. `resolvePublishedContent` hashes whatever comes back and checks
 * it against the on-chain `dataId`, so a gateway that serves the wrong bytes is treated exactly
 * like one that has none — which is why an untrusted public gateway is a safe backend.
 */
export function createIpfsContentResolver(options: IpfsContentResolverOptions): ContentResolver {
  return {
    async resolve(pointer: PublicationPointer): Promise<Uint8Array | null> {
      return options.fetchCid(publishedDataIdToCid(pointer.dataId));
    },
  };
}

/**
 * An HTTP-gateway fetcher for `createIpfsContentResolver`.
 *
 * A miss must be null rather than an error: a mirror that has not been populated yet is the
 * expected case, not a failure, and `createFallbackContentResolver` needs to move on to the next
 * backend quietly. Genuine transport failures do throw, so they surface in the
 * `ContentUnavailableError` diagnostics rather than being silently indistinguishable from a miss.
 */
export function createGatewayCidFetcher(
  gatewayUrl: string,
  options: { timeoutMs?: number; validateResponse?: (response: Response) => void | Promise<void> } = {},
): PublishedDataCidFetcher {
  const base = gatewayUrl.replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? 10_000;

  return async (cid) => {
    const response = await fetch(`${base}/${cid}`, {
      signal: AbortSignal.timeout(timeoutMs),
      // Path-style only. Subdomain-gateway redirects (*.ipfs.localhost) do not resolve in many
      // environments, and following them here would turn a miss into a confusing transport error.
      redirect: 'manual',
    });
    await options.validateResponse?.(response);

    // A redirect here is the subdomain-gateway hop, which we do not follow; treat it as a miss.
    if (response.status >= 300 && response.status < 400) return null;
    if (response.status === 404 || response.status === 410) return null;
    if (!response.ok) {
      throw new Error(`IPFS gateway ${base} returned ${response.status} for ${cid}`);
    }

    return new Uint8Array(await response.arrayBuffer());
  };
}

/**
 * Build an IPFS resolver from the gateway in machinery config, for an embedder that wants one.
 *
 * `createDefaultContentResolver` adds this after calldata whenever a non-mock gateway is
 * configured. This ordering means environments only contact IPFS when calldata cannot answer,
 * while an asynchronously populated mirror can heal archive-RPC misses. Applications can still
 * opt out or replace the whole composition through `machinery.publishedContentResolver`.
 *
 * Deliberately not wired to the mock IPFS store either: that store round-trips JSON objects, not
 * the raw bytes PublishedData deals in, so pointing this at it would produce content that fails
 * verification. Tests should inject a `fetchCid` instead.
 */
export function createIpfsContentResolverFromMachinery(machinery: SDKMachinery): ContentResolver | null {
  const { gatewayUrl, shouldUseMock } = machinery.ipfsConfig;
  if (!gatewayUrl || shouldUseMock) return null;

  return createIpfsContentResolver({
    fetchCid: createGatewayCidFetcher(gatewayUrl, {
      validateResponse: machinery.ipfsConfig.validateGatewayResponse,
    }),
  });
}
