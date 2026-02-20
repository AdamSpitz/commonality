
export interface MutableRef {
  owner: string;
  name: string;
  value: string;
  updatedAt: string;
  updatedAtBlock: string;
  transactionHash: string;
}

export interface RefUpdate {
  id: string;
  owner: string;
  name: string;
  value: string;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
  logIndex: number;
}
