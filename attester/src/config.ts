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

export function loadConfig(): AttesterConfig {
  const required = (name: string, value: string | undefined): string => {
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
    paymentAddress: required('X402_PAYMENT_ADDRESS', process.env.X402_PAYMENT_ADDRESS),
    serviceMarginPercent: parseFloat(process.env.SERVICE_MARGIN_PERCENT || '20'),
    ethUsdPrice: parseFloat(process.env.ETH_USD_PRICE || '3000'),
    gasPriceMultiplier: parseFloat(process.env.GAS_PRICE_MULTIPLIER || '1.2'),
    estimatedInputTokens: parseInt(process.env.ESTIMATED_INPUT_TOKENS || '1000', 10),
    estimatedOutputTokens: parseInt(process.env.ESTIMATED_OUTPUT_TOKENS || '200', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  };
}
