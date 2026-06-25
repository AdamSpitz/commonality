/**
 * Shared types for the fake-data-generation scripts.
 */

import { IpfsCidV1 } from '@commonality/sdk/utils';

export interface StatementContent {
  text: string;
  domain: string;
  position?: string;
  references?: string[];
  type?: string;
}

export interface Statement {
  domain: string;
  position: string;
  statementType: 'simple' | 'disjunction' | 'conjunction';
  content: StatementContent;
  cid?: IpfsCidV1;
}

export interface User {
  id: number;
  address: `0x${string}`;
  privateKey: `0x${string}`;
  engagement: string;
  actionsPerRound: number;
  wealth: number;
  interests: Record<string, unknown>;
  trustNetworkSize: number;
  trustNetwork: `0x${string}`[];
}

export interface AttesterStats {
  totalAttestations: number;
  acceptedRequests: number;
  rejectedRequests: number;
  lastAttestationBlock: number;
}

export interface Attester {
  id: number;
  address: `0x${string}`;
  privateKey: `0x${string}`;
  type: string;
  threshold: number;
  description: string;
  bias: string | null;
  stats: AttesterStats;
}

export interface ContractConfig {
  address: `0x${string}` | undefined;
  abi: readonly any[];
}

export interface SimulationContracts {
  beliefs?: ContractConfig;
  implications?: ContractConfig;
  alignmentAttestations?: ContractConfig;
  delegatableNotes?: ContractConfig;
  projectFactory?: ContractConfig;
  assuranceContract?: ContractConfig;
  erc1155SecondaryMarket?: ContractConfig;
  [key: string]: ContractConfig | undefined;
}

export interface TestClients {
  walletClient: import('viem').WalletClient;
  publicClient: import('viem').PublicClient;
  account: `0x${string}`;
}
