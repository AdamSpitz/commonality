
/**
 * Current state of a named mutable reference.
 *
 * Mutable refs are on-chain key-value pairs scoped to an owner address.
 * Common uses: "created-statements" list, bookmarks, user preferences.
 */
export interface MutableRef {
  /** Address of the ref owner. */
  owner: string;
  /** Name of the ref (e.g. "created-statements"). */
  name: string;
  /** Current value (typically an IPFS CID or JSON string). */
  value: string;
  /** Block timestamp of the most recent update. */
  updatedAt: string;
  /** Block number of the most recent update. */
  updatedAtBlock: string;
  /** Transaction hash of the most recent update. */
  transactionHash: string;
}

/** A single historical update to a mutable ref. */
export interface RefUpdate {
  /** Unique ID: `${owner}:${name}:${blockNumber}:${logIndex}`. */
  id: string;
  /** Address of the ref owner. */
  owner: string;
  /** Name of the ref. */
  name: string;
  /** Value at this point in time. */
  value: string;
  /** Block number of this update. */
  blockNumber: string;
  /** Block timestamp of this update. */
  timestamp: string;
  transactionHash: string;
  logIndex: number;
}
