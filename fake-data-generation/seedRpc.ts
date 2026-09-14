import { createPublicClient, createWalletClient, http, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { RPC_URL } from './loadEnv.js';

const hardhat = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
  },
} as const;

function seedChain() {
  const chainId = Number(process.env.CHAIN_ID ?? '31337');
  if (chainId === 31337) return hardhat;
  if (chainId === baseSepolia.id) return baseSepolia;
  throw new Error(`Fake-data writes are disabled for chain ${chainId}.`);
}

/** Local Hardhat receipts are immediate; viem's 4s default poll dominates seed time. */
export const SEED_RPC_POLLING_INTERVAL_MS = 50;
export const SEED_RPC_TIMEOUT_MS = 30_000;

export function seedHttpTransport(rpcUrl = RPC_URL) {
  return http(rpcUrl, {
    timeout: SEED_RPC_TIMEOUT_MS,
  });
}

export function createSeedClients(privateKey: `0x${string}`, rpcUrl = RPC_URL) {
  const account = privateKeyToAccount(privateKey);
  const transport = seedHttpTransport(rpcUrl);
  const walletClient = createWalletClient({
    account,
    chain: seedChain(),
    transport,
  });
  const publicClient = createPublicClient({
    chain: seedChain(),
    transport,
    pollingInterval: SEED_RPC_POLLING_INTERVAL_MS,
  }) as PublicClient;

  return {
    walletClient,
    publicClient,
    account: account.address,
  };
}

export function createSeedPublicClient(rpcUrl = RPC_URL) {
  return createPublicClient({
    chain: seedChain(),
    transport: seedHttpTransport(rpcUrl),
    pollingInterval: SEED_RPC_POLLING_INTERVAL_MS,
  }) as PublicClient;
}
