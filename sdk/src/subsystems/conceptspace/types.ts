import { IpfsCidV1 } from "../../utils/cid-types";
import { type DisplayableDocument } from "../displayable-documents/displayable-document.js";

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

export interface Statement {
  id: string;
  believerCount: number;
  disbelieverCount: number;
  cid: IpfsCidV1;
  statementType?: string;
  title?: string;
  excerpt?: string;
  createdAt?: string;
}

export interface Implication {
  attester: string;
  fromStatementCid: IpfsCidV1;
  toStatementCid: IpfsCidV1;
  explanationCid: IpfsCidV1;
  createdAt: string;
  blockNumber: string;
}

export interface UserBelief {
  statementCid: IpfsCidV1;
  beliefState: number; // 0=noOpinion, 1=believes, 2=disbelieves
}

export interface IndirectSupporter {
  user: string;
  viaStatementCid: IpfsCidV1;
  viaStatement?: Statement;
}

export interface StatementListItem {
  id: string;
  cid: IpfsCidV1;
  statementType: string;
  title: string;
  excerpt: string;
  believerCount: number;
  disbelieverCount: number;
  createdAt: string;
}

export interface BrowseStatementsOptions {
  limit?: number;
  offset?: number;
  orderDirection?: 'asc' | 'desc';
  orderBy?: 'createdAt' | 'believerCount' | 'disbelieverCount';
}

export interface StatementWithContent {
  statement: Statement;
  content: DisplayableDocument | null;
  metrics?: {
    directBelievers: number;
    directDisbelievers: number;
    indirectSupporters: number;
  };
}

export interface GetStatementWithContentOptions {
  includeMetrics?: boolean;
  timeout?: number;
  trustedAttesters?: string[];
}

export interface IndirectSupportInfo {
  statement: StatementListItem;
  supportedVia: Array<{
    directlyBelievedStatement: StatementListItem;
    viaStatementCid: IpfsCidV1;
  }>;
}

export interface GetUserIndirectSupportOptions {
  trustedAttesters?: string[];
  limit?: number;
  offset?: number;
}

export interface UserSocialData {
  address: string;
  ensName?: string;
  twitterHandle?: string;
  twitterFollowerCount?: number;
  isTwitterVerified: boolean;
  socialDataFetched: boolean;
  fetchedAt?: string;
}

export interface HighProfileSigner {
  address: string;
  ensName?: string;
  twitterHandle?: string;
  followerCount?: number;
}
