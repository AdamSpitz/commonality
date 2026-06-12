import { type Address, type Hash, type Abi } from 'viem';
import { type WriteClients } from '../../utils/ethereum.js';

/** Contract instance for the TrustRegistry. */
export interface TrustRegistryContract {
  address: Address;
  abi: Abi;
}

/**
 * Set the caller's direct trust score for another address.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param trustRegistryContract - The TrustRegistry contract instance
 * @param trustee - Address to assign a trust score to
 * @param score - Trust score (1–100 to trust, 0 to revoke)
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await setTrust(clients, trustRegistry, bobAddress, 80);
 * ```
 */
export async function setTrust(
  clients: WriteClients,
  trustRegistryContract: TrustRegistryContract,
  trustee: Address,
  score: number
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: trustRegistryContract.address,
    abi: trustRegistryContract.abi,
    functionName: 'setTrust',
    args: [trustee, score],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Set the caller's direct trust scores for multiple addresses in one transaction.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param trustRegistryContract - The TrustRegistry contract instance
 * @param trustees - Addresses to assign trust scores to
 * @param scores - Trust scores (1–100 to trust, 0 to revoke); must match trustees length
 * @returns Transaction hash
 */
export async function setTrustBatch(
  clients: WriteClients,
  trustRegistryContract: TrustRegistryContract,
  trustees: Address[],
  scores: number[]
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: trustRegistryContract.address,
    abi: trustRegistryContract.abi,
    functionName: 'setTrustBatch',
    args: [trustees, scores],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
