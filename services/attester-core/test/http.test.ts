import assert from 'assert';
import type { AddressInfo } from 'node:net';
import { createAttesterApp, registerCommonAttesterRoutes, type CommonAttesterConfigSnapshot } from '../src/http.js';

interface TestConfig extends CommonAttesterConfigSnapshot {
  openRouterModel: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  serviceMarginPercent: number;
}

const testConfig: TestConfig = {
  ethUsdPrice: 3000,
  openRouterApiKey: 'test-key',
  ethereumPrivateKey: '0x' + '1'.repeat(64),
  ipfsApiUrl: 'http://localhost:5001',
  paymentAddress: '0x' + '3'.repeat(40),
  openRouterModel: 'anthropic/claude-3.5-haiku',
  estimatedInputTokens: 1000,
  estimatedOutputTokens: 200,
  serviceMarginPercent: 20,
};

async function withServer(
  overrides?: Partial<{
    getConfig: () => TestConfig;
    getCurrentGasPrice: () => Promise<bigint>;
    checkAttesterBalance: () => Promise<{ balance: bigint; hasSufficientFunds: boolean; minimumRequired: bigint }>;
  }>
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = createAttesterApp();
  registerCommonAttesterRoutes(app, {
    getConfig: overrides?.getConfig ?? (() => testConfig),
    getCurrentGasPrice: overrides?.getCurrentGasPrice ?? (async () => 20_000_000_000n),
    getPaymentConfig: (config) => ({
      openRouterModel: config.openRouterModel,
      estimatedInputTokens: config.estimatedInputTokens,
      estimatedOutputTokens: config.estimatedOutputTokens,
      serviceMarginPercent: config.serviceMarginPercent,
      ethUsdPrice: config.ethUsdPrice,
      paymentAddress: config.paymentAddress,
    }),
    checkAttesterBalance: overrides?.checkAttesterBalance ?? (async () => ({
      balance: 20_000_000_000_000_000n,
      hasSufficientFunds: true,
      minimumRequired: 10_000_000_000_000_000n,
    })),
    version: 'test-version',
    statusRoute: {
      path: '/status/:left/:right',
      requiredParams: ['left', 'right'],
      missingParamsMessage: 'Missing required parameters: left, right',
      paymentDescription: 'Payment required to check attestation status',
    },
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
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

describe('common attester HTTP routes', () => {
  it('serves a payment quote', async () => {
    const server = await withServer();

    try {
      const response = await fetch(`${server.baseUrl}/quote`);
      assert.strictEqual(response.status, 200);

      const json = await response.json() as Record<string, unknown>;
      assert.strictEqual(json.currency, 'ETH');
      assert.ok(typeof json.price === 'string');
      assert.ok(typeof json.expiresAt === 'string');
    } finally {
      await server.close();
    }
  });

  it('serves a degraded health response when blockchain checks fail', async () => {
    const server = await withServer({
      checkAttesterBalance: async () => {
        throw new Error('rpc unavailable');
      },
    });

    try {
      const response = await fetch(`${server.baseUrl}/health`);
      assert.strictEqual(response.status, 503);

      const json = await response.json() as Record<string, unknown>;
      assert.strictEqual(json.status, 'degraded');
      assert.ok(typeof json.version === 'string');
      const details = json.details as Record<string, unknown>;
      assert.strictEqual(details.blockchainConnected, false);
      assert.strictEqual(details.lowBalanceWarning, true);
      assert.strictEqual(details.blockchainError, 'rpc unavailable');
    } finally {
      await server.close();
    }
  });

  it('serves placeholder status metadata with payment details', async () => {
    const server = await withServer();

    try {
      const response = await fetch(`${server.baseUrl}/status/a/b`);
      assert.strictEqual(response.status, 200);

      const json = await response.json() as Record<string, unknown>;
      assert.strictEqual(json.exists, false);
      assert.strictEqual(json.attestation, null);
      const paymentDetails = json.paymentDetails as Record<string, unknown>;
      assert.strictEqual(paymentDetails.description, 'Payment required to check attestation status');
      assert.ok(typeof paymentDetails.paymentId === 'string');
    } finally {
      await server.close();
    }
  });
});
