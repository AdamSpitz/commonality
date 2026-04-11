import { IpfsCidV1 } from "../../utils/cid-types.js";

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

/** Aggregated funding metrics for a cause across all aligned projects. */
export interface CauseFundingMetrics {
  /** Sum of totalReceived across all aligned projects (in wei). */
  totalRaisedAcrossProjects: bigint;
  /** Sum of available note values aligned to this cause (in wei). */
  totalAvailableFromNotes: bigint;
  /** Number of projects aligned to this cause. */
  projectCount: number;
  /** Number of notes aligned to this cause. */
  noteCount: number;
}

/** Aggregated contribution statistics for a single participant across projects. */
export interface ContributorStats {
  /** Ethereum address of the contributor. */
  participant: string;
  /** Total amount contributed across all projects (in wei). */
  totalContributed: bigint;
  /** Total amount refunded across all projects (in wei). */
  totalRefunded: bigint;
  /** Net contribution (totalContributed - totalRefunded, in wei). */
  netContribution: bigint;
  /** Number of individual contribution transactions. */
  contributionCount: number;
  /** Block timestamp of the earliest contribution. */
  firstContributionAt?: bigint;
  /** Block timestamp of the most recent contribution. */
  lastContributionAt?: bigint;
  /** Number of distinct projects contributed to. */
  projectsContributedTo: number;
}
