import { readNumberEnv, readStringEnv, requireEnv, } from '@commonality/attester-core';
export function loadConfig() {
    return {
        ethereumPrivateKey: requireEnv('ATTESTER_PRIVATE_KEY', process.env.ATTESTER_PRIVATE_KEY),
        ethereumRpcUrl: requireEnv('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL),
        alignmentAttestationsContractAddress: requireEnv('ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS', process.env.ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS),
        alignmentTopicStatementCid: requireEnv('ALIGNMENT_TOPIC_STATEMENT_CID', process.env.ALIGNMENT_TOPIC_STATEMENT_CID),
        openRouterApiKey: requireEnv('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY),
        openRouterModel: readStringEnv('OPENROUTER_MODEL', 'anthropic/claude-3.5-haiku'),
        ipfsApiUrl: readStringEnv('IPFS_API', 'http://localhost:5001'),
        ipfsGatewayUrl: readStringEnv('IPFS_GATEWAY', 'http://localhost:8080'),
        port: readNumberEnv('PORT', 3000),
        paymentAddress: requireEnv('X402_PAYMENT_ADDRESS', process.env.X402_PAYMENT_ADDRESS),
        serviceMarginPercent: readNumberEnv('SERVICE_MARGIN_PERCENT', 20),
        ethUsdPrice: readNumberEnv('ETH_USD_PRICE', 3000),
        gasPriceMultiplier: readNumberEnv('GAS_PRICE_MULTIPLIER', 1.2),
        estimatedInputTokens: readNumberEnv('ESTIMATED_INPUT_TOKENS', 2500),
        estimatedOutputTokens: readNumberEnv('ESTIMATED_OUTPUT_TOKENS', 400),
        rateLimitWindowMs: readNumberEnv('RATE_LIMIT_WINDOW_MS', 60000),
        rateLimitMaxRequests: readNumberEnv('RATE_LIMIT_MAX_REQUESTS', 10),
        attesterName: readStringEnv('CONTENT_ATTESTER_NAME', 'content-attester'),
        promptTemplate: requireEnv('CONTENT_ATTESTER_PROMPT_TEMPLATE', process.env.CONTENT_ATTESTER_PROMPT_TEMPLATE),
    };
}
export function getIpfsConfig(config = loadConfig()) {
    return {
        apiUrl: config.ipfsApiUrl,
        gatewayUrl: config.ipfsGatewayUrl,
    };
}
export function getPaymentConfig(config = loadConfig()) {
    return {
        openRouterModel: config.openRouterModel,
        estimatedInputTokens: config.estimatedInputTokens,
        estimatedOutputTokens: config.estimatedOutputTokens,
        serviceMarginPercent: config.serviceMarginPercent,
        ethUsdPrice: config.ethUsdPrice,
        paymentAddress: config.paymentAddress,
    };
}
//# sourceMappingURL=config.js.map