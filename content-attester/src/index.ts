import { checkAttesterBalance, getBlockchainClients, publishAttestation } from './blockchain.js';
import { loadConfig } from './config.js';
import { resolveContentForEvaluation } from './content.js';
import { createContentAttesterServiceApp, defaultUploadExplanation } from './app.js';
import { evaluateContentWithLLM } from './evaluator.js';

const config = loadConfig();

async function getCurrentGasPrice(): Promise<bigint> {
  try {
    const { testClients } = getBlockchainClients();
    const gasPrice = await testClients.publicClient.getGasPrice();
    return gasPrice * BigInt(Math.floor(config.gasPriceMultiplier * 100)) / 100n;
  } catch {
    return BigInt(20_000_000_000);
  }
}

const app = createContentAttesterServiceApp({
  getConfig: loadConfig,
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
  checkAttesterBalance,
  evaluateContent: evaluateContentWithLLM,
  resolveContent: resolveContentForEvaluation,
  uploadExplanation: defaultUploadExplanation,
  publishAttestation,
  version: '0.1.0',
});

app.listen(config.port, () => {
  console.log(`Content attester listening on port ${config.port}`);
});
