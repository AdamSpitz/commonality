export async function uploadToIpfs(config, content) {
    const response = await fetch(`${config.apiUrl}/api/v0/add`, {
        method: 'POST',
        body: await createFormData(content, config.uploadFilename || 'attestation-explanation.json'),
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
async function createFormData(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const formData = new FormData();
    formData.append('file', blob, filename);
    return formData;
}
export async function fetchFromIpfs(config, cid) {
    const response = await fetch(`${config.gatewayUrl}/ipfs/${cid}`);
    if (!response.ok) {
        throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`);
    }
    return response.text();
}
//# sourceMappingURL=ipfs.js.map