import { loadConfig } from './config.js';
export async function uploadToIpfs(content) {
    const config = loadConfig();
    const response = await fetch(`${config.ipfsApiUrl}/api/v0/add`, {
        method: 'POST',
        body: await createFormData(content),
    });
    if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return {
        cid: data.Hash,
        size: data.Size,
    };
}
async function createFormData(content) {
    const blob = new Blob([content], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, 'attestation-explanation.json');
    return formData;
}
export async function fetchFromIpfs(cid) {
    const config = loadConfig();
    const response = await fetch(`${config.ipfsGatewayUrl}/ipfs/${cid}`);
    if (!response.ok) {
        throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`);
    }
    return response.text();
}
//# sourceMappingURL=ipfs.js.map