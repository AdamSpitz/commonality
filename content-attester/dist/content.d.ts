import { type IpfsConfig } from '@commonality/attester-core';
import type { IpfsCidV1 } from '@commonality/sdk';
export type ContentSource = {
    contentText: string;
    contentUrl?: undefined;
    contentCid?: undefined;
} | {
    contentText?: undefined;
    contentUrl: string;
    contentCid?: undefined;
} | {
    contentText?: undefined;
    contentUrl?: undefined;
    contentCid: IpfsCidV1;
};
export declare function resolveContentForEvaluation(source: ContentSource, ipfsConfig: IpfsConfig, fetchUrlContent?: (url: string) => Promise<string>): Promise<string>;
export declare function fetchUrlContentForEvaluation(url: string): Promise<string>;
export declare function extractTextFromStructuredContent(raw: string): string;
export declare function stripHtmlToText(html: string): string;
//# sourceMappingURL=content.d.ts.map