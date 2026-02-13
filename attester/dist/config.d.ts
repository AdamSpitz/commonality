export interface AttesterConfig {
    ethereumPrivateKey: string;
    ethereumRpcUrl: string;
    implicationsContractAddress: string;
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
}
export declare function loadConfig(): AttesterConfig;
//# sourceMappingURL=config.d.ts.map