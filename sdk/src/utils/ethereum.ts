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
  type Chain,
} from 'viem';
import { hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ============================================================================
// Client Setup
// ============================================================================

export interface WriteClients {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: Address;
}

/**
 * Create wallet + public clients for a private key.
 *
 * Defaults to the Hardhat chain (local tests and scripts). Pass `chain` when
 * talking to any other network — viem needs the matching chain id for writes.
 */
export function createWriteClients(
  privateKey: `0x${string}`,
  rpcUrl = 'http://localhost:8545',
  chain: Chain = hardhat,
): WriteClients {
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  // @ts-expect-error - viem type inference issue with publicClient
  const publicClient: PublicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  return {
    walletClient,
    publicClient,
    account: account.address,
  };
}
