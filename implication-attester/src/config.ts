import {
  readNumberEnv,
  readStringEnv,
  requireEnv,
  type IpfsConfig,
  type PaymentConfig,
} from '@commonality/attester-core';

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
  return {
    ethereumPrivateKey: requireEnv('ATTESTER_PRIVATE_KEY', process.env.ATTESTER_PRIVATE_KEY),
    ethereumRpcUrl: requireEnv('ETHEREUM_RPC_URL', process.env.ETHEREUM_RPC_URL),
    implicationsContractAddress: requireEnv('IMPLICATIONS_CONTRACT_ADDRESS', process.env.IMPLICATIONS_CONTRACT_ADDRESS),
    openRouterApiKey: requireEnv('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY),
    openRouterModel: readStringEnv('OPENROUTER_MODEL', 'anthropic/claude-3.5-haiku'),
    ipfsApiUrl: readStringEnv('IPFS_API', 'http://localhost:5001'),
    ipfsGatewayUrl: readStringEnv('IPFS_GATEWAY', 'http://localhost:8080'),
    port: readNumberEnv('PORT', 3000),
    paymentAddress: requireEnv('X402_PAYMENT_ADDRESS', process.env.X402_PAYMENT_ADDRESS),
    serviceMarginPercent: readNumberEnv('SERVICE_MARGIN_PERCENT', 20),
    ethUsdPrice: readNumberEnv('ETH_USD_PRICE', 3000),
    gasPriceMultiplier: readNumberEnv('GAS_PRICE_MULTIPLIER', 1.2),
    estimatedInputTokens: readNumberEnv('ESTIMATED_INPUT_TOKENS', 1000),
    estimatedOutputTokens: readNumberEnv('ESTIMATED_OUTPUT_TOKENS', 200),
    rateLimitWindowMs: readNumberEnv('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMaxRequests: readNumberEnv('RATE_LIMIT_MAX_REQUESTS', 10),
  };
}

export function getIpfsConfig(config: AttesterConfig = loadConfig()): IpfsConfig {
  return {
    apiUrl: config.ipfsApiUrl,
    gatewayUrl: config.ipfsGatewayUrl,
  };
}

export function getPaymentConfig(config: AttesterConfig = loadConfig()): PaymentConfig {
  return {
    openRouterModel: config.openRouterModel,
    estimatedInputTokens: config.estimatedInputTokens,
    estimatedOutputTokens: config.estimatedOutputTokens,
    serviceMarginPercent: config.serviceMarginPercent,
    ethUsdPrice: config.ethUsdPrice,
    paymentAddress: config.paymentAddress,
  };
}
