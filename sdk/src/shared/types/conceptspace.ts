import { IpfsCidV1 } from "../../cid-types";

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
