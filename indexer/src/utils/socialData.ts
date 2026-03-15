import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { getEnsName, getEnsText } from 'viem/ens';

// Note that this is twitterapi.io, not the official Twitter API;
// in the future we might want to switch to the official API,
// but that is very expensive and I want to find out whether this
// app will be used first.
const TWITTERAPI_IO_KEY = process.env.TWITTERAPI_IO_KEY;

// We always use Ethereum L1 mainnet for ENS
const publicClientUsedForENS = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export interface EnsData {
  fetchedAt: number;
  ensName?: string;
  twitterHandle?: string;
  isTwitterVerified: boolean;
  error?: string;
}

export interface TwitterApiData {
  fetchedAt: number;
  followerCount?: number;
  error?: string;
}

export interface EthereumAddressSocialData {
  ensData?: EnsData;
  twitterApiData?: TwitterApiData;
}

async function resolveEnsNameForEthereumAddress(address: string): Promise<string | null> {
  try {
    const ensName = await getEnsName(publicClientUsedForENS, { address: address as `0x${string}` });
    return ensName || null;
  } catch (error) {
    console.warn(`Failed to resolve ENS for ${address}:`, error);
    return null;
  }
}

async function fetchEnsDataForEnsName(ensName: string): Promise<EnsData> {
  const fetchedAt = Date.now();
  try {
    const twitterHandle = await getEnsText(publicClientUsedForENS, {
      name: ensName,
      key: 'com.twitter',
    });

    // TODO: check whether ENS says it's been verified
    // see https://support.ens.domains/en/articles/9626402-profile-verification
    const isTwitterVerified = false;

    return {
      fetchedAt,
      ensName,
      twitterHandle: twitterHandle || undefined,
      isTwitterVerified,
    };
  } catch (error) {
    console.warn(`Failed to get Twitter handle from ENS ${ensName}:`, error);
    return {
      fetchedAt,
      ensName,
      twitterHandle: undefined,
      isTwitterVerified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function fetchTwitterApiData(handle: string): Promise<TwitterApiData> {
  if (!TWITTERAPI_IO_KEY) {
    throw new Error('TWITTERAPI_IO_KEY environment variable not set; this should be for twitterapi.io');
  }

  const fetchedAt = Date.now();
  try {
    const response = await fetch(
      `https://api.twitterapi.io/twitter/user/info?userName=${encodeURIComponent(handle)}`,
      {
        headers: {
          'X-API-Key': TWITTERAPI_IO_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return {
        fetchedAt,
        error: `twitterapi.io returned ${response.status}: ${response.statusText}`,
      };
    }

    const data: { data?: { followers?: number } } = await response.json() as { data?: { followers?: number } };
    const userData = data?.data;
    if (!userData) {
      return {
        fetchedAt,
        error: 'No Twitter user data found',
      };
    }

    const followerCount = userData.followers;
    if (typeof followerCount !== 'number') {
      return {
        fetchedAt,
        error: 'Invalid follower count in Twitter data',
      };
    }

    return { followerCount, fetchedAt };
  } catch (error) {
    console.warn(`Failed to fetch Twitter data for ${handle}:`, error);
    return {
      fetchedAt,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fetchEthereumAddressSocialData(address: string): Promise<EthereumAddressSocialData> {
  const fetchedAt = Date.now();
  const ensName = await resolveEnsNameForEthereumAddress(address);
  if (!ensName) {
    return {
      ensData: {
        fetchedAt,
        ensName: undefined,
        twitterHandle: undefined,
        isTwitterVerified: false,
      },
    };
  }

  const ensData = await fetchEnsDataForEnsName(ensName);

  const h = ensData.twitterHandle;
  const twitterApiData = h ? await fetchTwitterApiData(h) : undefined;
  return {
    ensData,
    twitterApiData,
  };
}
