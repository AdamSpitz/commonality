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

// ============================================================================
// Client Setup
// ============================================================================

export interface WriteClients {
  walletClient: WalletClient;
  publicClient: PublicClient;
  account: Address;
  /**
   * True when `walletClient` is an ERC-4337 smart-account client (e.g. Privy/Kernel
   * via permissionless) rather than a plain EOA wallet client. Smart-account clients
   * can batch multiple calls into a single sponsored UserOperation, so callers such
   * as `buyProjectTokens` bundle an ERC20 approve together with the buy in one op.
   */
  isSmartAccount?: boolean;
}

/**
 * Create write clients for a local test account private key.
 */
export function createWriteClients(privateKey: `0x${string}`, rpcUrl = 'http://localhost:8545'): WriteClients {
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


/**
 * Hardhat test account private keys
 *
 * These are the well-known private keys from Hardhat's default test accounts.
 * Safe to hardcode since they're only used for local testing.
 *
 * @see https://hardhat.org/hardhat-network/docs/reference#accounts
 */
export const TEST_PRIVATE_KEYS = {
  /** Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH) */
  ACCOUNT_0: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',

  /** Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH) */
  ACCOUNT_1: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',

  /** Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH) */
  ACCOUNT_2: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',

  /** Account #3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (10000 ETH) */
  ACCOUNT_3: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',

  /** Account #4: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (10000 ETH) */
  ACCOUNT_4: '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',

  /** Account #5: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc (10000 ETH) */
  ACCOUNT_5: '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',

  /** Account #6: 0x976EA74026E726554dB657fA54763abd0C3a0aa9 (10000 ETH) */
  ACCOUNT_6: '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',

  /** Account #7: 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 (10000 ETH) */
  ACCOUNT_7: '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',

  /** Account #8: 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f (10000 ETH) */
  ACCOUNT_8: '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',

  /** Account #9: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 (10000 ETH) */
  ACCOUNT_9: '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
} as const;
