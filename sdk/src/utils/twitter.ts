import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { getEnsName, getEnsText } from 'viem/ens';

const X_API_KEY = process.env.X_API_KEY;

// ENS is always on Ethereum mainnet
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export interface AddressSocialData {
  ensName?: string;
  twitterHandle?: string;
  twitterFollowerCount?: number;
  isTwitterVerified: boolean;
}

async function resolveEnsName(address: string): Promise<string | null> {
  try {
    // @ts-expect-error - viem type inference issue with publicClient
    return await getEnsName(mainnetClient, { address: address as `0x${string}` }) || null;
  } catch (error) {
    console.warn(`Failed to resolve ENS for ${address}:`, error);
    return null;
  }
}

async function fetchTwitterHandleFromEns(ensName: string): Promise<string | undefined> {
  try {
    // @ts-expect-error - viem type inference issue with publicClient
    const handle = await getEnsText(mainnetClient, { name: ensName, key: 'com.twitter' });
    return handle || undefined;
  } catch (error) {
    console.warn(`Failed to get ENS text records for ${ensName}:`, error);
    return undefined;
  }
}

async function fetchFollowerCount(handle: string): Promise<number | undefined> {
  if (!X_API_KEY) {
    console.warn('X_API_KEY not set; skipping Twitter follower count fetch');
    return undefined;
  }
  try {
    // Uses twitterapi.io (not the official Twitter API, which is very expensive)
    const response = await fetch(`https://api.twitterapi.io/twitter/user/info?userName=${handle}`, {
      headers: { 'X-API-Key': X_API_KEY, 'Content-Type': 'application/json' },
    });
    const data = await response.json() as { data?: { followers?: number } };
    const count = data?.data?.followers;
    return typeof count === 'number' ? count : undefined;
  } catch (error) {
    console.warn(`Failed to fetch Twitter follower count for @${handle}:`, error);
    return undefined;
  }
}

export async function fetchAddressSocialData(address: string): Promise<AddressSocialData> {
  const ensName = await resolveEnsName(address);
  if (!ensName) return { isTwitterVerified: false };

  const twitterHandle = await fetchTwitterHandleFromEns(ensName);
  const twitterFollowerCount = twitterHandle ? await fetchFollowerCount(twitterHandle) : undefined;

  // TODO: check ENS verification status
  // see https://support.ens.domains/en/articles/9626402-profile-verification
  return { ensName, twitterHandle, twitterFollowerCount, isTwitterVerified: false };
}
