export interface NudgerConfig {
    nudgerPrivateKey: string;
    ethereumRpcUrl: string;
    indexerUrl: string;
    ipfsApiUrl: string;
    ipfsGatewayUrl: string;
    openRouterApiKey: string;
    openRouterModel: string;
    port: number;
    name: string;
    description: string;
    sourceType: string;
    version: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
}
export declare function initializeSigner(config: NudgerConfig): {
    address: import("viem").Address;
    nonceManager?: import("viem").NonceManager | undefined;
    sign: (parameters: {
        hash: import("viem").Hash;
    }) => Promise<import("viem").Hex>;
    signAuthorization: (parameters: import("viem").AuthorizationRequest) => Promise<import("viem/accounts").SignAuthorizationReturnType>;
    signMessage: ({ message }: {
        message: import("viem").SignableMessage;
    }) => Promise<import("viem").Hex>;
    signTransaction: <serializer extends import("viem").SerializeTransactionFn<import("viem").TransactionSerializable> = import("viem").SerializeTransactionFn<import("viem").TransactionSerializable>, transaction extends Parameters<serializer>[0] = Parameters<serializer>[0]>(transaction: transaction, options?: {
        serializer?: serializer | undefined;
    } | undefined) => Promise<import("viem").Hex>;
    signTypedData: <const typedData extends import("viem").TypedData | Record<string, unknown>, primaryType extends keyof typedData | "EIP712Domain" = keyof typedData>(parameters: import("viem").TypedDataDefinition<typedData, primaryType>) => Promise<import("viem").Hex>;
    publicKey: import("viem").Hex;
    source: "privateKey";
    type: "local";
};
export declare function getSignerAddress(): string;
export interface NudgeMessage {
    nudger: string;
    targetStatementCid: string;
    suggestedStatementCid: string;
    reason: string;
    confidence: number;
    timestamp: number;
    signature: string;
}
export declare function signNudgeMessage(message: Omit<NudgeMessage, 'nudger' | 'signature'>): Promise<NudgeMessage>;
export declare function recoverSignerAddress(message: NudgeMessage): string;
//# sourceMappingURL=signer.d.ts.map