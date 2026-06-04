
/**
 * A delegatable note — a token of value that can be delegated through
 * a chain of addresses before being spent on a project purchase.
 */
export interface Note {
  /** Unique numeric ID assigned by the DelegatableNotes contract. */
  id: string;
  /** Keccak256 hash of the delegation chain, used for on-chain verification. */
  chainHash: string;
  /** Current value of the note (in wei for ETH). */
  amount: string;
  /** Token contract address (zero address for native ETH). */
  token: string;
  /** Token type: 0 = ERC-20 (or native ETH), 1 = ERC-1155. */
  tokenType: number;
  /** Token ID (only meaningful for ERC-1155 notes). */
  tokenId: string;
  /** Current leaf owner — the address with spending authority. */
  owner: string;
  /** Root depositor — the address that originally deposited funds. */
  rootOwner: string;
  /** Whether the note is still active (not consumed, reclaimed, or revoked). */
  active: boolean;
  /** If this note was created by splitting another note, the parent's ID. */
  parentNoteId?: string;
  /** Block timestamp when the note was created. */
  createdAt: string;
  /** Block number when the note was created. */
  createdAtBlock: string;
  /** Block timestamp of the most recent event affecting this note. */
  updatedAt: string;
}

/**
 * An attestation declaring the intended purpose (cause/statement) of a note.
 *
 * Recorded via the NoteIntent contract so that the delegation chain's
 * purpose is visible on-chain before spending.
 */
export interface NoteIntentAttestation {
  /** Address of the attester. */
  attester: string;
  /** Address of the DelegatableNotes contract holding the note. */
  noteContract: string;
  /** Numeric ID of the note. */
  noteId: string;
  /** CIDv1 of the statement/cause this note is intended for. */
  intendedStatementId: string;
  /** Block timestamp of the attestation. */
  createdAt: string;
  /** Block number of the attestation. */
  blockNumber: string;
}

/**
 * One link in a note's delegation chain.
 *
 * The chain is ordered root-first: position 0 is the original depositor,
 * and the highest position is the current leaf (spending authority).
 */
export interface DelegationChainLink {
  /** Ethereum address at this position in the chain. */
  address: string;
  /** Position in the chain (0 = root, higher = closer to leaf). */
  position: number;
  /** Block timestamp when this link was added. */
  createdAt: string;
}

/** DelegationChainLink with noteId included — returned by batch chain queries */
export interface DelegationChainLinkWithNote extends DelegationChainLink {
  noteId: string;
}

export interface StandingPledge {
  id: string;
  rootOwner: string;
  delegateTo: string;
  token: string;
  amountPerPeriod: string;
  period: string;
  causeRef: string;
  backingType: number;
  lastExecuted: string;
  active: boolean;
  createdAt: string;
  createdAtBlock: string;
  updatedAt: string;
  executedNoteIds: string[];
}

/** A "purchased" note event — records a note being spent on a primary market purchase */
export interface NoteEvent {
  noteId: string;
  transactionHash: string;
  data: string | null; // JSON with { inputNoteIds, outputNoteIds, erc1155Contract, ... }
}
