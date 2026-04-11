/**
 * A mapping from trustee address (lowercased) to trust score (1–100).
 * Represents one user's direct trust assignments.
 */
export type DirectTrustMapping = Map<string, number>;

/**
 * A mapping from address (lowercased) to cumulative transitive trust score.
 * Computed by traversing the trust graph via BFS from a root truster.
 */
export type TransitiveTrustMapping = Map<string, number>;

/** Callback invoked during transitive trust computation with the current best-score map. */
export type TrustComputationProgressHandler = (
  mapping: ReadonlyMap<string, number>
) => void;

/** A single trust relationship: truster → trustee with a score. */
export interface DirectTrustEntry {
  /** Address of the trusted party. */
  trustee: string;
  /** Trust score (1–100; 0 means revoked). */
  score: number;
}

/** Options for transitive trust computation. */
export interface TrustComputationOptions {
  /** Maximum number of hops in the trust graph (default: 6). */
  maxHops?: number;
  /** Minimum cumulative score to include in results (default: 1). */
  minScore?: number;
  /** Pre-populated cache of direct trust mappings to avoid redundant fetches. */
  directTrustCache?: Map<string, DirectTrustMapping>;
  /** Progress callback invoked after each BFS expansion step. */
  onProgress?: TrustComputationProgressHandler;
}
