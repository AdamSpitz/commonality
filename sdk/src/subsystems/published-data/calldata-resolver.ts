/**
 * The calldata-backed `ContentResolver`: today's answer to "where do the bytes live?".
 *
 * The bytes live in the input of the transaction that published them, and nowhere else. This
 * resolver fetches that transaction and walks its calldata (see `calldata.ts`) to find the
 * matching `publishData` call.
 *
 * Known limitation, and the reason `content-resolver.ts` is a seam at all: this depends on the
 * RPC endpoint still serving old transactions. That is an archive-availability assumption, not a
 * decoding one, and it is the weakest part of the current design — see
 * spikes/the-graph-nested-calldata/README.md § Limitations.
 */

import { sha256, toBytes, type Address, type Hash } from 'viem';
import { getContractAddressesForChain, type SDKMachinery } from '../../machinery.js';
import { extractPublications, type PublicationTransaction } from './calldata.js';
import { createFallbackContentResolver, type ContentResolver, type PublicationPointer } from './content-resolver.js';
import { createIpfsContentResolverFromMachinery } from './ipfs-resolver.js';

/** Just the slice of viem's PublicClient this needs, so tests need not build a whole client. */
export type PublicationTransactionFetcher = (hash: Hash) => Promise<PublicationTransaction>;

export interface CalldataContentResolverOptions {
  /** The PublishedData deployment whose calls count as publications. */
  publishedDataAddress: Address;
  getTransaction: PublicationTransactionFetcher;
}

function matches(publisher: Address, candidate: Address): boolean {
  return candidate.toLowerCase() === publisher.toLowerCase();
}

/**
 * Build a ContentResolver that recovers content from the publishing transaction's calldata.
 *
 * Candidate calls are matched on `(publisher, dataId)` rather than on the content hash alone.
 * Both are needed: one bundled transaction can carry byte-identical content published by two
 * different smart accounts, and hash-only matching attributes those to the wrong account. Any
 * candidates still tied after both are applied are byte-identical by construction, so picking the
 * first cannot change the result.
 *
 * The final hash check lives in `resolvePublishedContent`, which verifies whatever comes back
 * here against the on-chain `dataId`.
 */
export function createCalldataContentResolver(options: CalldataContentResolverOptions): ContentResolver {
  return {
    async resolve(pointer: PublicationPointer): Promise<Uint8Array | null> {
      if (!pointer.transactionHash) return null;

      const transaction = await options.getTransaction(pointer.transactionHash);
      const { publications, unexplored } = extractPublications(transaction, options.publishedDataAddress);
      const candidates = publications.filter((publication) => matches(pointer.publisher, publication.publisher));

      // Narrow by content hash only if we must: dataId is sha256(content), so comparing the
      // recovered bytes' hash is what distinguishes several publications by the same account.
      const match = candidates.length > 1
        ? candidates.find((publication) => sha256(publication.content).toLowerCase() === pointer.dataId.toLowerCase()) ?? null
        : candidates[0] ?? null;

      if (!match) {
        if (unexplored.length > 0) {
          // The walker met a call shape it does not know. Surfacing it is the whole point of the
          // diagnostic: this is the message that tells us what to teach the walker.
          throw new Error(
            `No publishData call for ${pointer.publisher} in ${pointer.transactionHash}; ` +
            `unexplored calls: ${unexplored.map((call) => `${call.path} (${call.reason})`).join(', ')}`,
          );
        }
        return null;
      }

      return toBytes(match.content);
    },
  };
}

/**
 * Build the default ContentResolver for a chain.
 *
 * **This function is the storage swap point.** When content moves to a durable store, this is
 * where the new resolver gets constructed (most likely wrapped in
 * `createFallbackContentResolver` alongside this one, so pre-migration content keeps resolving).
 * An embedder can already override it per-application through `machinery.publishedContentResolver`.
 *
 * When an ordinary (non-mock) IPFS gateway is configured, it is used after calldata. The mirror
 * is asynchronous, so a miss is normal; calldata remains canonical and avoids a gateway request
 * whenever the publishing transaction is still available.
 *
 * Returns null only when neither calldata nor IPFS reads can be constructed.
 */
export function createDefaultContentResolver(
  machinery: SDKMachinery,
  options: { chainId?: number } = {},
): ContentResolver | null {
  if (machinery.publishedContentResolver) return machinery.publishedContentResolver;

  const chainId = options.chainId ?? machinery.defaultChainId;
  const publishedDataAddress = getContractAddressesForChain(machinery, chainId)?.publishedData;
  const resolvers: ContentResolver[] = [];

  if (machinery.publicClient && publishedDataAddress) {
    const publicClient = machinery.publicClient;
    resolvers.push(createCalldataContentResolver({
      publishedDataAddress,
      getTransaction: async (hash) => {
        const transaction = await publicClient.getTransaction({ hash });
        return { from: transaction.from, to: transaction.to, input: transaction.input };
      },
    }));
  }

  const ipfsResolver = createIpfsContentResolverFromMachinery(machinery);
  if (ipfsResolver) resolvers.push(ipfsResolver);
  if (resolvers.length === 0) return null;
  return resolvers.length === 1 ? resolvers[0] : createFallbackContentResolver(resolvers);
}
