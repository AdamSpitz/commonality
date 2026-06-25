import { IpfsCidV1 } from "../../utils/cid-types.js";
import { type DisplayableDocument } from "../displayable-documents/displayable-document.js";
import { type AnonymizedId, type ProofStrength, type TieredHeadCount } from "../identity/unique-human-id.js";

/**
 * Belief state values as numbers (uint8), matching the Beliefs.sol constants and event fields.
 * Use these instead of raw numbers when reading beliefState from DirectSupport events or UserBelief.
 *   NO_OPINION = 0  (user has not expressed a view, or retracted a previous one)
 *   BELIEVES   = 1
 *   DISBELIEVES= 2
 *
 * Note: chain-reads.ts has analogous bigint constants (BELIEF_NO_OPINION etc.) for on-chain viem reads.
 */
export const BeliefStates = {
  NO_OPINION: 0,
  BELIEVES: 1,
  DISBELIEVES: 2,
} as const;
export type BeliefStateNumber = (typeof BeliefStates)[keyof typeof BeliefStates];

/** A statement in the Conceptspace with aggregated belief counts. */
export interface Statement {
  /** Unique identifier (same as the CID). */
  id: string;
  /** Number of users who currently believe this statement. */
  believerCount: number;
  /** Number of users who currently disbelieve this statement. */
  disbelieverCount: number;
  /** IPFS CIDv1 of the statement's {@link DisplayableDocument} content. */
  cid: IpfsCidV1;
  /** Document type hint from the extras field (e.g. "statement"). */
  statementType?: string;
  /** First line of the document content, truncated. */
  title?: string;
  /** Short excerpt of the document content. */
  excerpt?: string;
  /** ISO 8601 timestamp of the earliest belief event for this statement. */
  createdAt?: string;
}

/** An attestation that one statement implies another, made by an attester. */
export interface Implication {
  /** Ethereum address of the attester who created this implication. */
  attester: string;
  /** CID of the source statement ("if this..."). */
  fromStatementCid: IpfsCidV1;
  /** CID of the implied statement ("...then this"). */
  toStatementCid: IpfsCidV1;
  /** CID of the explanation document (zero hash if none provided). */
  explanationCid: IpfsCidV1;
  /** Timestamp (as string) of the first attestation event. */
  createdAt: string;
  /** Block number (as string) of the first attestation event. */
  blockNumber: string;
}

/** A user's current belief about a specific statement. */
export interface UserBelief {
  /** CID of the statement this belief is about. */
  statementCid: IpfsCidV1;
  /** Belief state: 0 = no opinion, 1 = believes, 2 = disbelieves. */
  beliefState: number;
}

/**
 * A user who indirectly supports a statement through the implication graph.
 *
 * If user X believes statement A, and A implies B, then X is an indirect
 * supporter of B (unless X directly disbelieves B).
 */
export interface IndirectSupporter {
  /** Ethereum address of the indirect supporter. */
  user: string;
  /** CID of the statement the user directly believes that implies the target. */
  viaStatementCid: IpfsCidV1;
  /** The full statement object for the via-statement, if resolved. */
  viaStatement?: Statement;
}

/** A lightweight statement summary used in list/browse views. */
export interface StatementListItem {
  id: string;
  cid: IpfsCidV1;
  statementType: string;
  title: string;
  excerpt: string;
  believerCount: number;
  disbelieverCount: number;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** Pagination and sorting options for browsing statements. */
export interface BrowseStatementsOptions {
  /** Maximum number of results to return (default: 10). */
  limit?: number;
  /** Number of results to skip for pagination (default: 0). */
  offset?: number;
  /** Sort direction (default: 'desc'). */
  orderDirection?: 'asc' | 'desc';
  /** Field to sort by (default: 'createdAt'). */
  orderBy?: 'createdAt' | 'believerCount' | 'disbelieverCount';
}

/** A statement combined with its full IPFS content and optional support metrics. */
export interface StatementWithContent {
  /** The statement metadata (counts, CID, timestamps). */
  statement: Statement;
  /** The full DisplayableDocument fetched from IPFS, or null if unavailable. */
  content: DisplayableDocument | null;
  /** Aggregated support metrics, included only when requested. */
  metrics?: {
    directBelievers: number;
    directDisbelievers: number;
    indirectSupporters: number;
    /**
     * Tiered head-count over the deduped supporter base (direct believers of
     * this statement + indirect supporters via implications, deduped by
     * anonymized anchor ID, with explicit target-disbelievers excluded).
     *
     * The headline `total` is every supporter; the threshold fields give
     * cumulative counts at each proof-of-personhood strength. Until a proof
     * provider is wired up every anchor is tier 0, so only `total` is nonzero —
     * the honest rendering. See `specs/tech/shared/unique-human-id.md`.
     */
    tieredSupporters?: TieredHeadCount;
  };
}

/** Options for {@link getStatementWithContent}. */
export interface GetStatementWithContentOptions {
  /** Whether to compute and include support metrics (default: false). */
  includeMetrics?: boolean;
  /** IPFS fetch timeout in milliseconds (default: 10000). */
  timeout?: number;
  /** If provided, only count indirect support via implications from these attesters. */
  trustedAttesters?: string[];
  /**
   * Optional map from anonymized anchor ID → proof-of-personhood tier, populated
   * by whatever proof-of-personhood integration is wired up (none yet). When
   * omitted, every anchor is tier 0 and the tiered head-count's threshold
   * fields read 0 — the honest default.
   */
  knownTiers?: ReadonlyMap<AnonymizedId, ProofStrength>;
}

/** Options for {@link getStatementSupportTieredHeadCount}. */
export interface IndirectSupportTieredHeadCountOptions {
  /** If provided, only count indirect support via implications from these attesters. */
  trustedAttesters?: string[];
  /**
   * Optional map from anonymized anchor ID → proof-of-personhood tier. When
   * omitted, every anchor is tier 0 and only the headline `total` is nonzero.
   */
  knownTiers?: ReadonlyMap<AnonymizedId, ProofStrength>;
}

/** A statement that a user indirectly supports, with the chain of reasoning. */
export interface IndirectSupportInfo {
  /** The indirectly-supported statement. */
  statement: StatementListItem;
  /** The directly-believed statements that imply this one. */
  supportedVia: Array<{
    directlyBelievedStatement: StatementListItem;
    viaStatementCid: IpfsCidV1;
  }>;
}

/** Options for {@link getUserIndirectSupport}. */
export interface GetUserIndirectSupportOptions {
  /** If provided, only follow implications from these attesters. */
  trustedAttesters?: string[];
  /** Maximum number of results to return. */
  limit?: number;
  /** Number of results to skip for pagination. */
  offset?: number;
}
