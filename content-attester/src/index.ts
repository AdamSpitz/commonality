import { type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { checkAttesterBalance, getBlockchainClients, publishAttestation } from './blockchain.js';
import { loadConfig, type ContentAttesterConfig } from './config.js';
import { resolveContentForEvaluation } from './content.js';
import { createContentAttesterServiceApp, defaultUploadExplanation } from './app.js';
import { evaluateContentWithLLM } from './evaluator.js';

export interface ContentAttesterRunHandle {
  server: Server;
  stop: () => Promise<void>;
}

export function run(config: ContentAttesterConfig = loadConfig()): ContentAttesterRunHandle {
  async function getCurrentGasPrice(): Promise<bigint> {
    try {
      const { testClients } = getBlockchainClients(config);
      const gasPrice = await testClients.publicClient.getGasPrice();
      return gasPrice * BigInt(Math.floor(config.gasPriceMultiplier * 100)) / 100n;
    } catch {
      return BigInt(20_000_000_000);
    }
  }

  const app = createContentAttesterServiceApp({
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

  const server = app.listen(config.port, () => {
    console.log(`Content attester listening on port ${config.port}`);
  });

  return {
    server,
    stop: () => new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
