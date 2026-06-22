/**
 * User actions for the identity subsystem — tier-0/1 proof-of-personhood
 * self-declarations (`AccountAssertions.sol`).
 */

import { type Address, type Hash, type Abi } from 'viem';
import { type WriteClients } from '../../utils/ethereum.js';

/** Contract instance for `AccountAssertions`. */
export interface AccountAssertionsContract {
  address: Address;
  abi: Abi;
}

/**
 * Assert that this is your one Commonality account (tier 0 → 1).
 *
 * This is a *self-claim* by the account holder — nothing external backs it, so
 * it carries essentially no Sybil-resistance on its own (per
 * `unique-human-id.md` caveat #1). It makes the "sign once, we union your
 * signatures" pitch demonstrable before any proof-of-personhood provider is
 * wired up, and lights up the tier-1 ("asserted") Tally head-count.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param accountAssertionsContract - The AccountAssertions contract instance
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await assertSingleAccount(clients, accountAssertions);
 * ```
 */
export async function assertSingleAccount(
  clients: WriteClients,
  accountAssertionsContract: AccountAssertionsContract,
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: accountAssertionsContract.address,
    abi: accountAssertionsContract.abi,
    functionName: 'assertSingleAccount',
    args: [],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Revoke your single-account assertion (return to tier 0).
 *
 * Used when re-anchoring attestations to a new account, per
 * `unique-human-id.md` caveat #3.
 *
 * @param clients - Wallet and public clients for blockchain interaction
 * @param accountAssertionsContract - The AccountAssertions contract instance
 * @returns Transaction hash
 */
export async function revokeAssertion(
  clients: WriteClients,
  accountAssertionsContract: AccountAssertionsContract,
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: accountAssertionsContract.address,
    abi: accountAssertionsContract.abi,
    functionName: 'revokeAssertion',
    args: [],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
