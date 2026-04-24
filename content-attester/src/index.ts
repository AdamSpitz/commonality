import { pathToFileURL } from 'node:url';
import { checkAttesterBalance, getBlockchainClients, publishAttestation } from './blockchain.js';
import { loadConfig, type ContentAttesterConfig } from './config.js';
import { resolveContentForEvaluation } from './content.js';
import { createContentAttesterServiceApp, defaultUploadExplanation } from './app.js';
import { evaluateContentWithLLM } from './evaluator.js';
export type { ContentAttesterConfig } from './config.js';
export { loadConfigFromEnv } from './config.js';

export interface ContentAttesterRunHandle {
  stop: () => Promise<void>;
}

export function createContentAttesterApp(
  config: ContentAttesterConfig = loadConfig(),
) {
  async function getCurrentGasPrice(): Promise<bigint> {
    try {
      const { testClients } = getBlockchainClients(config);
      const gasPrice = await testClients.publicClient.getGasPrice();
      return gasPrice * BigInt(Math.floor(config.gasPriceMultiplier * 100)) / 100n;
    } catch {
      return BigInt(20_000_000_000);
    }
  }

  return createContentAttesterServiceApp({
    getConfig: () => config,
    getCurrentGasPrice,
    getPaymentConfig: (serviceConfig) => ({
      openRouterModel: serviceConfig.openRouterModel,
      estimatedInputTokens: serviceConfig.estimatedInputTokens,
      estimatedOutputTokens: serviceConfig.estimatedOutputTokens,
      serviceMarginPercent: serviceConfig.serviceMarginPercent,
      ethUsdPrice: serviceConfig.ethUsdPrice,
      paymentAddress: serviceConfig.paymentAddress,
    }),
    getIpfsConfig: (serviceConfig) => ({
      apiUrl: serviceConfig.ipfsApiUrl,
      gatewayUrl: serviceConfig.ipfsGatewayUrl,
    }),
    checkAttesterBalance: () => checkAttesterBalance(config),
    evaluateContent: evaluateContentWithLLM,
    resolveContent: resolveContentForEvaluation,
    uploadExplanation: defaultUploadExplanation,
    publishAttestation: (contentCanonicalId, statementCid, topicStatementCid) =>
      publishAttestation(config, contentCanonicalId, statementCid, topicStatementCid),
    version: '0.1.0',
  });
}

export function run(_config: ContentAttesterConfig = loadConfig()): ContentAttesterRunHandle {
  return { stop: () => Promise.resolve() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  const port = parseInt(process.env.PORT || '3000', 10);
  createContentAttesterApp(config).listen(port, () => {
    console.log(`Content attester listening on port ${port}`);
  });
}
