export function loadConfig() {
    const required = (name, value) => {
        if (!value) {
            throw new Error(`Missing required environment variable: ${name}`);
        }
        return value;
    };
    return {
        ethereumPrivateKey: required('ATTESTER_PRIVATE_KEY', process.env.ATTESTER_PRIVATE_KEY),
        ethereumRpcUrl: required('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL),
        implicationsContractAddress: required('IMPLICATIONS_CONTRACT_ADDRESS', process.env.IMPLICATIONS_CONTRACT_ADDRESS),
        openRouterApiKey: required('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY),
        openRouterModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-haiku',
        ipfsApiUrl: process.env.IPFS_API || 'http://localhost:5001',
        ipfsGatewayUrl: process.env.IPFS_GATEWAY || 'http://localhost:8080',
        port: parseInt(process.env.PORT || '3000', 10),
    };
}
//# sourceMappingURL=config.js.map