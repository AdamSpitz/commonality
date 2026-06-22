import { IpfsCidV1 } from "../../utils/cid-types.js";
import type { CurrencyAmountBigInt } from "../../utils/currency.js";

/**
 * An attestation that a subject (project, user, content item) is aligned with a statement/cause.
 *
 * Recorded via the AlignmentAttestations contract. Used to connect projects
 * to the causes they support in the funding portal system.
 */
export interface AlignmentAttestation {
  /** Address of the attester who created this alignment. */
  attester: string;
  /** Bytes32 subject identifier (left-padded address for address subjects). */
  subjectId: string;
  /** CID of the statement/cause the subject is aligned with. */
  statementCid: IpfsCidV1;
  /** CID of the topic statement used for indexer filtering. */
  topicStatementCid?: IpfsCidV1;
  /** Block timestamp of the attestation. */
  createdAt: string;
  /** Block number of the attestation. */
  blockNumber: string;
}

/** @deprecated Use {@link AlignmentAttestation} instead. */
export type ProjectAlignment = AlignmentAttestation;

/** An attestation that a subject/project has delivered value aligned with a statement/cause. */
export type SuccessAttestation = AlignmentAttestation;

/**
 * A subject that is indirectly aligned with a statement via the implication graph.
 *
 * If subject S is directly aligned with statement A, and A implies B,
 * then S is indirectly aligned with B.
 */
export interface IndirectSubjectAlignment {
  /** Bytes32 subject identifier. */
  subjectId: string;
  /** CID of the statement the subject is directly aligned with. */
  directStatementCid: IpfsCidV1;
  /** CID of the statement we queried for (implied by directStatementCid). */
  indirectStatementCid: IpfsCidV1;
  /** Address of the alignment attester. */
  attester: string;
}

/** @deprecated Use {@link IndirectSubjectAlignment} instead. */
export type IndirectProjectAlignment = IndirectSubjectAlignment;

/** A subject that is indirectly successful for a statement via the implication graph. */
export type IndirectSubjectSuccess = IndirectSubjectAlignment;

/** Successful project plus retroactive-funding metrics for a cause board. */
export interface SuccessfulProjectForCause {
  projectAddress: string;
  successType: 'direct' | 'indirect';
  fundingCurrency: CurrencyAmountBigInt['currency'];
  totalReceived: string;
  threshold: string;
  deadline: string;
  outstandingReceipts: string;
  /** Lowest currently offered primary-market receipt price, in fundingCurrency base units. */
  currentReceiptPrice: string | null;
  /**
   * Ranking confidence used by cause boards: direct vouches count more than implication-derived vouches.
   * When a viewer's transitive trust weights are supplied, each vouch is scaled by the viewer's trust
   * score for that attester (so a vouch from a strongly-trusted attester counts more than one from the
   * edge of the network). See {@link SuccessfulProjectForCause.successConfidenceBasis}.
   */
  successConfidenceScore: string;
  /**
   * How `successConfidenceScore` was computed: `attester-count` is the flat 2:1 direct/indirect vouch
   * count (used when no viewer trust weights are available, e.g. logged-out / no trust network);
   * `trust-weighted` scales each vouch by the viewer's transitive trust score for the attester.
   * Kept separate from alignment scoring per the successful-projects policy decisions.
   */
  successConfidenceBasis: 'attester-count' | 'trust-weighted';
  successAttesters: string[];
}

/** Aggregated funding metrics for a cause across all aligned projects. */
export interface CauseFundingMetrics {
  /** Sum of totalReceived across all aligned projects, grouped by currency. */
  totalRaisedAcrossProjects: CurrencyAmountBigInt[];
  /** Sum of available note values aligned to this cause, grouped by currency. */
  totalAvailableFromNotes: CurrencyAmountBigInt[];
  /** Number of projects aligned to this cause. */
  projectCount: number;
  /** Number of notes aligned to this cause. */
  noteCount: number;
}

/** Aggregated contribution statistics for a single participant across projects. */
export interface ContributorStats {
  /** Ethereum address of the contributor. */
  participant: string;
  /** Total amount contributed across all projects, grouped by currency. */
  totalContributed: CurrencyAmountBigInt[];
  /** Total amount refunded across all projects, grouped by currency. */
  totalRefunded: CurrencyAmountBigInt[];
  /** Net contribution (totalContributed - totalRefunded), grouped by currency. */
  netContribution: CurrencyAmountBigInt[];
  /** Number of individual contribution transactions. */
  contributionCount: number;
  /** Block timestamp of the earliest contribution. */
  firstContributionAt?: bigint;
  /** Block timestamp of the most recent contribution. */
  lastContributionAt?: bigint;
  /** Number of distinct projects contributed to. */
  projectsContributedTo: number;
}
