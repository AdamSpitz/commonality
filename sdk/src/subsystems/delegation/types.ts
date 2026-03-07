
export interface Note {
  id: string;
  chainHash: string;
  amount: string;
  token: string;
  tokenType: number; // 0 = ERC20, 1 = ERC1155
  tokenId: string;
  owner: string; // Current leaf owner
  rootOwner: string; // Root depositor
  active: boolean;
  parentNoteId?: string;
  createdAt: string;
  createdAtBlock: string;
  updatedAt: string;
}

export interface NoteIntentAttestation {
  attester: string;
  noteContract: string;
  noteId: string;
  intendedStatementId: string;
  createdAt: string;
  blockNumber: string;
}

export interface DelegationChainLink {
  address: string;
  position: number; // 0 = root, higher numbers = closer to leaf
  createdAt: string;
}

/** DelegationChainLink with noteId included — returned by batch chain queries */
export interface DelegationChainLinkWithNote extends DelegationChainLink {
  noteId: string;
}

/** A "purchased" note event — records a note being spent on a primary market purchase */
export interface NoteEvent {
  noteId: string;
  transactionHash: string;
  data: string | null; // JSON with { inputNoteIds, outputNoteIds, erc1155Contract, ... }
}
