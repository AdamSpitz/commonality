/**
 * Common base type for all raw on-chain events used in fold functions.
 * All subsystem-specific event types extend this interface.
 */
export interface RawEvent {
  contractAddress: `0x${string}`;
  blockNumber: bigint;
  blockTimestamp: bigint;
  transactionHash: `0x${string}`;
  logIndex: number;
}
