import { fetchFromIpfs } from '@commonality/attester-core';
export async function resolveContentForEvaluation(source, ipfsConfig, fetchUrlContent = fetchUrlContentForEvaluation) {
    if (source.contentText) {
        return source.contentText.trim();
    }
    if (source.contentUrl) {
        return fetchUrlContent(source.contentUrl);
    }
    if (!source.contentCid) {
        throw new Error('Missing content source');
    }
    const rawIpfsContent = await fetchFromIpfs(ipfsConfig, source.contentCid);
    return extractTextFromStructuredContent(rawIpfsContent);
}
export async function fetchUrlContentForEvaluation(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch content URL: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    if (contentType.includes('text/html')) {
        return stripHtmlToText(body);
    }
    return body.trim();
}
export function extractTextFromStructuredContent(raw) {
    try {
        const parsed = JSON.parse(raw);
        const content = parsed.content;
        if (content && typeof content === 'object' && typeof content.text === 'string') {
            return (content.text).trim();
        }
        if (typeof parsed.text === 'string') {
            return parsed.text.trim();
        }
    }
    catch {
        return raw.trim();
    }
    return raw.trim();
}
export function stripHtmlToText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}
//# sourceMappingURL=content.js.map