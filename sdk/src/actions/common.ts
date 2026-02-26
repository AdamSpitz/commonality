/**
 * Common utilities for user actions
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type PublicClient,
  type Address,
} from 'viem';
import { hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { fakeIpfsCidV1, IpfsCidV1 } from '../utils/cid-types';

// ============================================================================
// Client Setup
// ============================================================================

export interface TestClients {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: Address;
}

/**
 * Create test clients for a given private key
 */
export function createTestClients(privateKey: `0x${string}`, rpcUrl = 'http://localhost:8545'): TestClients {
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: hardhat,
    transport: http(rpcUrl),
  });

  // @ts-expect-error - viem type inference issue with publicClient
  const publicClient: PublicClient = createPublicClient({
    chain: hardhat,
    transport: http(rpcUrl),
  });

  return {
    walletClient,
    publicClient,
    account: account.address,
  };
}

// ============================================================================
// Well-Known Topic Constants
// ============================================================================

/**
 * Well-known topic ID for project alignment attestations.
 *
 * TODO: Replace this with an actual IPFS CID of a statement that says
 * "This is the topic for project alignment attestations". (Not just that
 * raw text, but a Statement in the sense that we use the term in this
 * project.)
 */
export const PROJECT_ALIGNMENT_TOPIC: IpfsCidV1 = fakeIpfsCidV1('ProjectAlignmentTopic');
