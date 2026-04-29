import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { getEnsName, getEnsText } from 'viem/actions';

export type TwitterApiConfig = {
  platformApiBaseUrl?: string;
  /** RPC endpoint used for browser ENS lookups. Must allow browser CORS. */
  ethereumMainnetRpcUrl?: string;
}

const DEFAULT_MAINNET_RPC_URL = 'https://ethereum-rpc.publicnode.com';

function createEnsClient(config: TwitterApiConfig) {
  // ENS is always on Ethereum mainnet. Use an explicit CORS-friendly endpoint;
  // viem's default mainnet fallback can select providers that reject browser
  // preflights, which shows up as console errors in E2E tests.
  return createPublicClient({
    chain: mainnet,
    transport: http(config.ethereumMainnetRpcUrl ?? DEFAULT_MAINNET_RPC_URL),
  });
}

export interface AddressSocialData {
  ensName?: string;
  twitterHandle?: string;
  twitterFollowerCount?: number;
  isTwitterVerified: boolean;
}

function normalizeTwitterHandle(handle: string): string | undefined {
  const trimmed = handle.trim();
  if (!trimmed) return undefined;

  const prefixed = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  return /^@[A-Za-z0-9_]{1,15}$/.test(prefixed) ? prefixed : undefined;
}

async function resolveEnsName(config: TwitterApiConfig, address: string): Promise<string | null> {
  try {
    // @ts-expect-error - viem type inference issue with publicClient
    return await getEnsName(createEnsClient(config), { address: address as `0x${string}` }) || null;
  } catch (error) {
    console.warn(`Failed to resolve ENS for ${address}:`, error);
    return null;
  }
}

async function fetchTwitterHandleFromEns(config: TwitterApiConfig, ensName: string): Promise<string | undefined> {
  try {
    // @ts-expect-error - viem type inference issue with publicClient
    const handle = await getEnsText(createEnsClient(config), { name: ensName, key: 'com.twitter' });
    return handle ? normalizeTwitterHandle(handle) : undefined;
  } catch (error) {
    console.warn(`Failed to get ENS text records for ${ensName}:`, error);
    return undefined;
  }
}

export async function fetchFollowerCountForTwitterHandle(
  config: TwitterApiConfig,
  handle: string,
): Promise<number | undefined> {
  if (!config.platformApiBaseUrl) {
    console.warn('PLATFORM_API_URL not set; skipping Twitter follower count fetch');
    return undefined;
  }

  const normalizedHandle = normalizeTwitterHandle(handle);
  if (!normalizedHandle) {
    return undefined;
  }

  try {
    const response = await fetch(`${config.platformApiBaseUrl}/resolve/channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'twitter',
        handle: normalizedHandle,
      }),
    });

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json() as { followerCount?: number };
    const count = data?.followerCount;
    return typeof count === 'number' ? count : undefined;
  } catch (error) {
    console.warn(`Failed to fetch Twitter follower count for ${normalizedHandle}:`, error);
    return undefined;
  }
}

export async function fetchAddressSocialData(config: TwitterApiConfig, address: string): Promise<AddressSocialData> {
  const ensName = await resolveEnsName(config, address);
  if (!ensName) return { isTwitterVerified: false };

  const twitterHandle = await fetchTwitterHandleFromEns(config, ensName);
  const twitterFollowerCount = twitterHandle
    ? await fetchFollowerCountForTwitterHandle(config, twitterHandle)
    : undefined;

  // TODO: check ENS verification status
  // see https://support.ens.domains/en/articles/9626402-profile-verification
  return { ensName, twitterHandle, twitterFollowerCount, isTwitterVerified: false };
}
