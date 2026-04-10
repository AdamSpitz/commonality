import { IpfsCidV1, normalizeCidV1 } from "./cid-types.js";
import { fetchFromMockIPFS, uploadToMockIPFS, uploadBlobToMockIPFS } from "./mock-ipfs.js";

export type IPFSConfig = {
  gatewayUrl?: string;
  apiUrl?: string; // Optional IPFS API URL for uploads - if not set, uploads will use mock mode
  debugIpfs?: boolean; // If true, logs IPFS upload details to console - useful for debugging during development
  shouldUseMock?: boolean; // If true, forces using the mock IPFS implementation
};

/**
 * Fetch content from IPFS
 *
 * Modes:
 * - Real IPFS: When IPFS_GATEWAY env var is set, fetches from IPFS gateway
 * - Mock mode: Otherwise, fetches from in-memory mock store
 *
 * @param cid - IPFS CID to fetch
 * @param timeoutMs - Optional timeout in milliseconds (default: 10000)
 * @returns Content object or null if not found/failed
 */
export async function fetchFromIPFS(
  ipfsConfig: IPFSConfig,
  cid: string,
  timeoutMs: number = 10000
): Promise<object | null> {

  if (ipfsConfig.shouldUseMock) {
    return fetchFromMockIPFS(cid);
  }

  if (!ipfsConfig.gatewayUrl) {
    throw new Error('IPFS fetch requires gatewayUrl to be configured in IPFSConfig');
  }

  try {
    const url = `${ipfsConfig.gatewayUrl}/${cid}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      // Prevent following redirects to subdomain gateway format
      // which can cause DNS issues in test environments (*.ipfs.localhost)
      redirect: 'manual',
    });

    // Handle redirects manually - skip localhost subdomain redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      // Skip redirects to *.ipfs.localhost or *.ipns.localhost (subdomain gateway format)
      // These don't resolve properly in most test environments
      if (location && (location.includes('.ipfs.localhost') || location.includes('.ipns.localhost'))) {
        console.warn(`Skipping IPFS subdomain redirect for ${cid} - subdomain gateways not supported in this environment`);
        return null;
      }
      // Follow other redirects
      if (location) {
        const redirectResponse = await fetch(location, {
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'follow',
        });
        if (!redirectResponse.ok) {
          console.warn(`Failed to fetch IPFS content for ${cid}: ${redirectResponse.status}`);
          return null;
        }
        const content = await redirectResponse.json() as object;
        return content;
      }
    }

    if (!response.ok) {
      console.warn(`Failed to fetch IPFS content for ${cid}: ${response.status}`);
      return null;
    }

    const content = await response.json() as object;
    return content;
  } catch (error) {
    console.warn(`Error fetching IPFS content for ${cid}:`, error);
    return null;
  }
}

/**
 * Upload content to IPFS
 *
 * Modes:
 * - Real IPFS: When IPFS_API env var is set, uploads to actual IPFS node
 * - Mock mode: Otherwise, stores in-memory and returns deterministic CID
 *
 * Mock mode is useful for unit tests that don't want external dependencies.
 * The mock store allows fetching content back via fetchFromMockIPFS().
 */
export async function uploadToIPFS(ipfsConfig: IPFSConfig, content: object): Promise<IpfsCidV1> {
  if (ipfsConfig.shouldUseMock) {
    return uploadToMockIPFS(content);
  }

  const ipfsApi = ipfsConfig.apiUrl;

  if (!ipfsApi) {
    throw new Error('IPFS upload requires apiUrl to be configured in IPFSConfig');
  }

  const jsonContent = JSON.stringify(content);

  const formData = new FormData();
  const blob = new Blob([jsonContent], { type: 'application/json' });
  formData.append('file', blob);

  const response = await fetch(`${ipfsApi}/api/v0/add?pin=true`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { Hash: string };
  const cid = normalizeCidV1(result.Hash);

  if (ipfsConfig.debugIpfs) {
    console.log(`[IPFS] Uploaded CID: ${cid}`);
    console.log(`[IPFS] Content: ${jsonContent}`);
  }

  return cid;
}

/**
 * Upload a binary blob (e.g. an image file) to IPFS
 *
 * Modes:
 * - Real IPFS: When IPFS_API env var is set, uploads to actual IPFS node
 * - Mock mode: Otherwise, generates a deterministic CID from the blob content
 */
export async function uploadBlobToIPFS(ipfsConfig: IPFSConfig, blob: Blob): Promise<IpfsCidV1> {
  if (ipfsConfig.shouldUseMock) {
    return uploadBlobToMockIPFS(blob);
  }
  
  const ipfsApi = ipfsConfig.apiUrl;

  if (!ipfsApi) {
    throw new Error('IPFS blob upload requires apiUrl to be configured in IPFSConfig');
  }

  const formData = new FormData();
  formData.append('file', blob);

  const response = await fetch(`${ipfsApi}/api/v0/add?pin=true`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`IPFS blob upload failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as { Hash: string };
  return normalizeCidV1(result.Hash);
}
