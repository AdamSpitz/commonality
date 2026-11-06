/** One suggested display name, decoded from a `NameSuggested` event. */
export interface SuggestedName {
  attester: `0x${string}`;
  accountBeingNamed: `0x${string}`;
  name: string;
  blockNumber: bigint;
  logIndex: number;
}
