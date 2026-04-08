import { type IpfsConfig, type PaymentConfig, type CommonAttesterConfigSnapshot, uploadToIpfs } from '@commonality/attester-core';
import type { Express } from 'express';
import type { IpfsCidV1 } from '@commonality/sdk';
import type { ContentAttesterEvaluationResult } from './evaluator.js';
import type { ContentSource } from './content.js';
export interface ContentAttesterAppConfig extends CommonAttesterConfigSnapshot {
    ipfsGatewayUrl: string;
    openRouterModel: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    serviceMarginPercent: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    alignmentTopicStatementCid: IpfsCidV1;
    attesterName: string;
    promptTemplate: string;
}
export interface EvaluateContentRequest {
    contentCanonicalId: string;
    statementCid: IpfsCidV1;
    contentText?: string;
    contentUrl?: string;
    contentCid?: IpfsCidV1;
    declaredPerspective?: string;
}
export interface ContentAttesterAppDependencies {
    getConfig: () => ContentAttesterAppConfig;
    getCurrentGasPrice: () => Promise<bigint>;
    getPaymentConfig: (config: ContentAttesterAppConfig) => PaymentConfig;
    getIpfsConfig: (config: ContentAttesterAppConfig) => IpfsConfig;
    checkAttesterBalance: () => Promise<{
        balance: bigint;
        hasSufficientFunds: boolean;
        minimumRequired: bigint;
    }>;
    evaluateContent: (params: {
        content: string;
        declaredPerspective?: string;
        apiKey: string;
        model: string;
        promptTemplate: string;
        attesterName: string;
    }) => Promise<ContentAttesterEvaluationResult>;
    resolveContent: (source: ContentSource, ipfsConfig: IpfsConfig) => Promise<string>;
    uploadExplanation: (ipfsConfig: IpfsConfig, content: string) => Promise<{
        cid: string;
    }>;
    publishAttestation: (contentCanonicalId: string, statementCid: IpfsCidV1, topicStatementCid: IpfsCidV1) => Promise<string>;
    version: string;
}
export declare function createContentAttesterServiceApp(dependencies: ContentAttesterAppDependencies): Express;
export declare const defaultUploadExplanation: typeof uploadToIpfs;
//# sourceMappingURL=app.d.ts.map