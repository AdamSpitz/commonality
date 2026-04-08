import { type IpfsConfig, type PaymentConfig } from '@commonality/attester-core';
import type { IpfsCidV1 } from '@commonality/sdk';
export interface ContentAttesterConfig {
    ethereumPrivateKey: string;
    ethereumRpcUrl: string;
    alignmentAttestationsContractAddress: string;
    alignmentTopicStatementCid: IpfsCidV1;
    openRouterApiKey: string;
    openRouterModel: string;
    ipfsApiUrl: string;
    ipfsGatewayUrl: string;
    port: number;
    paymentAddress: string;
    serviceMarginPercent: number;
    ethUsdPrice: number;
    gasPriceMultiplier: number;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    attesterName: string;
    promptTemplate: string;
}
export declare function loadConfig(): ContentAttesterConfig;
export declare function getIpfsConfig(config?: ContentAttesterConfig): IpfsConfig;
export declare function getPaymentConfig(config?: ContentAttesterConfig): PaymentConfig;
//# sourceMappingURL=config.d.ts.map