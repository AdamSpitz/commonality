export interface AttesterConfig {
    ethereumPrivateKey: string;
    ethereumRpcUrl: string;
    implicationsContractAddress: string;
    openRouterApiKey: string;
    openRouterModel: string;
    ipfsApiUrl: string;
    ipfsGatewayUrl: string;
    port: number;
}
export declare function loadConfig(): AttesterConfig;
//# sourceMappingURL=config.d.ts.map