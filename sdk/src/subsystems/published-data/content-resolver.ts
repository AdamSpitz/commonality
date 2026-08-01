/**
 * The storage seam for PublishedData content.
 *
 * `PublishedData` records *that* Alice published content with a given hash; it never records the
 * content. Everything on-chain, and everything the indexer stores, is a **pointer**. Turning a
 * pointer back into bytes is the job of a `ContentResolver`, and it is deliberately the only
 * place in the SDK that knows where content physically lives.
 *
 * Today the sole implementation recovers bytes from the publishing transaction's calldata
 * (`calldata-resolver.ts`). That is expected to change: calldata recovery depends on RPC
 * providers retaining transaction history indefinitely, and a storage layer with real durability
 * guarantees is the likely successor. Swapping it means writing one more `ContentResolver` and
 * changing which one `createDefaultContentResolver` returns — no caller above this seam moves.
 *
 * What makes that swap safe rather than merely tidy is content addressing: `dataId` *is*
 * `sha256(content)`, so `resolvePublishedContent` can verify any backend's answer against the
 * on-chain pointer. A resolver cannot lie, and an untrusted or third-party backend is therefore
 * as trustworthy as a first-party one.
 */

import { sha256, toHex, type Address, type Hash } from 'viem';
import type { PublishedDataId } from './types.js';

/**
 * Everything a resolver gets to work with: the on-chain publication fact.
 *
 * `publisher` and `dataId` come from the `DataPublished` topics and are always present. The
 * transaction fields locate the publication and are what calldata recovery needs; a
 * content-store-backed resolver would ignore them and key on `dataId` alone.
 */
export interface PublicationPointer {
  publisher: Address;
  dataId: PublishedDataId;
  chainId?: number;
  transactionHash?: Hash;
  blockNumber?: bigint;
  logIndex?: number;
}

/** A backend that can turn a publication pointer back into the content bytes. */
export interface ContentResolver {
  /** Returns the bytes, or null if this backend simply does not have them. */
  resolve(pointer: PublicationPointer): Promise<Uint8Array | null>;
}

/**
 * Thrown when a publication is known to exist but its bytes could not be fetched.
 *
 * This is emphatically **not** `not-published`. The spec requires a transient miss to render as
 * `unavailable` and to stay *in* aggregate counts, because only an honored on-chain retraction may
 * remove support. Collapsing the two would let an RPC outage silently delete people's signatures
 * from headline numbers. Callers map this error to `unavailable`.
 */
export class ContentUnavailableError extends Error {
  constructor(readonly dataId: PublishedDataId, message: string) {
    super(message);
    this.name = 'ContentUnavailableError';
  }
}

/** True if `content` is genuinely the content named by `dataId`. */
export function contentMatchesDataId(dataId: PublishedDataId, content: Uint8Array): boolean {
  return sha256(toHex(content)).toLowerCase() === dataId.toLowerCase();
}

/**
 * Fetch and verify the content for a set of pointers to the same `dataId`.
 *
 * Pointers are tried in order until one yields bytes that hash to `dataId`. Trying several is not
 * redundancy for its own sake: a CID may have been published by several publishers in several
 * transactions, and any one of them carries the same content by definition, so a pruned or
 * unreachable transaction can be routed around.
 *
 * A backend answer that fails verification is discarded rather than returned — a resolver that
 * hands back the wrong bytes is treated exactly like one that has none.
 *
 * @throws ContentUnavailableError if no pointer yields verified content.
 */
export async function resolvePublishedContent(
  resolver: ContentResolver,
  dataId: PublishedDataId,
  pointers: readonly PublicationPointer[],
): Promise<Uint8Array> {
  if (pointers.length === 0) {
    throw new ContentUnavailableError(dataId, `No publication pointers supplied for ${dataId}`);
  }

  const failures: string[] = [];

  for (const pointer of pointers) {
    let content: Uint8Array | null;
    try {
      content = await resolver.resolve(pointer);
    } catch (error) {
      failures.push(`${pointer.transactionHash ?? pointer.publisher}: ${String(error)}`);
      continue;
    }

    if (!content) {
      failures.push(`${pointer.transactionHash ?? pointer.publisher}: resolver has no content`);
      continue;
    }

    if (!contentMatchesDataId(dataId, content)) {
      failures.push(`${pointer.transactionHash ?? pointer.publisher}: content does not hash to the published dataId`);
      continue;
    }

    return content;
  }

  throw new ContentUnavailableError(
    dataId,
    `Could not recover content for ${dataId} from ${pointers.length} publication pointer(s): ${failures.join('; ')}`,
  );
}

/**
 * Try each resolver in turn, so a new storage backend can be introduced alongside the old one.
 *
 * This is the migration shape: put the new backend first and calldata recovery second, and content
 * published before the switch keeps resolving while new content comes from the new store. Verification
 * happens above this, in `resolvePublishedContent`, so ordering is a performance choice and not a
 * trust one.
 */
export function createFallbackContentResolver(resolvers: readonly ContentResolver[]): ContentResolver {
  return {
    async resolve(pointer) {
      for (const resolver of resolvers) {
        try {
          const content = await resolver.resolve(pointer);
          if (content) return content;
        } catch {
          // A resolver that cannot answer is not an error while others remain to be tried;
          // resolvePublishedContent raises ContentUnavailableError once every option is spent.
        }
      }
      return null;
    },
  };
}
