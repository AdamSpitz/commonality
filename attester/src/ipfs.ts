import { loadConfig } from './config.js';

export interface IpfsResult {
  cid: string;
  size: number;
}

export async function uploadToIpfs(content: string): Promise<IpfsResult> {
  const config = loadConfig();
  
  const response = await fetch(`${config.ipfsApiUrl}/api/v0/add`, {
    method: 'POST',
    body: await createFormData(content),
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { Hash: string; Size: number };
  return {
    cid: data.Hash,
    size: data.Size,
  };
}

async function createFormData(content: string): Promise<FormData> {
  const blob = new Blob([content], { type: 'application/json' });
  const formData = new FormData();
  formData.append('file', blob, 'attestation-explanation.json');
  return formData;
}

export async function fetchFromIpfs(cid: string): Promise<string> {
  const config = loadConfig();
  
  const response = await fetch(`${config.ipfsGatewayUrl}/ipfs/${cid}`);
  
  if (!response.ok) {
    throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
