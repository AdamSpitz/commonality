/**
 * EIP-5792 wallet capabilities (atomic batches + ERC-7677 paymasterService).
 */

import { numberToHex, type Address } from 'viem';
import type { WriteClients } from './ethereum.js';

export interface WalletCapabilities {
  atomicBatches: boolean;
  paymasterService: boolean;
}

const cache = new Map<string, WalletCapabilities>();

const NONE: WalletCapabilities = { atomicBatches: false, paymasterService: false };

export function clearWalletCapabilitiesCache(): void {
  cache.clear();
}

function chainKey(chainId: number): string {
  return numberToHex(chainId);
}

function parseCapabilities(raw: unknown, chainId: number): WalletCapabilities {
  if (!raw || typeof raw !== 'object') return NONE;
  const record = raw as Record<string, unknown>;
  const hex = chainKey(chainId);
  const byChain =
    (record[hex] as Record<string, unknown> | undefined) ??
    (record[String(chainId)] as Record<string, unknown> | undefined) ??
    record;
  if (!byChain || typeof byChain !== 'object') return NONE;
  const atomicBatch = byChain.atomicBatch as { supported?: boolean } | undefined;
  const atomic = byChain.atomic as { status?: string } | undefined;
  const paymasterService = byChain.paymasterService as { supported?: boolean } | undefined;
  return {
    atomicBatches: atomicBatch?.supported === true || atomic?.status === 'supported',
    paymasterService: paymasterService?.supported === true,
  };
}

type RpcWallet = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

export async function getWalletCapabilities(
  walletClient: RpcWallet,
  account: Address,
  chainId: number,
): Promise<WalletCapabilities> {
  const key = `${account.toLowerCase()}:${chainId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const raw = await walletClient.request({
      method: 'wallet_getCapabilities',
      params: [account, [chainKey(chainId)]],
    });
    const caps = parseCapabilities(raw, chainId);
    cache.set(key, caps);
    return caps;
  } catch {
    cache.set(key, NONE);
    return NONE;
  }
}

export async function getWriteClientCapabilities(clients: WriteClients): Promise<WalletCapabilities> {
  const chainId = clients.walletClient.chain?.id;
  if (!chainId) return NONE;
  return getWalletCapabilities(clients.walletClient as unknown as RpcWallet, clients.account, chainId);
}

/** EIP-5792 capabilities object for wallet_sendCalls when the wallet can use our paymaster. */
export function paymasterServiceCapability(
  paymasterUrl: string | undefined,
  capabilities: WalletCapabilities,
): { paymasterService: { url: string } } | undefined {
  const url = paymasterUrl?.trim();
  if (!url || !capabilities.paymasterService) return undefined;
  return { paymasterService: { url } };
}
