import { publishedDataIdToCid, type PublishedDataCid } from '@commonality/sdk/published-data';

export const MAX_RAW_BLOCK_BYTES = 256 * 1024;

interface IpfsAddResponse { Hash?: string }

export async function addPublishedDataToIpfs(
  apiUrl: string,
  dataId: `0x${string}`,
  content: Uint8Array,
  fetchImpl: typeof fetch = fetch,
): Promise<PublishedDataCid> {
  if (content.byteLength > MAX_RAW_BLOCK_BYTES) {
    throw new Error(`PublishedData content is ${content.byteLength} bytes; the raw-CID mirror supports at most ${MAX_RAW_BLOCK_BYTES}`);
  }

  const expectedCid = publishedDataIdToCid(dataId);
  const url = new URL('/api/v0/add', apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
  url.searchParams.set('cid-version', '1');
  url.searchParams.set('raw-leaves', 'true');
  url.searchParams.set('pin', 'true');

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(content)]), expectedCid);
  const response = await fetchImpl(url, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`IPFS add failed: ${response.status} ${response.statusText}`);

  const lines = (await response.text()).trim().split('\n');
  const result = JSON.parse(lines.at(-1) || '{}') as IpfsAddResponse;
  if (result.Hash !== expectedCid) {
    throw new Error(`IPFS returned ${result.Hash ?? 'no CID'}; expected raw CID ${expectedCid}`);
  }
  return expectedCid;
}
