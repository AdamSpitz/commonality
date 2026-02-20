
export interface Statement {
  id: string;
  believerCount: number;
  disbelieverCount: number;
  cid?: string;
  statementType?: string;
  title?: string;
  excerpt?: string;
  createdAt?: string;
}

export interface Implication {
  attester: { id: string };
  fromStatementId: string;
  toStatementId: string;
  explanationCid: string;
  createdAt: string;
  blockNumber: string;
}

export interface UserBelief {
  statementId: string;
  beliefState: number; // 0=noOpinion, 1=believes, 2=disbelieves
}

export interface IndirectSupporter {
  user: string;
  viaStatementId: string;
  viaStatement?: Statement;
}

export interface StatementListItem {
  id: string;
  cid: string;
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
}
